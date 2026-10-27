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

## Checkout setup (Stripe)

`server/checkout.mjs` uses hosted Stripe Checkout. Card checkout includes Apple Pay / Google Pay when enabled in the merchant account and supported by the customer's browser/wallet; the storefront never draws a fake wallet payment button. Payment badges describe intended methods while setup is incomplete.

Sales require all of:

- `CHECKOUT_ENABLED=true`, owner gate released and final positive EUR price.
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_SHIPPING_RATE_ID` and HTTPS `PUBLIC_URL`.
- `SHOP_OPERATOR`, `CONTACT_EMAIL`, `SHOP_SHIPPING_TEXT`, `SHOP_RETURNS_TEXT`.
- `SHOP_STOCK_JSON` with final quantities for all five sizes, e.g. `{"XS":0,"S":0,"M":0,"L":0,"XL":0}`. Values seed SQLite only once; redeploys never reset sold stock. Do not use this example as actual inventory. Final sizes must be confirmed before selling.
- `SHIPPING_COUNTRIES` (default DE); `SHOP_SIZE_GUIDE` for final measurements. Configure tax treatment, shipping rates, payment methods, receipts and policies in Stripe before enabling sales.

Register `/api/checkout/webhook` in Stripe for `checkout.session.completed`, `checkout.session.expired`, `checkout.session.async_payment_succeeded` and `checkout.session.async_payment_failed`. Use test keys and a test webhook first. Do not put keys in client code or Git.

The server owns prices, validates cart quantities/sizes, atomically reserves stock, and uses Stripe idempotency keys. The browser retains its checkout key across navigation. A verified paid webhook confirms the local order; the success URL alone does not. Expired sessions return stock exactly once. Paid order/size/quantity records are in SQLite `checkouts`; customer/shipping/payment details are in the Stripe Dashboard for fulfillment. No payment card data is stored by TENSA.

An ambiguous network error keeps its reservation and retries with the same Stripe key. Rare pending sessions without a returned session id must be reconciled with Stripe metadata `tensa_checkout` before manually releasing stock; never restore stock blindly after a timeout. Use one Railway replica and back up the persistent volume.

Stripe promotion-code entry is enabled. The prelaunch 15% subscriber codes are not automatically provisioned into Stripe yet; create/sync those codes before mailing the launch offer. No live account, charge, refund, fulfillment or launch mailing has been triggered by this implementation.

## Railway

Project `de6df921-d696-42f3-8c53-393ae2b7b175`, production environment `04e543a6-7acb-4685-a086-2cfd1ac6a22b`, service `1e48bbc6-296c-4060-8a60-16703b423678`. Dockerfile uses Node 24; healthcheck `/health`; port 3000; persistent 500 MB volume at `/data`.
