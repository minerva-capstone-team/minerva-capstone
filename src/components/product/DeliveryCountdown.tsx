"use client";
import { useEffect, useState } from "react";
import { cn } from "@/lib/format";
import { deliveryPlan, SHIPPING_BUFFER_DAYS, type DeliveryPlan } from "@/lib/delivery";
import { Icon } from "@/components/ui/Icon";

const fmt = (d: Date) => d.toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long" });

/** "Si lo pides hoy…" y, si se acerca una fecha especial, hasta cuándo pedir para llegar a tiempo. */
export function DeliveryCountdown({ prepDays }: { prepDays: number }) {
  // Se calcula tras montar: la fecha depende del reloj del visitante y no debe romper la hidratación.
  const [plan, setPlan] = useState<DeliveryPlan | null>(null);
  useEffect(() => setPlan(deliveryPlan(prepDays)), [prepDays]);
  if (!plan) return <div className="skeleton mt-4 h-16 rounded-2xl" aria-hidden />;

  const o = plan.occasion;
  return (
    <div className="mt-4 space-y-2 text-sm" aria-live="polite">
      <p className="flex items-start gap-2 rounded-2xl bg-white p-3">
        <Icon name="clock" size={18} className="mt-0.5 shrink-0 text-m-violet" />
        <span>
          Si lo pides hoy, estará listo el <strong>{fmt(plan.readyOn)}</strong>. Después se suma el despacho a tu comuna.
        </span>
      </p>
      {o && (
        <p className={cn("flex items-start gap-2 rounded-2xl p-3", o.reachable ? (o.daysLeft <= 3 ? "bg-m-yellow/25 text-[#8a5a00]" : "bg-m-green/12 text-[#1c6b51]") : "bg-m-red/10 text-[#b42318]")}>
          <Icon name="sparkle" size={18} className="mt-0.5 shrink-0" />
          {o.reachable ? (
            <span>
              Para <strong>{o.name}</strong> ({o.date.toLocaleDateString("es-CL", { day: "numeric", month: "long" })}) pídelo hasta el <strong>{fmt(o.deadline)}</strong>
              {o.daysLeft === 0 ? " — ¡es hoy!" : o.daysLeft === 1 ? " — queda 1 día." : ` — quedan ${o.daysLeft} días.`}
              <span className="block text-xs opacity-80">Calculado con {SHIPPING_BUFFER_DAYS} días hábiles de despacho; puede variar según tu comuna.</span>
            </span>
          ) : (
            <span>
              Para <strong>{o.name}</strong> ya no alcanzamos a llegar con envío. Si lo retiras o lo coordinas por WhatsApp, escríbenos y vemos qué se puede hacer.
            </span>
          )}
        </p>
      )}
    </div>
  );
}
