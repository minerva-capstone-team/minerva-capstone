"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { useSession } from "@/lib/use-session";
import { cn } from "@/lib/format";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Logo } from "@/components/layout/Logo";
import { AuthForm } from "@/components/account/AuthForm";
import { InstallAppButton, PushToggle, useRegisterAdminSw } from "@/components/admin/AdminPwa";

const NAV_GROUPS: { title: string; items: { href: string; label: string; icon: IconName }[] }[] = [
  {
    title: "Operación",
    items: [
      { href: "/admin", label: "Resumen", icon: "home" },
      { href: "/admin/pedidos", label: "Pedidos", icon: "receipt" },
      { href: "/admin/produccion", label: "Producción", icon: "board" },
      { href: "/admin/taller", label: "Hoja de taller", icon: "printer" },
      { href: "/admin/cuentas-instagram", label: "Cuentas de Instagram", icon: "user" },
    ],
  },
  {
    title: "Catálogo",
    items: [
      { href: "/admin/productos", label: "Productos", icon: "tag" },
      { href: "/admin/categorias", label: "Categorías", icon: "grid" },
      { href: "/admin/cupones", label: "Cupones", icon: "sparkle" },
      { href: "/admin/promociones", label: "Promociones", icon: "percent" },
      { href: "/admin/envios", label: "Envíos", icon: "truck" },
    ],
  },
  {
    title: "Análisis",
    items: [
      { href: "/admin/metricas", label: "Métricas", icon: "chart" },
      { href: "/admin/instagram", label: "Lo que preguntan", icon: "chat" },
      { href: "/admin/calendario", label: "Calendario", icon: "calendar" },
    ],
  },
];
const NAV = NAV_GROUPS.flatMap((g) => g.items);
/** Pestañas fijas de la barra inferior en el celular; el resto queda en "Más". */
const TABS = ["/admin", "/admin/pedidos", "/admin/produccion"];

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-8 px-4 py-12">
      <Logo size={64} />
      {children}
    </main>
  );
}

