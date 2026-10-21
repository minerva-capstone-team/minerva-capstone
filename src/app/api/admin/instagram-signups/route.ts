import { NextResponse, type NextRequest } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { approveSignup, rejectSignup } from "@/lib/instagram-signup";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Acepta o rechaza una solicitud de cuenta hecha por Instagram. Solo administradores:
 * se verifica el JWT con is_admin() antes de usar la clave de servicio.
 */
export async function POST(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id, action } = (await req.json().catch(() => ({}))) as { id?: string; action?: string };
  if (!id || !UUID.test(id) || (action !== "approve" && action !== "reject")) return NextResponse.json({ error: "bad request" }, { status: 400 });

  const sb = getServerSupabase(token);
  if (!sb) return NextResponse.json({ error: "not configured" }, { status: 503 });
  const { data: isAdmin, error } = await sb.rpc("is_admin");
  if (error || !isAdmin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const result = action === "reject" ? await rejectSignup(id) : await approveSignup(id);
  return NextResponse.json(result, { status: result.ok ? 200 : 409 });
}
