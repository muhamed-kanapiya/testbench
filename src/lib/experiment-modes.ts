import { experimentManifest, type Variant } from "./experiment";
import { FORMATS, type ExperimentMode, type FormatId, type Project } from "./studio-model";

export const MODES = {
  background: { label: "Background", variable: "Background concept", description: "Change the setting. Keep product, composition and message fixed.", fixed: ["Product", "Composition", "Message"], hypothesis: "A different background concept may change link click-through rate. Compare A/B/C within the same placement and format while keeping the product, message and targeting fixed." },
  composition: { label: "Product composition", variable: "Product position and scale", description: "Move and resize one product layer. Keep background, text and offer fixed.", fixed: ["Product source", "Background", "Message"], hypothesis: "Product position and scale may change link click-through rate. Compare these composition variants on the same background with identical messaging and targeting; this tests position and scale together." },
  headline: { label: "Headline", variable: "Artwork headline", description: "Try three headlines. Keep background, product, typography and CTA fixed.", fixed: ["Background", "Composition", "CTA"], hypothesis: "Different headline wording may change link click-through rate. Compare A/B/C within one placement and format, holding imagery, typography, CTA and targeting fixed." },
  cta: { label: "Call to action", variable: "Artwork CTA wording", description: "Try three calls to action on the image. Keep headline, imagery and button style fixed.", fixed: ["Background", "Composition", "Headline"], hypothesis: "Different artwork CTA wording may change link click-through rate. Compare A/B/C with identical imagery, headline, button geometry and targeting; keep the platform's native CTA constant." },
} as const;
export function switchMode(p: Project, mode: ExperimentMode): Project {
  if (p.test.mode === mode) return p;
  return { ...p, hypothesis: p.test.hypotheses[mode] || MODES[mode].hypothesis,
    test: { ...p.test, mode, hypotheses: { ...p.test.hypotheses, [p.test.mode]: p.hypothesis } } };
}
export function resolveVariant(p: Project, index: number) {
  const t = p.test, mode = t.mode;
  const background = mode === "background" ? p.variants[index] : p.variants.find(v => v.id === t.sharedBackground)!;
  const offer = { ...p.offer, headline: mode === "headline" ? t.headlines[index] : p.offer.headline, cta: mode === "cta" ? t.ctas[index] : p.offer.cta };
  const overlays = mode === "composition" ? { ...p.overlays, layout: "editorial" as const, badgeSide: "left" as const } : mode === "cta" ? { ...p.overlays, showCta: true } : p.overlays;
  const name = mode === "background" ? background.name : `${mode === "composition" ? "Composition" : mode === "headline" ? "Headline" : "CTA"} ${String.fromCharCode(65 + index)}`;
  const variant: Variant = { ...background, id: p.variants[index].id, name };
  return { variant, offer, overlays, composition: mode === "composition" ? t.compositions[index] : undefined,
    headlineAlternatives: mode === "headline" ? t.headlines : undefined, ctaAlternatives: mode === "cta" ? t.ctas : undefined };
}
export function modeIssue(p: Project): string | null {
  const mode = p.test.mode;
  if (mode === "headline" || mode === "cta") {
    const values = mode === "headline" ? p.test.headlines : p.test.ctas;
    if (values.some(v => !v.trim())) return `Fill all three ${mode === "headline" ? "headlines" : "calls to action"} before export.`;
    if (new Set(values.map(v => v.toLowerCase().replace(/\s+/g, " ").trim())).size < 3) return `Make A/B/C different. Edit the ${mode === "headline" ? "headlines" : "CTA wording"} or generate alternatives.`;
  }
  if (mode === "composition" && new Set(p.test.compositions.map(c => `${c.x}:${c.scale}`)).size < 3) return "Give A/B/C different product positions or sizes before exporting.";
  return null;
}
export function modeFilename(p: Project, index: number, format: FormatId) {
  return `${FORMATS[format].label.replace(":", "x")}/variant-${String.fromCharCode(65 + index)}-${p.test.mode}.png`;
}
export function modeManifest(p: Project) {
  const legacy = experimentManifest(p.offer, p.variants, p.productSource, p.hypothesis);
  const mode = p.test.mode;
  return {
    schemaVersion: 3, name: `${p.offer.brand} — ${MODES[mode].label.toLowerCase()} experiment`, createdAt: new Date().toISOString(),
    mode, variable: MODES[mode].variable, hypothesis: p.hypothesis, formats: FORMATS,
    controlled: ["Product source image", "Brand and logo", "Supporting copy", "Offer badges and prices", "Post caption", "Native placement CTA", "Canvas dimensions within each format",
      ...(mode !== "background" ? ["Background image"] : []), ...(mode !== "composition" ? ["Product position and scale"] : []),
      ...(mode !== "headline" ? ["Headline"] : ["Headline font size and text region within each format"]), ...(mode !== "cta" ? ["Artwork CTA"] : ["Artwork CTA button size, color and position"])],
    sharedBackground: mode === "background" ? null : p.test.sharedBackground,
    offer: p.offer, overlays: { ...resolveVariant(p, 0).overlays, logo: p.overlays.logo ? "logo.png" : null }, caption: p.caption, productSource: p.productSource,
    variants: p.variants.map((_, i) => { const r = resolveVariant(p, i); return { variant: String.fromCharCode(65 + i), name: r.variant.name,
      background: { id: mode === "background" ? p.variants[i].id : p.test.sharedBackground, source: r.variant.source === "meta" ? "Generated with Meta Muse Image" : "Pre-generated illustrative example", prompt: r.variant.source === "meta" ? r.variant.prompt : undefined },
      offer: r.offer, composition: r.composition || { layout: r.overlays.layout },
      wordingSource: mode === "headline" ? p.test.headlineSources[i] : mode === "cta" ? p.test.ctaSources[i] : "shared",
      files: (Object.keys(FORMATS) as FormatId[]).map(f => modeFilename(p, i, f)) }; }),
    testPlan: { ...legacy.testPlan, interpretation: mode === "composition" ? "Tests product position and scale together, not their separate effects." : mode === "background" ? legacy.testPlan.interpretation : `Tests ${MODES[mode].variable.toLowerCase()} only. Keep other artwork and native placement settings fixed.` },
    adaptation: "Backgrounds are cropped. Layers recompose consistently within each format; compare A/B/C within the same placement and format.",
    preview: "Placement frames and guides are simulations and excluded from PNGs. The native platform CTA and caption remain shared. Review final placement in Ads Manager.",
  };
}
