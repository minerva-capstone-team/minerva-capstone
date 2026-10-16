"use client";
import { useState } from "react";
import Link from "next/link";
import { adminDb, errorMessage, notifyCustomer } from "@/lib/admin";
import { cn } from "@/lib/format";
import { toast } from "@/lib/stores";

export const PROOFS_BUCKET = "design-proofs";

export interface ProofRow {
  id: string;
  version: number;
  status: "pendiente" | "aprobado" | "cambios" | "reemplazado";
  image_url: string;
  note: string | null;
  customer_comment: string | null;
  created_at: string;
  responded_at: string | null;
}

const PROOF_TEXT: Record<ProofRow["status"], string> = { pendiente: "Esperando aprobación", aprobado: "Aprobado", cambios: "Pidió cambios", reemplazado: "Reemplazado" };

const PROOF_TONE: Record<ProofRow["status"], string> = {
  pendiente: "bg-m-yellow/20 text-[#8a5a00]",
  aprobado: "bg-m-green/15 text-[#1c6b51]",
  cambios: "bg-m-red/10 text-m-red",
  reemplazado: "bg-ink/10 text-ink-soft",
};

/** Sube una prueba de diseño; la clienta la aprueba o pide cambios desde /seguimiento. */
export function DesignProofsSection({ orderId, proofs, onChanged }: { orderId: string; proofs: ProofRow[]; onChanged: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const sorted = [...proofs].sort((a, b) => b.version - a.version);

  const upload = async () => {
    if (!file) return;
    if (!/^image\//.test(file.type)) return toast({ title: "Sube una imagen (JPG, PNG o WebP)", tone: "error" });
    if (file.size > 8 * 1024 * 1024) return toast({ title: "La imagen pesa más de 8 MB", tone: "error" });
    setBusy(true);
    const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
    const path = `${orderId}/${Date.now()}.${ext}`;
    const db = adminDb();
    const { error: upErr } = await db.storage.from(PROOFS_BUCKET).upload(path, file, { contentType: file.type });
    if (upErr) {
      setBusy(false);
      return toast({ title: "No se pudo subir la imagen", description: errorMessage(upErr), tone: "error" });
    }
    const image_url = db.storage.from(PROOFS_BUCKET).getPublicUrl(path).data.publicUrl;
    const { error } = await db.from("design_proofs").insert({ order_id: orderId, image_url, image_path: path, note: note.trim() || null });
    setBusy(false);
    if (error) return toast({ title: "No se pudo guardar la prueba", description: errorMessage(error), tone: "error" });
    setFile(null);
    setNote("");
    onChanged();
    const res = await notifyCustomer(orderId, "proof");
    toast(
      res.sent
        ? { title: "Prueba enviada", description: "Le avisamos por correo para que la revise." }
        : { title: "Prueba guardada", description: "La clienta la verá en /seguimiento. Avísale por WhatsApp si el correo no está disponible.", tone: "info" },
    );
  };

  return (
    <div>
      <p className="label">Aprobación de diseño</p>
      {sorted.length > 0 && (
        <ul className="mb-3 space-y-2">
          {sorted.map((p) => (
            <li key={p.id} className="flex gap-3 rounded-2xl bg-paper-2 p-3 text-sm">
              <a href={p.image_url} target="_blank" rel="noopener noreferrer" className="shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.image_url} alt={`Prueba versión ${p.version}`} className="size-14 rounded-xl object-cover ring-1 ring-line" />
              </a>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">v{p.version}</span>
                  <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", PROOF_TONE[p.status])}>{PROOF_TEXT[p.status]}</span>
                </span>
                {p.note && <span className="mt-1 block text-ink-soft">Nota: {p.note}</span>}
                {p.customer_comment && <span className="mt-1 block">Clienta: “{p.customer_comment}”</span>}
              </span>
            </li>
          ))}
        </ul>
      )}
      <input type="file" accept="image/*" className="field py-2 text-sm" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      <input className="field mt-2" placeholder="Nota para la clienta (opcional)" maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
      <button type="button" disabled={!file || busy} className="btn btn-primary mt-2 w-full" onClick={() => void upload()}>
        {busy ? "Subiendo…" : sorted.length ? "Subir nueva versión" : "Enviar prueba de diseño"}
      </button>
    </div>
  );
}

export function GiftSection({ orderId, message, from, openedAt }: { orderId: string; message: string; from: string | null; openedAt: string | null }) {
  return (
    <div className="rounded-2xl border border-dashed border-line p-4 text-sm">
      <p className="label">Regalo con mensaje secreto</p>
      <p className="whitespace-pre-line">“{message}”</p>
      {from && <p className="mt-1 text-ink-soft">— {from}</p>}
      <p className="mt-2 text-xs text-ink-soft">{openedAt ? `Abierto el ${new Date(openedAt).toLocaleString("es-CL", { dateStyle: "medium", timeStyle: "short" })}` : "Aún no lo abren"}</p>
      <Link href={`/admin/regalo/${orderId}`} className="btn btn-ghost mt-3 w-full">
        Imprimir tarjeta con QR
      </Link>
    </div>
  );
}
