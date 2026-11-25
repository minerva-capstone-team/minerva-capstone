"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getLocalOrders } from "@/lib/orders";
import { useSession } from "@/lib/use-session";
import { formatCLP } from "@/lib/format";
import { orderStatusLabel } from "@/lib/order-status";
import type { PlacedOrder } from "@/lib/types";
import { Icon } from "@/components/ui/Icon";
import { AuthForm } from "./AuthForm";
import { ChangeTempPassword, MyCoupons } from "./AccountExtras";
import { MyProfile } from "./MyProfile";

interface RemoteOrder {
  id: string;
  order_number: string;
  total: number;
  status: string;
  payment_status: string;
  created_at: string;
  order_items: { product_name: string; quantity: number }[];
}

const date = (iso: string) => new Date(iso).toLocaleDateString("es-CL", { day: "numeric", month: "short", year: "numeric" });

export function AccountView() {
  const session = useSession();
  const [remote, setRemote] = useState<RemoteOrder[] | null>(null);
  const [local, setLocal] = useState<PlacedOrder[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [pwChanged, setPwChanged] = useState(false);
  const [recovery, setRecovery] = useState(false);
  const [showChange, setShowChange] = useState(false);
  const [linkProblem, setLinkProblem] = useState<string | null>(null);
  const [tab, setTab] = useState<"datos" | "pedidos" | "cupones">("datos");
  useEffect(() => setLinkProblem(new URLSearchParams(window.location.search).get("modo")), []);
  const mustChangePassword = Boolean(session?.user.user_metadata?.must_change_password) && !pwChanged;

  useEffect(() => setLocal(getLocalOrders()), []);

  // Llegó desde el enlace de "¿Olvidaste tu contraseña?": pedir la contraseña nueva.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("modo") === "nueva") setRecovery(true);
    const sb = getBrowserSupabase();
    if (!sb) return;
    const { data } = sb.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setRecovery(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const sb = getBrowserSupabase();
    if (!sb || !session) return;
    sb.from("orders")
      .select("id, order_number, total, status, payment_status, created_at, order_items(product_name, quantity)")
      .order("created_at", { ascending: false })
      .then(({ data }) => setRemote((data as RemoteOrder[]) ?? []));
    sb.rpc("is_admin").then(({ data }) => setIsAdmin(Boolean(data)));
  }, [session]);

  if (session === undefined) return <div className="skeleton mt-10 h-72 rounded-[2rem]" aria-busy="true" />;

  return (
    <div className="mt-10 grid gap-10 lg:grid-cols-12">
      <div className="lg:col-span-5">
        {!isSupabaseConfigured ? (
          <div className="rounded-[2rem] bg-white p-6 shadow-[var(--shadow-soft)] sm:p-8">
            <h2 className="display text-2xl">Tus pedidos, siempre a mano</h2>
            <p className="mt-2 text-ink-soft">Aquí verás los pedidos que hiciste desde este dispositivo. Para cualquier consulta, escríbenos por WhatsApp.</p>
          </div>
        ) : session ? (
          <div className="rounded-[2rem] bg-white p-6 shadow-[var(--shadow-soft)] sm:p-8">
            <p className="text-sm text-ink-soft">Sesión iniciada como</p>
            <p className="mt-1 break-all text-lg font-semibold">{session.user.email}</p>
            <div className="mt-6 flex flex-wrap gap-2">
              {isAdmin && (
                <Link href="/admin" className="btn btn-primary">
                  <Icon name="grid" size={18} /> Panel de administración
                </Link>
              )}
              <button type="button" className="btn btn-ghost" onClick={() => getBrowserSupabase()?.auth.signOut()}>
                <Icon name="logout" size={18} /> Cerrar sesión
              </button>
            </div>
            {mustChangePassword && !recovery && <ChangeTempPassword onDone={() => setPwChanged(true)} />}
            {recovery && !pwChanged && (
              <ChangeTempPassword
                variant="recovery"
                onDone={() => {
                  setPwChanged(true);
                  setRecovery(false);
                  window.history.replaceState(null, "", "/cuenta");
                }}
              />
            )}
            {!mustChangePassword && !recovery && !pwChanged && (
              <>
                <button type="button" className="mt-4 block text-sm font-medium text-ink-2 underline underline-offset-4 hover:text-ink" onClick={() => setShowChange((v) => !v)}>
                  {showChange ? "Cancelar" : "Cambiar contraseña"}
                </button>
                {showChange && (
                  <ChangeTempPassword
                    variant="normal"
                    onDone={() => {
                      setPwChanged(true);
                      setShowChange(false);
                    }}
                  />
                )}
              </>
            )}
            {pwChanged && <p className="mt-4 rounded-xl bg-m-green/12 p-3 text-sm text-[#1c6b51]">Listo, tu contraseña quedó guardada.</p>}
          </div>
        ) : (
          <>
            {(linkProblem === "vencido" || (linkProblem === "nueva" && session === null)) && (
              <p role="alert" className="mb-4 rounded-2xl bg-m-yellow/20 p-4 text-sm text-[#8a5a00]">
                El enlace para cambiar la contraseña venció o ya se usó. Pide uno nuevo aquí abajo: llega a tu correo en un par de minutos (revisa también spam).
              </p>
            )}
            <AuthForm startInReset={linkProblem === "vencido" || linkProblem === "nueva"} />
          </>
        )}
      </div>

      <div className="space-y-10 lg:col-span-7">
        {session && (
          <nav aria-label="Mi cuenta" className="flex flex-wrap gap-2">
            {(
              [
                ["datos", "Mis datos"],
                ["pedidos", "Mis pedidos"],
                ["cupones", "Mis cupones"],
              ] as const
            ).map(([k, l]) => (
              <button key={k} type="button" className="chip" aria-pressed={tab === k} onClick={() => setTab(k)}>
                {l}
              </button>
            ))}
          </nav>
        )}
        {session && tab === "datos" && <MyProfile />}
        {session && tab === "cupones" && <MyCoupons />}
        {session && tab === "pedidos" && (
          <section aria-labelledby="remote-orders">
            <h2 id="remote-orders" className="display text-2xl">
              Mis pedidos
            </h2>
            {remote === null ? (
              <div className="skeleton mt-4 h-40 rounded-3xl" />
            ) : remote.length === 0 ? (
              <p className="mt-4 rounded-3xl bg-paper-2 p-6 text-ink-soft">Aún no tienes pedidos asociados a {session.user.email}.</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {remote.map((o) => (
                  <li key={o.id} className="rounded-3xl bg-white p-5 shadow-[var(--shadow-soft)]">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold">{o.order_number}</p>
                      <span className="rounded-full bg-paper-2 px-3 py-1 text-xs font-semibold">{orderStatusLabel.status[o.status as keyof typeof orderStatusLabel.status] ?? o.status}</span>
                    </div>
                    <p className="mt-1 text-sm text-ink-soft">
                      {date(o.created_at)} · {o.order_items.map((i) => `${i.quantity}× ${i.product_name}`).join(", ")}
                    </p>
                    <p className="mt-2 font-semibold tabular-nums">{formatCLP(o.total)}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {(!session || tab === "pedidos") && (
        <section aria-labelledby="local-orders">
          <h2 id="local-orders" className="display text-2xl">
            Pedidos en este dispositivo
          </h2>
          {local.length === 0 ? (
            <div className="mt-4 rounded-3xl bg-paper-2 p-8 text-center">
              <p className="text-ink-soft">Todavía no has hecho pedidos desde aquí.</p>
              <Link href="/productos" className="btn btn-primary mt-4">
                Explorar productos
              </Link>
            </div>
          ) : (
            <ul className="mt-4 space-y-3">
              {local.map((o) => (
                <li key={o.id}>
                  <Link href={`/pedido/${encodeURIComponent(o.order_number)}`} className="flex items-center justify-between gap-4 rounded-3xl bg-white p-5 shadow-[var(--shadow-soft)] transition-shadow hover:shadow-[var(--shadow-lift)]">
                    <span>
                      <span className="block font-semibold">{o.order_number}</span>
                      <span className="text-sm text-ink-soft">
                        {date(o.created_at)} · {o.items.reduce((n, i) => n + i.quantity, 0)} productos
                      </span>
                    </span>
                    <span className="flex items-center gap-3">
                      <span className="font-semibold tabular-nums">{formatCLP(o.total)}</span>
                      <Icon name="arrow" size={18} />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
        )}
      </div>
    </div>
  );
}
