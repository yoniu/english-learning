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
          caughtError instanceof Error ? caughtError.message : "读取标记内容失败。",
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
    <section className="page-stack">
      <div className="page-hero">
        <div>
          <h1 className="page-hero-title">标记内容</h1>
          <p className="page-hero-text">
            这里集中展示你在练习中手动标记的短句和短语，方便回头强化记忆。
          </p>
        </div>
      </div>

      {error ? <div className="state-banner error">{error}</div> : null}

      {loading ? (
        <div className="loading-state">
          <Loader2 className="h-5 w-5 animate-spin" />
          <div>正在读取标记内容</div>
        </div>
      ) : markedItems.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {markedItems.map((item) => (
            <button
              className="list-card text-left"
              key={item.id}
              onClick={() => void startPractice(item)}
              type="button"
            >
              <div className="flex items-center gap-2">
                <span className="kind-tag">
                  {item.kind === "sentence" ? "短句" : "短语"}
                </span>
                <span className="text-xs font-medium text-[var(--muted)]">
                  {getListTitle(item.listId)}
                </span>
              </div>
              <p className="mt-4 text-lg font-semibold leading-8">{item.text}</p>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                {item.zhHint}
              </p>
            </button>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <BookmarkCheck className="h-12 w-12 text-[var(--accent)]" />
          <h2>还没有标记内容</h2>
          <p>在练习页点击“标记”，这里就会自动收集起来。</p>
        </div>
      )}
    </section>
  );
}
