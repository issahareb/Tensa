import {existsSync} from 'node:fs';
import {cents, money, customer, fail} from './orders.mjs';

export function createPayPalClient(env, request = fetch) {
  const base = env.PAYPAL_ENVIRONMENT === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';
  let cached, until = 0;
  async function token() {
    if (cached && until > Date.now()) return cached;
    const r = await request(base + '/v1/oauth2/token', {method: 'POST', headers: {Authorization: 'Basic ' + Buffer.from(env.PAYPAL_CLIENT_ID + ':' + env.PAYPAL_CLIENT_SECRET).toString('base64'), 'Content-Type': 'application/x-www-form-urlencoded'}, body: 'grant_type=client_credentials', signal: AbortSignal.timeout(15000)});
    if (!r.ok) throw Error('PayPal authentication unavailable');
    const data = await r.json();
    if (!data.access_token) throw Error('Missing PayPal access token');
    cached = data.access_token; until = Date.now() + Math.max(0, Number(data.expires_in) - 60) * 1000;
    return cached;
  }
  async function api(path, method = 'GET', data, key) {
    const r = await request(base + path, {method, headers: {Authorization: 'Bearer ' + await token(), 'Content-Type': 'application/json', Prefer: 'return=representation', ...(key ? {'PayPal-Request-Id': key} : {})}, ...(data ? {body: JSON.stringify(data)} : {}), signal: AbortSignal.timeout(20000)});
    if (!r.ok) throw Error('PayPal request requires retry or reconciliation');
    return r.json();
  }
  return {
    create: (payload, key) => api('/v2/checkout/orders', 'POST', payload, key),
    get: id => api('/v2/checkout/orders/' + encodeURIComponent(id)),
    capture: (id, key) => api('/v2/checkout/orders/' + encodeURIComponent(id) + '/capture', 'POST', {}, key),
    verify: payload => api('/v1/notifications/verify-webhook-signature', 'POST', payload)
  };
}