function SetupNotice() {
  return (
    <Centered>
      <div className="max-w-xl rounded-[2rem] bg-white p-8 shadow-[var(--shadow-soft)]">
        <h1 className="display text-3xl">Conecta Supabase para usar el panel</h1>
        <ol className="mt-5 list-decimal space-y-2 pl-5 text-ink-2">
          <li>Crea un proyecto en supabase.com.</li>
          <li>
            Ejecuta <code className="rounded bg-paper-2 px-1.5">supabase/migrations/0001_init.sql</code> y luego <code className="rounded bg-paper-2 px-1.5">supabase/seed.sql</code> en el SQL Editor.
          </li>
          <li>
            Copia la URL y la <em>anon key</em> en <code className="rounded bg-paper-2 px-1.5">.env.local</code> y reinicia el servidor.
          </li>
          <li>Crea tu usuario y márcalo como administrador (instrucciones en el README).</li>
        </ol>
        <p className="mt-5 text-sm text-ink-soft">Mientras tanto, la tienda funciona con el catálogo de demostración.</p>
        <Link href="/" className="btn btn-ghost mt-6">
          Volver a la tienda
        </Link>
      </div>
    </Centered>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const session = useSession();
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState<boolean | undefined>(undefined);
  const [menuOpen, setMenuOpen] = useState(false);
  const [pendingAccounts, setPendingAccounts] = useState(0);
  useRegisterAdminSw();

  useEffect(() => {
    if (!session) {
      setIsAdmin(undefined);
      return;
    }
    getBrowserSupabase()!
      .rpc("is_admin")
      .then(({ data }) => setIsAdmin(Boolean(data)));
  }, [session]);

  useEffect(() => setMenuOpen(false), [pathname]);

  // Solicitudes de cuenta de Instagram esperando respuesta (se ve como globo en el menú).
  useEffect(() => {
    if (!isAdmin) return;
    getBrowserSupabase()!
      .from("instagram_signups")
      .select("id", { count: "exact", head: true })
      .eq("status", "por_aprobar")
      .then(({ count, error }) => setPendingAccounts(error ? 0 : (count ?? 0)));
  }, [isAdmin, pathname]);

  if (!isSupabaseConfigured) return <SetupNotice />;
  if (session === undefined || (session && isAdmin === undefined)) {
    return (
      <Centered>
        <div className="size-8 animate-spin rounded-full border-2 border-line border-t-ink" role="status" aria-label="Cargando" />
      </Centered>
    );
  }
  if (!session) {
    return (
      <Centered>
        <AuthForm allowSignUp={false} title="Panel de administración" />
        <Link href="/" className="text-sm text-ink-soft hover:text-ink">
          ← Volver a la tienda
        </Link>
      </Centered>
    );
  }
  if (!isAdmin) {
    return (
      <Centered>
        <div className="max-w-md rounded-[2rem] bg-white p-8 text-center shadow-[var(--shadow-soft)]">
          <h1 className="display text-2xl">Sin permisos de administración</h1>
          <p className="mt-2 text-ink-soft">La cuenta {session.user.email} no es administradora de Minerva.</p>
          <button type="button" className="btn btn-ghost mt-6" onClick={() => getBrowserSupabase()?.auth.signOut()}>
            Cerrar sesión
          </button>
        </div>
      </Centered>
    );
  }

  const isActive = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[16rem_1fr] print:block">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 print:hidden flex-col border-r border-line bg-white p-4 transition-transform duration-500 ease-[var(--ease-out-expo)] lg:sticky lg:top-0 lg:h-dvh lg:translate-x-0",
          menuOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between px-2 py-2">
          <Logo size={44} />
          <span className="rounded-full bg-paper-2 px-2.5 py-1 text-xs font-semibold text-ink-soft">Admin</span>
        </div>
        <nav className="mt-6 flex-1 overflow-y-auto" aria-label="Administración">
          {NAV_GROUPS.map((g) => (
            <div key={g.title} className="mb-5">
              <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-soft">{g.title}</p>
              <ul className="space-y-1">
                {g.items.map((n) => (
                  <li key={n.href}>
                    <Link
                      href={n.href}
                      aria-current={isActive(n.href) ? "page" : undefined}
                      className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-ink-2 transition-colors hover:bg-paper aria-[current=page]:bg-ink aria-[current=page]:text-white"
                    >
                      <Icon name={n.icon} size={18} /> {n.label}
                      {n.href === "/admin/cuentas-instagram" && pendingAccounts > 0 && (
                        <span className="ml-auto grid min-w-5 place-items-center rounded-full bg-m-red px-1.5 text-[11px] font-semibold leading-5 text-white" aria-label={`${pendingAccounts} por revisar`}>
                          {pendingAccounts}
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
        <div className="space-y-1 border-t border-line pt-4 pb-[env(safe-area-inset-bottom)]">
          <PushToggle className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-ink-2 hover:bg-paper disabled:opacity-50" />
          <InstallAppButton className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-ink-2 hover:bg-paper" />
          <Link href="/" target="_blank" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-ink-2 hover:bg-paper">
            <Icon name="external" size={18} /> Ver tienda
          </Link>
          <button type="button" onClick={() => getBrowserSupabase()?.auth.signOut()} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-ink-2 hover:bg-paper">
            <Icon name="logout" size={18} /> Cerrar sesión
          </button>
          <p className="truncate px-3 pt-2 text-xs text-ink-soft">{session.user.email}</p>
        </div>
      </aside>
      {menuOpen && <div className="fixed inset-0 z-30 bg-ink/30 lg:hidden" onClick={() => setMenuOpen(false)} aria-hidden />}

      <div className="min-w-0">
        <header className="sticky top-0 z-20 flex print:hidden items-center gap-3 border-b border-line bg-paper/85 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 backdrop-blur lg:hidden">
          <button type="button" className="grid size-11 place-items-center rounded-full hover:bg-ink/5" onClick={() => setMenuOpen(true)} aria-label="Abrir menú de administración">
            <Icon name="menu" />
          </button>
          <span className="font-semibold">Minerva Admin</span>
        </header>
        <main className="mx-auto max-w-6xl px-4 pt-8 print:max-w-none print:p-0 pb-[calc(6rem+env(safe-area-inset-bottom))] sm:px-8 lg:py-12">{children}</main>
      </div>

      <nav
        aria-label="Secciones"
        className="fixed inset-x-0 bottom-0 z-20 border-t print:hidden border-line bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      >
        <ul className="grid grid-cols-4">
          {NAV.filter((n) => TABS.includes(n.href)).map((n) => (
            <li key={n.href}>
              <Link
                href={n.href}
                aria-current={isActive(n.href) ? "page" : undefined}
                className="flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium text-ink-soft aria-[current=page]:text-ink"
              >
                <Icon name={n.icon} size={22} />
                {n.label}
              </Link>
            </li>
          ))}
          <li>
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-current={NAV.filter((n) => !TABS.includes(n.href)).some((n) => isActive(n.href)) ? "page" : undefined}
              className="flex w-full flex-col items-center gap-1 py-2.5 text-[11px] font-medium text-ink-soft aria-[current=page]:text-ink"
            >
              <span className="relative">
                <Icon name="menu" size={22} />
                {pendingAccounts > 0 && <span aria-hidden className="absolute -right-1 -top-0.5 size-2.5 rounded-full bg-m-red" />}
              </span>
              Más
            </button>
          </li>
        </ul>
      </nav>
    </div>
  );
}

export function AdminHeader({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="display text-4xl">{title}</h1>
        {description && <p className="mt-1 text-ink-soft">{description}</p>}
      </div>
      {action}
    </div>
  );
}
