"use client";
import { Overlay } from "@/components/ui/Overlay";

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Eliminar",
  busyLabel = "Eliminando…",
  onConfirm,
  onCancel,
  busy,
}: {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  busyLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  busy?: boolean;
}) {
  return (
    <Overlay
      open={open}
      onClose={onCancel}
      label={title}
      side="center"
      panelClassName="inset-0 m-auto h-fit w-[calc(100%-2rem)] max-w-md rounded-3xl bg-white p-6 shadow-2xl"
    >
      <div>
        <h2 className="display text-2xl">{title}</h2>
        {description && <p className="mt-2 text-ink-soft">{description}</p>}
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" className="btn btn-ghost" onClick={onCancel} data-autofocus>
            Cancelar
          </button>
          <button type="button" className="btn bg-m-red text-white hover:bg-[#c02524]" onClick={onConfirm} disabled={busy}>
            {busy ? busyLabel : confirmLabel}
          </button>
        </div>
      </div>
    </Overlay>
  );
}
