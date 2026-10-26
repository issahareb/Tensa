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

`private/shop.html`, `dist/shop.css`, `dist/shop.js`, `dist/zip-sequence.js`. Desktop scroll controls the sequence; touch dragging the zipper also advances document scroll. The hoodie translates upwards by 30% of its rendered size. The handle's travel is calculated from the source slider positions minus that translation, keeping it under the finger. Reverse dragging and keyboard arrows/Home/End work. Browser toolbar height changes do not cancel a touch drag; width/orientation changes remeasure the scene. Reduced motion uses the static product image and a normal document flow.

Higgsfield Kling 3.0 Pro generation `bbe00c61-e30c-464b-953b-e3ea2e0dbb22`. Source frames 15–134 become 120 WebP frames at 960px and 640px. `dist/assets/shop/zip/manifest.json` contains the measured monotonic slider positions, mapping physical displacement to frames. A bounded decoded-frame cache (24 mobile / 32 desktop) and neighboring-frame blending avoid video seeking; sparse anchors provide fallback during fast jumps. A single compressed frame pack is loaded before interaction (about 1.2 MB mobile / 2.4 MB desktop), so scrubbing needs no per-frame network requests. Individual WebP requests remain the fallback if that transfer fails. This is generated product imagery, not a cloth or mechanical simulation. The zipper ends near the lower stop without pulling the jacket halves apart. The original film is archived locally at `/workspace/scratch/shop-zip/source.mp4`. Rebuild frame files with `node production/build-zip-sequence.mjs /path/to/source.mp4`.

## Railway

Project `de6df921-d696-42f3-8c53-393ae2b7b175`, production environment `04e543a6-7acb-4685-a086-2cfd1ac6a22b`, service `1e48bbc6-296c-4060-8a60-16703b423678`. Dockerfile uses Node 24; healthcheck `/health`; port 3000; persistent 500 MB volume at `/data`.
