import "server-only";

export class ServiceError extends Error {
  constructor(message: string, public status = 500) { super(message); }
}

export function metaConfigured() { return !!process.env.MODEL_API_KEY?.trim(); }

const calls = new Map<string, { count: number; since: number }>();
export function checkRequest(request: Request) {
  const origin = request.headers.get("origin");
  const acceptedHosts = [new URL(request.url).host, request.headers.get("host")].filter(Boolean);
  if (origin && !acceptedHosts.includes(new URL(origin).host)) throw new ServiceError("This request must come from the TestBench studio.", 403);
  const length = Number(request.headers.get("content-length") || "0");
  if (length > 11 * 1024 * 1024) throw new ServiceError("Choose an image smaller than 10 MB.", 413);
  const key = request.headers.get("x-forwarded-for")?.split(",")[0] || "local";
  const now = Date.now();
  for (const [id, entry] of calls) if (now - entry.since > 60_000) calls.delete(id);
  const entry = calls.get(key) || { count: 0, since: now };
  if (entry.count >= 15) throw new ServiceError("Too many requests. Wait a minute before trying again.", 429);
  entry.count++; calls.set(key, entry);
}

export function errorResponse(error: unknown) {
  if (error instanceof ServiceError) return Response.json({ error: error.message }, { status: error.status });
  if (error instanceof Error && ["TimeoutError", "AbortError"].includes(error.name)) return Response.json({ error: "Generation took too long. Try again in a moment." }, { status: 504 });
  return Response.json({ error: "The request could not be completed. Please try again." }, { status: 500 });
}

export async function metaRequest(body: Record<string, unknown>) {
  const key = process.env.MODEL_API_KEY?.trim();
  if (!key) throw new ServiceError("Live generation is not connected yet. You can still edit and export the example experiment.", 503);
  let response: Response;
  try {
    response = await fetch("https://api.meta.ai/v1/responses", {
      method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ store: false, ...body }), signal: AbortSignal.timeout(180_000), cache: "no-store",
    });
  } catch (e) {
    if (e instanceof Error && ["TimeoutError", "AbortError"].includes(e.name)) throw e;
    throw new ServiceError("Meta could not be reached. Check the server connection and try again.", 502);
  }
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) throw new ServiceError("The Meta connection was not authorized. Check the server API key and model access.", 502);
    if (response.status === 429) throw new ServiceError("Meta is temporarily rate-limiting requests. Wait a moment and try again.", 429);
    if (response.status === 402) throw new ServiceError("The Meta account needs available generation credits.", 502);
    throw new ServiceError(`Meta could not complete this request (status ${response.status}). Try a simpler image or prompt.`, 502);
  }
  return response;
}

export function responseText(data: { output?: { type?: string; content?: { type?: string; text?: string }[] }[]; output_text?: string }) {
  return data.output_text || data.output?.flatMap(o => o.content || []).filter(c => c.type === "output_text").map(c => c.text || "").join("") || "";
}

export async function* sseEvents(response: Response): AsyncGenerator<Record<string, unknown>> {
  const reader = response.body?.getReader();
  if (!reader) throw new ServiceError("Meta returned an empty response.", 502);
  const decoder = new TextDecoder();
  let buffer = "";
  let dataLines: string[] = [];
  try {
    while (true) {
      const { done, value } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });
      let newline: number;
      while ((newline = buffer.indexOf("\n")) !== -1) {
        const line = buffer.slice(0, newline).replace(/\r$/, ""); buffer = buffer.slice(newline + 1);
        if (line.startsWith("data:")) dataLines.push(line.slice(5).trimStart());
        else if (line === "" && dataLines.length) {
          const content = dataLines.join("\n"); dataLines = [];
          if (content === "[DONE]") return;
          const event = JSON.parse(content);
          if (event.type === "error" || event.type === "response.failed") throw new ServiceError("Meta could not segment this image. Try a clearer photo or a more specific product description.", 502);
          yield event;
        }
      }
      if (done) break;
    }
    if (buffer.startsWith("data:")) dataLines.push(buffer.slice(5).trim());
    const trailing = dataLines.join("\n");
    if (trailing && trailing !== "[DONE]") yield JSON.parse(trailing);
  } finally { reader.releaseLock(); }
}
