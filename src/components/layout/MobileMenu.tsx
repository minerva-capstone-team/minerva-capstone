"use client";
import Link from "next/link";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { nav, site } from "@/lib/site";
import { useUI } from "@/lib/stores";
import { waLink } from "@/lib/whatsapp";
import { Overlay } from "@/components/ui/Overlay";
import { Icon, InstagramIcon, TikTokIcon, WhatsAppIcon } from "@/components/ui/Icon";
import { NavLink } from "./NavLink";

export function MobileMenu() {
  const { overlay, close } = useUI();
  const pathname = usePathname();
  const open = overlay === "menu";
  useEffect(() => close(), [pathname, close]);

  return (
    <Overlay
      open={open}
      onClose={close}
      label="Menú"
      side="left"
      panelClassName="left-0 top-0 flex h-dvh w-full max-w-sm flex-col bg-paper px-6 pb-8 pt-5 shadow-2xl"
    >
      <div className="flex items-center justify-between">
        <span className="eyebrow">Menú</span>
        <button type="button" onClick={close} className="grid size-11 place-items-center rounded-full hover:bg-ink/5" aria-label="Cerrar menú">
          <Icon name="x" />
        </button>
      </div>
      <nav aria-label="Menú móvil" className="mt-8">
        <ul className="space-y-1">
          {nav.map((item, i) => (
            <li
              key={item.href}
              className="transition-[transform,opacity] duration-700 ease-[var(--ease-out-expo)]"
              style={{ transitionDelay: open ? `${80 + i * 45}ms` : "0ms", transform: open ? "none" : "translateX(-16px)", opacity: open ? 1 : 0 }}
            >
              <NavLink href={item.href} onClick={close} className="display flex items-center justify-between py-2.5 text-[2rem] leading-tight">
                {item.label}
                <Icon name="arrow" className="text-ink-soft" />
              </NavLink>
              {item.children && (
                <ul className="mb-2 ml-1 space-y-0.5 border-l border-line pl-4">
                  {item.children.map((c) => (
                    <li key={c.href}>
                      <NavLink href={c.href} onClick={close} className="block py-1.5 text-base text-ink-soft hover:text-ink">
                        {c.label}
                      </NavLink>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
          <li className="pt-2">
            <Link href="/cuenta" onClick={close} className="flex items-center gap-2 py-2 font-medium text-ink-2">
              <Icon name="user" /> Mi cuenta
            </Link>
          </li>
        </ul>
      </nav>
      <div className="mt-auto space-y-3">
        <a href={waLink()} target="_blank" rel="noopener noreferrer" className="btn btn-wa w-full">
          <WhatsAppIcon /> Escríbenos por WhatsApp
        </a>
        <div className="flex gap-2">
          <a href={site.instagram.url} target="_blank" rel="noopener noreferrer" className="btn btn-ghost flex-1" aria-label="Instagram de Minerva">
            <InstagramIcon /> Instagram
          </a>
          <a href={site.tiktok.url} target="_blank" rel="noopener noreferrer" className="btn btn-ghost flex-1" aria-label="TikTok de Minerva">
            <TikTokIcon /> TikTok
          </a>
        </div>
      </div>
    </Overlay>
  );
}
