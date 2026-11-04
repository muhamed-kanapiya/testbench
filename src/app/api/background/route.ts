import sharp from "sharp";
import { checkRequest, errorResponse, metaRequest, ServiceError } from "@/lib/meta";
export const runtime = "nodejs";
export const maxDuration = 180;

export async function POST(request: Request) {
  try {
    checkRequest(request);
    const body = await request.json();
    if (typeof body.prompt !== "string" || body.prompt.trim().length < 10 || body.prompt.length > 1200) throw new ServiceError("Describe the background in 10 to 1200 characters.", 400);
    const productName = typeof body.productName === "string" ? body.productName.slice(0, 80) : "product";
    const prompt = `Create only an empty photographic advertising background, portrait aspect ratio 4:5. A ${productName} will be composited later; DO NOT generate the product, any duplicate product, bottles, packaging, letters, words, logos, labels or people. Scene direction: ${body.prompt}\nComposition contract: camera straight-on, product-free centre. A continuous FLAT horizontal supporting surface fills the entire lower 30% of the image; its FRONT EDGE IS OUTSIDE the bottom of the image. No elevated pedestal, no raised block and no vertical front face at centre. The product will stand at x=50%, y=84%, so this exact location must be an unobstructed horizontal surface. Top 29% is clear uncluttered pale negative space for dark typography. Soft diffused key light from upper left. Premium editorial product photography, physically plausible materials. Keep centre empty. Background only.`;
    const response = await metaRequest({ model: "muse-image-1.0", input: prompt });
    const result = await response.json();
    const item = result.output?.find((o: { type?: string; result?: string }) => o.type === "image_generation_call" && typeof o.result === "string");
    if (!item?.result) throw new ServiceError("Meta did not return an image. Adjust the background concept and try again.", 502);
    const raw = Buffer.from(item.result, "base64");
    const image = await sharp(raw, { limitInputPixels: 25_000_000 }).resize(1080, 1350, { fit: "cover", position: "centre" }).png().toBuffer();
    return Response.json({ image: `data:image/png;base64,${image.toString("base64")}`, model: "muse-image-1.0" });
  } catch (error) { return errorResponse(error); }
}
