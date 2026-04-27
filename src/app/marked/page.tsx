"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BookmarkCheck, Loader2 } from "lucide-react";
import {
  loadPracticeItems,
  loadPracticeLists,
  saveCurrentIndex,
} from "@/lib/storage";
import type { PracticeItem, PracticeList } from "@/types/app";

export default function MarkedPage() {
  const router = useRouter();
  const [items, setItems] = useState<PracticeItem[]>([]);
  const [lists, setLists] = useState<PracticeList[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const markedItems = items.filter((item) => item.marked);

  useEffect(() => {
    Promise.all([loadPracticeItems(), loadPracticeLists()])
      .then(([storedItems, storedLists]) => {
        setItems(storedItems);
        setLists(storedLists);
      })
      .catch((caughtError) =>
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "读取标记内容失败。",
        ),
      )
      .finally(() => setLoading(false));
  }, []);

  async function startPractice(item: PracticeItem) {
    const listItems = items.filter(
      (candidate) => candidate.listId === item.listId,
    );
    const index = listItems.findIndex((candidate) => candidate.id === item.id);

    if (index >= 0) {
      await saveCurrentIndex(item.listId, index);
      router.push(`/practice?listId=${encodeURIComponent(item.listId)}`);
    }
  }

  function getListTitle(listId: string): string {
    return lists.find((list) => list.id === listId)?.title ?? "练习列表";
  }

  return (
    <section className="space-y-5">
      <div className="panel rounded-lg p-5">
        <div className="flex items-center gap-2">
          <BookmarkCheck className="h-6 w-6 text-[var(--gold)]" />
          <h2 className="text-2xl font-black">短语标记</h2>
        </div>
        <p className="mt-1 text-sm font-semibold text-[var(--muted)]">
          这里集中展示练习中手动标记的短句和短语。
        </p>
      </div>

      {error ? (
        <div className="rounded-lg border border-[rgba(200,84,56,0.28)] bg-[rgba(200,84,56,0.1)] p-4 text-sm font-bold text-[var(--coral)]">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="panel flex min-h-[360px] items-center justify-center rounded-lg text-[var(--muted)]">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          正在读取标记
        </div>
      ) : markedItems.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {markedItems.map((item) => (
            <button
              className="panel rounded-lg p-4 text-left transition hover:-translate-y-0.5 hover:bg-white/90"
              key={item.id}
              onClick={() => void startPractice(item)}
              type="button"
            >
              <span className="rounded-full bg-[rgba(201,155,47,0.16)] px-3 py-1 text-xs font-black text-[var(--gold)]">
                {item.kind === "sentence" ? "短句" : "短语"}
              </span>
              <span className="ml-2 text-xs font-bold text-[var(--muted)]">
                {getListTitle(item.listId)}
              </span>
              <p className="mt-4 text-lg font-black leading-snug">
                {item.text}
              </p>
              <p className="mt-2 text-sm font-semibold text-[var(--muted)]">
                {item.zhHint}
              </p>
            </button>
          ))}
        </div>
      ) : (
        <div className="panel flex min-h-[360px] items-center justify-center rounded-lg p-6 text-center text-[var(--muted)]">
          还没有标记内容。
        </div>
      )}
    </section>
  );
}
