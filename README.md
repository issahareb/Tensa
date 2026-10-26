# TENSA — Drop 001

Branding: TENSA wordmark. The slogan is intentionally not displayed.

Single-product launch shop for the washed-black zip hoodie. Public launch gate at `/`; authenticated owner preview at `/shop`; administration at `/studio`. Gate state and waitlist records live in SQLite and survive restarts when `/data` is mounted on a Railway volume. No payment processing is active.

## Run

Node 24+: `npm start`. Run integration tests with `npm test`. Copy `.env.example` values into the execution environment; never commit real credentials.

## Railway

Dockerfile and health check `/health` are ready. Mount a persistent volume at `/data` and set `DATA_DIR=/data`. Use a single replica for this SQLite deployment. Configure `PUBLIC_URL` to the final HTTPS origin and set a strong `ADMIN_PASSWORD` in Railway's variables UI. Do not share the password in chat. `/studio` supports preview, final price, gate release/closure and confirmed-subscriber CSV export. Releasing the gate does not send launch emails or activate checkout.

## Resend

Set `RESEND_API_KEY`, `MAIL_FROM` on a verified domain, `PUBLIC_URL`, `SHOP_OPERATOR` and `CONTACT_EMAIL`. Before these are present, signup saves a pending address with explicit consent and honestly states that confirmation is deferred. A queue retries confirmation delivery once configured (up to five attempts, 15 minutes apart). Explicit consent and a 24-hour email confirmation link are required. Confirmed subscribers receive a unique reserved 15% code in the database. Launch mailing and coupon redemption must be connected to the final commerce checkout before launch. No bulk launch mail has been sent.

Legal pages are draft placeholders pending the operator's details; finalize provider, retention, returns, shipping, taxes and contact details before accepting real subscribers or sales. Sizes XS–XL are illustrative. Price and stock are not invented.

## Assets and scroll

Higgsfield background job: `dbe74e6c-07b0-45ba-bf90-d0664390377d`, completed and integrated as `dist/assets/gate-atmosphere.webp`. Fonts are self-hosted.

User product references are visible in chat but not available as local files or Higgsfield media IDs. Upload widget has been opened for front/back/embroidery references. Do not invent or redraw the original print.

Prepared integration points:
- `private/front.webp`: faithful front product photograph.
- `private/back.webp`: faithful back photograph.
- `private/product-turn.mp4`: Higgsfield front-to-back rotation, static camera, dark backdrop. Seek-optimized encoding with frequent keyframes recommended. Server supports byte ranges.
- `dist/assets/reveal.webp`: user's upcoming elephant-with-sword artwork.

The circular loader supports mouse, touch and a keyboard-accessible reveal button. Revealed areas close automatically after 1.5 seconds. No sword artwork is fabricated: the TENSA wordmark is the reveal. The shop's pinned sequence seeks the video based on scroll, then shrinks and lifts it. Reduced-motion mode uses front/back stills. The film has NOT been generated yet; use confirmed uploaded references as Kling 3.0 start/end frames and inspect logo/backprint stability before integration. AI motion is not a certified physical simulation.

## Validation

Node API integration tests cover gate access, authentication, price validation, origin checks and truthful queued signup. Browser QA at 1440×1000 and 390×844 covers gate rendering, mobile overflow, waitlist queued state, admin preview, size selection and cart persistence. No browser JS errors in this pass. Real email delivery, payment, product film and Railway deployment remain pending external setup.

## Provisioned Railway target

Project: `de6df921-d696-42f3-8c53-393ae2b7b175`; production environment: `04e543a6-7acb-4685-a086-2cfd1ac6a22b`; service `tensa-web`: `1e48bbc6-296c-4060-8a60-16703b423678`.
A 500 MB volume is attached at `/data`. The domain is reserved at `https://tensa-web-production.up.railway.app`; a domain alone does not indicate a successful deployment. Runtime variables and a generated ADMIN_PASSWORD are stored in Railway; view or replace the password in the service Variables tab. Source repository: `issahareb/Tensa`, created by the owner. Railway is configured to follow `main` after connection.
