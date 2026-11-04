import sharp from "sharp";
import { parseImageStream, recordsOfKind, decodeMaskToRaster, decodeMaskToRLE, type ResponsesEvent } from "@meta-sam/parser";
import { checkRequest, errorResponse, metaRequest, ServiceError, sseEvents } from "@/lib/meta";
export const runtime = "nodejs";
export const maxDuration = 180;

export async function POST(request: Request) {
  try {
    checkRequest(request);
    const form = await request.formData();
    const file = form.get("image");
    const label = String(form.get("label") || "product").trim().slice(0, 80);
    if (!(file instanceof File)) throw new ServiceError("Choose a product photo first.", 400);
    if (file.size > 10 * 1024 * 1024) throw new ServiceError("Choose an image smaller than 10 MB.", 413);
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) throw new ServiceError("Use a PNG, JPG or WebP photo.", 400);
    const source = Buffer.from(await file.arrayBuffer());
    let input: Buffer;
    try { input = await sharp(source, { limitInputPixels: 25_000_000 }).rotate().resize(1600, 1600, { fit: "inside", withoutEnlargement: true }).ensureAlpha().png().toBuffer(); }
    catch { throw new ServiceError("This image could not be opened. Use a PNG, JPG or WebP under 25 megapixels.", 400); }
    const stats = await sharp(input).stats();
    if (!stats.isOpaque) {
      const cutout = await sharp(input).trim().png().toBuffer();
      return Response.json({ image: `data:image/png;base64,${cutout.toString("base64")}`, method: "Uploaded transparent product image" });
    }
    const response = await metaRequest({ model: "sam-3.1", stream: true, metadata: { mask_encoding: "one_bit" }, input: [{ type: "message", role: "user", content: [{ type: "input_text", text: label || "product" }, { type: "input_image", image_url: `data:image/png;base64,${input.toString("base64")}` }] }] });
    const result = await parseImageStream(sseEvents(response) as AsyncIterable<ResponsesEvent>).finalResult;
    if (result.outcome.status !== "completed") throw new ServiceError("Product segmentation ended early. Try again.", 502);
    const boxes = recordsOfKind(result.records, "box");
    const masks = recordsOfKind(result.records, "mask");
    const box = [...boxes].sort((a, b) => (b.right - b.left) * (b.bottom - b.top) - (a.right - a.left) * (a.bottom - a.top))[0];
    const mask = box ? masks.find(m => m.objectId === box.objectId) : undefined;
    if (!box || !mask) throw new ServiceError("No matching product was found. Try a more specific description, like 'blue bottle', or upload a transparent PNG.", 422);
    const raster = decodeMaskToRaster(mask.mask);
    const { size: [maskHeight, maskWidth] } = decodeMaskToRLE(mask.mask);
    const metadata = await sharp(input).metadata();
    const width = metadata.width!; const height = metadata.height!;
    const left = Math.max(0, Math.floor(box.left)); const top = Math.max(0, Math.floor(box.top));
    const boxWidth = Math.min(width - left, Math.ceil(box.right - box.left));
    const boxHeight = Math.min(height - top, Math.ceil(box.bottom - box.top));
    if (boxWidth < 1 || boxHeight < 1 || !maskWidth || !maskHeight) throw new ServiceError("The product boundary was invalid. Try another photo.", 422);
    const alpha = Buffer.alloc(width * height);
    for (let y = 0; y < boxHeight; y++) for (let x = 0; x < boxWidth; x++) {
      const mx = Math.min(maskWidth - 1, Math.floor(x * maskWidth / boxWidth));
      const my = Math.min(maskHeight - 1, Math.floor(y * maskHeight / boxHeight));
      alpha[(top + y) * width + left + x] = raster[my * maskWidth + mx] ? 255 : 0;
    }
    const rgba = await sharp(input).ensureAlpha().raw().toBuffer();
    for (let i = 0; i < width * height; i++) rgba[i * 4 + 3] = alpha[i];
    const cutout = await sharp(rgba, { raw: { width, height, channels: 4 } }).trim().png().toBuffer();
    return Response.json({ image: `data:image/png;base64,${cutout.toString("base64")}`, method: "Product cutout prepared with Meta SAM 3.1", matches: boxes.length });
  } catch (error) { return errorResponse(error); }
}
