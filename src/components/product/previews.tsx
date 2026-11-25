/**
 * Vista previa de personalización ("Así quedará tu producto").
 *
 * Arquitectura: cada `preview_kind` de producto tiene un renderer. Para agregar
 * un mockup nuevo (ej. poleras), crea el componente y regístralo en `renderers`,
 * y luego elige ese tipo en /admin al editar el producto. Más adelante estos
 * renderers pueden reemplazarse por un editor con canvas o un mockup 3D.
 */
import { useId, type ReactNode } from "react";
import type { ArtKey, PreviewKind } from "@/lib/types";
import { MugPreview, ProductArt, type MugPrint } from "./ProductArt";

export interface PreviewProps {
  print: MugPrint;
  /** Foto del producto en blanco subida en el panel (reemplaza el dibujo). */
  mockup?: string | null;
  variantName: string | null;
  art: ArtKey | null;
  productName: string;
}

function Surface({ viewBox, label, children }: { viewBox: string; label: string; children: ReactNode }) {
  return (
    <svg viewBox={viewBox} className="h-full w-full" role="img" aria-label={label}>
      {children}
    </svg>
  );
}

function PrintContent({ id, print, x, y, w, h, ink = "#141217", circle = false }: { id: string; print: MugPrint; x: number; y: number; w: number; h: number; ink?: string; circle?: boolean }) {
  const hasText = Boolean(print.text?.trim() || print.name?.trim());
  const cx = x + w / 2;
  return (
    <>
      <defs>
        <linearGradient id={`${id}-g`} x1="0" x2="1">
          <stop offset="0" stopColor="#E0312F" />
          <stop offset="0.3" stopColor="#F0643A" />
          <stop offset="0.6" stopColor="#D9307F" />
          <stop offset="1" stopColor="#6A45A0" />
        </linearGradient>
        <clipPath id={`${id}-c`}>
          {circle ? <circle cx={x + w / 2} cy={y + h / 2} r={Math.min(w, h) / 2} /> : <rect x={x} y={y} width={w} height={h} rx="8" />}
        </clipPath>
      </defs>
      <g clipPath={`url(#${id}-c)`}>
        {print.image && <image href={print.image} x={x} y={y} width={w} height={hasText ? h * 0.66 : h} preserveAspectRatio="xMidYMid slice" />}
        {!print.image && !hasText && (
          <>
            <rect x={x + 8} y={y + 8} width={w - 16} height={h - 16} rx="8" fill="none" stroke={ink} strokeOpacity="0.3" strokeDasharray="5 6" />
            <text x={cx} y={y + h / 2 + 4} textAnchor="middle" fontSize="13" fill={ink} fillOpacity="0.5" fontFamily="var(--font-inter)">
              Tu diseño aquí
            </text>
          </>
        )}
        {print.name?.trim() && (
          <text x={cx} y={print.image ? y + h * 0.82 : y + h * 0.45} textAnchor="middle" fontSize={Math.min(34, (w / Math.max(4, print.name.length)) * 1.6)} fontWeight="700" fontFamily="var(--font-bricolage)" fill={`url(#${id}-g)`}>
            {print.name.trim().slice(0, 18)}
          </text>
        )}
        {print.text?.trim() && (
          <text x={cx} y={print.image ? y + h * 0.95 : y + h * 0.62} textAnchor="middle" fontSize={print.text.length > 24 ? 13 : 17} fontStyle="italic" fontFamily="var(--font-instrument)" fill={ink}>
            {print.text.trim().slice(0, 34)}
          </text>
        )}
      </g>
    </>
  );
}

function MugRenderer({ print, variantName }: PreviewProps) {
  const v = (variantName ?? "").toLowerCase();
  return <MugPreview print={print} dark={v.includes("mágica")} interior={v.includes("color") ? "#D9307F" : undefined} className="h-full w-full" />;
}

function NotebookRenderer({ print, productName }: PreviewProps) {
  const id = useId().replace(/:/g, "");
  return (
    <Surface viewBox="0 0 400 500" label={`Vista previa de ${productName}`}>
      <ellipse cx="200" cy="452" rx="140" ry="14" fill="#141217" opacity="0.08" />
      <rect x="96" y="66" width="220" height="380" rx="14" fill="#fff" />
      <rect x="90" y="60" width="220" height="380" rx="14" fill="#F4EFE8" stroke="#E7E0D6" />
      <rect x="90" y="60" width="24" height="380" rx="10" fill="#6A45A0" />
      <PrintContent id={id} print={print} x={132} y={120} w={160} h={220} />
    </Surface>
  );
}

function ToteRenderer({ print, productName }: PreviewProps) {
  const id = useId().replace(/:/g, "");
  return (
    <Surface viewBox="0 0 400 500" label={`Vista previa de ${productName}`}>
      <ellipse cx="200" cy="456" rx="150" ry="14" fill="#141217" opacity="0.08" />
      <path d="M140 170c0-100 120-100 120 0" fill="none" stroke="#E7DBC4" strokeWidth="14" />
      <path d="M92 166h216l16 280H76Z" fill="#F4EBD9" />
      <PrintContent id={id} print={print} x={120} y={210} w={160} h={190} />
    </Surface>
  );
}

