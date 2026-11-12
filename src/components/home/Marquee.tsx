const ITEMS = ["Sublimación", "Papelería", "Estampado textil", "Uniformes corporativos", "Calendarios y cuadernos", "Regalos personalizados", "Hecho en Chile"];
const DOTS = ["bg-m-red", "bg-m-orange", "bg-m-yellow", "bg-m-green", "bg-m-blue", "bg-m-violet", "bg-m-magenta"];

export function Marquee() {
  const row = (hidden: boolean) => (
    <ul className="flex shrink-0 items-center" aria-hidden={hidden || undefined}>
      {ITEMS.map((item, i) => (
        <li key={item} className="flex items-center gap-8 pr-8">
          <span className="display text-[clamp(1.75rem,4vw,3rem)] font-medium tracking-tight">{item}</span>
          <span className={`size-3 rounded-full ${DOTS[i % DOTS.length]}`} />
        </li>
      ))}
    </ul>
  );
  return (
    <section aria-label="Lo que hacemos" className="group relative overflow-hidden border-y border-line bg-white/50 py-6">
      <div className="flex w-max animate-marquee group-hover:[animation-play-state:paused] motion-reduce:animate-none">
        {row(false)}
        {row(true)}
      </div>
    </section>
  );
}
