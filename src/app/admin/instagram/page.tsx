"use client";
import { useEffect, useMemo, useState } from "react";
import { adminDb } from "@/lib/admin";
import { cn } from "@/lib/format";
import { TOPICS, topicLabel, topicsOf, type TopicId } from "@/lib/assistant-topics";
import { AdminHeader } from "@/components/admin/AdminShell";
import { ChartCard, HBars, RangePicker, StatTile, VBars, VIZ } from "@/components/admin/charts";

interface Msg {
  id: string;
  created_at: string;
  channel: "instagram" | "web";
  sender_hash: string;
  question: string;
  reply: string | null;
  products: string[];
  fallback: boolean;
  latency_ms: number | null;
}
interface OrderRow {
  status: string;
  order_items: { product_id: string | null; product_name: string; quantity: number }[];
}

const HOUR = new Intl.DateTimeFormat("es-CL", { hour: "numeric", hour12: false, timeZone: "America/Santiago" });
const DERIVED = /whatsapp/i;

export default function AssistantInsights() {
  const [days, setDays] = useState(30);
  const [channel, setChannel] = useState<"todos" | "instagram" | "web">("todos");
  const [data, setData] = useState<{ msgs: Msg[]; orders: OrderRow[]; products: { id: string; name: string; slug: string }[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [topic, setTopic] = useState<TopicId | "todos">("todos");
  const [search, setSearch] = useState("");
  const [signups, setSignups] = useState<{ created: number; newAccounts: number; used: number } | null>(null);

  // Cuentas con cupón creadas desde DMs (migración 0007). Si falta, el bloque no se muestra.
  useEffect(() => {
    const sb = adminDb();
    const since = new Date(Date.now() - days * 86_400_000).toISOString();
    Promise.all([
      sb.from("instagram_signups").select("new_account,coupon_code").eq("status", "creada").gte("confirmed_at", since),
      sb.from("coupons").select("code,uses").eq("source", "instagram").gte("created_at", since),
    ]).then(([s, c]) => {
      if (s.error || c.error) return setSignups(null);
      const rows = (s.data ?? []) as { new_account: boolean | null }[];
      setSignups({
        created: rows.length,
        newAccounts: rows.filter((r) => r.new_account).length,
        used: ((c.data ?? []) as { uses: number }[]).filter((x) => x.uses > 0).length,
      });
    });
  }, [days]);

  useEffect(() => {
    const sb = adminDb();
    const since = new Date(Date.now() - days * 86_400_000).toISOString();
    setData(null);
    Promise.all([
      sb.from("assistant_messages").select("id,created_at,channel,sender_hash,question,reply,products,fallback,latency_ms").gte("created_at", since).order("created_at", { ascending: false }).limit(3000),
      sb.from("orders").select("status, order_items(product_id, product_name, quantity)").gte("created_at", since).neq("status", "cancelado").limit(2000),
      sb.from("products").select("id,name,slug"),
    ]).then(([m, o, p]) => {
      const err = m.error ?? o.error ?? p.error;
      if (err) return setError(/assistant_messages/.test(err.message) ? "Falta aplicar la migración 0006 en Supabase." : err.message);
      setError(null);
      setData({ msgs: (m.data ?? []) as Msg[], orders: (o.data ?? []) as OrderRow[], products: p.data ?? [] });
    });
  }, [days]);

  const view = useMemo(() => {
    if (!data) return null;
    const msgs = data.msgs.filter((m) => channel === "todos" || m.channel === channel);
    const total = msgs.length;
    const people = new Set(msgs.map((m) => m.sender_hash)).size;
    const derived = msgs.filter((m) => m.fallback || DERIVED.test(m.reply ?? ""));
    const answered = msgs.filter((m) => !m.fallback && m.latency_ms);
    const avgSec = answered.length ? answered.reduce((n, m) => n + (m.latency_ms ?? 0), 0) / answered.length / 1000 : 0;

    const topicCount = new Map<TopicId, number>();
    for (const m of msgs) for (const t of topicsOf(m.question)) topicCount.set(t, (topicCount.get(t) ?? 0) + 1);
    const topics = [...topicCount.entries()].sort((a, b) => b[1] - a[1]).map(([id, n]) => ({ label: topicLabel(id), values: [n] }));

    const bySlug = new Map(data.products.map((p) => [p.slug, p]));
    const byId = new Map(data.products.map((p) => [p.id, p]));
    const asked = new Map<string, number>();
    for (const m of msgs) for (const s of m.products) if (bySlug.has(s)) asked.set(s, (asked.get(s) ?? 0) + 1);
    const sold = new Map<string, number>();
    for (const o of data.orders) for (const i of o.order_items) {
      const slug = i.product_id ? byId.get(i.product_id)?.slug : undefined;
      if (slug) sold.set(slug, (sold.get(slug) ?? 0) + i.quantity);
    }
    const slugs = [...new Set([...asked.keys(), ...sold.keys()])]
      .sort((a, b) => (asked.get(b) ?? 0) - (asked.get(a) ?? 0) || (sold.get(b) ?? 0) - (sold.get(a) ?? 0))
      .slice(0, 8);
    const opportunities: string[] = [];
    const products = slugs.map((s) => {
      const a = asked.get(s) ?? 0;
      const v = sold.get(s) ?? 0;
      const opp = a >= 3 && v < a * 0.3;
      if (opp) opportunities.push(bySlug.get(s)!.name);
      return { label: bySlug.get(s)!.name, values: [a, v], highlight: opp ? "Oportunidad" : undefined };
    });

    const hours = Array<number>(24).fill(0);
    for (const m of msgs) hours[Number(HOUR.format(new Date(m.created_at))) % 24]++;
    const peak = hours.indexOf(Math.max(...hours));

    return { msgs, total, people, derived, avgSec, topics, products, opportunities, hours, peak };
  }, [data, channel]);

  const list = useMemo(() => {
    if (!view) return [];
    const q = search.trim().toLowerCase();
    return view.msgs.filter((m) => (topic === "todos" || topicsOf(m.question).includes(topic)) && (!q || m.question.toLowerCase().includes(q))).slice(0, 40);
  }, [view, topic, search]);

  const pct = (n: number, d: number) => (d ? `${Math.round((n / d) * 100)}%` : "—");

  return (
    <>
      <AdminHeader
        title="Lo que preguntan"
        description="Qué consultan las clientas al asistente de Instagram y de la web, y qué no supo responder."
        action={
          <div className="flex flex-wrap gap-2">
            <div className="flex gap-1 rounded-full bg-white p-1 shadow-[var(--shadow-soft)]" role="group" aria-label="Canal">
              {(["todos", "instagram", "web"] as const).map((c) => (
                <button key={c} type="button" aria-pressed={channel === c} onClick={() => setChannel(c)} className="rounded-full px-3 py-1.5 text-sm font-medium capitalize text-ink-soft aria-pressed:bg-ink aria-pressed:text-white">
                  {c === "todos" ? "Todos" : c === "web" ? "Web" : "Instagram"}
                </button>
              ))}
            </div>
            <RangePicker value={days} onChange={setDays} />
          </div>
        }
      />

      {error && <p className="rounded-2xl bg-m-red/10 p-4 text-m-red">{error}</p>}
      {!view && !error && <div className="skeleton h-96 rounded-3xl" />}
      {view && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile label="Preguntas recibidas" value={String(view.total)} hint={`Últimos ${days} días`} />
            <StatTile label="Personas distintas" value={String(view.people)} hint="Identificadas de forma anónima" />
            <StatTile label="Resueltas por el asistente" value={pct(view.total - view.derived.length, view.total)} hint={`${view.derived.length} derivadas a WhatsApp`} />
            <StatTile label="Tiempo de respuesta" value={view.avgSec ? `${view.avgSec.toFixed(1)} s` : "—"} hint="Promedio" />
          </div>
          {signups && (
            <div className="grid gap-4 sm:grid-cols-3">
              <StatTile label="Correos con cupón" value={String(signups.created)} hint="Dejaron su correo y confirmaron" />
              <StatTile label="Cuentas nuevas" value={String(signups.newAccounts)} hint="El resto ya tenía cuenta" />
              <StatTile label="Cupones usados" value={pct(signups.used, signups.created)} hint={`${signups.used} compraron con su cupón`} />
            </div>
          )}

          {view.total === 0 ? (
            <p className="rounded-3xl bg-white p-10 text-center text-ink-soft shadow-[var(--shadow-soft)]">
              Aún no hay preguntas registradas en este período. Se empiezan a guardar cuando el asistente responde (requiere la variable SUPABASE_SERVICE_ROLE_KEY en el servidor).
            </p>
          ) : (
            <>
              <div className="grid gap-6 lg:grid-cols-2">
                <ChartCard title="¿Sobre qué preguntan?" subtitle="Una pregunta puede tocar más de un tema.">
                  <HBars rows={view.topics} series={[{ name: "Preguntas", color: VIZ.s1 }]} />
                </ChartCard>
                <ChartCard title="¿A qué hora escriben?" subtitle={`Hora de Chile · más mensajes a las ${view.peak}:00 h`}>
                  <VBars values={view.hours} labels={view.hours.map((_, i) => String(i))} tipLabel={(i) => `${i}:00 – ${i}:59 h`} format={(n) => `${n} ${n === 1 ? "pregunta" : "preguntas"}`} tickEvery={3} />
                </ChartCard>
              </div>

              <ChartCard title="Consultados vs. vendidos" subtitle="Productos que el asistente recomendó en sus respuestas y unidades vendidas en el mismo período.">
                <HBars rows={view.products} series={[{ name: "Veces consultado", color: VIZ.s1 }, { name: "Unidades vendidas", color: VIZ.s2 }]} empty="El asistente aún no ha recomendado productos en este período." />
                {view.opportunities.length > 0 && (
                  <p className="mt-4 rounded-2xl bg-m-yellow/15 p-4 text-sm text-ink-2">
                    <b>Oportunidad:</b> {view.opportunities.join(", ")} {view.opportunities.length === 1 ? "se consulta" : "se consultan"} mucho pero se vende poco. Revisa precio, fotos o arma un cupón para ese producto.
                  </p>
                )}
              </ChartCard>

              <ChartCard title="Lo que el asistente no supo responder" subtitle="Preguntas derivadas a WhatsApp: buenas candidatas para agregar a las preguntas frecuentes.">
                {view.derived.length === 0 ? (
                  <p className="py-4 text-center text-sm text-ink-soft">El asistente respondió todo en este período. ✨</p>
                ) : (
                  <ul className="divide-y divide-line">
                    {view.derived.slice(0, 12).map((m) => (
                      <li key={m.id} className="flex items-start justify-between gap-4 py-3 text-sm">
                        <span className="text-ink">“{m.question}”</span>
                        <span className="shrink-0 text-xs text-ink-soft">{new Date(m.created_at).toLocaleDateString("es-CL")}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </ChartCard>

              <ChartCard
                title="Últimas preguntas"
                action={<input className="field h-10 w-56" placeholder="Buscar…" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Buscar en las preguntas" />}
              >
                <div className="no-scrollbar -mx-1 mb-3 flex gap-2 overflow-x-auto px-1">
                  {(["todos", ...TOPICS.map((t) => t.id), "otro"] as const).map((t) => (
                    <button key={t} type="button" className="chip shrink-0" aria-pressed={topic === t} onClick={() => setTopic(t)}>
                      {t === "todos" ? "Todos" : topicLabel(t)}
                    </button>
                  ))}
                </div>
                <ul className="divide-y divide-line">
                  {list.map((m) => (
                    <li key={m.id} className="py-3">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-ink-soft">
                        <span className={cn("rounded-full px-2 py-0.5 font-semibold", m.channel === "instagram" ? "bg-m-magenta/10 text-[#a3205d]" : "bg-m-blue/10 text-[#1d5f86]")}>{m.channel === "instagram" ? "Instagram" : "Web"}</span>
                        {topicsOf(m.question).map((t) => (
                          <span key={t} className="rounded-full bg-paper px-2 py-0.5">{topicLabel(t)}</span>
                        ))}
                        <span>{new Date(m.created_at).toLocaleString("es-CL", { dateStyle: "short", timeStyle: "short" })}</span>
                      </div>
                      <p className="mt-1.5 text-sm font-medium text-ink">{m.question}</p>
                      {m.reply && <p className="mt-1 line-clamp-2 text-sm text-ink-soft">↳ {m.reply}</p>}
                    </li>
                  ))}
                  {list.length === 0 && <li className="py-6 text-center text-sm text-ink-soft">No hay preguntas con ese filtro.</li>}
                </ul>
              </ChartCard>
            </>
          )}
        </div>
      )}
    </>
  );
}
