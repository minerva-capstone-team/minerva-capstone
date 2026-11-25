"use client";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { adminDb, errorMessage, removePublicImage, revalidateStore, uploadPublicImage } from "@/lib/admin";
import { cn, slugify } from "@/lib/format";
import { toast } from "@/lib/stores";
import type { ArtKey, Badge, Category, PreviewKind, ProductImage as Img } from "@/lib/types";
import { AdminHeader } from "./AdminShell";
import { ConfirmDialog } from "./ConfirmDialog";
import { Icon } from "@/components/ui/Icon";

type ImageRow = Img & { storage_path: string | null };
interface VariantDraft {
  id?: string;
  name: string;
  price_delta: number;
}
interface Form {
  name: string;
  slug: string;
  description: string;
  price: string;
  compare_at_price: string;
  category_id: string;
  stock: string;
  preparation_days: string;
  badge: Badge | "";
  preview_kind: PreviewKind;
  placeholder_art: ArtKey | "";
  featured: boolean;
  customizable: boolean;
  requires_image: boolean;
  quote_only: boolean;
  mockup_url: string | null;
  active: boolean;
}

const EMPTY: Form = {
  name: "",
  slug: "",
  description: "",
  price: "",
  compare_at_price: "",
  category_id: "",
  stock: "10",
  preparation_days: "3",
  badge: "",
  preview_kind: "generic",
  placeholder_art: "",
  featured: false,
  customizable: true,
  requires_image: false,
  quote_only: false,
  mockup_url: null,
  active: true,
};

const ARTS: ArtKey[] = ["mug", "mug-dad", "mug-magic", "mug-name", "notebook", "agenda", "stickers", "stickers-logo", "tote", "bottle", "party", "cards", "print"];

function Check({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint: string }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-line p-4 hover:bg-paper">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 size-4 accent-[var(--color-ink)]" />
      <span>
        <span className="block font-semibold">{label}</span>
        <span className="text-sm text-ink-soft">{hint}</span>
      </span>
    </label>
  );
}

