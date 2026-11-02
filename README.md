# TENSA — Drop 001

Single-product launch foundation for the washed-black zip hoodie. Live gate: https://tensa-web-production.up.railway.app/gate. Shop preview: https://tensa-web-production.up.railway.app/shop. GitHub `issahareb/Tensa`, Railway follows `main`. No payment processing is active.

## Run

Node 24+: `npm start`; API integration checks: `npm test`. Use `.env.example` for configuration; never commit credentials. SQLite records persist in `DATA_DIR` (Railway `/data` volume). Use one replica.

## Public gate

`dist/index.html`, `light-gate.css`, `light-gate.js` `ring-mesh.js` and `ring-bloom.js`. TENSA. stays visible above the central hoodie. Mouse position moves and rotates a real 3D luminous ring, with corresponding side illumination. At center the garment stays almost black. There is no scroll animation. Pointer and touch movement control the light directly; the scene supports arrow keys and Home, pause, reduced-motion and WebGL fallback. No visible slider is shown. A full-screen entrance counts to 72%, then the bar travels to the marked lower torso position. A narrow light pulse crosses it every 3.4 seconds while the value stays fixed. The original typographic wordmark sits over a faint elephant in the intro. Coming soon below the one-line invitation has sequential bouncing dots. The mobile header is opaque to prevent text overlapping TENSA while scrolling. Rendering stops when pointer easing settles.

The hoodie texture was generated and cut out with Higgsfield from uploaded TENSA references. The luminous ring was generated with Tripo v3.1: 1,430,150 source triangles, optimized by Tripo to 21,580 triangles, then locally rebuilt as a regular circular tube (32,768 triangles, 591 KB browser GLB). The browser uses a precision remesh of the generated dimensions with 2x supersampled rendering for smooth edges. Uniform white emission and dense, occlusion-aware Gaussian bloom provide the glow without visible surface texture. The garment stays near-black with directional outer-edge lighting and a faint logo silhouette lit independently from the left or right. Source task records and a rendered preview are archived in `production/source`; provenance, costs and generation IDs are in `production/light-brief.json`. The high-resolution emissive GLB and Blender scene remain in `/workspace/tripo-assets/tensa-ring-source`. To rebuild the web asset: `blender --background --python production/prepare-ring.py -- INPUT.glb dist/assets/light/ring.glb`, then `python production/regularize-ring.py`. The ring has real triangle geometry and perspective; hoodie lighting is a photo-based surface approximation, not a full 3D cloth simulation.

## Waitlist and Resend

All registrations before launch qualify for 15%, without a numerical cap. `/api/waitlist` validates explicit consent and stores pending addresses; after launch it rejects new prelaunch registrations. Set `RESEND_API_KEY`, `MAIL_FROM` on a verified domain, `PUBLIC_URL`, `SHOP_OPERATOR`, and `CONTACT_EMAIL`. Without these, the form honestly states that confirmation delivery is deferred. The queue retries delivery up to five times at 15-minute intervals. Confirmation links expire after 24 hours. Confirmed subscribers get a unique reserved 15% code in SQLite.

Launch mailing and coupon redemption are not yet connected to a checkout. No bulk launch mailing has been sent. Complete legal/operator details, prices, sizes, stock, shipping and returns before opening sales.

## Owner studio and shop

`/studio` supports password login, price, gate release/closure and confirmed-subscriber CSV export. `/shop` is the public store preview; `/` still routes to `/gate` until owner release. Root release does not activate payments or send mail. Final price, sizes/measurements, inventory, operator details, shipping and return terms remain owner inputs.

The store has product gallery/zoom, size selection, persisted cart, purchase rail, service dialog and checkout action. No Early Access navigation or waitlist copy appears in the shop. When unconfigured, the checkout reports its unavailable state rather than claiming to accept payment. The product gallery and lookbook use the new Higgsfield campaign images; original photographs remain as source references.

## Higgsfield hero and campaign imagery

`dist/hero-film.js` replaces the rejected Tripo/Three.js scene. Native page scrolling drives a fixed-framing Higgsfield/Kling 3.0 front-to-back product film. No synthetic mesh, custom touch capture or per-frame tracking is used. The film is fully fetched before interaction and every encoded frame is independently seekable (H.264 all-intra, no B-frames). Only one seek is in flight; new scroll positions replace the pending target. A fixed canvas presents decoded frames only between its current image and the latest target, avoiding stale forward/backward seek results. The last part of the hero holds the back view. Reduced motion and media failure show the product photo in normal page flow.

