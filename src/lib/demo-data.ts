/**
 * Catálogo de demostración. Se usa automáticamente mientras Supabase no esté
 * configurado. Los mismos datos están en supabase/seed.sql para migrarlos.
 * Precios referenciales: edítalos desde /admin una vez conectado Supabase.
 */
import type { Category, Product, ProductVariant } from "./types";

export const demoCategories: Category[] = [
  { id: "cat-tazas", name: "Sublimación", slug: "sublimacion", description: "Tazones, tazas mágicas, mugs térmicos y más, estampados por sublimación.", image_url: "/fotos/02-taza-personalizada.webp", placeholder_art: "mug-dad", position: 1, show_in_menu: true },
  { id: "cat-papeleria", name: "Papelería", slug: "papeleria", description: "Cuadernos, agendas, stickers, tarjetas, imanes y calendarios.", image_url: "/fotos/05-papeleria.webp", placeholder_art: "notebook", position: 2, show_in_menu: true },
  { id: "cat-textil", name: "Estampados textil", slug: "estampados-textil", description: "Poleras, polerones y uniformes estampados.", image_url: null, placeholder_art: "tote", position: 3, show_in_menu: true },
  { id: "cat-regalos", name: "Regalos personalizados", slug: "regalos-personalizados", description: "Detalles únicos para regalar.", image_url: "/fotos/08-regalo-envuelto.webp", placeholder_art: "tote", position: 4, show_in_menu: false },
  { id: "cat-stickers", name: "Stickers", slug: "stickers", description: "Stickers troquelados para todo.", image_url: "/fotos/07-stickers.webp", placeholder_art: "stickers", position: 5, show_in_menu: false },
  { id: "cat-eventos", name: "Eventos", slug: "eventos", description: "Cumpleaños, baby showers y celebraciones.", image_url: "/fotos/12-eventos.webp", placeholder_art: "party", position: 6, show_in_menu: false },
  { id: "cat-especiales", name: "Diseños especiales", slug: "disenos-especiales", description: "Láminas e ilustraciones de autor.", image_url: null, placeholder_art: "print", position: 7, show_in_menu: false },
];

const cat = (id: string) => {
  const c = demoCategories.find((c) => c.id === id)!;
  return { id: c.id, name: c.name, slug: c.slug };
};

const variants = (productId: string, list: [string, number][]): ProductVariant[] =>
  list.map(([name, price_delta], i) => ({ id: `${productId}-v${i}`, product_id: productId, name, price_delta, stock: null, position: i }));

type Seed = Omit<Product, "category" | "images" | "variants" | "active" | "created_at"> & { variants?: [string, number][] };

