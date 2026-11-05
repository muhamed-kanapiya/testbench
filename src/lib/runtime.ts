export const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "";
export const REPOSITORY_URL = "https://github.com/muhamed-kanapiya/testbench";
export const API_SETUP_URL = REPOSITORY_URL + "#run-locally-with-your-own-meta-api-key";
export function assetPath(path: string) { return BASE_PATH + path; }

// Curated examples, never presented as a live model response.
export function sampleWording(mode: "headline" | "cta", baseline: string): string[] {
  const samples = mode === "headline"
    ? ["Make room for your ritual.", "Your everyday, reimagined.", "A moment for yourself."]
    : ["Explore the collection", "Meet your daily ritual", "Discover morrow"];
  const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
  return [baseline, ...samples.filter(s => normalize(s) !== normalize(baseline)).slice(0, 2)];
}