function GenericRenderer({ print, art, productName }: PreviewProps) {
  const id = useId().replace(/:/g, "");
  return (
    <div className="relative h-full w-full">
      <ProductArt art={art ?? "stickers"} bare className="absolute inset-0 h-full w-full opacity-40" />
      <div className="absolute inset-0 grid place-items-center">
        <svg viewBox="0 0 240 240" className="w-[62%] drop-shadow-xl" role="img" aria-label={`Vista previa del diseño para ${productName}`}>
          <circle cx="120" cy="120" r="116" fill="#fff" />
          <circle cx="120" cy="120" r="104" fill="none" stroke="#D9307F" strokeWidth="3" strokeDasharray="2 8" strokeLinecap="round" />
          <PrintContent id={id} print={print} x={40} y={40} w={160} h={160} />
        </svg>
      </div>
    </div>
  );
}

function MockupRenderer({ print, productName, mockup }: PreviewProps) {
  const id = useId().replace(/:/g, "");
  return (
    <div className="relative h-full w-full">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={mockup ?? ""} alt="" className="absolute inset-0 h-full w-full object-contain" />
      <svg viewBox="0 0 400 500" className="absolute inset-0 h-full w-full" role="img" aria-label={`Vista previa de ${productName}`}>
        <PrintContent id={id} print={print} x={135} y={175} w={130} h={150} />
      </svg>
    </div>
  );
}

