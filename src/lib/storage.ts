import type { MistakeRecord, PracticeItem } from "@/types/app";
import { normalizeWord } from "@/lib/words";

const DB_NAME = "english-learning-ai";
const DB_VERSION = 1;
const CURRENT_INDEX_KEY = "currentIndex";

type StoreName = "items" | "mistakes" | "meta";

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains("items")) {
        const store = db.createObjectStore("items", { keyPath: "id" });
        store.createIndex("topic", "topic", { unique: false });
      }

      if (!db.objectStoreNames.contains("mistakes")) {
        db.createObjectStore("mistakes", { keyPath: "id" });
      }

      if (!db.objectStoreNames.contains("meta")) {
        db.createObjectStore("meta", { keyPath: "key" });
      }
    };
  });
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

async function getStore(storeName: StoreName, mode: IDBTransactionMode) {
  const db = await openDatabase();
  const tx = db.transaction(storeName, mode);
  tx.oncomplete = () => db.close();
  tx.onerror = () => db.close();
  tx.onabort = () => db.close();
  return tx.objectStore(storeName);
}

export async function loadPracticeItems(): Promise<PracticeItem[]> {
  const store = await getStore("items", "readonly");
  return requestToPromise<PracticeItem[]>(store.getAll());
}

export async function replacePracticeItems(items: PracticeItem[]): Promise<void> {
  const store = await getStore("items", "readwrite");
  await requestToPromise(store.clear());

  for (const item of items) {
    await requestToPromise(store.put(item));
  }

  await saveCurrentIndex(0);
}

export async function savePracticeItem(item: PracticeItem): Promise<void> {
  const store = await getStore("items", "readwrite");
  await requestToPromise(store.put(item));
}

export async function loadMistakes(): Promise<MistakeRecord[]> {
  const store = await getStore("mistakes", "readonly");
  return requestToPromise<MistakeRecord[]>(store.getAll());
}

export async function recordMistakes(
  mistakes: Array<{ word: string; expected: string; itemId: string }>,
): Promise<MistakeRecord[]> {
  const store = await getStore("mistakes", "readwrite");
  const now = new Date().toISOString();

  for (const mistake of mistakes) {
    const id = normalizeWord(mistake.expected);
    const existing = (await requestToPromise(
      store.get(id),
    )) as MistakeRecord | undefined;
    const next: MistakeRecord = {
      id,
      word: mistake.word.trim() || "(blank)",
      expected: mistake.expected,
      itemId: mistake.itemId,
      count: existing ? existing.count + 1 : 1,
      lastSeenAt: now,
    };

    await requestToPromise(store.put(next));
  }

  return loadMistakes();
}

export async function loadCurrentIndex(): Promise<number> {
  const store = await getStore("meta", "readonly");
  const result = (await requestToPromise(store.get(CURRENT_INDEX_KEY))) as
    | { key: string; value: number }
    | undefined;

  return typeof result?.value === "number" ? result.value : 0;
}

export async function saveCurrentIndex(value: number): Promise<void> {
  const store = await getStore("meta", "readwrite");
  await requestToPromise(store.put({ key: CURRENT_INDEX_KEY, value }));
}
