export type ArtKey =
  | "mug-dad"
  | "mug-magic"
  | "mug-name"
  | "mug"
  | "notebook"
  | "agenda"
  | "stickers"
  | "stickers-logo"
  | "tote"
  | "bottle"
  | "party"
  | "cards"
  | "print";

export type Badge = "nuevo" | "mas-vendido" | "personalizable";

export type PreviewKind = "mug" | "notebook" | "tote" | "generic";

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  placeholder_art: ArtKey | null;
  position: number;
}

export interface ProductImage {
  id: string;
  product_id: string;
  image_url: string;
  position: number;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  name: string;
  price_delta: number;
  stock: number | null;
  position: number;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  compare_at_price: number | null;
  category_id: string | null;
  category: Pick<Category, "id" | "name" | "slug"> | null;
  stock: number;
  featured: boolean;
  customizable: boolean;
  active: boolean;
  badge: Badge | null;
  preparation_days: number;
  preview_kind: PreviewKind;
  placeholder_art: ArtKey | null;
  images: ProductImage[];
  variants: ProductVariant[];
  created_at: string;
}

/** Datos que el cliente ingresa para personalizar un producto. */
export interface Customization {
  text?: string;
  name?: string;
  /** Imagen reducida en el navegador (data URL) hasta que se sube con el pedido. */
  imageDataUrl?: string;
  imageName?: string;
}

export interface CartItem {
  key: string;
  productId: string;
  slug: string;
  name: string;
  unitPrice: number;
  quantity: number;
  maxQuantity: number;
  variantId: string | null;
  variantName: string | null;
  image: string | null;
  art: ArtKey | null;
  customization: Customization | null;
}

export type OrderStatus = "pendiente" | "confirmado" | "en_produccion" | "listo" | "entregado" | "cancelado";
export type PaymentStatus = "pendiente" | "pagado" | "reembolsado";
export type DeliveryStatus = "por_coordinar" | "preparando" | "enviado" | "entregado";

export interface CheckoutCustomer {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address: string;
  comuna: string;
  region: string;
  notes: string;
}

export type DocumentType = "boleta" | "factura";

export interface BillingData {
  rut: string;
  razon_social: string;
  giro: string;
  direccion: string;
}

export interface CheckoutQuote {
  coupon_valid: boolean | null;
  coupon_message: string | null;
  discount: number;
  shipping: number;
  shipping_pending: boolean;
  free_shipping: boolean;
  free_shipping_min: number | null;
  total: number;
}

export interface PlacedOrder {
  id: string;
  order_number: string;
  /** Total final (productos − descuento + envío). */
  total: number;
  subtotal: number;
  discount: number;
  shipping_cost: number;
  /** true cuando el envío de esa región aún no tiene tarifa y se coordina por WhatsApp. */
  shipping_pending: boolean;
  coupon_code: string | null;
  document_type: DocumentType;
  created_at: string;
  customer: CheckoutCustomer;
  items: { name: string; variantName: string | null; quantity: number; unitPrice: number; customization: Customization | null }[];
  payment_method: string;
  synced: boolean;
}