const seeds: Seed[] = [
  { id: "p-taza-papa", name: "Taza personalizada Día del Papá", slug: "taza-personalizada-dia-del-papa", description: "Taza cerámica de 11 oz estampada por sublimación, con colores que no se borran en el lavado. Agrega el nombre de papá, una frase o una foto y la preparamos con todo el cariño para que llegue lista para regalar.", price: 7990, compare_at_price: 9490, category_id: "cat-tazas", stock: 24, featured: true, customizable: true, badge: "mas-vendido", preparation_days: 3, preview_kind: "mug", placeholder_art: "mug-dad", variants: [["Blanca clásica", 0], ["Interior de color", 1000], ["Mágica (cambia con el calor)", 3000]] },
  { id: "p-taza-magica", name: "Taza mágica con foto", slug: "taza-magica-con-foto", description: "Negra por fuera hasta que le sirves algo caliente: ahí aparece tu foto. Una sorpresa que se repite cada mañana.", price: 10990, compare_at_price: null, category_id: "cat-tazas", stock: 12, featured: true, customizable: true, badge: "nuevo", preparation_days: 4, preview_kind: "mug", placeholder_art: "mug-magic" },
  { id: "p-taza-nombre", name: "Taza lettering con nombre", slug: "taza-lettering-con-nombre", description: "Tu nombre en lettering hecho a mano, rodeado de detalles de color. Ideal para oficinas, profes y amigas.", price: 7990, compare_at_price: null, category_id: "cat-tazas", stock: 30, featured: false, customizable: true, badge: "personalizable", preparation_days: 3, preview_kind: "mug", placeholder_art: "mug-name", variants: [["Blanca clásica", 0], ["Interior de color", 1000]] },
  { id: "p-cuaderno", name: "Cuaderno personalizado A5", slug: "cuaderno-personalizado-a5", description: "Cuaderno A5 de 100 hojas con tapa dura estampada con tu nombre o diseño. Hojas de 80 g, perfectas para lápices de colores.", price: 8990, compare_at_price: null, category_id: "cat-papeleria", stock: 18, featured: true, customizable: true, badge: "personalizable", preparation_days: 4, preview_kind: "notebook", placeholder_art: "notebook", variants: [["Hojas lisas", 0], ["Hojas con líneas", 0], ["Hojas punteadas", 500]] },
  { id: "p-agenda", name: "Agenda 2027 con tu nombre", slug: "agenda-2027-con-tu-nombre", description: "Agenda semanal 2027 con planificador mensual, stickers de regalo y portada personalizada.", price: 14990, compare_at_price: 16990, category_id: "cat-papeleria", stock: 9, featured: true, customizable: true, badge: "nuevo", preparation_days: 5, preview_kind: "notebook", placeholder_art: "agenda" },
  { id: "p-stickers", name: "Set de stickers personalizados (24 u.)", slug: "set-de-stickers-personalizados", description: "24 stickers troquelados en vinilo resistente al agua. Ideales para botellas, notebooks y cuadernos.", price: 4990, compare_at_price: null, category_id: "cat-stickers", stock: 40, featured: true, customizable: true, badge: "mas-vendido", preparation_days: 2, preview_kind: "generic", placeholder_art: "stickers" },
  { id: "p-stickers-logo", name: "Stickers para emprendedores (100 u.)", slug: "stickers-para-emprendedores", description: "Stickers con el logo de tu marca para sellar pedidos y packaging. Troquel redondo o a medida.", price: 12990, compare_at_price: null, category_id: "cat-stickers", stock: 50, featured: false, customizable: true, badge: null, preparation_days: 4, preview_kind: "generic", placeholder_art: "stickers-logo", variants: [["Redondos 5 cm", 0], ["Troquel a medida", 3000]] },
  { id: "p-tote", name: "Tote bag estampada", slug: "tote-bag-estampada", description: "Bolso de tela 100% algodón con estampado a elección. Resistente, lavable y listo para acompañarte todos los días.", price: 9990, compare_at_price: null, category_id: "cat-regalos", stock: 15, featured: true, customizable: true, badge: "personalizable", preparation_days: 4, preview_kind: "tote", placeholder_art: "tote" },
  { id: "p-botella", name: "Botella de aluminio personalizada", slug: "botella-de-aluminio-personalizada", description: "Botella de aluminio de 600 ml con tapa rosca, estampada con tu nombre o diseño.", price: 11990, compare_at_price: null, category_id: "cat-regalos", stock: 4, featured: false, customizable: true, badge: null, preparation_days: 4, preview_kind: "generic", placeholder_art: "bottle" },
  { id: "p-kit-cumple", name: "Kit de cumpleaños personalizado", slug: "kit-de-cumpleanos-personalizado", description: "Banderín, toppers para torta, stickers y tarjetas con el nombre y la temática del festejado.", price: 15990, compare_at_price: null, category_id: "cat-eventos", stock: 10, featured: true, customizable: true, badge: "nuevo", preparation_days: 6, preview_kind: "generic", placeholder_art: "party" },
  { id: "p-invitaciones", name: "Invitaciones impresas (20 u.)", slug: "invitaciones-impresas", description: "20 invitaciones impresas en papel premium de 300 g, con sobre incluido.", price: 9990, compare_at_price: null, category_id: "cat-eventos", stock: 20, featured: false, customizable: true, badge: null, preparation_days: 5, preview_kind: "generic", placeholder_art: "cards" },
  { id: "p-lamina", name: "Lámina ilustrada Flores de Chile", slug: "lamina-ilustrada-flores-de-chile", description: "Lámina A4 impresa en papel de algodón con ilustraciones de flores nativas. Edición limitada.", price: 6990, compare_at_price: null, category_id: "cat-especiales", stock: 0, featured: false, customizable: false, badge: null, preparation_days: 2, preview_kind: "generic", placeholder_art: "print" },
];

export const demoProducts: Product[] = seeds.map((s, i) => {
  const { variants: v, ...rest } = s;
  return {
    ...rest,
    active: true,
    category: s.category_id ? cat(s.category_id) : null,
    images: [],
    variants: v ? variants(s.id, v) : [],
    created_at: new Date(Date.UTC(2026, 8, 1 + i)).toISOString(),
  };
});
