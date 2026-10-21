export const site = {
  name: "Minerva",
  fullName: "Minerva | Estampados y Papelería",
  tagline: "Estampados y papelería personalizada hecha con cariño en Chile 🇨🇱",
  description:
    "Tazas personalizadas, papelería, stickers y regalos personalizados hechos a mano en Chile. Crea algo realmente tuyo con Minerva.",
  url: (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, ""),
  whatsapp: "56950467189",
  whatsappDisplay: "+56 9 5046 7189",
  instagram: { handle: "@minerva.arteycolor", url: "https://www.instagram.com/minerva.arteycolor/" },
  tiktok: { handle: "@minerva.arteycolor", url: "https://www.tiktok.com/@minerva.arteycolor" },
  keywords: [
    "Minerva estampados",
    "Minerva papelería",
    "tazas personalizadas Chile",
    "regalos personalizados Chile",
    "estampados personalizados",
    "papelería personalizada Chile",
  ],
};

export const nav = [
  { label: "Inicio", href: "/" },
  { label: "Productos", href: "/productos" },
  { label: "Regalos", href: "/regalos" },
  { label: "Personaliza", href: "/#personaliza" },
  { label: "Nosotros", href: "/#nosotros" },
  { label: "Preguntas frecuentes", href: "/#faq" },
  { label: "Contacto", href: "/#contacto" },
];
