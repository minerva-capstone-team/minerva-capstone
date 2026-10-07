import type { MetadataRoute } from "next";
import { getCategories, getProducts } from "@/lib/catalog";
import { site } from "@/lib/site";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, categories] = await Promise.all([getProducts(), getCategories()]);
  const now = new Date();
  return [
    { url: `${site.url}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${site.url}/productos`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${site.url}/privacidad`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    ...categories.map((c) => ({
      url: `${site.url}/productos?categoria=${c.slug}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...products.map((p) => ({
      url: `${site.url}/productos/${p.slug}`,
      lastModified: new Date(p.created_at),
      changeFrequency: "weekly" as const,
      priority: 0.8,
      images: p.images.slice(0, 1).map((i) => i.image_url),
    })),
  ];
}
