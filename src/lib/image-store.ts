"use client";

/**
 * Guarda en el navegador (IndexedDB) la foto de personalización en alta resolución.
 * El carro (localStorage) solo admite unos pocos MB, así que ahí va una vista previa reducida
 * y aquí la versión que se imprime. Se borra sola a los 30 días.
 */
const DB = "minerva-images";
const STORE = "uploads";
const MAX_AGE = 30 * 86_400_000;

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx<T>(mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return open().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(STORE, mode);
        const req = run(t.objectStore(STORE));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
        t.oncomplete = () => db.close();
      }),
  );
}

/** Guarda la imagen y devuelve su clave; null si el navegador no lo permite (modo privado, etc.). */
export async function putImage(blob: Blob): Promise<string | null> {
  try {
    const key = crypto.randomUUID();
    await tx("readwrite", (s) => s.put({ blob, at: Date.now() }, key));
    void prune();
    return key;
  } catch {
    return null;
  }
}

export async function getImage(key: string): Promise<Blob | null> {
  try {
    const v = (await tx("readonly", (s) => s.get(key))) as { blob: Blob } | undefined;
    return v?.blob ?? null;
  } catch {
    return null;
  }
}

async function prune() {
  try {
    const db = await open();
    const t = db.transaction(STORE, "readwrite");
    const req = t.objectStore(STORE).openCursor();
    req.onsuccess = () => {
      const c = req.result;
      if (!c) return;
      if (Date.now() - ((c.value as { at?: number }).at ?? 0) > MAX_AGE) c.delete();
      c.continue();
    };
    t.oncomplete = () => db.close();
  } catch {
    /* sin IndexedDB */
  }
}