Film job `53270b45-8648-4ccf-a79d-120bde9b9fa8`: Kling 3.0, requested 4K mode, delivered 2880×2880 at 24fps, 8.04 seconds. Web encodes are 1600px desktop (~17 MB) and 960px mobile (~7.2 MB). Source: `/workspace/scratch/hf-shop/hero-source.mp4`. Files live under `dist/assets/shop/editorial/`. These generated visuals are not a physical cloth simulation.

Five Higgsfield product/campaign images: front, back, zipper/embroidery macro, male model front and female model back. Original square images are 4096px and portraits 3584×4800px. Requests used `nano_banana_pro`; returned metadata identifies `nano_banana_2`. Web images are 1600px wide, enlarged gallery images 3200px. Raw downloads remain in `/workspace/scratch/hf-shop`. Generation IDs, prompts, references and preflight estimates are in `production/higgsfield-editorial.json`. The original user product photographs remain available as source references. No Tripo runtime model or Three.js bundle is loaded by the shop.

## Checkout and payment methods

The checkout supports three independent paths sharing the same SQLite orders and inventory reservations. Sales remain disabled by default. `PAYMENTS_MODE=test` is the default; live Stripe keys and a live PayPal environment are refused in that mode. No live charge, refund, merchant registration, bank transfer or deployment was performed for this change.

| Method | Implemented path | Merchant prerequisites |
| --- | --- | --- |
| Cards | Hosted Stripe Checkout | Test/live Stripe account, webhook and shipping rate |
| PayPal | Stripe Checkout with `paypal` in `STRIPE_PAYMENT_METHODS` | Enable PayPal in an eligible Stripe account; complete the required merchant activation |
| Klarna | Stripe Checkout with `klarna` in `STRIPE_PAYMENT_METHODS` | Enable Klarna; customer eligibility and available plans are determined by Klarna |
| Apple Pay / Google Pay in hosted checkout | Stripe's supported card wallets | Merchant wallet settings and eligible browser/device; no storefront wallet button is simulated |
| Apple Pay directly in the bag, independent of Stripe | Native Apple Pay button + PayPal JS SDK v6 / Orders API | PayPal Apple Pay approval, credentials, webhook, domain registration/association file and supported Apple wallet |
| Vorkasse | Separate TENSA order with bank instructions | Confirmed bank details, terms and manual payment reconciliation |
| Own invoice payment | Separate TENSA order, initially unpaid | Confirmed invoice terms, bank details and merchant-managed invoicing/collections |

For a German merchant, PayPal and Klarna do not inherently require separate integrations outside Stripe. Own invoice payment is distinct from any pay-later option that Klarna may offer. Apple Pay is a wallet, not a standalone acquirer: the direct button avoids Stripe by using PayPal to process the payment.

The product film, gallery assets and scroll animation code are unchanged. Payment controls use the existing store palette and typography. Badges are generated from configured methods; the native Apple Pay button appears only after server readiness, browser support and PayPal eligibility checks. Provider SDKs load only when the bag is opened. An unconfigured method is hidden. Test mode is displayed in the bag and test Apple Pay totals are labeled accordingly.

### Common configuration and safety

All sales paths require `CHECKOUT_ENABLED=true`, released owner gate, a final positive EUR price, HTTPS `PUBLIC_URL` with no path/trailing slash, operator/contact details, shipping/return text and final inventory for all five sizes. `SHOP_STOCK_JSON` seeds SQLite only once; redeploys never reset sold/reserved stock. Use one replica and back up the persistent `/data` volume before applying the additive schema migration.

Live use additionally requires `PAYMENTS_MODE=live` and `SALES_DETAILS_CONFIRMED=true`. This flag is an explicit operator confirmation, not legal validation. Confirm operator address, tax treatment/inclusive final prices, delivery times, shipping destinations/costs, product sizes/measurements, withdrawal/returns, privacy, terms and all required customer information before setting it. The legal pages still require merchant review and completion.

`checkouts` is upgraded without dropping existing orders or inventory. Each new order stores an immutable provider request snapshot before external calls. Replays reuse original price, shipping settings and provider idempotency key. Reservations are shared across all payment paths. Client redirects, closed dialogs and failed network requests never count as payment or automatically return stock. Confirmed failures/expiry return reserved stock exactly once; paid stock is never returned by a late failure event. A paid event after stock has already been released raises a reconciliation error instead of silently fulfilling an oversold order.