export function createPayPalCheckout({orders, env, client}) {
  const api = client || createPayPalClient(env);
  const shipping = cents(env.SHIPPING_AMOUNT_CENTS);
  const environment = env.PAYPAL_ENVIRONMENT || 'sandbox';
  const configured = () => !!(env.APPLE_PAY_ENABLED === 'true' && env.APPLE_PAY_DOMAIN_VERIFIED === 'true' && existsSync(env.APPLE_PAY_DOMAIN_ASSOCIATION_FILE || '') && env.PAYPAL_CLIENT_ID && env.PAYPAL_CLIENT_SECRET && env.PAYPAL_MERCHANT_ID && env.PAYPAL_WEBHOOK_ID && shipping !== null && shipping <= 100000 && ((orders.mode === 'test' && environment === 'sandbox') || (orders.mode === 'live' && environment === 'live')));
  const ready = () => orders.ready() && configured();
  const publicConfig = () => ready() ? {ready: true, environment, clientId: env.PAYPAL_CLIENT_ID, countryCode: 'DE', shippingCents: shipping} : {ready: false};
  function owned(input) {
    const row = orders.get(input?.requestId);
    if (!row || row.provider !== 'paypal' || row.session_id !== input?.orderId || !/^[A-Z0-9]{10,32}$/.test(input?.orderId || '')) throw fail(404, 'Bestellung nicht gefunden.');
    return row;
  }
  function validate(row, order, requireSource = true) {
    const expected = JSON.parse(row.snapshot).payload.purchase_units[0];
    const unit = order.purchase_units?.[0];
    if (order.id !== row.session_id || order.intent !== 'CAPTURE' || order.purchase_units?.length !== 1 || unit?.custom_id !== row.id || unit.amount?.currency_code !== 'EUR' || unit.amount?.value !== expected.amount.value || unit.payee?.merchant_id !== expected.payee.merchant_id) throw Error('PayPal order mismatch; reconciliation required');
    const address = unit.shipping?.address, saved = expected.shipping.address;
    if (!address || ['address_line_1', 'admin_area_2', 'postal_code', 'country_code'].some(k => address[k] !== saved[k])) throw Error('PayPal shipping mismatch');
    if (requireSource && !order.payment_source?.apple_pay) throw Error('Expected Apple Pay payment source');
    return unit;
  }
  function settle(row, order) {
    const unit = validate(row, order, !(order.status === 'VOIDED' && !order.purchase_units?.[0]?.payments?.captures?.length)), captures = unit.payments?.captures || [];
    if (captures.length > 1) throw Error('Unexpected multiple PayPal captures');
    const capture = captures[0];
    if (capture) {
      if (capture.amount?.currency_code !== 'EUR' || capture.amount?.value !== unit.amount.value) throw Error('PayPal capture amount mismatch');
      if (capture.status === 'COMPLETED') orders.transition(row.id, 'paid');
      else if (['DECLINED', 'DENIED', 'FAILED'].includes(capture.status)) orders.transition(row.id, 'failed');
      else orders.transition(row.id, 'processing');
    } else if (order.status === 'VOIDED') orders.transition(row.id, 'cancelled');
    return {status: orders.get(row.id).status};
  }
  async function start(input) {
    if (!ready()) throw fail(503, 'Apple Pay ist derzeit nicht verfügbar.');
    const contact = customer(input.customer, orders.countries);
    const row = orders.reserve(input, 'paypal', 'apple_pay', (items, price) => {
      const subtotal = items.reduce((n, x) => n + x.qty * price, 0), total = subtotal + shipping;
      if (input.expectedTotal !== total) throw fail(409, 'Der Preis hat sich geändert. Bitte lade den Shop neu.');
      return {payload: {intent: 'CAPTURE', purchase_units: [{reference_id: 'default', custom_id: input.requestId, payee: {merchant_id: env.PAYPAL_MERCHANT_ID}, amount: {currency_code: 'EUR', value: money(total), breakdown: {item_total: {currency_code: 'EUR', value: money(subtotal)}, shipping: {currency_code: 'EUR', value: money(shipping)}}}, items: items.map(x => ({name: 'TENSA. The Washed Zip Hoodie', sku: 'DROP001-' + x.size, quantity: String(x.qty), category: 'PHYSICAL_GOODS', unit_amount: {currency_code: 'EUR', value: money(price)}})), shipping: {name: {full_name: contact.name}, address: {address_line_1: contact.address, admin_area_2: contact.city, postal_code: contact.postalCode, country_code: contact.country}}}]}};
    }, {customer: contact, expectedTotal: input.expectedTotal});
    if (row.session_id) return {orderId: row.session_id};
    // Default PayPal idempotency retention is six hours. Never create another order afterwards.
    if (Date.now() - row.created_at > 5 * 3600000) throw fail(409, 'Die Zahlung benötigt eine Prüfung. Bitte kontaktiere uns.');
    const order = await api.create(JSON.parse(row.snapshot).payload, row.id + '-create');
    if (!/^[A-Z0-9]{10,32}$/.test(order.id || '')) throw Error('Invalid PayPal order');
    orders.bind(row.id, order.id);
    return {orderId: order.id};
  }
  async function capture(input) {
    if (!configured()) throw fail(503, 'Apple Pay ist derzeit nicht verfügbar.');
    const row = owned(input);
    if (row.status === 'paid') return {status: 'paid'};
    if (!['pending', 'processing'].includes(row.status)) return {status: row.status};
    const order = await api.get(row.session_id);
    if (order.status === 'VOIDED') return settle(row, order);
    const unit = validate(row, order);
    if (unit.payments?.captures?.length || order.status === 'VOIDED') return settle(row, order);
    if (order.status !== 'APPROVED') throw fail(409, 'Die Zahlung ist noch nicht freigegeben.');
    if (Date.now() - row.created_at > 5 * 3600000) throw fail(409, 'Die Zahlung benötigt eine Prüfung. Bitte kontaktiere uns.');
    orders.transition(row.id, 'processing');
    // An uncertain capture keeps stock reserved; GET + the same key makes retries safe.
    return settle(row, await api.capture(row.session_id, row.id + '-capture'));
  }
  async function webhook(event, headers) {
    if (!configured()) throw fail(503, 'PayPal nicht eingerichtet');
    const result = await api.verify({auth_algo: headers['paypal-auth-algo'], cert_url: headers['paypal-cert-url'], transmission_id: headers['paypal-transmission-id'], transmission_sig: headers['paypal-transmission-sig'], transmission_time: headers['paypal-transmission-time'], webhook_id: env.PAYPAL_WEBHOOK_ID, webhook_event: event});
    if (result.verification_status !== 'SUCCESS') throw fail(400, 'Ungültige PayPal-Signatur');
    if (!['PAYMENT.CAPTURE.COMPLETED', 'PAYMENT.CAPTURE.PENDING', 'PAYMENT.CAPTURE.DENIED', 'CHECKOUT.ORDER.APPROVED', 'CHECKOUT.PAYMENT-APPROVAL.REVERSED'].includes(event.event_type)) return;
    const id = event.event_type.startsWith('PAYMENT.CAPTURE.') ? event.resource?.supplementary_data?.related_ids?.order_id : event.resource?.id;
    const row = orders.db.prepare("SELECT * FROM checkouts WHERE provider='paypal' AND session_id=?").get(id || '');
    if (!row) return;
    // Read authoritative order data instead of trusting a client redirect or webhook amount alone.
    const order = await api.get(id);
    if (event.event_type === 'CHECKOUT.ORDER.APPROVED' && ['pending', 'processing'].includes(row.status)) await capture({requestId: row.id, orderId: id});
    else settle(row, order);
  }
  async function reconcile(id) {
    const row = orders.get(id);
    if (!row || row.provider !== 'paypal' || !row.session_id) throw fail(404, 'Zahlungsreferenz fehlt. Bitte beim Anbieter prüfen.');
    return settle(row, await api.get(row.session_id));
  }
  return {ready, publicConfig, start, capture, webhook, reconcile};
}
