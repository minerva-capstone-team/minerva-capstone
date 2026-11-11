"use client";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { adminDb, errorMessage, revalidateStore, uploadPublicImage } from "@/lib/admin";
import { slugify } from "@/lib/format";
import { toast } from "@/lib/stores";
import type { Category } from "@/lib/types";
import { AdminHeader } from "@/components/admin/AdminShell";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { Icon } from "@/components/ui/Icon";
import { ProductArt } from "@/components/product/ProductArt";

interface Draft {
  id?: string;
  name: string;
  slug: string;
  description: string;
  image_url: string | null;
  position: number;
  show_in_menu: boolean;
}

export default function AdminCategories() {
  const [items, setItems] = useState<Category[] | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [toDelete, setToDelete] = useState<Category | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await adminDb().from("categories").select("*").order("position");
    if (error) toast({ title: "Error al cargar", description: error.message, tone: "error" });
    setItems((data as Category[]) ?? []);
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft || !draft.name.trim()) return;
    setSaving(true);
    const payload = {
      name: draft.name.trim(),
      slug: draft.slug || slugify(draft.name),
      description: draft.description.trim() || null,
      image_url: draft.image_url,
      position: draft.position,
      show_in_menu: draft.show_in_menu,
    };
    const sb = adminDb();
    const { error } = draft.id ? await sb.from("categories").update(payload).eq("id", draft.id) : await sb.from("categories").insert(payload);
    setSaving(false);
    if (error) return toast({ title: "No se pudo guardar", description: errorMessage(error), tone: "error" });
    toast({ title: draft.id ? "Categoría actualizada" : "Categoría creada" });
    setDraft(null);
    void revalidateStore();
    void load();
  };

  const remove = async () => {
    if (!toDelete) return;
    const { error } = await adminDb().from("categories").delete().eq("id", toDelete.id);
    if (error) return toast({ title: "No se pudo eliminar", description: errorMessage(error), tone: "error" });
    toast({ title: "Categoría eliminada" });
    setToDelete(null);
    void revalidateStore();
    void load();
  };

  return (
    <>
      <AdminHeader
        title="Categorías"
        description="Organiza cómo se agrupan tus productos en la tienda."
        action={
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setDraft({ name: "", slug: "", description: "", image_url: null, position: (items?.length ?? 0) + 1, show_in_menu: true })}
          >
            <Icon name="plus" size={18} /> Nueva categoría
          </button>
        }
      />

      {draft && (
        <form onSubmit={save} className="mb-6 grid gap-4 rounded-3xl bg-white p-6 shadow-[var(--shadow-soft)] sm:grid-cols-2">
          <h2 className="display text-xl sm:col-span-2">{draft.id ? "Editar categoría" : "Nueva categoría"}</h2>
          <div>
            <label htmlFor="cat-name" className="label">
              Nombre
            </label>
            <input
              id="cat-name"
              required
              className="field"
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value, slug: draft.id ? draft.slug : slugify(e.target.value) })}
            />
          </div>
          <div>
            <label htmlFor="cat-slug" className="label">
              Slug (URL)
            </label>
            <input id="cat-slug" className="field" value={draft.slug} onChange={(e) => setDraft({ ...draft, slug: slugify(e.target.value) })} />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="cat-desc" className="label">
              Descripción
            </label>
            <input id="cat-desc" className="field" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
          </div>
          <div>
            <label htmlFor="cat-pos" className="label">
              Orden
            </label>
            <input id="cat-pos" type="number" className="field" value={draft.position} onChange={(e) => setDraft({ ...draft, position: Number(e.target.value) })} />
          </div>
          <div>
            <span className="label">Imagen</span>
            <div className="flex items-center gap-3">
              {draft.image_url && (
                <span className="relative size-12 overflow-hidden rounded-xl">
                  <Image src={draft.image_url} alt="" fill sizes="48px" className="object-cover" />
                </span>
              )}
              <label className="btn btn-ghost cursor-pointer">
                <Icon name="upload" size={18} /> {uploading ? "Subiendo…" : draft.image_url ? "Cambiar" : "Subir imagen"}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/avif"
                  className="sr-only"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setUploading(true);
                    try {
                      const { url } = await uploadPublicImage(file, "categories");
                      setDraft((d) => (d ? { ...d, image_url: url } : d));
                    } catch (err) {
                      toast({ title: "No se pudo subir", description: errorMessage(err), tone: "error" });
                    } finally {
                      setUploading(false);
                      e.target.value = "";
                    }
                  }}
                />
              </label>
              {draft.image_url && (
                <button type="button" className="text-sm text-ink-soft hover:text-m-red" onClick={() => setDraft({ ...draft, image_url: null })}>
                  Quitar
                </button>
              )}
            </div>
          </div>
          <label className="flex items-center gap-3 sm:col-span-2">
            <input type="checkbox" className="size-5 accent-[var(--color-ink)]" checked={draft.show_in_menu} onChange={(e) => setDraft({ ...draft, show_in_menu: e.target.checked })} />
            <span>
              <span className="block font-medium">Mostrar en el menú de Productos</span>
              <span className="block text-sm text-ink-soft">Aparece en el menú desplegable de arriba, con su nombre y descripción.</span>
            </span>
          </label>
          <div className="flex justify-end gap-2 sm:col-span-2">
            <button type="button" className="btn btn-ghost" onClick={() => setDraft(null)}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving || uploading}>
              {saving ? "Guardando…" : "Guardar"}
            </button>
          </div>
        </form>
      )}

      <div className="rounded-3xl bg-white shadow-[var(--shadow-soft)]">
        {items === null ? (
          <div className="space-y-2 p-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="skeleton h-16 rounded-2xl" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="p-10 text-center text-ink-soft">Aún no hay categorías.</p>
        ) : (
          <ul className="divide-y divide-line">
            {items.map((c) => (
              <li key={c.id} className="flex items-center gap-4 p-4">
                <span className="relative size-14 shrink-0 overflow-hidden rounded-2xl bg-paper-2">
                  {c.image_url ? <Image src={c.image_url} alt="" fill sizes="56px" className="object-cover" /> : <ProductArt art={c.placeholder_art ?? "mug"} className="size-full" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{c.name}</span>
                  <span className="text-sm text-ink-soft">
                    /{c.slug}
                    {c.show_in_menu !== false && <span className="ml-2 rounded-full bg-paper px-2 py-0.5 text-xs font-medium text-ink-2">En el menú</span>}
                  </span>
                </span>
                <button
                  type="button"
                  className="grid size-9 place-items-center rounded-full hover:bg-paper"
                  aria-label={`Editar ${c.name}`}
                  onClick={() => setDraft({ id: c.id, name: c.name, slug: c.slug, description: c.description ?? "", image_url: c.image_url, position: c.position, show_in_menu: c.show_in_menu !== false })}
                >
                  <Icon name="edit" size={17} />
                </button>
                <button type="button" className="grid size-9 place-items-center rounded-full hover:bg-m-red/10 hover:text-m-red" aria-label={`Eliminar ${c.name}`} onClick={() => setToDelete(c)}>
                  <Icon name="trash" size={17} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="¿Eliminar categoría?"
        description={`Los productos de “${toDelete?.name}” quedarán sin categoría (no se eliminan).`}
        onCancel={() => setToDelete(null)}
        onConfirm={remove}
      />
    </>
  );
}