Pending or ambiguous requests are retained until the provider gives authoritative results. No timer blindly releases online-payment reservations. Older pre-migration Stripe rows retain their records; do not recreate a legacy request with new parameters. Use the existing hosted URL or reconcile it in the dashboard. The browser preserves cart/payment keys and a temporary recovery reference; payment tokens, card data and secret keys are never stored by TENSA.

### Stripe configuration

Set `STRIPE_SECRET_KEY` (`sk_test_...` in test mode), `STRIPE_WEBHOOK_SECRET` and `STRIPE_SHIPPING_RATE_ID`. `STRIPE_PAYMENT_METHODS` defaults to `card`; after enabling the methods in the Stripe Dashboard, set `card,paypal,klarna` to offer all three. Unknown methods fail closed. Stripe controls customer/region/amount eligibility; listing a method in configuration does not activate it in the merchant account.

Register `/api/checkout/webhook` for:

- `checkout.session.completed`
- `checkout.session.expired`
- `checkout.session.async_payment_succeeded`
- `checkout.session.async_payment_failed`

A completed session with an unpaid asynchronous payment stays `processing`; fulfillment requires a verified paid event. `/api/checkout/status?session_id=...` exposes status only. Customer/shipping details for Stripe orders remain in the Stripe Dashboard. Verify receipts, tax and shipping rate configuration there before going live.

Stripe promotion-code entry remains enabled. The prelaunch 15% subscriber codes are not provisioned into Stripe automatically. Direct Apple Pay/manual orders do not yet have discount-code redemption; complete and test discount parity before sending a launch discount campaign.

### Direct Apple Pay through PayPal, without Stripe

Start with a separate HTTPS sandbox environment and `CHECKOUT_ENABLED=false` until configuration is complete:

1. Enable Apple Pay for the PayPal sandbox business app. Set `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_MERCHANT_ID` and `PAYPAL_ENVIRONMENT=sandbox`. No Stripe key is needed for this path.
2. Download the matching sandbox domain association file from PayPal. Store it outside Git and set its absolute path in `APPLE_PAY_DOMAIN_ASSOCIATION_FILE`. The server serves its exact bytes at `/.well-known/apple-developer-merchantid-domain-association` with binary MIME and no redirect. Register the exact HTTPS hostname with PayPal. Only then set `APPLE_PAY_DOMAIN_VERIFIED=true`.
3. Set the final `SHIPPING_AMOUNT_CENTS` (including zero for free shipping), `SHIPPING_COUNTRIES` (default `DE`) and `APPLE_PAY_ENABLED=true`. Direct checkout uses EUR, a German merchant and one flat shipping charge. Additional destinations require checking their address requirements and confirming the same rate is suitable. Tax must already be reflected in approved prices; this path does not calculate tax dynamically.
4. Create a sandbox webhook at `/api/apple-pay/webhook` and set `PAYPAL_WEBHOOK_ID`. Subscribe to `CHECKOUT.ORDER.APPROVED`, `CHECKOUT.PAYMENT-APPROVAL.REVERSED`, `PAYMENT.CAPTURE.PENDING`, `PAYMENT.CAPTURE.COMPLETED` and `PAYMENT.CAPTURE.DENIED`.
5. Supply all common test product/operator settings, release the test gate, enable checkout and use an Apple sandbox wallet/test card on a supported device. Production-wallet cards are not a substitute for this test.

The button opens a native `ApplePaySession` synchronously from the shopper's click. PayPal performs merchant validation and token confirmation. The server owns prices, shipping amount and order ID; before capture it checks the provider order, merchant, currency, amount, shipping address, local order binding and Apple Pay source. Only a completed capture reports success. Pending captures keep their reservations and present a recovery action instead of another purchase button. Recovery survives a page reload; other purchase controls remain disabled while that payment is unresolved.

Webhook signatures are verified through PayPal's verification API using the configured webhook ID. The handler retrieves authoritative order data. An approved order can be captured even if the browser disappeared after approval. Duplicate notifications are idempotent. Capture retries read the existing provider order and use the same request ID. Creation/capture is blocked after five hours rather than risking a new charge after PayPal's default idempotency window. Unknown network outcomes must be reconciled.

Use Studio → Bestellungen → PayPal-Status abgleichen for an authoritative status read. Confirmed voided orders return stock; created/approved/uncertain orders are not cancelled based solely on a closed browser. A created order without a returned provider ID, or an abandoned order that the provider has not authoritatively voided, needs merchant investigation. This implementation intentionally has no blind force-release action.

For future live activation, obtain the necessary merchant approval and live credentials/webhook, use the live association file and register the live domain, then match `PAYPAL_ENVIRONMENT=live` with confirmed common live settings. Sandbox credentials/domain registration do not activate live Apple Pay. No merchant accounts, certificates or payment registrations are created by this code.

