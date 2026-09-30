import { getSearchIndex } from "@/lib/catalog";
import { site } from "@/lib/site";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { MobileMenu } from "@/components/layout/MobileMenu";
import { SearchOverlay } from "@/components/layout/SearchOverlay";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { Toaster } from "@/components/layout/Toaster";
import { WhatsAppFab } from "@/components/layout/WhatsAppFab";
import { ChatWidget } from "@/components/layout/ChatWidget";
import { MotionProvider } from "@/components/layout/MotionProvider";

export const revalidate = 60;

const organizationLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Minerva",
  alternateName: "Minerva Arte y Color",
  description: site.description,
  url: site.url,
  logo: `${site.url}/brand/minerva-logo.png`,
  sameAs: [site.instagram.url, site.tiktok.url],
  contactPoint: [{ "@type": "ContactPoint", telephone: "+56-9-5046-7189", contactType: "customer service", areaServed: "CL", availableLanguage: "es" }],
  address: { "@type": "PostalAddress", addressCountry: "CL" },
};

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const index = await getSearchIndex();
  return (
    <>
      <a href="#contenido" className="sr-only z-[100] rounded-full bg-ink px-4 py-2 text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
        Saltar al contenido
      </a>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationLd) }} />
      <Header />
      <main id="contenido">{children}</main>
      <Footer />
      <CartDrawer />
      <MobileMenu />
      <SearchOverlay index={index} />
      <Toaster />
      <WhatsAppFab />
      <ChatWidget />
      <MotionProvider />
    </>
  );
}
