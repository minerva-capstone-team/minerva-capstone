"use client";
import QRCode from "qrcode";
import { use, useEffect, useState } from "react";
import { adminDb, errorMessage } from "@/lib/admin";
import { site } from "@/lib/site";
import { AdminHeader } from "@/components/admin/AdminShell";
import { Icon } from "@/components/ui/Icon";

const pretty = (code: string) => code.replace(/(.{4})(?=.)/g, "$1-");

export default function GiftCard({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [order, setOrder] = useState<{ order_number: string; gift_code: string | null; gift_from: string | null; gift_opened_at: string | null } | null | undefined>(undefined);
  const [svg, setSvg] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminDb()
      .from("orders")
      .select("order_number,gift_code,gift_from,gift_opened_at")
      .eq("id", id)
      .maybeSingle()
      .then(async ({ data, error }) => {
        if (error) return setError(errorMessage(error));
        setOrder(data);
        if (data?.gift_code) setSvg(await QRCode.toString(`${site.url}/regalo/${data.gift_code}`, { type: "svg", margin: 0, errorCorrectionLevel: "M", color: { dark: "#1d1a17", light: "#ffffff" } }));
      });
  }, [id]);

  const url = order?.gift_code ? `${site.url.replace(/^https?:\/\//, "")}/regalo/${pretty(order.gift_code)}` : "";

  return (
    <>
      <div className="print:hidden">
        <AdminHeader
          title="Tarjeta de regalo"
          description={order ? `Pedido ${order.order_number}. Imprímela y ponla dentro del paquete.` : undefined}
          action={
            order?.gift_code ? (
              <button type="button" className="btn btn-primary" onClick={() => window.print()}>
                <Icon name="receipt" size={18} /> Imprimir
              </button>
            ) : undefined
          }
        />
        {error && <p className="rounded-2xl bg-m-red/10 p-4 text-m-red">{error}</p>}
        {order === null && <p className="rounded-2xl bg-white p-6">Pedido no encontrado.</p>}
        {order && !order.gift_code && <p className="rounded-2xl bg-white p-6">Este pedido no tiene mensaje de regalo.</p>}
        {order?.gift_opened_at && <p className="mb-4 rounded-2xl bg-m-green/12 p-4 text-sm text-[#1c6b51]">El mensaje ya fue abierto el {new Date(order.gift_opened_at).toLocaleString("es-CL")}.</p>}
      </div>

      {order?.gift_code && svg && (
        <div className="flex justify-center print:block">
          {/* Tamaño tarjeta: 9 × 11 cm, con líneas de corte al imprimir */}
          <article className="relative w-[9cm] overflow-hidden rounded-[18px] bg-white text-center shadow-[var(--shadow-soft)] print:rounded-none print:shadow-none print:outline print:outline-1 print:outline-dashed print:outline-black/40" style={{ minHeight: "11cm" }}>
            <div className="bg-gradient-minerva h-2 w-full" />
            <div className="px-7 pb-6 pt-6">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/brand/minerva-logo.png" alt="Minerva" className="mx-auto h-12" />
              <p className="display mt-4 text-[22px] leading-tight">Tienes un mensaje secreto</p>
              <p className="mt-1.5 text-[13px] text-ink-soft">{order.gift_from ? `${order.gift_from} te dejó unas palabras.` : "Alguien especial te dejó unas palabras."} Escanea el código para leerlas.</p>
              <div className="mx-auto mt-4 w-[4.2cm]" dangerouslySetInnerHTML={{ __html: svg }} />
              <p className="mt-3 break-all font-mono text-[11px] text-ink-soft">{url}</p>
            </div>
          </article>
        </div>
      )}
    </>
  );
}