### Vorkasse and own invoice orders

These paths work independently of Stripe/PayPal. Set a strong `ADMIN_PASSWORD`, confirmed `BANK_ACCOUNT_HOLDER`, `BANK_IBAN`, `SHIPPING_AMOUNT_CENTS` and the applicable `BANK_TRANSFER_TERMS` / `INVOICE_TERMS`. In confirmed live mode, separately opt in with `BANK_TRANSFER_ENABLED=true` and/or `INVOICE_ENABLED=true`. Test fixtures can opt in using `MANUAL_TEST_ENABLED=true` in test mode; use fake bank details only.

The bag collects buyer email/delivery address, displays the total including shipping and the selected payment terms, and requires acknowledgment before the payment-obligation button. The server validates and persists the order/address, reserves stock and returns bank instructions with a unique transfer reference. `awaiting_payment` is an order confirmation, not a paid state. The browser retains the latest instructions for the session.

For Vorkasse, both the checkout terms and the saved order instructions state: “Bei Vorkasse per Echtzeitüberweisung versenden wir die Zahlungsbestätigung innerhalb von 1 Stunde nach Zahlungseingang.” This is a merchant service commitment. The merchant must monitor incoming payments and send the confirmation within that hour; the current implementation does not automate bank matching or confirmation-email delivery.

Authenticated Studio lists recent orders and delivery data. After checking the bank payment, the merchant can confirm the payment or cancel an unpaid order. Confirmation consumes the existing allocation; cancellation releases it once. Paid orders cannot be cancelled/restocked through this action. Unpaid manual orders have no automatic expiry: the merchant must cancel them according to the stated terms. Only mark paid after checking the full amount/reference in the bank account.

Automatic order email, legal invoice/PDF generation, accounting export, bank matching, credit checks, dunning, refunds and fulfillment are **not implemented**. The merchant must provide invoices/order communications and operate these processes separately before enabling the corresponding sales path. No automatic invoice is promised to the shopper. Confirmed invoice payment does not mean an invoice document has been generated.

### Verification and remaining launch work

`npm test` uses temporary/in-memory SQLite databases, signed Stripe test events, simulated PayPal API responses and a native Apple Pay session test double. It covers successful/aborted/failed/pending payments, duplicate and late webhooks, stock release, cross-provider key conflicts, immutable retry parameters, amount/address/merchant mismatches, ownership, authenticated manual settlement and direct HTTP orders. No real charge is made and no merchant secrets are needed.

The automated tests do **not** establish a real Apple Wallet/PayPal sandbox end-to-end success. Complete that test after the merchant credentials, account capability and domain registration are supplied. A supplemental mobile Playwright smoke test could not run in the current work environment because the browser executable was absent and its download did not produce a valid archive; no visual browser verification is claimed.

Before opening sales, verify on the actual test deployment:

- Successful, declined and cancelled card/PayPal/Klarna test payments, including return without payment and delayed webhook delivery.
- Native Apple Pay in an eligible sandbox wallet: merchant validation, shipping-inclusive total, cancellation before authorization, provider rejection, lost capture response, reload/recovery and duplicate notifications. Test an unsupported device to confirm no unusable button appears.
- Vorkasse/invoice order replay, bank instructions, manual cancellation/settlement, receipt delivery and actual invoice workflow.
- Final real prices, stock, shipping/tax/return/legal information, verified merchant capabilities, production credentials/webhook endpoints, privacy text, backups and discount-code parity.

Official implementation references, reviewed 2026-11-02:

- [Stripe PayPal](https://docs.stripe.com/payments/paypal)
- [Stripe Klarna](https://docs.stripe.com/payments/klarna)
- [PayPal Apple Pay with JS SDK v6](https://developer.paypal.com/apple-pay/integrate)
- [PayPal JS SDK v6 reference](https://developer.paypal.com/sdk/js/reference/)
- [PayPal Apple Pay domain registration and sandbox setup](https://developer.paypal.com/v5/apple-pay/integrate)
- [Apple merchant validation](https://developer.apple.com/documentation/applepayontheweb/providing-merchant-validation)

## Railway

Project `de6df921-d696-42f3-8c53-393ae2b7b175`, production environment `04e543a6-7acb-4685-a086-2cfd1ac6a22b`, service `1e48bbc6-296c-4060-8a60-16703b423678`. Dockerfile uses Node 24; healthcheck `/health`; port 3000; persistent 500 MB volume at `/data`.
