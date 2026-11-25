"use client";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";

const SLIDES = [
  { src: "/banners/tazon-mug.webp", alt: "Tazón Mug personalizado con tu logo o diseño", href: "/productos/mug-termico" },
  { src: "/banners/cuadro-ceramica.webp", alt: "Cuadro de cerámica personalizado con tu foto", href: "/productos/cuadro-tipo-piedra-19x14-cm" },
  { src: "/banners/fotografias.webp", alt: "Promoción fotografías: 100 fotos 10x14 a $10.000 y 100 fotos 13x18 a $17.000", href: "/productos?q=fotograf%C3%ADas" },
  { src: "/banners/botella-750.webp", alt: "Botella de 750 ml personalizada con tu imagen", href: "/productos/botella-acero-inox-750cc" },
  { src: "/banners/vaso-cervecero.webp", alt: "Vaso cervecero personalizado", href: "/productos/vaso-cervecero" },
  { src: "/banners/placa-mascotas.webp", alt: "Placa de identificación para mascotas", href: "/productos/placa-mascotas" },
  { src: "/banners/llaveros.webp", alt: "Llaveros metálicos sublimados", href: "/productos?categoria=sublimacion" },
];

/** Carrusel de la portada: se desliza con el dedo, flechas o puntos, y avanza solo (se pausa al interactuar). */
export function HeroCarousel() {
  const track = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const n = SLIDES.length;

  const go = useCallback(
    (i: number) => {
      const el = track.current;
      if (!el) return;
      const k = (i + n) % n;
      el.scrollTo({ left: k * el.clientWidth, behavior: "smooth" });
    },
    [n],
  );

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const onScroll = () => setIndex(Math.round(el.scrollLeft / Math.max(1, el.clientWidth)));
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setTimeout(() => go(index + 1), 6000);
    return () => clearTimeout(t);
  }, [index, paused, go]);

  return (
    <section
      aria-roledescription="carrusel"
      aria-label="Productos destacados"
      className="container-x pt-20 sm:pt-24 md:pt-28"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      onTouchStart={() => setPaused(true)}
    >
      <div className="relative mx-auto max-w-5xl">
        <div
          ref={track}
          className="flex snap-x snap-mandatory overflow-x-auto rounded-[1.25rem] bg-paper-2 shadow-[var(--shadow-soft)] [scrollbar-width:none] sm:rounded-[2rem] [&::-webkit-scrollbar]:hidden"
        >
          {SLIDES.map((s, i) => (
            <Link
              key={s.src}
              href={s.href}
              className="relative aspect-[3/2] w-full shrink-0 snap-center"
              aria-roledescription="diapositiva"
              aria-label={`${i + 1} de ${n}: ${s.alt}`}
              tabIndex={i === index ? 0 : -1}
            >
              <Image src={s.src} alt={s.alt} fill priority={i === 0} sizes="(min-width: 1024px) 64rem, 100vw" className="object-cover" />
            </Link>
          ))}
        </div>

        <button
          type="button"
          onClick={() => go(index - 1)}
          className="absolute left-3 top-1/2 hidden size-12 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-ink shadow-lg backdrop-blur transition hover:bg-white sm:grid"
          aria-label="Anterior"
        >
          <Icon name="arrow" size={20} className="rotate-180" />
        </button>
        <button
          type="button"
          onClick={() => go(index + 1)}
          className="absolute right-3 top-1/2 hidden size-12 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-ink shadow-lg backdrop-blur transition hover:bg-white sm:grid"
          aria-label="Siguiente"
        >
          <Icon name="arrow" size={20} />
        </button>

        <div className="mt-4 flex items-center justify-center gap-2" role="group" aria-label="Elegir diapositiva">
          {SLIDES.map((s, i) => (
            <button
              key={s.src}
              type="button"
              onClick={() => go(i)}
              aria-label={`Ir a la diapositiva ${i + 1}`}
              aria-current={i === index}
              className={`h-2.5 rounded-full transition-all duration-500 ${i === index ? "w-8 bg-ink" : "w-2.5 bg-ink/20 hover:bg-ink/40"}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
