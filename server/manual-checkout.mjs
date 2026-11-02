import {cents, customer, fail} from './orders.mjs';

export function createManualCheckout({orders, env}) {
  const shipping = cents(env.SHIPPING_AMOUNT_CENTS);
  const iban = (env.BANK_IBAN || '').replace(/\s/g, '');
  function methods() {
    if (!orders.ready() || orders.mode !== 'live' || !env.ADMIN_PASSWORD || shipping === null || shipping > 100000 || !env.BANK_ACCOUNT_HOLDER || !/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(iban)) return [];
    return [env.BANK_TRANSFER_ENABLED === 'true' && env.BANK_TRANSFER_TERMS ? 'bank_transfer' : null, env.INVOICE_ENABLED === 'true' && env.INVOICE_TERMS ? 'invoice' : null].filter(Boolean);
  }
  // Local test mode may exercise manual orders with fixture-only bank details.
  function allowed() {
    if (orders.mode === 'test' && env.MANUAL_TEST_ENABLED === 'true' && env.ADMIN_PASSWORD && orders.ready() && shipping !== null && shipping <= 100000 && env.BANK_ACCOUNT_HOLDER && iban && env.BANK_TRANSFER_TERMS && env.INVOICE_TERMS) return ['bank_transfer', 'invoice'];
    return methods();
  }
  const termsFor = method => method === 'bank_transfer'
    ? `${env.BANK_TRANSFER_TERMS} Bei Vorkasse per Echtzeitüberweisung versenden wir die Zahlungsbestätigung innerhalb von 1 Stunde nach Zahlungseingang.`
    : env.INVOICE_TERMS;
  const publicTerms = () => Object.fromEntries(allowed().map(m => [m, termsFor(m)]));
  const info = row => ({requestId: row.id, status: row.status, method: row.payment_method, totalCents: JSON.parse(row.snapshot).total, ...JSON.parse(row.snapshot).instructions});
  function start(input) {
    if (!allowed().includes(input.method)) throw fail(503, 'Diese Zahlungsart ist derzeit nicht verfügbar.');
    if (input.acceptTerms !== true) throw fail(400, 'Bitte bestätige die Zahlungsbedingungen.');
    const contact = customer(input.customer, orders.countries);
    const row = orders.reserve(input, 'manual', input.method, (items, price, now) => {
      const total = items.reduce((n, x) => n + x.qty * price, 0) + shipping;
      if (input.expectedTotal !== total) throw fail(409, 'Der Preis hat sich geändert. Bitte lade den Shop neu.');
      return {total, instructions: {accountHolder: env.BANK_ACCOUNT_HOLDER, iban, reference: input.requestId, terms: termsFor(input.method)}, orderedAt: now};
    }, {customer: contact, expectedTotal: input.expectedTotal});
    orders.transition(row.id, 'awaiting_payment');
    return info(orders.get(row.id));
  }
  function update(id, action) {
    const row = orders.get(id);
    if (!row || row.provider !== 'manual') throw fail(404, 'Bestellung nicht gefunden.');
    if (!['confirm_payment', 'cancel'].includes(action)) throw fail(400, 'Ungültige Aktion.');
    if (row.status !== 'awaiting_payment') throw fail(409, 'Diese Bestellung wurde bereits bearbeitet.');
    orders.transition(id, action === 'confirm_payment' ? 'paid' : 'cancelled');
    return {status: orders.get(id).status};
  }
  function list() {
    return orders.db.prepare("SELECT id,provider,payment_method,status,items,amount,details,created_at,session_id,snapshot FROM checkouts ORDER BY created_at DESC LIMIT 100").all().map(row => ({...row, items: JSON.parse(row.items), details: row.details ? JSON.parse(row.details) : null, totalCents: row.provider === 'manual' ? JSON.parse(row.snapshot).total : null, snapshot: undefined}));
  }
  return {methods: allowed, publicTerms, start, update, list};
}
