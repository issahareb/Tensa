import {createHash} from 'node:crypto';

export const SIZES = ['XS', 'S', 'M', 'L', 'XL'];
export const fail = (status, message) => Object.assign(new Error(message), {status});
const active = new Set(['pending', 'processing', 'awaiting_payment']);
export const cents = value => /^\d+$/.test(String(value ?? '')) && Number.isSafeInteger(Number(value)) ? Number(value) : null;
export const money = value => (value / 100).toFixed(2);

export function normalize(items) {
  if (!Array.isArray(items) || !items.length || items.length > 5) throw fail(400, 'Dein Warenkorb ist leer oder ungültig.');
  const seen = new Set();
  return items.map(x => {
    if (!x || !SIZES.includes(x.size) || !Number.isInteger(x.qty) || x.qty < 1 || x.qty > 10 || seen.has(x.size)) throw fail(400, 'Bitte prüfe Größe und Menge.');
    seen.add(x.size);
    return {size: x.size, qty: x.qty};
  }).sort((a, b) => SIZES.indexOf(a.size) - SIZES.indexOf(b.size));
}

export function customer(input, countries) {
  const text = (key, max = 150) => {
    const value = String(input?.[key] || '').trim();
    if (!value || value.length > max || /[\x00-\x1f]/.test(value)) throw fail(400, 'Bitte ergänze deine vollständige Lieferadresse und E-Mail.');
    return value;
  };
  const result = {name: text('name'), email: text('email', 254), address: text('address'), city: text('city'), postalCode: text('postalCode', 20), country: text('country', 2)};
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result.email) || !countries.includes(result.country)) throw fail(400, 'E-Mail oder Lieferland ist nicht verfügbar.');
  return result;
}

export function createOrders({db, setting, env}) {
  db.exec(`CREATE TABLE IF NOT EXISTS inventory(size TEXT PRIMARY KEY,quantity INTEGER NOT NULL CHECK(quantity>=0));
    CREATE TABLE IF NOT EXISTS checkouts(id TEXT PRIMARY KEY,cart_hash TEXT NOT NULL,items TEXT NOT NULL,amount INTEGER NOT NULL,status TEXT NOT NULL,session_id TEXT UNIQUE,url TEXT,created_at INTEGER NOT NULL);`);
  const columns = new Set(db.prepare('PRAGMA table_info(checkouts)').all().map(c => c.name));
  for (const [name, type] of [['provider', "TEXT NOT NULL DEFAULT 'stripe'"], ['payment_method', "TEXT NOT NULL DEFAULT 'card'"], ['snapshot', 'TEXT'], ['details', 'TEXT'], ['expires_at', 'INTEGER']]) {
    if (!columns.has(name)) db.exec(`ALTER TABLE checkouts ADD COLUMN ${name} ${type}`);
  }
  let stock = {};
  try { stock = JSON.parse(env.SHOP_STOCK_JSON || '{}'); } catch {}
  for (const size of SIZES) if (Number.isSafeInteger(stock[size]) && stock[size] >= 0) db.prepare('INSERT OR IGNORE INTO inventory VALUES(?,?)').run(size, stock[size]);
  const countries = (env.SHIPPING_COUNTRIES || 'DE').split(',').map(s => s.trim()).filter(s => /^[A-Z]{2}$/.test(s));
  const price = () => Math.round(Number(setting('price')) * 100);
  const mode = env.PAYMENTS_MODE || 'test';
  function ready() {
    let https = false;
    try { const url = new URL(env.PUBLIC_URL); https = url.protocol === 'https:' && url.origin === env.PUBLIC_URL; } catch {}
    return !!(env.CHECKOUT_ENABLED === 'true' && setting('launched') === 'true' && https && countries.length && env.SHOP_OPERATOR && env.CONTACT_EMAIL && env.SHOP_SHIPPING_TEXT && env.SHOP_RETURNS_TEXT && Number.isSafeInteger(price()) && price() > 0 && price() <= 1000000 && db.prepare('SELECT count(*) n FROM inventory').get().n === SIZES.length && (mode === 'test' || (mode === 'live' && env.SALES_DETAILS_CONFIRMED === 'true')));
  }
  const get = id => typeof id === 'string' ? db.prepare('SELECT * FROM checkouts WHERE id=?').get(id) : undefined;
  function reserve(input, provider, method, buildSnapshot, extra = {}) {
    if (!/^[a-zA-Z0-9-]{20,80}$/.test(input?.requestId || '')) throw fail(400, 'Bitte starte den Checkout erneut.');
    const items = normalize(input.items);
    const fingerprint = createHash('sha256').update(JSON.stringify({items, provider, method, ...extra})).digest('hex');
    const old = get(input.requestId);
    if (old) {
      // Legacy Stripe rows used only the cart for their fingerprint.
      const legacy = !old.snapshot && old.provider === 'stripe' && provider === 'stripe' && old.cart_hash === createHash('sha256').update(JSON.stringify(items)).digest('hex');
      if (old.cart_hash !== fingerprint && !legacy) throw fail(409, 'Deine Auswahl hat sich geändert. Bitte starte erneut.');
      if (!active.has(old.status)) throw fail(409, 'Diese Bestellung ist beendet. Bitte starte erneut.');
      if (legacy && !old.url) throw fail(409, 'Bitte verwende für diese ältere Sitzung die bereits geöffnete Zahlungsseite oder kontaktiere uns.');
      return old;
    }
    const now = Date.now(), snapshot = buildSnapshot(items, price(), now);
    db.exec('BEGIN IMMEDIATE');
    try {
      for (const item of items) {
        const r = db.prepare('UPDATE inventory SET quantity=quantity-? WHERE size=? AND quantity>=?').run(item.qty, item.size, item.qty);
        if (!r.changes) throw fail(409, `Größe ${item.size} ist in dieser Menge nicht mehr verfügbar.`);
      }
      db.prepare('INSERT INTO checkouts(id,cart_hash,items,amount,status,created_at,provider,payment_method,snapshot,details,expires_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)').run(input.requestId, fingerprint, JSON.stringify(items), price(), 'pending', now, provider, method, JSON.stringify(snapshot), extra.customer ? JSON.stringify(extra.customer) : null, snapshot.expiresAt || null);
      db.exec('COMMIT');
      return get(input.requestId);
    } catch (e) { db.exec('ROLLBACK'); throw e; }
  }
  function bind(id, reference, url = null) {
    const row = get(id);
    if (!row || (row.session_id && row.session_id !== reference)) throw Error('Payment reference mismatch');
    db.prepare('UPDATE checkouts SET session_id=?,url=? WHERE id=?').run(reference, url, id);
  }
  function transition(id, state) {
    db.exec('BEGIN IMMEDIATE');
    try {
      const row = get(id);
      if (row && row.status !== state) {
        if (row.status === 'paid') { db.exec('COMMIT'); return; }
        if (!active.has(row.status)) {
          if (state === 'paid') throw Error('Late payment after released reservation requires reconciliation');
          db.exec('COMMIT'); return;
        }
        if (['failed', 'expired', 'cancelled'].includes(state)) {
          for (const item of JSON.parse(row.items)) db.prepare('UPDATE inventory SET quantity=quantity+? WHERE size=?').run(item.qty, item.size);
        }
        db.prepare('UPDATE checkouts SET status=? WHERE id=?').run(state, id);
      }
      db.exec('COMMIT');
    } catch (e) { db.exec('ROLLBACK'); throw e; }
  }
  return {db, get, reserve, bind, transition, ready, price, countries, mode};
}
