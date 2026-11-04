export type ConceptId = "studio" | "home" | "nature";
export type Offer = { brand: string; headline: string; price: string; cta: string };
export type Variant = {
  id: ConceptId;
  name: string;
  description: string;
  color: string;
  image: string;
  prompt: string;
  source: "example" | "meta";
};

export const DEFAULT_OFFER: Offer = {
  brand: "morrow",
  headline: "A little more\nfeel-good.",
  price: "Your daily ritual, reimagined.",
  cta: "Find your ritual",
};

export const CONCEPTS: Variant[] = [
  { id: "studio", name: "The studio", description: "Clean, focused, considered.", color: "#ded9f2", image: "/assets/background-studio.png", source: "example", prompt: "A minimal pale lavender seamless photography studio with a continuous flat matte surface flowing into a curved cyclorama wall. Tactile lilac plaster, soft side light. No pedestal, no raised platforms, no props, no visible table edges." },
  { id: "home", name: "At home", description: "A place in their everyday.", color: "#d5e7ef", image: "/assets/background-home.png", source: "example", prompt: "A contemporary home bathroom with a powder-blue ceramic tiled shelf, light sky-blue wall, soft natural window light, tiny cropped pale linen towel at extreme edge. Inviting everyday context." },
  { id: "nature", name: "Outside", description: "A fresh frame of reference.", color: "#efdfd3", image: "/assets/background-nature.png", source: "example", prompt: "A sun-washed pale peach stone ledge in a minimal Mediterranean botanical setting, pale apricot plaster backdrop, delicate olive branch at far upper right, subtle soft leaf shadows at edge, natural editorial atmosphere." },
];

export function experimentManifest(offer: Offer, variants: Variant[], productSource: string, hypothesis: string) {
  return {
    name: `${offer.brand || "Product"} — background experiment`,
    createdAt: new Date().toISOString(),
    format: { width: 1080, height: 1350, aspectRatio: "4:5" },
    variable: "Background concept", hypothesis,
    controlled: ["Product layer", "Product position and size", "Headline", "Supporting copy", "CTA", "Typography", "Canvas dimensions"],
    offer,
    productSource,
    variants: variants.map((v, i) => ({ variant: String.fromCharCode(65 + i), concept: v.name, source: v.source === "meta" ? "Generated with Meta Muse Image" : "Pre-generated illustrative example", filename: `variant-${String.fromCharCode(65 + i)}-${v.id}.png`, prompt: v.source === "meta" ? v.prompt : undefined })),
    testPlan: {
      primaryMetric: "Link click-through rate (link clicks / impressions)",
      downstreamMetric: "Landing-page conversions, if tracking is available",
      setup: "Use a randomized split test. Keep targeting, placements, destination, schedule and optimization goal consistent. Ordinary ad delivery can allocate impressions unevenly.",
      decision: "Choose duration and sample size before launch. Report insufficient evidence when results are inconclusive. Do not infer a winning variant from these images alone.",
      interpretation: "This tests the complete background concept. It does not isolate the individual effects of colour, lighting or props.",
    },
  };
}

export function safeFileStem(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-|-$/g, "").slice(0, 50) || "testbench";
}

export function validateOffer(offer: Offer): string | null {
  if (!offer.brand.trim()) return "Add a brand or product name.";
  if (!offer.headline.trim()) return "Add a headline for your ads.";
  if (!offer.cta.trim()) return "Add a call to action.";
  if (offer.brand.length > 28 || offer.headline.length > 70 || offer.price.length > 65 || offer.cta.length > 24) return "Shorten the copy to fit the ad layouts.";
  return null;
}