/** Chapitas y placas: la foto llena el círculo, con borde metálico. */
function RoundRenderer({ print, productName }: PreviewProps) {
  const id = useId().replace(/:/g, "");
  return (
    <Surface viewBox="0 0 400 500" label={`Vista previa de ${productName}`}>
      <defs>
        <linearGradient id={`${id}-metal`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f4f4f5" />
          <stop offset="0.45" stopColor="#a1a1aa" />
          <stop offset="0.55" stopColor="#d4d4d8" />
          <stop offset="1" stopColor="#71717a" />
        </linearGradient>
      </defs>
      <ellipse cx="200" cy="420" rx="120" ry="14" fill="#141217" opacity="0.1" />
      <circle cx="200" cy="245" r="150" fill={`url(#${id}-metal)`} />
      <circle cx="200" cy="245" r="138" fill="#fff" />
      <PrintContent id={id} print={print} x={62} y={107} w={276} h={276} circle />
      <circle cx="200" cy="245" r="138" fill="none" stroke="#fff" strokeOpacity="0.5" strokeWidth="2" />
      <ellipse cx="150" cy="170" rx="60" ry="26" fill="#fff" opacity="0.18" transform="rotate(-30 150 170)" />
    </Surface>
  );
}

/** Cuadros, fotos, calendarios y tarjetas: la foto llena el rectángulo. */
function RectRenderer({ print, productName }: PreviewProps) {
  const id = useId().replace(/:/g, "");
  return (
    <Surface viewBox="0 0 400 500" label={`Vista previa de ${productName}`}>
      <ellipse cx="200" cy="395" rx="160" ry="14" fill="#141217" opacity="0.1" />
      <rect x="26" y="118" width="348" height="264" rx="10" fill="#fff" stroke="#e7e0d6" strokeWidth="2" />
      <PrintContent id={id} print={print} x={40} y={132} w={320} h={236} />
    </Surface>
  );
}

/** Botella o vaso: área de impresión en el cuerpo. */
function BottleRenderer({ print, productName }: PreviewProps) {
  const id = useId().replace(/:/g, "");
  return (
    <Surface viewBox="0 0 400 500" label={`Vista previa de ${productName}`}>
      <ellipse cx="200" cy="472" rx="90" ry="10" fill="#141217" opacity="0.1" />
      <rect x="168" y="22" width="64" height="40" rx="8" fill="#1f1f23" />
      <path d="M176 62h48v24c0 10 46 30 46 64v300c0 12-10 22-22 22H152c-12 0-22-10-22-22V150c0-34 46-54 46-64Z" fill="#fafafa" stroke="#e4e4e7" strokeWidth="2" />
      <PrintContent id={id} print={print} x={140} y={190} w={120} h={154} />
      <rect x="134" y="150" width="14" height="290" rx="7" fill="#fff" opacity="0.55" />
    </Surface>
  );
}

/** Poleras, polerones, buzos y uniformes: el diseño va en el pecho. */
function ShirtRenderer({ print, productName, variantName }: PreviewProps) {
  const id = useId().replace(/:/g, "");
  const v = (variantName ?? productName).toLowerCase();
  const dark = /negr|azul marino|marino|gris oscuro/.test(v);
  const hoodie = /poler[oó]n|buzo|canguro/.test(productName.toLowerCase());
  const body = dark ? "#26262b" : "#fafafa";
  const line = dark ? "#3f3f46" : "#e4e4e7";
  return (
    <Surface viewBox="0 0 400 500" label={`Vista previa de ${productName}`}>
      <ellipse cx="200" cy="470" rx="140" ry="12" fill="#141217" opacity="0.08" />
      <path
        d={
          hoodie
            ? "M150 70c10 26 90 26 100 0l70 30 52 108-50 26-26-44v268H104V190l-26 44-50-26 52-108Z"
            : "M152 62c8 30 88 30 96 0l78 30 46 96-56 30-22-38v274H106V180l-22 38-56-30 46-96Z"
        }
        fill={body}
        stroke={line}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {hoodie ? (
        <path d="M150 70c4 44 96 44 100 0-10 50-90 50-100 0Z" fill={line} opacity="0.6" />
      ) : (
        <path d="M152 62c8 30 88 30 96 0" fill="none" stroke={line} strokeWidth="6" />
      )}
      {hoodie && <path d="M140 360h120v60H140Z" fill="none" stroke={line} strokeWidth="2" />}
      <PrintContent id={id} print={print} x={140} y={140} w={120} h={146} ink={dark ? "#fff" : "#141217"} />
    </Surface>
  );
}

/** Cojín: el diseño cubre el frente. */
function PillowRenderer({ print, productName }: PreviewProps) {
  const id = useId().replace(/:/g, "");
  return (
    <Surface viewBox="0 0 400 500" label={`Vista previa de ${productName}`}>
      <ellipse cx="200" cy="420" rx="150" ry="14" fill="#141217" opacity="0.1" />
      <path d="M60 110q140-24 280 0q22 140 0 280q-140 24-280 0q-22-140 0-280Z" fill="#fff" stroke="#e7e0d6" strokeWidth="2" />
      <PrintContent id={id} print={print} x={82} y={130} w={236} h={240} />
      <path d="M60 110q140-24 280 0q22 140 0 280q-140 24-280 0q-22-140 0-280Z" fill="none" stroke="#141217" strokeOpacity="0.06" strokeWidth="14" />
    </Surface>
  );
}

/** Saco o bolsa dulcera: bolsita con cordón. */
function BagRenderer({ print, productName }: PreviewProps) {
  const id = useId().replace(/:/g, "");
  return (
    <Surface viewBox="0 0 400 500" label={`Vista previa de ${productName}`}>
      <ellipse cx="200" cy="452" rx="130" ry="12" fill="#141217" opacity="0.1" />
      <path d="M96 120h208l16 300q0 20-20 20H100q-20 0-20-20Z" fill="#f4ebd9" stroke="#e7dbc4" strokeWidth="2" />
      <path d="M96 140q104 18 208 0" fill="none" stroke="#c7a46b" strokeWidth="5" />
      <path d="M150 142q-20 40 -6 70M250 142q20 40 6 70" fill="none" stroke="#c7a46b" strokeWidth="4" strokeLinecap="round" />
      <PrintContent id={id} print={print} x={118} y={190} w={164} h={190} />
    </Surface>
  );
}

/** Reloj: la foto es la esfera, con las agujas encima. */
function ClockRenderer({ print, productName }: PreviewProps) {
  const id = useId().replace(/:/g, "");
  return (
    <Surface viewBox="0 0 400 500" label={`Vista previa de ${productName}`}>
      <ellipse cx="200" cy="430" rx="120" ry="12" fill="#141217" opacity="0.1" />
      <circle cx="200" cy="245" r="156" fill="#1f1f23" />
      <circle cx="200" cy="245" r="142" fill="#fff" />
      <PrintContent id={id} print={print} x={62} y={107} w={276} h={276} circle />
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i * Math.PI) / 6;
        return <line key={i} x1={200 + Math.sin(a) * 124} y1={245 - Math.cos(a) * 124} x2={200 + Math.sin(a) * 136} y2={245 - Math.cos(a) * 136} stroke="#fff" strokeWidth="4" strokeLinecap="round" />;
      })}
      <line x1="200" y1="245" x2="200" y2="170" stroke="#fff" strokeWidth="7" strokeLinecap="round" />
      <line x1="200" y1="245" x2="256" y2="268" stroke="#fff" strokeWidth="5" strokeLinecap="round" />
      <circle cx="200" cy="245" r="9" fill="#fff" />
    </Surface>
  );
}

const renderers: Record<PreviewKind, (p: PreviewProps) => ReactNode> = {
  mug: MugRenderer,
  notebook: NotebookRenderer,
  tote: ToteRenderer,
  generic: GenericRenderer,
  round: RoundRenderer,
  rect: RectRenderer,
  bottle: BottleRenderer,
  shirt: ShirtRenderer,
  pillow: PillowRenderer,
  bag: BagRenderer,
  clock: ClockRenderer,
};

export function CustomizationPreview({ kind, ...props }: PreviewProps & { kind: PreviewKind }) {
  if (props.mockup) return <MockupRenderer {...props} />;
  const Renderer = renderers[kind] ?? renderers.generic;
  return <Renderer {...props} />;
}
