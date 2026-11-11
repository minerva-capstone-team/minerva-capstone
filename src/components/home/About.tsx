import Image from "next/image";
import { Icon, type IconName } from "@/components/ui/Icon";

const VALUES: { icon: IconName; title: string; text: string; color: string }[] = [
  { icon: "brush", title: "Diseño a tu medida", text: "Te ayudamos a bajar tu idea a un diseño que se vea increíble impreso.", color: "text-m-magenta" },
  { icon: "heart", title: "Hecho con dedicación", text: "Cada pieza se estampa y revisa a mano, una por una.", color: "text-m-red" },
  { icon: "box", title: "Empaque con cariño", text: "Tus pedidos llegan protegidos y listos para regalar.", color: "text-m-violet" },
  { icon: "truck", title: "Envíos a todo Chile", text: "Coordinamos el despacho a tu comuna o retiro.", color: "text-m-blue" },
];

export function About() {
  return (
    <section id="nosotros" aria-labelledby="nosotros-title" className="container-x py-24 md:py-32">
      <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
        <div data-reveal className="lg:col-span-5">
          <p className="eyebrow">Nosotros</p>
          <h2 id="nosotros-title" className="display mt-4 text-[clamp(2.25rem,5vw,4rem)]">
            Arte y color <span className="serif-accent">para lo que</span> más quieres
          </h2>
          <div className="mt-8 flex items-center gap-4">
            <Image src="/brand/minerva-logo.png" alt="" width={104} height={105} className="h-16 w-auto" />
            <p className="text-ink-soft">
              Minerva es un taller chileno de estampados y papelería personalizada. Creemos que los mejores regalos son los que cuentan una historia, y
              nuestro trabajo es ayudarte a contarla.
            </p>
          </div>
          <div className="relative mt-8 aspect-[3/2] overflow-hidden rounded-[1.75rem]">
            <Image src="/fotos/13-taller.webp" alt="Mesa de trabajo del taller con plancha de transferencia y tazas por estampar" fill sizes="(min-width: 1024px) 40vw, 100vw" className="object-cover" />
          </div>
        </div>
        <ul data-reveal="stagger" className="grid gap-4 sm:grid-cols-2 lg:col-span-7">
          {VALUES.map((v) => (
            <li key={v.title} className="rounded-[1.75rem] border border-line bg-white p-6 transition-shadow duration-500 hover:shadow-[var(--shadow-lift)] sm:p-7">
              <span className={`grid size-12 place-items-center rounded-2xl bg-paper ${v.color}`}>
                <Icon name={v.icon} size={24} />
              </span>
              <h3 className="display mt-5 text-2xl">{v.title}</h3>
              <p className="mt-2 text-ink-soft">{v.text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
