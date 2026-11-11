"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavItem } from "@/lib/site";
import { cn } from "@/lib/format";
import { Icon } from "@/components/ui/Icon";

/** Enlace del menú con submenú: se abre al pasar el mouse, al hacer clic o con el teclado. */
export function NavDropdown({ item, active }: { item: NavItem; active: boolean }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLLIElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pathname = usePathname();
  const children = item.children ?? [];

  // Se cierra al cambiar de página
  useEffect(() => setOpen(false), [pathname]);

  // Se cierra con Escape o al hacer clic fuera
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onDown = (e: MouseEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onDown);
    };
  }, [open]);

  const show = () => {
    if (timer.current) clearTimeout(timer.current);
    setOpen(true);
  };
  const hide = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setOpen(false), 140);
  };

  return (
    <li ref={root} className="relative" onMouseEnter={show} onMouseLeave={hide}>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        aria-current={active ? "page" : undefined}
        onClick={() => setOpen((v) => !v)}
        className="group relative inline-flex items-center gap-1 rounded-full px-3.5 py-2 text-[0.92rem] font-medium text-ink-2 transition-colors hover:text-ink aria-[current=page]:text-ink"
      >
        {item.label}
        <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden className={cn("transition-transform duration-300", open && "rotate-180")}>
          <path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="bg-gradient-minerva absolute inset-x-3.5 -bottom-0.5 h-0.5 origin-left scale-x-0 rounded-full transition-transform duration-500 ease-[var(--ease-out-expo)] group-hover:scale-x-100 group-aria-[current=page]:scale-x-100" />
      </button>

      <div
        className={cn(
          "absolute left-1/2 top-full z-50 w-[19rem] -translate-x-1/2 pt-3 transition-[opacity,transform] duration-300 ease-[var(--ease-out-expo)]",
          open ? "pointer-events-auto translate-y-0 opacity-100" : "pointer-events-none -translate-y-2 opacity-0",
        )}
      >
        <ul className="overflow-hidden rounded-3xl border border-white/70 bg-white/95 p-2 shadow-[0_18px_48px_-16px_rgb(20_18_23/0.28)] backdrop-blur-xl">
          {children.map((c) => (
            <li key={c.href}>
              <Link
                href={c.href}
                tabIndex={open ? 0 : -1}
                className="block rounded-2xl px-4 py-3 transition-colors hover:bg-paper focus-visible:bg-paper"
              >
                <span className="block text-[0.95rem] font-semibold text-ink">{c.label}</span>
                <span className="mt-0.5 block text-sm leading-snug text-ink-soft">{c.text}</span>
              </Link>
            </li>
          ))}
          <li className="mt-1 border-t border-line pt-1">
            <Link
              href={item.href}
              tabIndex={open ? 0 : -1}
              className="flex items-center justify-between rounded-2xl px-4 py-3 text-[0.95rem] font-semibold text-ink transition-colors hover:bg-paper focus-visible:bg-paper"
            >
              Ver todos los productos <Icon name="arrow" size={16} />
            </Link>
          </li>
        </ul>
      </div>
    </li>
  );
}
