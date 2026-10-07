import { after, NextResponse, type NextRequest } from "next/server";
import { handleInstagramPayload, isInstagramConfigured, validSignature, validVerifyToken, type IgPayload } from "@/lib/instagram";

export const maxDuration = 60;

/** Meta llama aquí una vez, al configurar el webhook, para comprobar que la URL es tuya. */
export function GET(req: NextRequest) {
  if (!isInstagramConfigured) return NextResponse.json({ error: "not configured" }, { status: 503 });
  const q = req.nextUrl.searchParams;
  if (q.get("hub.mode") === "subscribe" && validVerifyToken(q.get("hub.verify_token")) && q.get("hub.challenge")) {
    return new Response(q.get("hub.challenge"), { status: 200, headers: { "Content-Type": "text/plain" } });
  }
  return NextResponse.json({ error: "forbidden" }, { status: 403 });
}

/**
 * Meta avisa aquí de cada mensaje directo. Se verifica la firma (HMAC con el App Secret), se responde 200
 * de inmediato y la respuesta del bot se procesa después, para no pasar el tiempo límite de Meta.
 */
export async function POST(req: NextRequest) {
  if (!isInstagramConfigured) return NextResponse.json({ error: "not configured" }, { status: 503 });
  const raw = await req.text();
  if (!validSignature(raw, req.headers.get("x-hub-signature-256"))) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  let payload: IgPayload;
  try {
    payload = JSON.parse(raw) as IgPayload;
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
  if (payload.object === "instagram") after(() => handleInstagramPayload(payload));
  return NextResponse.json({ received: true });
}
