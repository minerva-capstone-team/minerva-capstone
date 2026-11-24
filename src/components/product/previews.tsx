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

function PrintContent({ id, print, x, y, w, h, ink = "#141217" }: { id: string; print: MugPrint; x: number; y: number; w: number; h: number; ink?: string }) {
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
          <rect x={x} y={y} width={w} height={h} rx="8" />
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

const renderers: Record<PreviewKind, (p: PreviewProps) => ReactNode> = {
  mug: MugRenderer,
  notebook: NotebookRenderer,
  tote: ToteRenderer,
  generic: GenericRenderer,
};

export function CustomizationPreview({ kind, ...props }: PreviewProps & { kind: PreviewKind }) {
  if (props.mockup) return <MockupRenderer {...props} />;
  const Renderer = renderers[kind] ?? renderers.generic;
  return <Renderer {...props} />;
}
