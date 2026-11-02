// Native Apple Pay button, with PayPal processing. No Stripe dependency.
const scripts = new Map();
export function loadScript(src, doc = document) {
  if (!scripts.has(src)) scripts.set(src, new Promise((resolve, reject) => {
    const script = doc.createElement('script');
    script.src = src; script.async = true;
    script.onload = resolve;
    script.onerror = () => { scripts.delete(src); script.remove(); reject(Error('Zahlungsanbieter nicht erreichbar.')); };
    doc.head.append(script);
  }));
  return scripts.get(src);
}

export async function initApplePay({config, container, getCart, getKey, onPaid, onTerminal = () => {}, onBusy = () => {}, status, request = fetch, win = window, load = loadScript}) {
  const proofKey = 'tensa-apple-pay-attempt';
  let proof, unresolved = false;
  try { proof = JSON.parse(win.sessionStorage.getItem(proofKey) || 'null'); } catch {}
  function saveProof(value) { proof = value; if (!value) unresolved = false; try { value ? win.sessionStorage.setItem(proofKey, JSON.stringify(value)) : win.sessionStorage.removeItem(proofKey); } catch {} }
  function showRecovery() {
    unresolved = true; onBusy(true);
    const retry = container.ownerDocument.createElement('button');
    retry.className = 'continue-button'; retry.textContent = 'Zahlungsstatus prüfen';
    retry.addEventListener('click', async () => {
      retry.disabled = true; onBusy(true);
      try {
        const r = await request('/api/apple-pay/capture', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(proof)});
        const data = await r.json();
        if (!r.ok) throw Error(data.error || 'Die Zahlung benötigt eine Prüfung. Bitte kontaktiere uns.');
        if (data.status === 'paid') { saveProof(null); onPaid(); container.hidden = true; status.textContent = config.paymentMode === 'test' ? 'Testzahlung bestätigt.' : 'Danke. Deine Zahlung ist bestätigt.'; }
        else if (['failed', 'cancelled', 'expired'].includes(data.status)) { saveProof(null); onTerminal(); container.hidden = true; status.textContent = 'Diese Zahlung ist beendet. Bitte lade den Shop für einen neuen Versuch neu.'; }
        else status.textContent = 'Die Zahlungsbestätigung steht weiter aus. Bitte keine neue Bestellung anlegen.';
      } catch (e) { status.textContent = e.message; }
      finally { retry.disabled = false; onBusy(unresolved); }
    });
    container.replaceChildren(retry); container.hidden = false;
  }
  if (proof?.requestId && proof?.orderId) { showRecovery(); status.textContent = 'Eine frühere Zahlung ist noch zu prüfen. Bitte prüfe ihren Status vor einer neuen Bestellung.'; return true; }
  if (!config.applePay?.ready || !win.isSecureContext || !win.ApplePaySession?.supportsVersion(4) || !win.ApplePaySession.canMakePayments()) return false;
  await Promise.all([load('https://applepay.cdn-apple.com/jsapi/v1/apple-pay-sdk.js'), load(config.applePay.environment === 'live' ? 'https://www.paypal.com/web-sdk/v6/core' : 'https://www.sandbox.paypal.com/web-sdk/v6/core')]);
  const sdk = await win.paypal.createInstance({clientId: config.applePay.clientId, components: ['applepay-payments'], pageType: 'cart', locale: 'de-DE'});
  const eligibility = await sdk.findEligibleMethods({currencyCode: 'EUR'});
  if (!eligibility.isEligible('applepay')) return false;
  const provider = await sdk.createApplePayOneTimePaymentSession();
  const {merchantCapabilities, supportedNetworks} = await provider.config();
  const button = container.ownerDocument.createElement('apple-pay-button');
  button.setAttribute('buttonstyle', 'black'); button.setAttribute('type', 'buy'); button.setAttribute('locale', 'de-DE');
  button.setAttribute('aria-label', 'Mit Apple Pay kaufen');
  let busy = false;
  async function post(path, payload) {
    const r = await request(path, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload)});
    const data = await r.json();
    if (!r.ok) throw Error(data.error || 'Zahlung nicht bestätigt. Bitte kontaktiere uns, bevor du eine neue Bestellung anlegst.');
    return data;
  }
  button.addEventListener('click', () => {
    if (busy) return;
    const items = getCart().map(x => ({...x}));
    if (!items.length) { status.textContent = 'Dein Warenkorb ist noch leer.'; return; }
    const unit = Math.round(Number(config.price) * 100), shipping = config.applePay.shippingCents;
    const totalCents = items.reduce((n, x) => n + x.qty * unit, 0) + shipping;
    const total = {label: config.paymentMode === 'test' ? 'TENSA. (Test)' : 'TENSA.', amount: (totalCents / 100).toFixed(2), type: 'final'};
    // Construct and begin synchronously inside the trusted click; await would lose user activation.
    let session;
    try { session = new win.ApplePaySession(4, {countryCode: config.applePay.countryCode, currencyCode: 'EUR', merchantCapabilities, supportedNetworks, requiredBillingContactFields: ['name', 'postalAddress'], requiredShippingContactFields: ['name', 'postalAddress', 'email'], shippingType: 'shipping', lineItems: [{label: 'Artikel', amount: ((totalCents - shipping) / 100).toFixed(2)}, {label: 'Versand', amount: (shipping / 100).toFixed(2)}], total}); } catch { status.textContent = 'Apple Pay konnte nicht geöffnet werden.'; return; }
    busy = true; onBusy(true); button.setAttribute('aria-disabled', 'true');
    const finish = () => { busy = false; onBusy(unresolved); button.removeAttribute('aria-disabled'); };
    session.onvalidatemerchant = async event => {
      try { const data = await provider.validateMerchant({validationUrl: event.validationURL}); session.completeMerchantValidation(data.merchantSession); }
      catch { session.abort(); finish(); status.textContent = 'Apple Pay konnte nicht geöffnet werden. Deine Auswahl bleibt erhalten.'; }
    };
    session.onshippingcontactselected = event => {
      const country = event.shippingContact?.countryCode?.toUpperCase();
      const errors = config.shippingCountries.includes(country) ? [] : [new win.ApplePayError('shippingContactInvalid', 'country', 'Für dieses Land ist kein Versand möglich.')];
      session.completeShippingContactSelection({newTotal: total, newLineItems: [], errors});
    };
    session.onpaymentmethodselected = () => session.completePaymentMethodSelection({newTotal: total});
    session.onpaymentauthorized = async event => {
      try {
        const c = event.payment.shippingContact;
        const contact = {name: [c.givenName, c.familyName].filter(Boolean).join(' '), email: c.emailAddress, address: c.addressLines?.join(', '), city: c.locality, postalCode: c.postalCode, country: c.countryCode?.toUpperCase()};
        // The key also binds the shipping contact; retrying never silently changes a paid order.
        const requestId = getKey('apple_pay', {items, customer: contact, expectedTotal: totalCents});
        const {orderId} = await post('/api/apple-pay/orders', {items, customer: contact, expectedTotal: totalCents, requestId});
        saveProof({requestId, orderId});
        await provider.confirmOrder({orderId, token: event.payment.token, billingContact: event.payment.billingContact, shippingContact: c});
        const result = await post('/api/apple-pay/capture', {requestId, orderId});
        if (result.status !== 'paid') {
          if (['failed', 'cancelled', 'expired'].includes(result.status)) { saveProof(null); onTerminal(); } else showRecovery();
          session.completePayment({status: win.ApplePaySession.STATUS_FAILURE});
          status.textContent = result.status === 'failed' ? 'Die Zahlung wurde abgelehnt. Bitte kontaktiere uns bei Fragen.' : 'Die Zahlungsbestätigung steht aus. Bitte keine neue Bestellung anlegen. Wir prüfen den Zahlungseingang.';
        } else {
          session.completePayment({status: win.ApplePaySession.STATUS_SUCCESS});
          saveProof(null); onPaid(); status.textContent = config.paymentMode === 'test' ? 'Testzahlung bestätigt. Es wurde kein echtes Geld abgebucht.' : 'Danke. Deine Zahlung ist bestätigt.';
        }
      } catch (e) { session.completePayment({status: win.ApplePaySession.STATUS_FAILURE}); if (proof) showRecovery(); status.textContent = e.message; }
      finally { finish(); }
    };
    session.oncancel = () => { finish(); status.textContent = 'Apple Pay geschlossen. Deine Auswahl bleibt erhalten. Eine bereits gestartete Zahlung wird gegebenenfalls noch geprüft.'; };
    try { session.begin(); } catch { finish(); status.textContent = 'Apple Pay konnte nicht geöffnet werden.'; }
  });
  container.replaceChildren(button); container.hidden = false;
  return true;
}
