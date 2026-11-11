"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { nav } from "@/lib/site";
import { cartCount, useCart, useUI } from "@/lib/stores";
import { cn } from "@/lib/format";
import { Icon } from "@/components/ui/Icon";
import { Logo } from "./Logo";
import { NavLink } from "./NavLink";
import { NavDropdown } from "./NavDropdown";

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const count = useCart((s) => cartCount(s.items));
  const { open, overlay } = useUI();

  useEffect(() => {
    setMounted(true);
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Atajos: "/" o Ctrl/Cmd+K abren la búsqueda
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const typing = target.closest("input, textarea, select, [contenteditable]");
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !typing)) {
        e.preventDefault();
        open("search");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const isActive = (href: string) => (href === "/" ? pathname === "/" : !href.includes("#") && pathname.startsWith(href));

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-2 pt-2 sm:px-4 sm:pt-3" data-header>
      <div
        className={cn(
          "mx-auto flex h-14 items-center justify-between gap-3 rounded-full px-3 transition-[max-width,background-color,box-shadow,border-color,backdrop-filter] duration-500 ease-[var(--ease-out-expo)] sm:h-16 sm:px-5",
          scrolled
            ? "max-w-6xl border border-white/70 bg-white/70 shadow-[0_8px_32px_-12px_rgb(20_18_23/0.18)] backdrop-blur-xl backdrop-saturate-150"
            : "max-w-[88rem] border border-transparent bg-transparent",
        )}
      >
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="grid size-11 place-items-center rounded-full lg:hidden"
            aria-label="Abrir menú"
            aria-expanded={overlay === "menu"}
            onClick={() => open("menu")}
          >
            <Icon name="menu" />
          </button>
          <Logo size={scrolled ? 38 : 46} priority className="transition-[width] duration-500" />
        </div>

        <nav aria-label="Principal" className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {nav.map((item) =>
              item.children ? (
                <NavDropdown key={item.href} item={item} active={isActive(item.href)} />
              ) : (
              <li key={item.href}>
                <NavLink
                  href={item.href}
                  aria-current={isActive(item.href) ? "page" : undefined}
                  className="group relative rounded-full px-3.5 py-2 text-[0.92rem] font-medium text-ink-2 transition-colors hover:text-ink aria-[current=page]:text-ink"
                >
                  {item.label}
                  <span className="bg-gradient-minerva absolute inset-x-3.5 -bottom-0.5 h-0.5 origin-left scale-x-0 rounded-full transition-transform duration-500 ease-[var(--ease-out-expo)] group-hover:scale-x-100 group-aria-[current=page]:scale-x-100" />
                </NavLink>
              </li>
              ),
            )}
          </ul>
        </nav>

        <div className="flex items-center gap-0.5 sm:gap-1">
          <button
            type="button"
            onClick={() => open("search")}
            className="grid size-11 place-items-center rounded-full transition-colors hover:bg-ink/5"
            aria-label="Buscar productos"
          >
            <Icon name="search" />
          </button>
          <Link
            href="/cuenta"
            className="hidden size-11 place-items-center rounded-full transition-colors hover:bg-ink/5 sm:grid"
            aria-label="Mi cuenta"
          >
            <Icon name="user" />
          </Link>
          <button
            type="button"
            onClick={() => open("cart")}
            className="relative grid size-11 place-items-center rounded-full transition-colors hover:bg-ink/5"
            aria-label={`Abrir carrito${mounted && count ? `, ${count} productos` : ""}`}
          >
            <Icon name="bag" />
            {mounted && count > 0 && (
              <span
                key={count}
                className="bg-gradient-minerva absolute right-0.5 top-0.5 grid min-w-5 animate-[fade-up_0.5s_var(--ease-out-expo)] place-items-center rounded-full px-1 text-[0.68rem] font-bold leading-5 text-white"
              >
                {count}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
