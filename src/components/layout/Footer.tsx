import Link from "next/link";
import { site } from "@/lib/site";
import { waLink } from "@/lib/whatsapp";
import { InstagramIcon, TikTokIcon, WhatsAppIcon } from "@/components/ui/Icon";
import { ChileFlag } from "@/components/ui/ChileFlag";
import { Logo } from "./Logo";

const columns = [
  {
    title: "Tienda",
    links: [
      { label: "Todos los productos", href: "/productos" },
      { label: "Tazas", href: "/productos?categoria=tazas" },
      { label: "Papelería", href: "/productos?categoria=papeleria" },
      { label: "Stickers", href: "/productos?categoria=stickers" },
      { label: "Eventos", href: "/productos?categoria=eventos" },
    ],
  },
  {
    title: "Ayuda",
    links: [
      { label: "Cómo personalizar", href: "/#personaliza" },
      { label: "Preguntas frecuentes", href: "/#faq" },
      { label: "Seguir mi pedido", href: "/seguimiento" },
      { label: "Mi cuenta y pedidos", href: "/cuenta" },
      { label: "Nosotros", href: "/#nosotros" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="relative mt-24 overflow-hidden border-t border-line bg-paper-2/60">
      <div className="bg-gradient-minerva h-1 w-full opacity-80" />
      <div className="container-x grid gap-12 py-16 md:grid-cols-12 md:py-20">
        <div className="md:col-span-4">
          <Logo size={72} />
          <p className="mt-5 max-w-xs text-lg leading-snug text-ink-2">
            {site.tagline.replace(" 🇨🇱", "")} <ChileFlag className="ml-1 inline-block align-[-0.1em]" />
          </p>
          <div className="mt-6 flex gap-2">
            <a href={site.instagram.url} target="_blank" rel="noopener noreferrer" className="grid size-11 place-items-center rounded-full border border-line bg-white transition-colors hover:border-ink hover:bg-ink hover:text-white" aria-label="Instagram">
              <InstagramIcon />
            </a>
            <a href={site.tiktok.url} target="_blank" rel="noopener noreferrer" className="grid size-11 place-items-center rounded-full border border-line bg-white transition-colors hover:border-ink hover:bg-ink hover:text-white" aria-label="TikTok">
              <TikTokIcon />
            </a>
            <a href={waLink()} target="_blank" rel="noopener noreferrer" className="grid size-11 place-items-center rounded-full border border-line bg-white transition-colors hover:border-[#1faa59] hover:bg-[#1faa59] hover:text-white" aria-label="WhatsApp">
              <WhatsAppIcon />
            </a>
          </div>
        </div>

        {columns.map((col) => (
          <nav key={col.title} aria-label={col.title} className="md:col-span-2">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-ink-soft">{col.title}</h2>
            <ul className="mt-4 space-y-2.5">
              {col.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-ink-2 transition-colors hover:text-ink">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}

        <div className="md:col-span-2">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-ink-soft">Contacto</h2>
          <ul className="mt-4 space-y-2.5 text-ink-2">
            <li>
              <a href={waLink()} target="_blank" rel="noopener noreferrer" className="hover:text-ink">
                WhatsApp {site.whatsappDisplay}
              </a>
            </li>
            <li className="flex items-center gap-2">Envíos a todo Chile <ChileFlag /></li>
          </ul>
        </div>

        <div className="md:col-span-2">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-ink-soft">Redes sociales</h2>
          <ul className="mt-4 space-y-2.5 text-ink-2">
            <li>
              <a href={site.instagram.url} target="_blank" rel="noopener noreferrer" className="hover:text-ink">
                Instagram {site.instagram.handle}
              </a>
            </li>
            <li>
              <a href={site.tiktok.url} target="_blank" rel="noopener noreferrer" className="hover:text-ink">
                TikTok {site.tiktok.handle}
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="container-x flex flex-col items-start justify-between gap-3 border-t border-line py-6 text-sm text-ink-soft sm:flex-row sm:items-center">
        <p>© Minerva {new Date().getFullYear()} · Estampados y Papelería</p>
        <p className="flex items-center gap-2">Hecho con cariño en Chile <ChileFlag /></p>
      </div>

      <p aria-hidden="true" className="display pointer-events-none select-none whitespace-nowrap text-center text-[22vw] leading-[0.8] text-ink/[0.035]">
        minerva
      </p>
    </footer>
  );
}
