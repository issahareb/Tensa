import Stripe from 'stripe';
import {createOrders, SIZES, fail} from './orders.mjs';
import {createPayPalCheckout} from './paypal.mjs';
import {createManualCheckout} from './manual-checkout.mjs';
export {SIZES};

export function createCheckout({db, setting, env = process.env, stripeClient, paypalClient}) {
  const orders = createOrders({db, setting, env});
  const keyMatchesMode = orders.mode === 'test' ? /^sk_test_/.test(env.STRIPE_SECRET_KEY || '') : /^sk_live_/.test(env.STRIPE_SECRET_KEY || '');
  const stripe = stripeClient || (keyMatchesMode ? new Stripe(env.STRIPE_SECRET_KEY, {maxNetworkRetries: 2, timeout: 15000}) : null);
  const methods = [...new Set((env.STRIPE_PAYMENT_METHODS || 'card').split(',').map(s => s.trim()))];
  const validMethods = methods.length && methods.every(m => ['card', 'paypal', 'klarna'].includes(m));
  const stripeReady = () => !!(orders.ready() && stripe && env.STRIPE_WEBHOOK_SECRET && env.STRIPE_SHIPPING_RATE_ID && validMethods);
  const paypal = createPayPalCheckout({orders, env, client: paypalClient});
  const manual = createManualCheckout({orders, env});
  const ready = () => stripeReady() || paypal.ready() || manual.methods().length > 0;
  function publicConfig() {
    const labels = stripeReady() ? methods.flatMap(m => m === 'card' ? ['Visa', 'Mastercard', 'Apple Pay / Google Pay an der Kasse'] : [m === 'paypal' ? 'PayPal' : 'Klarna']) : [];
    return {checkoutReady: ready(), stripeReady: stripeReady(), paymentMethods: labels.concat(manual.methods().map(m => m === 'bank_transfer' ? 'Vorkasse' : 'Rechnung')), paymentMode: orders.mode,
      shippingCountries: orders.countries, shippingCents: Number(env.SHIPPING_AMOUNT_CENTS || 0), applePay: paypal.publicConfig(), manualMethods: manual.methods(), manualTerms: manual.publicTerms(),
      sizes: SIZES.map(size => ({size, available: db.prepare('SELECT quantity FROM inventory WHERE size=?').get(size)?.quantity > 0})),
      shippingText: env.SHOP_SHIPPING_TEXT || '', returnsText: env.SHOP_RETURNS_TEXT || '', sizeGuide: env.SHOP_SIZE_GUIDE || '', contactEmail: env.CONTACT_EMAIL || ''};
  }
  async function start(input) {
    if (!stripeReady()) throw fail(503, 'Der Checkout ist derzeit nicht verfügbar. Deine Auswahl bleibt gespeichert.');
    const record = orders.reserve(input, 'stripe', 'checkout', (items, amount, now) => ({payload: {
      mode: 'payment', payment_method_types: methods,
      line_items: items.map(x => ({price_data: {currency: 'eur', unit_amount: amount, product_data: {name: 'TENSA. The Washed Zip Hoodie', description: `Washed Black / ${x.size}`, images: [env.PUBLIC_URL + '/assets/shop/editorial/front.webp'], metadata: {size: x.size}}}, quantity: x.qty})),
      shipping_address_collection: {allowed_countries: orders.countries}, shipping_options: [{shipping_rate: env.STRIPE_SHIPPING_RATE_ID}], allow_promotion_codes: true,
      expires_at: Math.floor(now / 1000) + 2100, success_url: env.PUBLIC_URL + '/shop?checkout=success&session_id={CHECKOUT_SESSION_ID}', cancel_url: env.PUBLIC_URL + '/shop?checkout=cancelled#product', metadata: {tensa_checkout: input.requestId}
    }}));
    if (record.url) return {url: record.url};
    // Retry the exact persisted parameters; never release ambiguous requests on a timer.
    if (Date.now() - record.created_at > 23 * 3600000) throw fail(409, 'Diese Anfrage benötigt eine Prüfung. Bitte kontaktiere uns.');
    const session = await stripe.checkout.sessions.create(JSON.parse(record.snapshot).payload, {idempotencyKey: input.requestId});
    if (!session.id || !/^https:\/\/checkout\.stripe\.com\//.test(session.url || '')) throw fail(502, 'Die Zahlungsseite konnte nicht geöffnet werden. Bitte versuche es erneut.');
    orders.bind(input.requestId, session.id, session.url);
    return {url: session.url};
  }
  function applyEvent(event) {
    if (!['checkout.session.completed', 'checkout.session.async_payment_succeeded', 'checkout.session.expired', 'checkout.session.async_payment_failed'].includes(event.type)) return;
    const session = event.data.object, id = session.metadata?.tensa_checkout, row = orders.get(id);
    if (!row || row.provider !== 'stripe' || (row.session_id && row.session_id !== session.id)) return;
    if (session.livemode !== undefined && session.livemode !== (orders.mode === 'live')) throw Error('Stripe webhook mode mismatch');
    orders.bind(id, session.id, row.url);
    if (['checkout.session.completed', 'checkout.session.async_payment_succeeded'].includes(event.type)) {
      orders.transition(id, session.payment_status === 'paid' ? 'paid' : 'processing');
    } else if (event.type === 'checkout.session.async_payment_failed') orders.transition(id, 'failed');
    // A completed asynchronous payment is still processing, even after the old session deadline.
    else if (row.status === 'pending') orders.transition(id, 'expired');
  }
  function webhook(raw, signature) {
    if (!stripe || !env.STRIPE_WEBHOOK_SECRET) throw fail(503, 'Checkout nicht eingerichtet');
    let event;
    try { event = stripe.webhooks.constructEvent(raw, signature, env.STRIPE_WEBHOOK_SECRET); } catch { throw fail(400, 'Ungültige Signatur'); }
    applyEvent(event);
  }
  function status(id) {
    if (!/^cs_[a-zA-Z0-9_]{10,250}$/.test(id || '')) throw fail(400, 'Ungültige Sitzung');
    const row = db.prepare("SELECT status FROM checkouts WHERE provider='stripe' AND session_id=?").get(id);
    return {status: row?.status || 'pending'};
  }
  return {ready, publicConfig, start, webhook, status, applyEvent, paypal, manual, orders};
}
