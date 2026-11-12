import { Icon, WhatsAppIcon } from "@/components/ui/Icon";
import { waLink } from "@/lib/whatsapp";

const ITEMS = ["Poleras", "Polerones", "Buzos", "Indumentaria deportiva", "Uniformes corporativos"];

/** El estampado textil se cotiza (no tiene precio fijo): se pide por WhatsApp. */
export function TextilQuote() {
  return (
    <div className="mt-8 rounded-[2rem] bg-white p-8 shadow-[var(--shadow-soft)] sm:p-12">
      <p className="eyebrow">Por cotización</p>
      <h2 className="display mt-3 text-[clamp(2rem,4.5vw,3.25rem)]">
        Estampado textil <span className="serif-accent text-gradient">y corporativo</span>
      </h2>
      <p className="mt-4 max-w-xl text-lg text-ink-soft">
        El valor depende de la cantidad, la prenda y el diseño. Cuéntanos qué necesitas y te enviamos la cotización por WhatsApp.
      </p>
      <ul className="mt-6 flex flex-wrap gap-2">
        {ITEMS.map((item) => (
          <li key={item} className="chip">
            <Icon name="check" size={14} /> {item}
          </li>
        ))}
      </ul>
      <a
        href={waLink("Hola Minerva 👋 Quiero cotizar estampado textil/corporativo (poleras, polerones, buzos, indumentaria deportiva o uniformes). ¿Me pueden ayudar?")}
        target="_blank"
        rel="noopener noreferrer"
        className="btn btn-wa mt-8"
      >
        <WhatsAppIcon /> Cotizar por WhatsApp
      </a>
    </div>
  );
}
