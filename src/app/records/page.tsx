"use client";

import { useEffect, useState } from "react";
import { ClipboardList, Clock3, Loader2, TriangleAlert } from "lucide-react";
import { loadPracticeRecords } from "@/lib/storage";
import type { PracticeRecord } from "@/types/app";

function formatDuration(durationMs: number): string {
  const totalSeconds = Math.max(0, Math.round(durationMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes} 分 ${seconds} 秒`;
}

export default function RecordsPage() {
  const [records, setRecords] = useState<PracticeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadPracticeRecords()
      .then((storedRecords) => setRecords(storedRecords))
      .catch((caughtError) =>
        setError(
          caughtError instanceof Error ? caughtError.message : "读取练习记录失败。",
        ),
      )
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="page-stack">
      <div className="page-hero">
        <div>
          <h1 className="page-hero-title">练习记录</h1>
          <p className="page-hero-text">
            查看每次完整练习的耗时、错词情况和 AI 评价，方便连续复盘自己的进步。
          </p>
        </div>
      </div>

      {error ? <div className="state-banner error">{error}</div> : null}

      {loading ? (
        <div className="loading-state">
          <Loader2 className="h-5 w-5 animate-spin" />
          <div>正在读取练习记录</div>
        </div>
      ) : records.length > 0 ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {records.map((record) => (
          <article className="list-card" key={record.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold">{record.listTitle}</h2>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    完成时间：{new Date(record.completedAt).toLocaleString()}
                  </p>
                </div>
                <span className="subtle-tag">完成 {record.completedItemCount} 条</span>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-4">
                <div className="rounded-xl border border-[var(--line)] bg-[var(--paper-strong)] p-4">
                  <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
                    <Clock3 className="h-4 w-4" />
                    练习耗时
                  </div>
                  <p className="mt-2 text-lg font-semibold">
                    {formatDuration(record.durationMs)}
                  </p>
                </div>
                <div className="rounded-xl border border-[var(--line)] bg-[var(--paper-strong)] p-4">
                  <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
                    <ClipboardList className="h-4 w-4" />
                    提示次数
                  </div>
                  <p className="mt-2 text-lg font-semibold">
                    {record.hintCount}
                  </p>
                </div>
                <div className="rounded-xl border border-[var(--line)] bg-[var(--paper-strong)] p-4">
                  <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
                    <TriangleAlert className="h-4 w-4" />
                    错词数量
                  </div>
                  <p className="mt-2 text-lg font-semibold">
                    {record.wrongWordCount}
                  </p>
                </div>
                <div className="rounded-xl border border-[var(--line)] bg-[var(--paper-strong)] p-4">
                  <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
                    <ClipboardList className="h-4 w-4" />
                    错句数量
                  </div>
                  <p className="mt-2 text-lg font-semibold">
                    {record.wrongSentenceCount}
                  </p>
                </div>
              </div>

              <div className="mt-5 rounded-xl border border-[var(--line)] bg-[var(--paper-strong)] p-4">
                <h3 className="text-base font-semibold">AI 评价</h3>
                <p className="mt-3 text-sm leading-6">{record.evaluation?.summary}</p>

                {record.hintedItems.length > 0 ? (
                  <div className="mt-4">
                    <p className="text-sm font-semibold text-[var(--muted)]">提示过的内容</p>
                    <ul className="mt-2 space-y-2 text-sm leading-6 text-[var(--ink)]">
                      {record.hintedItems.map((item) => (
                        <li key={`${record.id}-hinted-${item.itemId}`}>
                          - {item.text} / {item.zhHint}（{item.count} 次）
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {record.wrongItems.length > 0 ? (
                  <div className="mt-4">
                    <p className="text-sm font-semibold text-[var(--muted)]">检查出错的句子</p>
                    <ul className="mt-2 space-y-2 text-sm leading-6 text-[var(--ink)]">
                      {record.wrongItems.map((item) => (
                        <li key={`${record.id}-wrong-${item.itemId}`}>
                          - {item.text} / {item.zhHint}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  <div>
                    <p className="text-sm font-semibold text-[var(--muted)]">做得不错</p>
                    <ul className="mt-2 space-y-2 text-sm leading-6 text-[var(--ink)]">
                      {(record.evaluation?.strengths ?? []).map((item, index) => (
                        <li key={`${record.id}-strength-${index}`}>- {item}</li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-[var(--muted)]">继续提升</p>
                    <ul className="mt-2 space-y-2 text-sm leading-6 text-[var(--ink)]">
                      {(record.evaluation?.improvements ?? []).map((item, index) => (
                        <li key={`${record.id}-improvement-${index}`}>- {item}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <p className="mt-4 text-sm font-medium text-[var(--accent)]">
                  {record.evaluation?.encouragement}
                </p>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <ClipboardList className="h-12 w-12 text-[var(--accent)]" />
          <h2>还没有练习记录</h2>
          <p>完成一整组练习后，这里会自动生成练习记录和 AI 评价。</p>
        </div>
      )}
    </section>
  );
}
