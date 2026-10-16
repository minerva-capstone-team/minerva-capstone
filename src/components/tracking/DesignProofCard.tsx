"use client";
import { useState } from "react";
import { getBrowserSupabase } from "@/lib/supabase/client";
import type { DesignProof } from "@/lib/tracking";

/** Prueba del diseño personalizado: la clienta la aprueba o pide cambios (con comentario). */
export function DesignProofCard({ proof, orderNumber, email, onChange }: { proof: DesignProof; orderNumber: string; email: string; onChange: (p: DesignProof) => void }) {
  const [mode, setMode] = useState<"idle" | "changes">("idle");
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const respond = async (approve: boolean) => {
    const sb = getBrowserSupabase();
    if (!sb) return;
    if (!approve && !comment.trim()) return setError("Cuéntanos qué te gustaría cambiar.");
    setBusy(true);
    setError(null);
    const { data, error: err } = await sb.rpc("respond_design_proof", {
      p_order_number: orderNumber,
      p_email: email,
      p_proof_id: proof.id,
      p_approve: approve,
      p_comment: approve ? null : comment,
    });
    setBusy(false);
    if (err) return setError(/not pending/.test(err.message) ? "Esta prueba ya fue respondida o reemplazada. Vuelve a consultar tu pedido." : "No pudimos guardar tu respuesta. Inténtalo de nuevo.");
    onChange({ ...proof, status: (data as { status: DesignProof["status"] }).status, customer_comment: approve ? null : comment.trim() });
  };

  return (
    <div className="mt-8 overflow-hidden rounded-3xl border border-line">
      <div className="flex items-center justify-between gap-3 bg-paper-2 px-5 py-3">
        <h3 className="font-semibold">Prueba de tu diseño</h3>
        <span className="text-xs text-ink-soft">Versión {proof.version}</span>
      </div>
      <a href={proof.image_url} target="_blank" rel="noopener noreferrer" className="block bg-white">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={proof.image_url} alt={`Prueba del diseño, versión ${proof.version}`} className="mx-auto max-h-96 w-auto object-contain" />
      </a>
      <div className="space-y-3 p-5">
        {proof.note && <p className="text-sm text-ink-2">Nota de Minerva: {proof.note}</p>}

        {proof.status === "aprobado" && <p className="rounded-2xl bg-m-green/12 p-4 text-sm font-medium text-[#1c6b51]">✓ Aprobaste este diseño. Ya lo estamos preparando.</p>}
        {proof.status === "cambios" && (
          <p className="rounded-2xl bg-m-yellow/15 p-4 text-sm text-ink-2">
            Pediste cambios: “{proof.customer_comment}”. Te enviaremos una nueva versión.
          </p>
        )}

        {proof.status === "pendiente" && (
          <>
            <p className="text-sm text-ink-soft">Revísalo con calma: nombres, fechas, ortografía y la foto. Solo empezamos a estampar cuando lo apruebes.</p>
            {mode === "changes" && (
              <div>
                <label htmlFor="proof-comment" className="label">
                  ¿Qué cambiamos?
                </label>
                <textarea id="proof-comment" className="field resize-none" rows={3} maxLength={1000} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Ej: el nombre va con tilde, Martín" />
              </div>
            )}
            {error && <p role="alert" className="rounded-xl bg-m-red/10 p-3 text-sm text-m-red">{error}</p>}
            <div className="flex flex-col gap-2 sm:flex-row">
              {mode === "idle" ? (
                <>
                  <button type="button" disabled={busy} className="btn btn-primary flex-1" onClick={() => respond(true)}>
                    {busy ? "Guardando…" : "Aprobar diseño"}
                  </button>
                  <button type="button" disabled={busy} className="btn btn-ghost flex-1" onClick={() => setMode("changes")}>
                    Pedir cambios
                  </button>
                </>
              ) : (
                <>
                  <button type="button" disabled={busy} className="btn btn-primary flex-1" onClick={() => respond(false)}>
                    {busy ? "Enviando…" : "Enviar cambios"}
                  </button>
                  <button type="button" disabled={busy} className="btn btn-ghost flex-1" onClick={() => setMode("idle")}>
                    Volver
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
