import "server-only";
import { esc, sendMessage, signupCard } from "./telegram";
import { getServiceSupabase } from "./supabase/service";
import { formatCLP } from "./format";
import { approveSignup, rejectSignup } from "./instagram-signup";
import { site } from "./site";

const STATUS: Record<string, string> = {
  pendiente: "Pendiente",
  confirmado: "Confirmado",
  en_produccion: "En producción",
  listo: "Listo",
  entregado: "Entregado",
  cancelado: "Cancelado",
};

const HELP = `<b>Comandos de Minerva</b>
/resumen — ventas y pedidos de las últimas 24 h
/pedidos — pedidos que siguen en curso
/cuentas — solicitudes de cuenta de Instagram por revisar
/stock — productos con poco stock
/id — tu número de chat`;

const noData = "No pude leer los datos (falta SUPABASE_SERVICE_ROLE_KEY o sus permisos).";

export const adminLink = (path: string) => `${site.url}${path}`;

export async function handleCommand(chatId: number, command: string) {
  const sb = getServiceSupabase();
  switch (command) {
    case "resumen": {
      if (!sb) return sendMessage(chatId, noData);
      const since = new Date(Date.now() - 24 * 3_600_000).toISOString();
      const [day, open, signups] = await Promise.all([
        sb.from("orders").select("total,status").gte("created_at", since),
        sb.from("orders").select("status").in("status", ["pendiente", "confirmado", "en_produccion", "listo"]),
        sb.from("instagram_signups").select("id", { count: "exact", head: true }).eq("status", "por_aprobar"),
      ]);
      if (day.error || open.error) return sendMessage(chatId, noData);
      const valid = (day.data ?? []).filter((o) => o.status !== "cancelado");
      const total = valid.reduce((n, o) => n + (o.total as number), 0);
      const byStatus = (open.data ?? []).reduce<Record<string, number>>((m, o) => ((m[o.status as string] = (m[o.status as string] ?? 0) + 1), m), {});
      const lines = Object.entries(byStatus).map(([k, v]) => `• ${STATUS[k] ?? k}: ${v}`);
      return sendMessage(
        chatId,
        `📊 <b>Resumen (últimas 24 h)</b>\nPedidos: <b>${valid.length}</b> · ${formatCLP(total)}\n\n<b>En curso</b>\n${lines.join("\n") || "Nada pendiente 🎉"}\n\nSolicitudes de cuenta por revisar: <b>${signups.count ?? 0}</b>`,
        [[{ text: "Abrir el panel", url: adminLink("/admin") }]],
      );
    }
    case "pedidos": {
      if (!sb) return sendMessage(chatId, noData);
      const { data, error } = await sb
        .from("orders")
        .select("order_number,total,status,created_at,customer:customers(first_name,last_name)")
        .in("status", ["pendiente", "confirmado", "en_produccion", "listo"])
        .order("created_at", { ascending: false })
        .limit(8);
      if (error) return sendMessage(chatId, noData);
      if (!data?.length) return sendMessage(chatId, "No hay pedidos en curso 🎉");
      const rows = data.map((o) => {
        const c = (Array.isArray(o.customer) ? o.customer[0] : o.customer) as { first_name: string; last_name: string } | null;
        return `• <b>${esc(o.order_number)}</b> · ${esc(c ? `${c.first_name} ${c.last_name}` : "—")} · ${formatCLP(o.total as number)} · ${STATUS[o.status as string] ?? o.status}`;
      });
      return sendMessage(chatId, `🧾 <b>Pedidos en curso</b>\n${rows.join("\n")}`, [[{ text: "Abrir Pedidos", url: adminLink("/admin/pedidos") }]]);
    }
    case "cuentas": {
      if (!sb) return sendMessage(chatId, noData);
      const { data, error } = await sb
        .from("instagram_signups")
        .select("id,email,product:products(name)")
        .eq("status", "por_aprobar")
        .order("created_at", { ascending: true })
        .limit(10);
      if (error) return sendMessage(chatId, noData);
      if (!data?.length) return sendMessage(chatId, "No hay solicitudes por revisar ✅");
      for (const s of data) {
        const p = (Array.isArray(s.product) ? s.product[0] : s.product) as { name: string } | null;
        const card = signupCard({ id: s.id as string, email: s.email as string, product: p?.name ?? null });
        await sendMessage(chatId, card.html, card.buttons);
      }
      return;
    }
    case "stock": {
      if (!sb) return sendMessage(chatId, noData);
      const { data, error } = await sb.from("products").select("name,stock").eq("active", true).lte("stock", 5).order("stock").limit(15);
      if (error) return sendMessage(chatId, noData);
      if (!data?.length) return sendMessage(chatId, "Todo con stock suficiente ✅");
      return sendMessage(chatId, `📦 <b>Poco stock</b>\n${data.map((p) => `• ${esc(p.name)}: <b>${p.stock}</b>`).join("\n")}`, [[{ text: "Abrir Productos", url: adminLink("/admin/productos") }]]);
    }
    case "id":
      return sendMessage(chatId, `Tu número de chat es <code>${chatId}</code>`);
    default:
      return sendMessage(chatId, HELP);
  }
}

/** Botones ✅/❌ de una solicitud de cuenta. Devuelve el texto que reemplaza al mensaje. */
export async function handleSignupDecision(action: "ap" | "rj", id: string): Promise<string> {
  if (action === "rj") {
    const r = await rejectSignup(id);
    return r.ok ? "❌ <b>Solicitud rechazada.</b> No se creó cuenta ni se envió correo." : `⚠️ ${esc(r.error)}`;
  }
  const r = await approveSignup(id);
  return r.ok
    ? `✅ <b>Aprobada.</b> ${r.newAccount ? "Se creó la cuenta" : "Ya tenía cuenta"} y se envió el correo con el cupón <code>${esc(r.couponCode)}</code>.`
    : `⚠️ No se pudo aprobar: ${esc(r.error)}`;
}