export function ProductEditor({ id }: { id: string | null }) {
  const router = useRouter();
  const [form, setForm] = useState<Form>(EMPTY);
  const [slugTouched, setSlugTouched] = useState(Boolean(id));
  const [variants, setVariants] = useState<VariantDraft[]>([]);
  const [removedVariants, setRemovedVariants] = useState<string[]>([]);
  const [images, setImages] = useState<ImageRow[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(Boolean(id));
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(0);
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({});
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    const sb = adminDb();
    sb.from("categories")
      .select("*")
      .order("position")
      .then(({ data }) => setCategories((data as Category[]) ?? []));
    if (!id) return;
    sb.from("products")
      .select("*, images:product_images(*), variants:product_variants(*)")
      .eq("id", id)
      .single()
      .then(({ data, error }) => {
        setLoading(false);
        if (error || !data) {
          toast({ title: "Producto no encontrado", tone: "error" });
          router.replace("/admin/productos");
          return;
        }
        setForm({
          name: data.name,
          slug: data.slug,
          description: data.description ?? "",
          price: String(data.price),
          compare_at_price: data.compare_at_price == null ? "" : String(data.compare_at_price),
          category_id: data.category_id ?? "",
          stock: String(data.stock),
          preparation_days: String(data.preparation_days),
          badge: data.badge ?? "",
          preview_kind: data.preview_kind,
          placeholder_art: data.placeholder_art ?? "",
          featured: data.featured,
          customizable: data.customizable,
          requires_image: Boolean(data.requires_image),
          quote_only: Boolean(data.quote_only),
          mockup_url: data.mockup_url ?? null,
          active: data.active,
        });
        setImages([...(data.images as ImageRow[])].sort((a, b) => a.position - b.position));
        setVariants(
          [...(data.variants as (VariantDraft & { position: number })[])].sort((a, b) => a.position - b.position).map((v) => ({ id: v.id, name: v.name, price_delta: v.price_delta })),
        );
      });
  }, [id, router]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => {
    setForm((f) => ({ ...f, [k]: v, ...(k === "name" && !slugTouched ? { slug: slugify(String(v)) } : {}) }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const validate = () => {
    const e: typeof errors = {};
    if (!form.name.trim()) e.name = "El nombre es obligatorio.";
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(form.slug)) e.slug = "Usa solo minúsculas, números y guiones.";
    if (!(Number(form.price) >= 0) || form.price === "") e.price = "Ingresa un precio válido.";
    if (form.compare_at_price && !(Number(form.compare_at_price) > Number(form.price))) e.compare_at_price = "Debe ser mayor al precio actual.";
    if (!(Number(form.stock) >= 0) || form.stock === "") e.stock = "Ingresa el stock.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    const sb = adminDb();
    const payload = {
      name: form.name.trim(),
      slug: form.slug,
      description: form.description.trim(),
      price: Math.round(Number(form.price)),
      compare_at_price: form.compare_at_price ? Math.round(Number(form.compare_at_price)) : null,
      category_id: form.category_id || null,
      stock: Math.floor(Number(form.stock)),
      preparation_days: Math.max(0, Math.floor(Number(form.preparation_days) || 0)),
      badge: form.badge || null,
      preview_kind: form.preview_kind,
      placeholder_art: form.placeholder_art || null,
      featured: form.featured,
      customizable: form.customizable,
      requires_image: form.requires_image,
      quote_only: form.quote_only,
      mockup_url: form.mockup_url,
      active: form.active,
    };
    try {
      let productId = id;
      if (id) {
        const { error } = await sb.from("products").update(payload).eq("id", id);
        if (error) throw error;
      } else {
        const { data, error } = await sb.from("products").insert(payload).select("id").single();
        if (error) throw error;
        productId = data.id;
      }
      // Variantes: borrar las quitadas, actualizar existentes, insertar nuevas
      if (removedVariants.length) {
        const { error } = await sb.from("product_variants").delete().in("id", removedVariants);
        if (error) throw error;
      }
      const rows = variants
        .filter((v) => v.name.trim())
        .map((v, position) => ({ ...(v.id ? { id: v.id } : {}), product_id: productId!, name: v.name.trim(), price_delta: Math.round(v.price_delta) || 0, position }));
      const existing = rows.filter((r) => "id" in r);
      const fresh = rows.filter((r) => !("id" in r));
      if (existing.length) {
        const { error } = await sb.from("product_variants").upsert(existing);
        if (error) throw error;
      }
      if (fresh.length) {
        const { error } = await sb.from("product_variants").insert(fresh);
        if (error) throw error;
      }
      setRemovedVariants([]);
      void revalidateStore();
      toast({ title: id ? "Cambios guardados" : "Producto creado", description: id ? undefined : "Ahora puedes subir sus fotografías." });
      if (!id) router.replace(`/admin/productos/${productId}`);
      else {
        const { data } = await sb.from("product_variants").select("id,name,price_delta,position").eq("product_id", id).order("position");
        setVariants((data ?? []).map((v) => ({ id: v.id, name: v.name, price_delta: v.price_delta })));
      }
    } catch (err) {
      toast({ title: "No se pudo guardar", description: errorMessage(err), tone: "error" });
    } finally {
      setSaving(false);
    }
  };

  const upload = async (files: FileList | null) => {
    if (!files?.length || !id) return;
    const list = Array.from(files);
    setUploading(list.length);
    const sb = adminDb();
    let position = images.length ? Math.max(...images.map((i) => i.position)) + 1 : 0;
    for (const file of list) {
      try {
        const { url, path } = await uploadPublicImage(file, id);
        const { data, error } = await sb.from("product_images").insert({ product_id: id, image_url: url, storage_path: path, position: position++ }).select().single();
        if (error) throw error;
        setImages((imgs) => [...imgs, data as ImageRow]);
      } catch (err) {
        toast({ title: `Error con ${file.name}`, description: errorMessage(err), tone: "error" });
      } finally {
        setUploading((n) => n - 1);
      }
    }
    void revalidateStore();
  };

  const removeImage = async (img: ImageRow) => {
    const { error } = await adminDb().from("product_images").delete().eq("id", img.id);
    if (error) return toast({ title: "No se pudo eliminar la foto", description: errorMessage(error), tone: "error" });
    await removePublicImage(img.storage_path);
    setImages((imgs) => imgs.filter((i) => i.id !== img.id));
    void revalidateStore();
  };

  const move = async (index: number, dir: -1 | 1) => {
    const next = [...images];
    const j = index + dir;
    if (j < 0 || j >= next.length) return;
    [next[index], next[j]] = [next[j], next[index]];
    const withPos = next.map((img, position) => ({ ...img, position }));
    setImages(withPos);
    const sb = adminDb();
    const results = await Promise.all(withPos.map((img) => sb.from("product_images").update({ position: img.position }).eq("id", img.id)));
    if (results.some((r) => r.error)) toast({ title: "No se pudo reordenar", tone: "error" });
    else void revalidateStore();
  };

  const deleteProduct = async () => {
    if (!id) return;
    const { error } = await adminDb().from("products").delete().eq("id", id);
    if (error) return toast({ title: "No se pudo eliminar", description: errorMessage(error), tone: "error" });
    await Promise.all(images.map((i) => removePublicImage(i.storage_path)));
    void revalidateStore();
    toast({ title: "Producto eliminado" });
    router.replace("/admin/productos");
  };

  if (loading) return <div className="skeleton h-[40rem] rounded-3xl" aria-busy="true" />;

  const input = (k: keyof Form, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div>
      <label htmlFor={`f-${k}`} className="label">
        {label}
      </label>
      <input
        id={`f-${k}`}
        className="field"
        value={String(form[k])}
        onChange={(e) => {
          if (k === "slug") setSlugTouched(true);
          set(k, (k === "slug" ? e.target.value.toLowerCase().replace(/\s+/g, "-") : e.target.value) as never);
        }}
        onBlur={k === "slug" ? () => set("slug", slugify(form.slug) as never) : undefined}
        aria-invalid={Boolean(errors[k])}
        {...props}
      />
      {errors[k] && <p className="mt-1 text-sm text-m-red">{errors[k]}</p>}
    </div>
  );

  return (
    <form onSubmit={save} noValidate>
      <Link href="/admin/productos" className="mb-4 inline-flex items-center gap-1 text-sm text-ink-soft hover:text-ink">
        ← Productos
      </Link>
      <AdminHeader
        title={id ? form.name || "Editar producto" : "Nuevo producto"}
        action={
          <div className="flex gap-2">
            {id && (
              <Link href={`/productos/${form.slug}`} target="_blank" className="btn btn-ghost">
                <Icon name="external" size={18} /> Ver en tienda
              </Link>
            )}
            <button type="submit" disabled={saving} className="btn btn-primary">
              {saving ? "Guardando…" : id ? "Guardar cambios" : "Crear producto"}
            </button>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="space-y-5 rounded-3xl bg-white p-6 shadow-[var(--shadow-soft)]">
            <h2 className="display text-xl">Información</h2>
            {input("name", "Nombre", { required: true })}
            <div>
              {input("slug", "Dirección (URL)", { required: true })}
              <p className="mt-1 break-all text-xs text-ink-soft">
                minerva-arteycolor.cl/productos/<b>{form.slug || "…"}</b>
                {id ? " · si la cambias, los enlaces viejos redirigen solos a la nueva." : ""}
              </p>
              <button type="button" className="mt-1 text-xs font-medium underline underline-offset-2" onClick={() => set("slug", slugify(form.name) as never)}>
                Generar desde el nombre
              </button>
            </div>
            <div>
              <label htmlFor="f-description" className="label">
                Descripción
              </label>
              <textarea id="f-description" rows={5} className="field" value={form.description} onChange={(e) => set("description", e.target.value)} />
            </div>
          </section>

          <section className="rounded-3xl bg-white p-6 shadow-[var(--shadow-soft)]">
            <div className="flex items-center justify-between">
              <h2 className="display text-xl">Fotografías</h2>
              {id && (
                <label className={cn("btn btn-ghost cursor-pointer", uploading > 0 && "pointer-events-none opacity-60")}>
                  <Icon name="upload" size={18} /> {uploading > 0 ? `Subiendo ${uploading}…` : "Subir fotos"}
                  <input type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple className="sr-only" onChange={(e) => upload(e.target.files).then(() => (e.target.value = ""))} />
                </label>
              )}
            </div>
            {!id ? (
              <p className="mt-4 rounded-2xl bg-paper p-4 text-sm text-ink-soft">Guarda el producto primero para poder subir fotografías.</p>
            ) : images.length === 0 ? (
              <p className="mt-4 rounded-2xl bg-paper p-4 text-sm text-ink-soft">
                Sin fotos aún. Mientras tanto se muestra la ilustración seleccionada. La primera foto es la portada; la segunda aparece al pasar el cursor.
              </p>
            ) : (
              <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {images.map((img, i) => (
                  <li key={img.id} className="group relative aspect-square overflow-hidden rounded-2xl bg-paper-2">
                    <Image src={img.image_url} alt="" fill sizes="200px" className="object-cover" />
                    {i === 0 && <span className="absolute left-2 top-2 rounded-full bg-ink px-2 py-0.5 text-xs font-semibold text-white">Portada</span>}
                    <div className="absolute inset-x-2 bottom-2 flex justify-between gap-1">
                      <div className="flex gap-1">
                        <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="grid size-8 place-items-center rounded-full bg-white/90 disabled:opacity-40" aria-label="Mover antes">
                          <Icon name="up" size={16} className="-rotate-90" />
                        </button>
                        <button type="button" onClick={() => move(i, 1)} disabled={i === images.length - 1} className="grid size-8 place-items-center rounded-full bg-white/90 disabled:opacity-40" aria-label="Mover después">
                          <Icon name="up" size={16} className="rotate-90" />
                        </button>
                      </div>
                      <button type="button" onClick={() => removeImage(img)} className="grid size-8 place-items-center rounded-full bg-white/90 hover:text-m-red" aria-label="Eliminar foto">
                        <Icon name="trash" size={16} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-3xl bg-white p-6 shadow-[var(--shadow-soft)]">
            <div className="flex items-center justify-between">
              <h2 className="display text-xl">Variantes</h2>
              <button type="button" className="btn btn-ghost" onClick={() => setVariants((v) => [...v, { name: "", price_delta: 0 }])}>
                <Icon name="plus" size={18} /> Agregar
              </button>
            </div>
            <p className="mt-1 text-sm text-ink-soft">Ej: “Interior de color” con +$1.000. Déjalo vacío si el producto no tiene variantes.</p>
            <ul className="mt-4 space-y-2">
              {variants.map((v, i) => (
                <li key={v.id ?? `new-${i}`} className="flex gap-2">
                  <input
                    className="field flex-1"
                    placeholder="Nombre de la variante"
                    aria-label="Nombre de la variante"
                    value={v.name}
                    onChange={(e) => setVariants((list) => list.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
                  />
                  <input
                    className="field w-32"
                    type="number"
                    step={100}
                    aria-label="Diferencia de precio"
                    value={v.price_delta}
                    onChange={(e) => setVariants((list) => list.map((x, j) => (j === i ? { ...x, price_delta: Number(e.target.value) } : x)))}
                  />
                  <button
                    type="button"
                    className="grid size-12 shrink-0 place-items-center rounded-full hover:bg-m-red/10 hover:text-m-red"
                    aria-label="Quitar variante"
                    onClick={() => {
                      if (v.id) setRemovedVariants((r) => [...r, v.id!]);
                      setVariants((list) => list.filter((_, j) => j !== i));
                    }}
                  >
                    <Icon name="trash" size={18} />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <div className="space-y-6">
          <section className="space-y-5 rounded-3xl bg-white p-6 shadow-[var(--shadow-soft)]">
            <h2 className="display text-xl">Precio y stock</h2>
            {input("price", "Precio (CLP)", { type: "number", min: 0, step: 10, inputMode: "numeric" })}
            {input("compare_at_price", "Precio anterior (opcional)", { type: "number", min: 0, step: 10, inputMode: "numeric" })}
            {input("stock", "Stock", { type: "number", min: 0, inputMode: "numeric" })}
            {input("preparation_days", "Días de preparación", { type: "number", min: 0, inputMode: "numeric" })}
          </section>

          <section className="space-y-5 rounded-3xl bg-white p-6 shadow-[var(--shadow-soft)]">
            <h2 className="display text-xl">Organización</h2>
            <div>
              <label htmlFor="f-cat" className="label">
                Categoría
              </label>
              <select id="f-cat" className="field" value={form.category_id} onChange={(e) => set("category_id", e.target.value)}>
                <option value="">Sin categoría</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="f-badge" className="label">
                Etiqueta
              </label>
              <select id="f-badge" className="field" value={form.badge} onChange={(e) => set("badge", e.target.value as Form["badge"])}>
                <option value="">Ninguna</option>
                <option value="nuevo">Nuevo</option>
                <option value="mas-vendido">Más vendido</option>
                <option value="personalizable">Personalizable</option>
              </select>
            </div>
            <div>
              <label htmlFor="f-preview" className="label">
                Vista previa de personalización
              </label>
              <select id="f-preview" className="field" value={form.preview_kind} onChange={(e) => set("preview_kind", e.target.value as PreviewKind)}>
                <option value="mug">Taza</option>
                <option value="notebook">Cuaderno / agenda</option>
                <option value="tote">Tote bag</option>
                <option value="round">Redonda (chapitas, placas)</option>
                <option value="rect">Rectangular (cuadros, fotos, calendarios, tarjetas)</option>
                <option value="bottle">Botella o vaso</option>
                <option value="shirt">Polera, polerón o buzo</option>
                <option value="pillow">Cojín</option>
                <option value="bag">Saco o bolsa</option>
                <option value="clock">Reloj</option>
                <option value="generic">Genérica (sticker)</option>
              </select>
            </div>
            <div>
              <span className="label">Foto base de la vista previa (producto en blanco)</span>
              <p className="mb-2 text-xs text-ink-soft">Sube una foto del producto sin estampar y de fondo claro: el diseño del cliente se dibuja encima, al centro. Reemplaza el dibujo.</p>
              {form.mockup_url ? (
                <div className="flex items-center gap-3 rounded-2xl border border-line p-2.5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={form.mockup_url} alt="" className="size-14 rounded-xl object-contain" />
                  <span className="min-w-0 flex-1 text-sm text-ink-soft">Foto base cargada</span>
                  <button type="button" className="text-sm text-ink-soft hover:text-m-red" onClick={() => set("mockup_url", null)}>
                    Quitar
                  </button>
                </div>
              ) : (
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-line px-4 py-4 text-sm font-medium text-ink-2 hover:bg-paper">
                  <Icon name="upload" size={18} /> Subir foto base
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="sr-only"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      try {
                        const { url } = await uploadPublicImage(file, "mockups");
                        set("mockup_url", url);
                        toast({ title: "Foto base cargada", description: "Guarda el producto para aplicarla." });
                      } catch (err) {
                        toast({ title: "No se pudo subir", description: errorMessage(err), tone: "error" });
                      }
                    }}
                  />
                </label>
              )}
            </div>
            <div>
              <label htmlFor="f-art" className="label">
                Ilustración si no hay fotos
              </label>
              <select id="f-art" className="field" value={form.placeholder_art} onChange={(e) => set("placeholder_art", e.target.value as Form["placeholder_art"])}>
                <option value="">Taza (por defecto)</option>
                {ARTS.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>
          </section>

          <section className="space-y-3 rounded-3xl bg-white p-6 shadow-[var(--shadow-soft)]">
            <h2 className="display text-xl">Visibilidad</h2>
            <Check checked={form.active} onChange={(v) => set("active", v)} label="Activo" hint="Visible en la tienda." />
            <Check checked={form.featured} onChange={(v) => set("featured", v)} label="Destacado" hint="Aparece en la portada y favoritos." />
            <Check checked={form.customizable} onChange={(v) => set("customizable", v)} label="Personalizable" hint="Muestra el formulario y la vista previa." />
            <Check
              checked={form.requires_image}
              onChange={(v) => set("requires_image", v)}
              label="Pedir imagen al cliente (obligatoria)"
              hint="No se puede comprar sin subir su foto o diseño (ej. placas, cuadros, fotos)."
            />
            <Check
              checked={form.quote_only}
              onChange={(v) => set("quote_only", v)}
              label="Solo cotización (no se compra en la web)"
              hint="Muestra «Precio a cotizar» y un botón de WhatsApp en vez de agregar al carrito (ej. estampado textil y corporativo)."
            />
          </section>

          {id && (
            <button type="button" onClick={() => setConfirmDelete(true)} className="btn w-full border border-m-red/30 text-m-red hover:bg-m-red/5">
              <Icon name="trash" size={18} /> Eliminar producto
            </button>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="¿Eliminar este producto?"
        description="Se eliminarán también sus fotos. Esta acción no se puede deshacer."
        onCancel={() => setConfirmDelete(false)}
        onConfirm={deleteProduct}
      />
    </form>
  );
}
