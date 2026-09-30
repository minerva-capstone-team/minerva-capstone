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

const NAV: { href: string; label: string; icon: IconName }[] = [
  { href: "/admin", label: "Resumen", icon: "home" },
  { href: "/admin/pedidos", label: "Pedidos", icon: "receipt" },
  { href: "/admin/productos", label: "Productos", icon: "tag" },
  { href: "/admin/categorias", label: "Categorías", icon: "grid" },
  { href: "/admin/cupones", label: "Cupones", icon: "sparkle" },
  { href: "/admin/envios", label: "Envíos", icon: "truck" },
];
/** En el celular la barra inferior muestra estas y el resto queda en "Más". */
const TAB_COUNT = 3;

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
    <div className="min-h-dvh lg:grid lg:grid-cols-[16rem_1fr]">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-line bg-white p-4 transition-transform duration-500 ease-[var(--ease-out-expo)] lg:sticky lg:top-0 lg:h-dvh lg:translate-x-0",
          menuOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between px-2 py-2">
          <Logo size={44} />
          <span className="rounded-full bg-paper-2 px-2.5 py-1 text-xs font-semibold text-ink-soft">Admin</span>
        </div>
        <nav className="mt-8 flex-1" aria-label="Administración">
          <ul className="space-y-1">
            {NAV.map((n) => (
              <li key={n.href}>
                <Link
                  href={n.href}
                  aria-current={isActive(n.href) ? "page" : undefined}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-ink-2 transition-colors hover:bg-paper aria-[current=page]:bg-ink aria-[current=page]:text-white"
                >
                  <Icon name={n.icon} size={18} /> {n.label}
                </Link>
              </li>
            ))}
          </ul>
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
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-line bg-paper/85 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 backdrop-blur lg:hidden">
          <button type="button" className="grid size-11 place-items-center rounded-full hover:bg-ink/5" onClick={() => setMenuOpen(true)} aria-label="Abrir menú de administración">
            <Icon name="menu" />
          </button>
          <span className="font-semibold">Minerva Admin</span>
        </header>
        <main className="mx-auto max-w-6xl px-4 pt-8 pb-[calc(6rem+env(safe-area-inset-bottom))] sm:px-8 lg:py-12">{children}</main>
      </div>

      <nav
        aria-label="Secciones"
        className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      >
        <ul className="grid grid-cols-4">
          {NAV.slice(0, TAB_COUNT).map((n) => (
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
              aria-current={NAV.slice(TAB_COUNT).some((n) => isActive(n.href)) ? "page" : undefined}
              className="flex w-full flex-col items-center gap-1 py-2.5 text-[11px] font-medium text-ink-soft aria-[current=page]:text-ink"
            >
              <Icon name="menu" size={22} />
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
