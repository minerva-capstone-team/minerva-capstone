import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/lib/site";
import { waLink } from "@/lib/whatsapp";

export const metadata: Metadata = {
  title: "Política de privacidad",
  description: "Qué datos personales recoge Minerva, para qué los usa, con quién los comparte y cómo puedes pedir que se eliminen.",
  alternates: { canonical: "/privacidad" },
};

const UPDATED = "6 de octubre de 2026";

function Section({ id, title, children }: { id?: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-28 border-t border-line pt-8">
      <h2 className="display text-2xl">{title}</h2>
      <div className="mt-4 space-y-3 text-ink-2 [&_a]:font-medium [&_a]:text-ink [&_a]:underline [&_a]:underline-offset-2 [&_li]:leading-relaxed [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5">
        {children}
      </div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <div className="container-x pb-12 pt-28 md:pt-36">
      <article className="mx-auto max-w-3xl space-y-8">
        <header>
          <p className="eyebrow">Legal</p>
          <h1 className="display mt-4 text-[clamp(2.25rem,5vw,3.75rem)]">Política de privacidad</h1>
          <p className="mt-3 text-ink-soft">Última actualización: {UPDATED}</p>
          <p className="mt-6 text-lg text-ink-2">
            En Minerva usamos tus datos solo para atender tu pedido y responder tus consultas. No vendemos tu información ni la usamos para publicidad de terceros. Aquí te
            explicamos, en simple, qué datos recogemos, para qué, con quién los compartimos y cómo puedes pedir que los eliminemos.
          </p>
        </header>

        <Section title="1. Quiénes somos">
          <p>
            Esta política aplica al sitio {site.url.replace(/^https?:\/\//, "")}, a nuestro WhatsApp ({site.whatsappDisplay}) y a nuestro Instagram ({site.instagram.handle}). Minerva |
            Estampados y Papelería (“Minerva”, “nosotros”) es quien decide cómo se usan los datos que nos entregas. Tratamos tus datos conforme a la Ley N° 19.628 sobre protección de la
            vida privada y la normativa chilena aplicable.
          </p>
        </Section>

        <Section title="2. Qué datos recogemos">
          <ul>
            <li>
              <strong>Cuando compras:</strong> nombre, apellido, email, teléfono, dirección, comuna y región de entrega, notas del pedido, los productos que eliges y lo que agregas para
              personalizarlos (textos, nombres e imágenes que subes), el método de pago elegido y si quieres boleta o factura.
            </li>
            <li>
              <strong>Si pides factura:</strong> además, RUT, razón social, giro y dirección de facturación de la empresa.
            </li>
            <li>
              <strong>Si creas una cuenta:</strong> tu email y tu contraseña. La contraseña la gestiona nuestro proveedor de cuentas y nosotros no podemos verla.
            </li>
            <li>
              <strong>Si hablas con el asistente de la página o con nuestro Instagram:</strong> el texto que escribes y, en Instagram, el identificador de tu cuenta que entrega Meta para poder
              responderte.
            </li>
            <li>
              <strong>Datos técnicos:</strong> como en cualquier sitio, el servidor registra datos básicos de conexión (por ejemplo, dirección IP y navegador) para que la página funcione y
              para evitar abusos.
            </li>
          </ul>
          <p>
            <strong>Lo que no hacemos:</strong> no usamos cookies de publicidad ni herramientas de analítica o seguimiento, y no te pedimos datos de tarjetas en esta página.
          </p>
        </Section>

        <Section title="3. Datos guardados en tu dispositivo">
          <p>Para que la tienda funcione, tu navegador guarda en tu propio dispositivo (no en nuestros servidores):</p>
          <ul>
            <li>tu carrito de compras;</li>
            <li>un borrador de tus datos de entrega, para que no tengas que escribirlos de nuevo (sin las notas);</li>
            <li>un resumen de tus últimos pedidos hechos desde ese dispositivo;</li>
            <li>tu sesión, si iniciaste sesión en tu cuenta.</li>
          </ul>
          <p>Puedes borrarlos cuando quieras limpiando los datos del sitio en la configuración de tu navegador.</p>
        </Section>

        <Section title="4. Para qué usamos tus datos">
          <ul>
            <li>Registrar, producir, personalizar y entregar tu pedido.</li>
            <li>Contactarte por WhatsApp o email para coordinar el pago y el despacho.</li>
            <li>Enviarte la confirmación del pedido y avisos cuando cambie de etapa, con tu número de seguimiento.</li>
            <li>Emitir boleta o factura y cumplir nuestras obligaciones tributarias.</li>
            <li>Responder tus consultas, incluidas las que haces al asistente de la página o por mensaje directo de Instagram.</li>
            <li>Cuidar la seguridad del sitio y evitar abusos (por ejemplo, limitar pedidos sin pagar repetidos y la cantidad de mensajes al asistente).</li>
          </ul>
        </Section>

        <Section title="5. Con quién los compartimos">
          <p>Solo con proveedores que necesitamos para operar, y únicamente con los datos necesarios para cada función:</p>
          <ul>
            <li>
              <strong>Supabase:</strong> base de datos, cuentas de usuario y almacenamiento de las imágenes de personalización (en un espacio privado).
            </li>
            <li>
              <strong>Vercel:</strong> alojamiento del sitio.
            </li>
            <li>
              <strong>Resend:</strong> envío de correos de confirmación y avisos del pedido.
            </li>
            <li>
              <strong>Paket:</strong> empresa de despacho; recibe el nombre, teléfono y dirección de entrega para llevar tu pedido.
            </li>
            <li>
              <strong>Google (Gemini):</strong> genera las respuestas automáticas del asistente de la página y del Instagram. Recibe el texto de tus mensajes y la información de nuestro
              catálogo, no tu nombre ni tus datos de contacto. Según las condiciones del servicio que usamos, Google podría utilizar esos textos para mejorar sus productos; por eso te
              pedimos no escribir datos sensibles (RUT, claves, datos bancarios) en el asistente.
            </li>
            <li>
              <strong>Meta (Instagram y WhatsApp):</strong> por donde recibimos y respondemos tus mensajes; aplican sus propias políticas de privacidad.
            </li>
            <li>
              <strong>Proveedor de boletas y facturas:</strong> el servicio autorizado por el SII que use Minerva para emitir los documentos.
            </li>
            <li>
              <strong>Autoridades</strong> cuando la ley lo exija.
            </li>
          </ul>
          <p>Algunos de estos proveedores pueden almacenar o procesar datos fuera de Chile. No vendemos ni arrendamos tus datos.</p>
        </Section>

        <Section title="6. Asistente automático (IA)">
          <p>
            El asistente de la página y el que responde mensajes en Instagram son automáticos y pueden equivocarse; no toman decisiones con efectos legales sobre ti. Si prefieres hablar con una
            persona, escríbenos por{" "}
            <a href={waLink()} target="_blank" rel="noopener noreferrer">
              WhatsApp
            </a>
            .
          </p>
          <p>
            No guardamos las conversaciones del asistente de la página. En Instagram, para entender el contexto, el servidor recuerda de forma temporal los últimos mensajes de la conversación
            (hasta 24 horas, solo en su memoria).
          </p>
        </Section>

        <Section title="7. Cuánto tiempo conservamos tus datos">
          <ul>
            <li>Los datos de pedidos y documentos tributarios, durante el tiempo que exija la ley tributaria y mientras sean necesarios para garantías, reclamos y postventa.</li>
            <li>Las imágenes y textos de personalización, mientras sean necesarios para producir y entregar tu pedido y atender reclamos.</li>
            <li>Tu cuenta, hasta que pidas eliminarla.</li>
            <li>Los datos que ya no necesitemos y que la ley no nos obligue a conservar los eliminamos cuando lo solicites.</li>
          </ul>
        </Section>

        <Section title="8. Tus derechos">
          <p>Puedes pedirnos en cualquier momento:</p>
          <ul>
            <li>saber qué datos tuyos tenemos (acceso);</li>
            <li>corregir datos incorrectos (rectificación);</li>
            <li>eliminar tus datos (cancelación), salvo lo que la ley nos obligue a conservar;</li>
            <li>bloquear su uso o oponerte a que los usemos para fines distintos de atender tu pedido.</li>
          </ul>
          <p>Para ejercerlos escríbenos como se explica abajo; te responderemos lo antes posible.</p>
        </Section>

        <Section id="eliminar-datos" title="9. Cómo eliminar tus datos">
          <ol className="list-decimal space-y-1.5 pl-5">
            <li>
              Escríbenos por{" "}
              <a href={waLink("Hola Minerva 👋 Quiero eliminar mis datos personales.")} target="_blank" rel="noopener noreferrer">
                WhatsApp
              </a>{" "}
              o por mensaje directo a{" "}
              <a href={site.instagram.url} target="_blank" rel="noopener noreferrer">
                {site.instagram.handle}
              </a>{" "}
              con el texto “Eliminar mis datos”.
            </li>
            <li>Indica tu nombre, el email que usaste al comprar y, si lo tienes, tu número de pedido, para poder identificarte.</li>
            <li>Eliminaremos tus datos personales de nuestros sistemas y te avisaremos cuando esté listo. Los documentos que la ley tributaria nos obliga a conservar se mantienen solo por ese motivo.</li>
          </ol>
          <p>
            Si solo hablaste con nuestro asistente en Instagram, no guardamos esas conversaciones más allá de la memoria temporal descrita arriba. También puedes borrar el chat desde Instagram y
            quitar el acceso de Minerva a tu cuenta desde la configuración de Instagram.
          </p>
        </Section>

        <Section title="10. Seguridad">
          <p>
            Tomamos medidas razonables para proteger tus datos: conexión cifrada (HTTPS), acceso al panel de administración solo para personas autorizadas, cálculo de precios en el servidor y
            almacenamiento privado para las imágenes que subes. Ningún sistema es 100 % infalible; si ocurriera un incidente que te afecte, te lo informaremos.
          </p>
        </Section>

        <Section title="11. Menores de edad">
          <p>Nuestra tienda está pensada para personas adultas. Si eres menor de edad, pide a un adulto que realice la compra o te acompañe al hacerla.</p>
        </Section>

        <Section title="12. Cambios a esta política">
          <p>Podemos actualizar esta política, por ejemplo cuando incorporemos nuevos medios de pago o proveedores. Siempre publicaremos aquí la versión vigente con su fecha de actualización.</p>
        </Section>

        <Section title="13. Contacto">
          <p>
            Para cualquier duda sobre tus datos, escríbenos por{" "}
            <a href={waLink()} target="_blank" rel="noopener noreferrer">
              WhatsApp {site.whatsappDisplay}
            </a>{" "}
            o por Instagram{" "}
            <a href={site.instagram.url} target="_blank" rel="noopener noreferrer">
              {site.instagram.handle}
            </a>
            .
          </p>
          <p>
            <Link href="/">Volver a la tienda</Link>
          </p>
        </Section>
      </article>
    </div>
  );
}
