import "server-only";
import webpush from "web-push";
import { site } from "./site";

const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
const privateKey = process.env.VAPID_PRIVATE_KEY ?? "";
/** Debe ser "mailto:tu@correo.cl" o una URL https. */
const subject = process.env.VAPID_SUBJECT || site.url;

export const isPushConfigured = Boolean(publicKey && privateKey);

export interface PushSub {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export interface PushPayload {
  title: string;
  body: string;
  url: string;
  tag?: string;
}

/** Envía a todas las suscripciones. `dead` son las que el servicio push ya no reconoce (404/410). */
export async function sendPush(subs: PushSub[], payload: PushPayload) {
  webpush.setVapidDetails(subject, publicKey, privateKey);
  const body = JSON.stringify(payload);
  const dead: string[] = [];
  const errors: string[] = [];
  let sent = 0;
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, body, { TTL: 60 * 60 * 24 });
        sent++;
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) dead.push(s.endpoint);
        else errors.push(`${status ?? "?"} ${(err as Error).message}`);
      }
    }),
  );
  return { sent, dead, errors };
}
