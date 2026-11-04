import type { Offer, Variant } from "./experiment";
import { DEFAULT_OVERLAYS, FORMATS, type FormatId, type Overlays, type ProductComposition } from "./studio-model";

export const WIDTH = 1080;
export const HEIGHT = 1350;
const cache = new Map<string, Promise<HTMLImageElement>>();
export function loadImage(src: string): Promise<HTMLImageElement> {
  const existing = cache.get(src); if (existing) return existing;
  const promise = new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image(); image.onload = () => resolve(image);
    image.onerror = () => { cache.delete(src); reject(new Error("An image could not be loaded. Try again.")); }; image.src = src;
  });
  if (cache.size > 16) cache.delete(cache.keys().next().value!);
  cache.set(src, promise); return promise;
}
export type RenderOptions = { format?: FormatId; overlays?: Overlays; isolate?: boolean; composition?: ProductComposition; headlineAlternatives?: string[]; ctaAlternatives?: string[] };
export type RenderReport = { issues: string[] };
export function contrastInk(hex: string) {
  const rgb = hex.slice(1).match(/../g)!.map(v => parseInt(v, 16) / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4);
  return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722 > .179 ? "#171821" : "#ffffff";
}
function cover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, width: number, height: number) {
  const scale = Math.max(width / img.width, height / img.height);
  ctx.drawImage(img, (width - img.width * scale) / 2, (height - img.height * scale) * .75, img.width * scale, img.height * scale);
}
function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const result: string[] = [];
  for (const paragraph of text.split("\n").filter(p => p.trim())) {
    let line = "";
    for (const word of paragraph.trim().split(/\s+/)) {
      const next = line ? `${line} ${word}` : word;
      if (ctx.measureText(next).width <= maxWidth) { line = next; continue; }
      if (line) { result.push(line); line = ""; }
      for (const letter of Array.from(word)) {
        if (ctx.measureText(line + letter).width > maxWidth && line) { result.push(line); line = letter; } else line += letter;
      }
    }
    if (line) result.push(line);
  }
  return result;
}
function fitTextSize(ctx: CanvasRenderingContext2D, text: string, width: number, height: number, initialSize: number, minSize: number, family: string, weight: number) {
  let size = initialSize, rows: string[] = [];
  do { ctx.font = `${weight} ${size}px "${family}", sans-serif`; rows = wrap(ctx, text, width); if (rows.length * size * 1.12 <= height) break; size -= 2; } while (size >= minSize);
  return Math.max(minSize, size);
}
function textBlock(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, width: number, height: number, initialSize: number, minSize: number, family: string, weight: number, issues: string[], name: string) {
  const size = fitTextSize(ctx, text, width, height, initialSize, minSize, family, weight);
  ctx.font = `${weight} ${size}px "${family}", sans-serif`;
  const rows = wrap(ctx, text, width);
  if (rows.length * size * 1.12 > height) issues.push(`${name} is too long for this composition. Shorten it before export.`);
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, width, height); ctx.clip();
  rows.forEach((line, index) => ctx.fillText(line, x, y + index * size * 1.12)); ctx.restore();
}
function pill(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, width: number, height: number, fill: string, ink: string, size: number) {
  ctx.fillStyle = fill; ctx.beginPath(); ctx.roundRect(x, y, width, height, height / 2); ctx.fill();
  ctx.fillStyle = ink; ctx.font = `600 ${size}px "Instrument Sans", sans-serif`;
  while (ctx.measureText(text).width > width - 30 && size > 16) { size -= 1; ctx.font = `600 ${size}px "Instrument Sans", sans-serif`; }
  ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(text, x + width / 2, y + height / 2); ctx.textAlign = "left"; ctx.textBaseline = "top";
}
export async function renderCreative(canvas: HTMLCanvasElement, product: string, variant: Variant, offer: Offer, options: RenderOptions = {}): Promise<RenderReport> {
  const format = options.format || "portrait", o = options.overlays || DEFAULT_OVERLAYS;
  const { width, height } = FORMATS[format];
  const [background, productImage, logo] = await Promise.all([loadImage(variant.image), loadImage(product), o.logo ? loadImage(o.logo) : Promise.resolve(null), document.fonts.ready]);
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext("2d"); if (!ctx) throw new Error("Your browser does not support image rendering.");
  const issues: string[] = [];
  if (options.isolate) {
    ctx.fillStyle = "#f5f5fa"; ctx.fillRect(0, 0, width, height); ctx.fillStyle = "#e7e7f1";
    for (let x = 0; x < width; x += 36) for (let y = 0; y < height; y += 36) if ((x / 36 + y / 36) % 2 === 0) ctx.fillRect(x, y, 36, 36);
  } else cover(ctx, background, width, height);
  const story = format === "story", square = format === "square", split = o.layout === "split";
  const top = story ? 300 : 60;
  const base = story ? 1220 : square ? 875 : 1110;
  const maxProductHeight = story ? 520 : square ? 480 : 680;
  // Only the composition experiment may change this product transform.
  const scale = Math.min((options.composition ? 300 : split ? 430 : 420) / productImage.width, maxProductHeight / productImage.height) * (options.composition ? options.composition.scale / 100 : 1);
  const pw = productImage.width * scale, ph = productImage.height * scale;
  const center = options.composition ? width * options.composition.x / 100 : split ? 775 : 540, px = center - pw / 2, py = base - ph;
  ctx.save(); ctx.filter = "blur(19px)"; ctx.fillStyle = "rgba(28,26,52,0.14)";
  ctx.beginPath(); ctx.ellipse(center, base - 5, pw * .39, 23, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  ctx.drawImage(productImage, px, py, pw, ph);
  ctx.fillStyle = o.ink; ctx.textBaseline = "top";
  if (logo) { const s = Math.min(195 / logo.width, 60 / logo.height); ctx.drawImage(logo, 76, top - 7, logo.width * s, logo.height * s); }
  else { ctx.font = '600 31px "Instrument Sans", sans-serif'; ctx.fillText(offer.brand, 76, top); }
  const titleY = top + (split ? 120 : 80), titleHeight = split ? 270 : square ? 160 : 185;
  const headlineSize = options.headlineAlternatives ? Math.min(...options.headlineAlternatives.map(text => fitTextSize(ctx, text, split ? 440 : 910, titleHeight, square ? 68 : 78, 38, "Bricolage Grotesque", 600))) : square ? 68 : 78;
  textBlock(ctx, offer.headline, 72, titleY, split ? 440 : 910, titleHeight, headlineSize, options.headlineAlternatives ? headlineSize : 38, "Bricolage Grotesque", 600, issues, "Headline");
  textBlock(ctx, offer.price, 76, titleY + titleHeight + 16, split ? 425 : 910, 80, 27, 22, "Instrument Sans", 400, issues, "Supporting line");
  const overlayScale = o.scale / 100;
  if (o.showBadge && o.badge.trim()) {
    const badgeWidth = 215 * overlayScale, badgeHeight = 72 * overlayScale;
    const badgeX = o.badgeSide === "left" ? 72 : width - 72 - badgeWidth;
    const badgeY = split ? (o.badgeSide === "left" ? base - 245 : top + 50) : top + (square ? 315 : 355);
    pill(ctx, o.badge, badgeX, badgeY, badgeWidth, badgeHeight, o.accent, contrastInk(o.accent), 31 * overlayScale);
  }
  if (o.showPrice && o.salePrice.trim()) {
    const priceY = base - (o.oldPrice.trim() ? 130 : 95);
    ctx.fillStyle = o.ink;
    textBlock(ctx, o.salePrice, 76, priceY, 220, 75, 50 * overlayScale, 25, "Bricolage Grotesque", 600, issues, "Price");
    if (o.oldPrice.trim()) {
      ctx.font = '400 27px "Instrument Sans", sans-serif'; ctx.fillText(o.oldPrice, 78, priceY + 70, 210);
      ctx.strokeStyle = o.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(78, priceY + 84); ctx.lineTo(78 + Math.min(210, ctx.measureText(o.oldPrice).width), priceY + 84); ctx.stroke();
    }
  }
  if (o.showBenefit && o.benefit.trim()) {
    ctx.fillStyle = o.ink;
    textBlock(ctx, o.benefit, 76, base + 25, 910, 42, 27 * overlayScale, 22, "Instrument Sans", 500, issues, "Benefit");
  }
  if (o.showCta) {
    ctx.font = '600 27px "Instrument Sans", sans-serif';
    const buttonWidth = Math.min(800, Math.max(245, ...((options.ctaAlternatives || [offer.cta]).map(text => ctx.measureText(text).width + 64))));
    pill(ctx, offer.cta, 76, base + 82, buttonWidth, 70, o.accent, contrastInk(o.accent), 27);
  }
  return { issues };
}
export async function creativeBlob(product: string, variant: Variant, offer: Offer, options: RenderOptions = {}) {
  const canvas = document.createElement("canvas");
  const report = await renderCreative(canvas, product, variant, offer, options);
  if (report.issues.length) throw new Error(`${FORMATS[options.format || "portrait"].label}: ${report.issues[0]}`);
  return new Promise<Blob>((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("PNG export failed.")), "image/png"));
}
export function saveBlob(blob: Blob, name: string) {
  const href = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = href; anchor.download = name; anchor.click();
  setTimeout(() => URL.revokeObjectURL(href), 1000);
}
export async function prepareLogo(file: File) {
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > 3 * 1024 * 1024) throw new Error("Choose a PNG, JPG or WebP logo smaller than 3 MB.");
  const src = URL.createObjectURL(file);
  try {
    const image = await loadImage(src); if (image.width * image.height > 25_000_000) throw new Error("Choose a smaller logo image.");
    const canvas = document.createElement("canvas"), scale = Math.min(1, 600 / Math.max(image.width, image.height));
    canvas.width = Math.max(1, Math.round(image.width * scale)); canvas.height = Math.max(1, Math.round(image.height * scale));
    canvas.getContext("2d")!.drawImage(image, 0, 0, canvas.width, canvas.height); return canvas.toDataURL("image/png");
  } finally { URL.revokeObjectURL(src); cache.delete(src); }
}
