import type {
  GeneratedPracticeItem,
  MistakeAnalysis,
  MistakeRecord,
  PracticeItem,
  PracticeRecord,
  PracticeSession,
  PracticeList,
} from "@/types/app";
import { normalizeWord } from "@/lib/words";

const DB_NAME = "english-learning-ai";
const DB_VERSION = 3;
const ACTIVE_LIST_KEY = "activeListId";
const ACTIVE_SESSION_KEY = "activePracticeSessionId";

type StoreName = "lists" | "items" | "mistakes" | "records" | "meta";

function createId(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function currentIndexKey(listId: string): string {
  return `currentIndex:${listId}`;
}

function sessionKey(sessionId: string): string {
  return `practiceSession:${sessionId}`;
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains("lists")) {
        db.createObjectStore("lists", { keyPath: "id" });
      }

      let itemsStore: IDBObjectStore;
      if (!db.objectStoreNames.contains("items")) {
        itemsStore = db.createObjectStore("items", { keyPath: "id" });
        itemsStore.createIndex("topic", "topic", { unique: false });
      } else {
        itemsStore = request.transaction!.objectStore("items");
      }

      if (!itemsStore.indexNames.contains("listId")) {
        itemsStore.createIndex("listId", "listId", { unique: false });
      }

      if (!db.objectStoreNames.contains("mistakes")) {
        db.createObjectStore("mistakes", { keyPath: "id" });
      }

      if (!db.objectStoreNames.contains("records")) {
        const recordsStore = db.createObjectStore("records", { keyPath: "id" });
        recordsStore.createIndex("completedAt", "completedAt", { unique: false });
        recordsStore.createIndex("listId", "listId", { unique: false });
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

function transactionToPromise(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
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

async function ensureLegacyPracticeList(): Promise<void> {
  const readDb = await openDatabase();
  const readTx = readDb.transaction(["lists", "items"], "readonly");
  const listsRequest = readTx.objectStore("lists").getAll();
  const itemsRequest = readTx.objectStore("items").getAll();
  const [lists, allItems] = await Promise.all([
    requestToPromise<PracticeList[]>(listsRequest),
    requestToPromise(itemsRequest) as Promise<
      Array<PracticeItem & { listId?: string }>
    >,
  ]);

  if (lists.length > 0) {
    readDb.close();
    return;
  }

  const legacyItems = allItems.filter((item) => !item.listId);
  readDb.close();

  if (legacyItems.length === 0) {
    return;
  }

  const writeDb = await openDatabase();

  try {
    const tx = writeDb.transaction(["lists", "items", "meta"], "readwrite");
    const listsStore = tx.objectStore("lists");
    const itemsStore = tx.objectStore("items");
    const metaStore = tx.objectStore("meta");

    const now = new Date().toISOString();
    const listId = createId();
    const list: PracticeList = {
      id: listId,
      title: "历史练习集合",
      topic: legacyItems[0]?.topic ?? "legacy",
      level: "unknown",
      itemCount: legacyItems.length,
      createdAt: now,
      updatedAt: now,
    };

    listsStore.put(list);
    metaStore.put({ key: ACTIVE_LIST_KEY, value: listId });
    metaStore.put({ key: currentIndexKey(listId), value: 0 });

    for (const item of legacyItems) {
      itemsStore.put({ ...item, listId });
    }

    await transactionToPromise(tx);
  } finally {
    writeDb.close();
  }
}

function sortLists(lists: PracticeList[]): PracticeList[] {
  return lists.sort(
    (first, second) =>
      new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime(),
  );
}

export async function loadPracticeLists(): Promise<PracticeList[]> {
  await ensureLegacyPracticeList();
  const store = await getStore("lists", "readonly");
  const lists = await requestToPromise<PracticeList[]>(store.getAll());
  return sortLists(lists);
}

export async function loadPracticeList(
  listId: string,
): Promise<PracticeList | undefined> {
  const store = await getStore("lists", "readonly");
  return requestToPromise<PracticeList | undefined>(store.get(listId));
}

export async function createPracticeList(params: {
  topic: string;
  level: string;
  items: GeneratedPracticeItem[];
}): Promise<{ list: PracticeList; items: PracticeItem[] }> {
  const db = await openDatabase();
  const now = new Date().toISOString();
  const listId = createId();
  const list: PracticeList = {
    id: listId,
    title: params.topic.trim(),
    topic: params.topic.trim(),
    level: params.level,
    itemCount: params.items.length,
    createdAt: now,
    updatedAt: now,
  };
  const items: PracticeItem[] = params.items.map((item, index) => ({
    ...item,
    id: `${listId}-${index}`,
    listId,
    marked: false,
  }));

  try {
    const tx = db.transaction(["lists", "items", "meta"], "readwrite");
    const listsStore = tx.objectStore("lists");
    const itemsStore = tx.objectStore("items");
    const metaStore = tx.objectStore("meta");

    listsStore.put(list);
    metaStore.put({ key: ACTIVE_LIST_KEY, value: listId });
    metaStore.put({ key: currentIndexKey(listId), value: 0 });

    for (const item of items) {
      itemsStore.put(item);
    }

    await transactionToPromise(tx);
  } finally {
    db.close();
  }

  return { list, items };
}

export async function loadPracticeItems(listId?: string): Promise<PracticeItem[]> {
  const store = await getStore("items", "readonly");

  if (!listId) {
    return requestToPromise<PracticeItem[]>(store.getAll());
  }

  const index = store.index("listId");
  return requestToPromise<PracticeItem[]>(index.getAll(IDBKeyRange.only(listId)));
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
  mistakes: Array<{
    word: string;
    expected: string;
    itemId: string;
    listId: string;
  }>,
): Promise<MistakeRecord[]> {
  const existingMistakes = await loadMistakes();
  const existingById = new Map(
    existingMistakes.map((mistake) => [mistake.id, mistake]),
  );
  const db = await openDatabase();
  const now = new Date().toISOString();

  try {
    const tx = db.transaction("mistakes", "readwrite");
    const store = tx.objectStore("mistakes");

    for (const mistake of mistakes) {
      const id = normalizeWord(mistake.expected);
      const existing = existingById.get(id);
      const next: MistakeRecord = {
        ...existing,
        id,
        word: mistake.word.trim() || "(blank)",
        expected: mistake.expected,
        itemId: mistake.itemId,
        listId: mistake.listId,
        count: existing ? existing.count + 1 : 1,
        lastSeenAt: now,
      };

      store.put(next);
    }

    await transactionToPromise(tx);
  } finally {
    db.close();
  }

  return loadMistakes();
}

export async function saveMistakeAnalyses(
  analyses: Array<{ id: string; aiAnalysis: MistakeAnalysis }>,
): Promise<MistakeRecord[]> {
  if (analyses.length === 0) {
    return loadMistakes();
  }

  const existingMistakes = await loadMistakes();
  const existingById = new Map(
    existingMistakes.map((mistake) => [mistake.id, mistake]),
  );
  const db = await openDatabase();

  try {
    const tx = db.transaction("mistakes", "readwrite");
    const store = tx.objectStore("mistakes");

    for (const analysis of analyses) {
      const existing = existingById.get(analysis.id);

      if (existing) {
        store.put({ ...existing, aiAnalysis: analysis.aiAnalysis });
      }
    }

    await transactionToPromise(tx);
  } finally {
    db.close();
  }

  return loadMistakes();
}

export async function deleteMistake(mistakeId: string): Promise<void> {
  const store = await getStore("mistakes", "readwrite");
  await requestToPromise(store.delete(mistakeId));
}

export async function loadActivePracticeListId(): Promise<string> {
  const store = await getStore("meta", "readonly");
  const result = (await requestToPromise(store.get(ACTIVE_LIST_KEY))) as
    | { key: string; value: string }
    | undefined;

  return result?.value ?? "";
}

export async function saveActivePracticeListId(listId: string): Promise<void> {
  const store = await getStore("meta", "readwrite");
  await requestToPromise(store.put({ key: ACTIVE_LIST_KEY, value: listId }));
}

export async function loadCurrentIndex(listId: string): Promise<number> {
  const store = await getStore("meta", "readonly");
  const result = (await requestToPromise(store.get(currentIndexKey(listId)))) as
    | { key: string; value: number }
    | undefined;

  return typeof result?.value === "number" ? result.value : 0;
}

export async function saveCurrentIndex(
  listId: string,
  value: number,
): Promise<void> {
  const store = await getStore("meta", "readwrite");
  await requestToPromise(store.put({ key: currentIndexKey(listId), value }));
  await saveActivePracticeListId(listId);
}

function shuffleItemIds(items: PracticeItem[]): string[] {
  const ids = items.map((item) => item.id);

  for (let index = ids.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [ids[index], ids[swapIndex]] = [ids[swapIndex], ids[index]];
  }

  return ids;
}

export async function startPracticeSession(listId: string): Promise<PracticeSession> {
  const [list, items] = await Promise.all([
    loadPracticeList(listId),
    loadPracticeItems(listId),
  ]);

  if (!list || items.length === 0) {
    throw new Error("Practice list not found.");
  }

  const session: PracticeSession = {
    id: createId(),
    listId,
    startedAt: new Date().toISOString(),
    shuffledItemIds: shuffleItemIds(items),
  };

  const store = await getStore("meta", "readwrite");
  await requestToPromise(store.put({ key: sessionKey(session.id), value: session }));
  await requestToPromise(store.put({ key: ACTIVE_SESSION_KEY, value: session.id }));
  await requestToPromise(store.put({ key: currentIndexKey(listId), value: 0 }));
  await requestToPromise(store.put({ key: ACTIVE_LIST_KEY, value: listId }));

  return session;
}

export async function loadPracticeSession(
  sessionId: string,
): Promise<PracticeSession | undefined> {
  const store = await getStore("meta", "readonly");
  const result = (await requestToPromise(store.get(sessionKey(sessionId)))) as
    | { key: string; value: PracticeSession }
    | undefined;

  return result?.value;
}

export async function loadActivePracticeSessionId(): Promise<string> {
  const store = await getStore("meta", "readonly");
  const result = (await requestToPromise(store.get(ACTIVE_SESSION_KEY))) as
    | { key: string; value: string }
    | undefined;

  return result?.value ?? "";
}

export async function stopPracticeSession(sessionId: string): Promise<void> {
  const store = await getStore("meta", "readwrite");
  const activeSessionId = await loadActivePracticeSessionId();

  await requestToPromise(store.delete(sessionKey(sessionId)));

  if (activeSessionId === sessionId) {
    await requestToPromise(store.delete(ACTIVE_SESSION_KEY));
  }
}

export async function savePracticeRecord(
  record: PracticeRecord,
): Promise<PracticeRecord> {
  const db = await openDatabase();

  try {
    const tx = db.transaction(["records", "meta"], "readwrite");
    const recordsStore = tx.objectStore("records");
    const metaStore = tx.objectStore("meta");

    recordsStore.put(record);
    metaStore.delete(sessionKey(record.sessionId));

    const activeSession = await requestToPromise(
      metaStore.get(ACTIVE_SESSION_KEY),
    ) as { key: string; value: string } | undefined;

    if (activeSession?.value === record.sessionId) {
      metaStore.delete(ACTIVE_SESSION_KEY);
    }

    await transactionToPromise(tx);
  } finally {
    db.close();
  }

  return record;
}

export async function loadPracticeRecords(): Promise<PracticeRecord[]> {
  const store = await getStore("records", "readonly");
  const records = await requestToPromise<PracticeRecord[]>(store.getAll());
  return records.sort(
    (first, second) =>
      new Date(second.completedAt).getTime() - new Date(first.completedAt).getTime(),
  );
}
