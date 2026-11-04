import { metaConfigured } from "@/lib/meta";
export const dynamic = "force-dynamic";
export async function GET() { return Response.json({ configured: metaConfigured() }, { headers: { "Cache-Control": "no-store" } }); }
