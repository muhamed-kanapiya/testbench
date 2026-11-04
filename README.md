# TestBench

A creative experiment studio for the Meta AI Developer Hackathon. Choose background, product composition, headline or artwork CTA; compare three variants while holding the other elements fixed.


![TestBench placement studio](docs/studio-preview.jpg)

## Hackathon entry

Built for **Build for Your World** in the Meta AI Developer Hackathon. TestBench prepares comparable ad creatives and an experiment brief for performance marketers and small brands. The working prototype includes four experiment modes, placement previews and a nine-image campaign export.

- **Start with the included example:** explore editing, placement previews and export locally.
- **Connect Meta Model API:** add your own server-side key to use SAM segmentation, Muse Image backgrounds and Muse Spark copy and hypotheses.
- **Review the result:** the app prepares assets for a campaign test. It does not run ads or estimate performance.

## Run locally

Requires Node.js 22.9 or newer.

```sh
npm install
```

Create `.env.local` from `.env.example` and set `MODEL_API_KEY` to your Meta Model API key. Never put the key in a `NEXT_PUBLIC_` variable or commit it.

```sh
npm run dev
```

Open the Local URL printed by Next.js. The landing page is `/`; the editor is `/studio`.

```sh
npm run typecheck
npm run build
npm start
```

If your network uses a Windows-trusted inspection certificate, provide the trusted CA bundle with `NODE_EXTRA_CA_CERTS` when starting Node. Certificate verification remains enabled.

## Product flow

1. Use the illustrative Morrow product or upload a PNG, JPG or WebP (up to 10 MB and 25 megapixels).
2. For an opaque photo, describe the visible object with a simple noun such as `bottle`, `box` or `shoe`. SAM 3.1 segments the largest match. A transparent PNG keeps its existing alpha channel.
3. Review and approve the cutout. The exact same source layer is used in all three variants. Position and scale stay fixed except in composition tests.
4. Enter brand, headline, supporting line and CTA.
5. Choose an experiment. Generate three backgrounds with Muse Image; adjust product position and size; or generate headline/CTA alternatives with Muse Spark. For wording tests, A is your baseline and B/C are suggestions you can edit. Composition and wording tests use one shared background. Headline font size and CTA button geometry stay identical across A/B/C within each format.
6. Add a logo, badge, price, previous price, benefit line and branded CTA in the Overlays panel. Choose editorial or split composition. Offer details are user-supplied and shared by all variants.
7. Switch between 4:5, 1:1 and 9:16. Backgrounds are cropped, while layers adapt consistently within each format according to the selected experiment. This version does not outpaint backgrounds.
8. Inspect fixed layers, toggle the composition guide, and view Instagram Feed, Facebook Feed or Stories simulations. Interface elements and guides are not included in the exported artwork.
9. Download one PNG in the selected format or export the nine-creative campaign kit.

The ZIP contains three PNGs each at 1080 × 1350, 1080 × 1080 and 1080 × 1920, the product cutout, optional logo, an experiment JSON manifest with product SHA-256, variable, per-variant copy/transform, overlay settings, caption and asset provenance, and a short test setup guide. Blank/repeated wording, repeated composition presets and text overflow block export with an actionable message. The landing page links directly to each mode through `/studio?test=background`, `composition`, `headline` or `cta`.

## Integration

- `sam-3.1`: image segmentation over streaming Responses API; official `@meta-sam/parser` decodes the masks.
- `muse-image-1.0`: background generation, separate from the fixed foreground product.
- `muse-spark-1.3`: headline/CTA alternatives and an editable, uncertain and testable experiment hypothesis.
- Canvas: deterministic product/copy composition and PNG rendering.
- Server-side credentials, image limits, same-origin checks and an in-process request limit.

The API base is `https://api.meta.ai/v1`. All requests use Standard model IDs. API response storage is disabled in application requests.

## Scope and interpretation

This prototype prepares creative experiments. It does not run ads, predict CTR, declare a winner or prove statistical significance. Use a randomized split test with consistent targeting, placements and schedule. A complete background concept can change colour, light and props together; results cannot isolate those subcomponents. Composition tests vary position and scale together, not their individual effects. They use a shared editorial layout with a left badge to reserve product space. CTA tests change the wording inside the artwork; native placement CTA and post caption remain shared. Review generated wording before use.

One current project is autosaved in this browser and origin using IndexedDB, including product, logo, generated backgrounds and all mode settings. Version 2 drafts migrate to version 3 while retaining their assets and overlays. Switching modes preserves variants and individual hypotheses. Wait for “Saved in this browser” before closing. Undo keeps up to 25 recent changes in the current editing session; its history is not persisted. Editing the project in multiple tabs is not supported. Clearing browser data removes the draft; export for a separate copy. Storage errors are displayed and never represented as a successful save. The app has no accounts, cross-device sync or hosted storage. The included dev/start commands bind to loopback; public hosting and access control have not been configured.

Placement frames are simulations, not official Meta previews. Composition guides are design margins, not platform policy specifications or approval guarantees. Check the final placement in Ads Manager. Compare A/B/C within the same placement and format so format changes do not confound the experiment. The Stories frame is a static image preview; the app does not export video or Reels.

## Demo assets

The Morrow brand and product are fictional. Included example images were created with the built-in imagegen tool, not returned by a live Meta request. The studio and exports explicitly distinguish examples from Meta-generated backgrounds. See `ASSETS.md` for the asset briefs and paths.

## Verified

TypeScript and optimized production build; live SAM product extraction; live Muse Image generation of three backgrounds; live Muse Spark hypothesis; browser editing and ZIP export. The exported PNGs were checked at 1080 × 1350 and the shared product interior compared across variants with tolerance for source alpha compositing.

Placement studio checks: draft restoration after reload (including generated backgrounds and overlay values), Undo, PNG logo upload, editorial/split compositions, Instagram/Facebook/Stories previews, mobile layout, overlong-headline export rejection, and a nine-image ZIP with dimensions and product SHA-256 verified. Product-core RGB differences across backgrounds stay within the source alpha-compositing bound. Exact final RGB equality is not expected for partially transparent product pixels.

Experiment mode checks: v2 draft migration, variable isolation, duplicate rejection, hypothesis preservation, live Meta headline and CTA generation, and all three new modes exported in all three formats. Pixel comparison of the actual exported PNGs found zero differences outside the selected variable region. CTA button bounds remain identical; source product SHA-256 and shared background are verified in each ZIP.


## Contact

Built by **Muhamed-Kanapiya Zhaksylyk**.

- [Telegram](https://t.me/muhamed_kanapiya)
- [Email](mailto:muhamedkanapiya@gmail.com)
