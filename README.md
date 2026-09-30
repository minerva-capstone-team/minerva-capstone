# Minerva 🇨🇱 · Estampados y Papelería

Tienda e-commerce de Minerva construida con **Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS 4 + GSAP/ScrollTrigger + Three.js + Supabase**.

```bash
npm install
npm run dev        # http://localhost:3000
npm run build && npm start
```

Sin configurar nada, la tienda funciona con un **catálogo de demostración** (`src/lib/demo-data.ts`) y los pedidos se coordinan por WhatsApp. Al conectar Supabase, el catálogo, los pedidos y el panel `/admin` pasan a usar la base de datos.

---

## 1. Conectar Supabase

1. Crea un proyecto en [supabase.com](https://supabase.com).
2. En **SQL Editor** ejecuta, en orden:
   - `supabase/migrations/0001_init.sql` — tablas, RLS, función `create_order`, buckets de Storage.
   - `supabase/migrations/0002_order_emails.sql` — confirmación de pedido por email.
   - `supabase/migrations/0003_order_tracking.sql` — código de Paket y función `track_order` para la página `/seguimiento`.
   - `supabase/seed.sql` — categorías y productos iniciales (opcional).
3. En **Project Settings → API** copia la *Project URL* y la *anon public key* a `.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
   NEXT_PUBLIC_SITE_URL=https://tu-dominio.cl
   ```
   > ⚠️ **Nunca** pongas la `service_role` key en `.env.local` ni en ninguna variable `NEXT_PUBLIC_*`. El sitio no la necesita.
4. Reinicia `npm run dev`.

### Crear el primer administrador

1. **Authentication → Users → Add user** (email + contraseña, marca *Auto confirm*).
2. En el SQL Editor:
   ```sql
   insert into public.admins (user_id)
   select id from auth.users where email = 'tu-correo@ejemplo.com';
   ```
3. Entra a `/admin` con ese usuario.

### Recomendaciones de Auth
- Mantén activado **Confirm email** (Authentication → Providers → Email). Los clientes ven sus pedidos según el email de su cuenta, así que el email debe estar verificado.
- En **URL Configuration** agrega tu dominio y `http://localhost:3000` como *Redirect URLs*.

---

## 2. Seguridad (RLS)

| Tabla | Público (anon) | Cliente autenticado | Admin |
|---|---|---|---|
| categories, products, product_images, product_variants | Lee (solo productos activos) | Lee | Todo |
| customers, orders, order_items | — | Lee **solo lo suyo** | Todo |
| customizations | — | — | Lee |

- Los pedidos **solo** se crean con `create_order(payload)` (`SECURITY DEFINER`): valida stock, **recalcula precios en la base de datos** y descuenta stock. El navegador nunca fija precios.
- Storage: `product-images` es público de lectura y solo el admin escribe. `customer-uploads` es privado: cualquiera puede subir (máx. 5 MB, solo imágenes) y solo el admin puede verlas (URLs firmadas).
- `/api/revalidate` refresca las páginas públicas tras cambios en `/admin`, y solo acepta el JWT de un administrador.

---

## 3. Panel de administración (`/admin`)

- **Resumen:** productos activos, pedidos pendientes, ventas del mes, stock bajo.
- **Productos:** crear, editar, eliminar, subir/ordenar/eliminar fotos, precio, precio anterior, stock, variantes, destacado, activo, etiqueta, tipo de vista previa.
- **Categorías:** crear, editar, eliminar, imagen y orden.
- **Pedidos:** detalle, datos del cliente, textos e imágenes de personalización, cambio de estado / pago / despacho y enlace directo a WhatsApp del cliente.

La primera foto de un producto es la portada; la segunda aparece al pasar el cursor por la tarjeta. Mientras un producto no tenga fotos se muestra una ilustración vectorial (campo *Ilustración si no hay fotos*).

---

## 4. Pagos (Webpay / Mercado Pago)

La arquitectura está en `src/lib/payments/index.ts`. Hoy el checkout registra el pedido y lleva al cliente a coordinar el pago por WhatsApp. Para activar una pasarela:

1. Crea `src/app/api/payments/<webpay|mercadopago>/route.ts` que cree la transacción con credenciales **privadas** (variables sin `NEXT_PUBLIC_`) y devuelva `{ url }`.
2. Crea el webhook/retorno que marque `orders.payment_status = 'pagado'` usando la `service_role` **solo en el servidor**.
3. Pon `NEXT_PUBLIC_PAYMENTS_WEBPAY=true` (o `..._MERCADOPAGO`). La opción se habilita sola en el checkout.

---

## 5. Estructura

```
src/
  app/
    (store)/            tienda: inicio, productos, ficha, checkout, pedido, cuenta
    admin/              panel protegido
    api/revalidate/     refresco tras cambios del admin
    sitemap.ts robots.ts not-found.tsx
  components/
    layout/             Header, Footer, menú, búsqueda, toasts, WhatsApp, MotionProvider (Lenis + reveals)
    home/               Hero (+ escena Three.js), categorías, Hazlo tuyo, editorial, favoritos, redes, FAQ, contacto
    product/            ProductCard, Catalog, ProductDetail, previews (vista previa de personalización), ProductArt
    cart/               CartDrawer, CheckoutForm, OrderConfirmation
    admin/              AdminShell, ProductEditor, ConfirmDialog
  lib/                  catálogo, Supabase, carrito (zustand), pedidos, pagos, WhatsApp, SEO
supabase/
  migrations/0001_init.sql
  seed.sql
public/brand/           logo original de Minerva (+ versión PNG con fondo transparente)
```

### Vista previa de personalización
`src/components/product/previews.tsx` registra un renderer por `preview_kind` (`mug`, `notebook`, `tote`, `generic`). Para agregar un mockup nuevo (por ejemplo, poleras) crea el renderer, agrégalo al registro y al `check` de `preview_kind` en la migración.

### Redes sociales
`src/lib/social.ts` define la grilla de Instagram/TikTok. Reemplaza cada entrada con la imagen (`/public/social/...`) y el enlace real de la publicación.

---

## 6. Rendimiento y accesibilidad

- Three.js se carga con `import()` dinámico en `requestIdleCallback`, se pausa fuera de pantalla y usa una versión reducida en móviles. En equipos modestos, con *ahorro de datos* o `prefers-reduced-motion`, se muestra una composición SVG estática.
- Lenis (smooth scroll) solo en escritorio y sin reduced-motion. Las animaciones GSAP usan `matchMedia` y se simplifican en móvil.
- Imágenes con `next/image` (AVIF/WebP, lazy loading). Fuentes con `next/font`.
- SEO: metadata, Open Graph, Twitter Cards, canonical, `sitemap.xml`, `robots.txt`, JSON-LD `Organization`, `Product`, `BreadcrumbList` y `FAQPage`.

## 7. Pendiente de contenido real

- **Fotos de producto:** súbelas desde `/admin`. (La foto de la taza mencionada no estaba en la carpeta del proyecto; mientras tanto se usan ilustraciones.)
- **Logo en alta resolución:** el archivo recibido es de 150×150 px. Reemplaza `public/brand/minerva-logo.png` por una versión PNG/SVG más grande para que se vea nítido en pantallas retina.
- **Precios:** los del catálogo demo son referenciales.
