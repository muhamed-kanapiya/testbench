import { CONCEPTS, DEFAULT_OFFER, type Offer, type Variant } from "./experiment";

export const FORMATS = {
  portrait: { label: "4:5", name: "Portrait", width: 1080, height: 1350 },
  square: { label: "1:1", name: "Square", width: 1080, height: 1080 },
  story: { label: "9:16", name: "Story", width: 1080, height: 1920 },
} as const;
export type FormatId = keyof typeof FORMATS;
export type Placement = "instagram" | "facebook" | "stories";
export type ExperimentMode = "background" | "composition" | "headline" | "cta";
export type ProductComposition = { x: number; scale: number };
export type TestSettings = {
  mode: ExperimentMode; sharedBackground: Variant["id"];
  compositions: ProductComposition[]; headlines: string[]; ctas: string[];
  headlineSources: string[]; ctaSources: string[];
  hypotheses: Partial<Record<ExperimentMode, string>>;
};
export function defaultTest(offer: Offer): TestSettings {
  return { mode: "background", sharedBackground: "studio", compositions: [{ x: 45, scale: 90 }, { x: 60, scale: 75 }, { x: 75, scale: 100 }],
    headlines: [offer.headline, offer.headline, offer.headline], ctas: [offer.cta, offer.cta, offer.cta],
    headlineSources: ["original", "original", "original"], ctaSources: ["original", "original", "original"], hypotheses: {} };
}
export type Overlays = {
  logo: string; accent: string; ink: string; layout: "editorial" | "split";
  badge: string; salePrice: string; oldPrice: string; benefit: string;
  showBadge: boolean; showPrice: boolean; showBenefit: boolean; showCta: boolean;
  scale: number; badgeSide: "left" | "right";
};
export const DEFAULT_OVERLAYS: Overlays = {
  logo: "", accent: "#4454e8", ink: "#252635", layout: "editorial",
  badge: "", salePrice: "", oldPrice: "", benefit: "",
  showBadge: false, showPrice: false, showBenefit: false, showCta: true,
  scale: 100, badgeSide: "right",
};
export type Project = {
  version: 3; offer: Offer; variants: Variant[]; product: string; productSource: string;
  productLabel: string; approved: boolean; hypothesis: string; overlays: Overlays;
  format: FormatId; caption: string; test: TestSettings;
};
export function newProject(): Project {
  return {
    version: 3, offer: { ...DEFAULT_OFFER }, variants: CONCEPTS.map(v => ({ ...v })), test: defaultTest(DEFAULT_OFFER),
    product: "/assets/product.png", productSource: "Illustrative example product", productLabel: "bottle", approved: true,
    hypothesis: "An everyday setting may help people picture the product in their own routine. Compare link click-through rate across these three background concepts.",
    overlays: { ...DEFAULT_OVERLAYS }, format: "portrait", caption: "A little more feel-good. Find your everyday ritual with morrow.",
  };
}
const imageAllowed = (v: unknown) => typeof v === "string" && (v.startsWith("/assets/") || /^data:image\/(png|jpeg|webp);base64,/.test(v));
function isSavedBase(value: unknown): value is Project {
  if (!value || typeof value !== "object") return false;
  const p = value as Project;
  return [2, 3].includes(p.version) && !!p.offer && ["brand", "headline", "price", "cta"].every(k => typeof p.offer[k as keyof Offer] === "string")
    && Array.isArray(p.variants) && p.variants.length === 3 && CONCEPTS.every((v, i) => p.variants[i].id === v.id && imageAllowed(p.variants[i].image) && typeof p.variants[i].prompt === "string")
    && imageAllowed(p.product) && typeof p.productSource === "string" && typeof p.productLabel === "string" && typeof p.approved === "boolean" && typeof p.hypothesis === "string" && typeof p.caption === "string"
    && Object.hasOwn(FORMATS, p.format) && !!p.overlays && ["editorial", "split"].includes(p.overlays.layout)
    && ["badge", "salePrice", "oldPrice", "benefit"].every(k => typeof p.overlays[k as keyof Overlays] === "string")
    && ["showBadge", "showPrice", "showBenefit", "showCta"].every(k => typeof p.overlays[k as keyof Overlays] === "boolean")
    && /^#[0-9a-f]{6}$/i.test(p.overlays.accent) && /^#[0-9a-f]{6}$/i.test(p.overlays.ink)
    && Number.isFinite(p.overlays.scale) && p.overlays.scale >= 80 && p.overlays.scale <= 120
    && ["left", "right"].includes(p.overlays.badgeSide) && (p.overlays.logo === "" || imageAllowed(p.overlays.logo));
}
export function isProject(value: unknown): value is Project {
  if (!isSavedBase(value) || value.version !== 3) return false;
  const t = value.test;
  return !!t && ["background", "composition", "headline", "cta"].includes(t.mode) && CONCEPTS.some(v => v.id === t.sharedBackground)
    && Array.isArray(t.compositions) && t.compositions.length === 3 && t.compositions.every(c => c && Number.isFinite(c.x) && c.x >= 45 && c.x <= 75 && Number.isFinite(c.scale) && c.scale >= 65 && c.scale <= 100)
    && [t.headlines, t.ctas, t.headlineSources, t.ctaSources].every(a => Array.isArray(a) && a.length === 3 && a.every(v => typeof v === "string"))
    && t.headlines.every(v => v.length <= 70) && t.ctas.every(v => v.length <= 24)
    && !!t.hypotheses && typeof t.hypotheses === "object" && Object.values(t.hypotheses).every(v => typeof v === "string");
}
export function migrateProject(value: unknown): Project | null {
  if (!isSavedBase(value)) return null;
  if ((value as { version: number }).version === 2) return { ...value, version: 3, test: defaultTest(value.offer) };
  return isProject(value) ? value : null;
}

// Composition guides, not official placement specifications or approval checks.
export function guideInsets(format: FormatId) {
  return format === "story" ? { top: 14, bottom: 28, side: 6 } : { top: 4, bottom: 4, side: 5 };
}
export function creativeFilename(index: number, variant: Variant, format: FormatId) {
  return `${FORMATS[format].label.replace(":", "x")}/variant-${String.fromCharCode(65 + index)}-${variant.id}.png`;
}
