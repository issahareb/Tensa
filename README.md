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

`/studio` supports password login, price, gate release/closure and confirmed-subscriber CSV export. The password is held in Railway variables as `ADMIN_PASSWORD`; view or replace it there. `/studio/light` previews the gate. `/shop` is an explicitly public preview; `/gate` is the prelaunch landing page. `/` redirects to `/gate` until owner release, then to `/shop`. Legacy `/product-media/*` remains protected. The shop includes a Higgsfield zipper sequence, gallery and zoom, provisional XS–XL sizes, 100% cotton information supplied by the owner, and a locally saved Bag. Prices are read from owner settings or shown as “Preis folgt”. The Bag is a saved selection, not a reservation; checkout remains pending. Releasing the gate alone does not send launch mail or activate payments.

## Zipper interaction

`private/shop.html`, `dist/shop.css`, `dist/shop.js`, `dist/zip-sequence.js`. The finger directly owns progress during a touch gesture; scroll events cannot feed back into it. Geometry stays fixed until release if browser chrome resizes. Desktop scroll uses the same progression. The renderer draws into a fixed viewport canvas and aligns each frame's tracked pull to the touch target. It presents decoded frames only toward the requested position, never alternating earlier/later fallback frames, and never blends two metal-pull positions. The canvas is not reset when its dimensions have not changed.

Higgsfield Kling 3.0 macro generation `80bdcadd-a08e-46c1-8bf3-9c9a0500d814`, requested in 4k mode; delivered 2880 × 2880 at 24 fps. The new film contains the zoom and sharply resolved final hardware instead of enlarging the old full-garment footage. Source frames 0–264 at step 2 become 133 WebP frames. Desktop uses 1600px frames; mobile uses 960px frames and a dedicated 1600px final hold image. A single compressed pack is loaded before interaction (6.3 MB mobile / 18.2 MB desktop); the server streams these files with bounded memory. Individual files are the fallback. The decoded cache is limited to 14 mobile / 18 desktop images, retaining the current presentation and end anchors. `dist/assets/shop/zip-macro/manifest.json` records smoothed per-frame tracking coordinates.

Zipper travel and zoom finish at 78% of the sticky section. The last 22% is a stationary macro hold: the same frame, scale and anchor remain unchanged. The product section follows the entire sticky section with no overlapping negative margin, so it appears only after further input. Dragging past the stop continues document scroll. Reduced motion uses a static photo and ordinary page flow.

Original film: `/workspace/scratch/zip-macro/source.mp4`. Rebuild with `node production/build-zip-sequence.mjs /path/to/macro-source.mp4`. Tracking diagnostics are archived in `production/source/zip-macro-tracking.json`. This remains generated product imagery, not a physical cloth/mechanical simulation.

## Railway

Project `de6df921-d696-42f3-8c53-393ae2b7b175`, production environment `04e543a6-7acb-4685-a086-2cfd1ac6a22b`, service `1e48bbc6-296c-4060-8a60-16703b423678`. Dockerfile uses Node 24; healthcheck `/health`; port 3000; persistent 500 MB volume at `/data`.
