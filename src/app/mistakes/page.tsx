"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  AlertCircle,
  CheckSquare,
  Loader2,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { generateMistakeAnalyses } from "@/lib/ai";
import { loadActiveProfileId, loadAiProfiles } from "@/lib/local-settings";
import {
  deleteMistake,
  loadMistakes,
  loadPracticeLists,
  saveMistakeAnalyses,
} from "@/lib/storage";
import type { AiProfile, MistakeRecord, PracticeList } from "@/types/app";

function hasAiAnalysis(mistake: MistakeRecord): boolean {
  return Boolean(
    mistake.aiAnalysis?.phonetic?.trim() &&
      mistake.aiAnalysis.definition.trim() &&
      mistake.aiAnalysis.example.trim(),
  );
}

export default function MistakesPage() {
  const [mistakes, setMistakes] = useState<MistakeRecord[]>([]);
  const [lists, setLists] = useState<PracticeList[]>([]);
  const [profiles, setProfiles] = useState<AiProfile[]>([]);
  const [activeProfileId, setActiveProfileId] = useState("");
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [confirmingDeleteIds, setConfirmingDeleteIds] = useState<string[]>([]);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const activeProfile =
    profiles.find((profile) => profile.id === activeProfileId) ?? profiles[0];

  const sortedMistakes = mistakes
    .slice()
    .sort((first, second) => second.count - first.count);
  const pendingAnalysisCount = sortedMistakes.filter(
    (mistake) => !hasAiAnalysis(mistake),
  ).length;
  const selectedMistakes = sortedMistakes.filter((mistake) =>
    confirmingDeleteIds.includes(mistake.id),
  );
  const allSelected =
    sortedMistakes.length > 0 && selectedIds.length === sortedMistakes.length;

  useEffect(() => {
    Promise.all([loadMistakes(), loadPracticeLists()])
      .then(([storedMistakes, storedLists]) => {
        setMistakes(storedMistakes);
        setLists(storedLists);
        setSelectedIds((current) =>
          current.filter((id) =>
            storedMistakes.some((mistake) => mistake.id === id),
          ),
        );
        setProfiles(loadAiProfiles());
        setActiveProfileId(loadActiveProfileId());
      })
      .catch((caughtError) =>
        setError(
          caughtError instanceof Error ? caughtError.message : "读取错词失败。",
        ),
      )
      .finally(() => setLoading(false));
  }, []);

  function getListTitle(listId?: string): string {
    if (!listId) {
      return "未知练习列表";
    }

    return lists.find((list) => list.id === listId)?.title ?? "练习列表";
  }

  function toggleSelected(mistakeId: string) {
    setSelectedIds((current) =>
      current.includes(mistakeId)
        ? current.filter((id) => id !== mistakeId)
        : [...current, mistakeId],
    );
  }

  function toggleSelectAll() {
    setSelectedIds(allSelected ? [] : sortedMistakes.map((mistake) => mistake.id));
  }

  async function handleAnalyze() {
    setError("");
    setNotice("");

    if (!activeProfile) {
      setError("请先到设置页保存一个 AI 配置。");
      return;
    }

    const targets = sortedMistakes.filter((mistake) => !hasAiAnalysis(mistake));

    if (targets.length === 0) {
      setNotice("所有错词都已经生成过 AI 解析。");
      return;
    }

    setAnalyzing(true);

    try {
      const analyses = await generateMistakeAnalyses(
        activeProfile,
        targets.map((mistake) => mistake.expected),
      );
      const updates = targets
        .map((mistake) => {
          const analysis = analyses[mistake.expected.trim().toLowerCase()];
          return analysis ? { id: mistake.id, aiAnalysis: analysis } : null;
        })
        .filter((update): update is NonNullable<typeof update> =>
          Boolean(update),
        );

      if (updates.length === 0) {
        throw new Error("AI 没有返回可用的错词解析。");
      }

      const nextMistakes = await saveMistakeAnalyses(updates);
      setMistakes(nextMistakes);
      setNotice(
        `已生成 ${updates.length} 条错词解析，跳过 ${
          sortedMistakes.length - targets.length
        } 条已有解析的内容。`,
      );
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : "AI 解析失败。",
      );
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleDelete() {
    if (confirmingDeleteIds.length === 0) {
      return;
    }

    setError("");
    setNotice("");
    setDeleting(true);

    try {
      await Promise.all(confirmingDeleteIds.map((id) => deleteMistake(id)));
      setMistakes((current) =>
        current.filter((mistake) => !confirmingDeleteIds.includes(mistake.id)),
      );
      setSelectedIds((current) =>
        current.filter((id) => !confirmingDeleteIds.includes(id)),
      );
      setNotice(`已删除 ${confirmingDeleteIds.length} 条错词记录。`);
      setConfirmingDeleteIds([]);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : "删除错词失败。",
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <section className="page-stack">
      <div className="page-hero">
        <div>
          <h1 className="page-hero-title">错词本</h1>
          <p className="page-hero-text">
            系统会自动记录拼写错误，支持批量生成 AI 解析，方便回顾发音、释义和例句。
          </p>
        </div>
        <button
          className="primary-button"
          disabled={loading || analyzing || sortedMistakes.length === 0}
          onClick={() => void handleAnalyze()}
          type="button"
        >
          {analyzing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          AI 解析
        </button>
      </div>

      {!loading && sortedMistakes.length > 0 ? (
        <div className="toolbar-strip">
          <span className="text-sm font-medium text-[var(--muted)]">
            待解析 {pendingAnalysisCount} 条，已完成{" "}
            {sortedMistakes.length - pendingAnalysisCount} 条。
          </span>
          <div className="flex flex-wrap gap-2">
            <button className="secondary-button" onClick={toggleSelectAll} type="button">
              <CheckSquare className="h-4 w-4" />
              {allSelected ? "取消全选" : "全选"}
            </button>
            <button
              className="danger-button"
              disabled={selectedIds.length === 0}
              onClick={() => setConfirmingDeleteIds(selectedIds)}
              type="button"
            >
              <Trash2 className="h-4 w-4" />
              删除选中 {selectedIds.length}
            </button>
          </div>
        </div>
      ) : null}

      {error ? <div className="state-banner error">{error}</div> : null}
      {notice ? <div className="state-banner info">{notice}</div> : null}

      {loading ? (
        <div className="loading-state">
          <Loader2 className="h-5 w-5 animate-spin" />
          <div>正在读取错词记录</div>
        </div>
      ) : sortedMistakes.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {sortedMistakes.map((mistake) => (
            <article className="list-card" key={mistake.id}>
              <div className="flex items-start justify-between gap-3">
                <label className="flex min-w-0 items-start gap-3">
                  <input
                    checked={selectedIds.includes(mistake.id)}
                    className="mt-2 h-4 w-4 accent-[var(--button)]"
                    onChange={() => toggleSelected(mistake.id)}
                    type="checkbox"
                  />
                  <span className="min-w-0">
                    <span className="block break-words text-2xl font-semibold">
                      {mistake.expected}
                    </span>
                    {mistake.aiAnalysis ? (
                      <span className="mt-1 block text-sm text-[var(--muted)]">
                        {mistake.aiAnalysis.phonetic}
                      </span>
                    ) : null}
                  </span>
                </label>

                <div className="flex shrink-0 items-center gap-2">
                  <span className="count-tag">x{mistake.count}</span>
                  <button
                    className="icon-button"
                    onClick={() => setConfirmingDeleteIds([mistake.id])}
                    title="删除错词"
                    type="button"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {mistake.aiAnalysis ? (
                <div className="mt-4 rounded-xl border border-[var(--line)] bg-[var(--paper-strong)] p-4">
                  <p className="text-sm font-medium leading-6">
                    {mistake.aiAnalysis.definition}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                    {mistake.aiAnalysis.example}
                  </p>
                </div>
              ) : (
                <div className="state-banner mt-4">尚未生成 AI 解析</div>
              )}

              <p className="mt-4 text-sm text-[var(--muted)]">
                最近输入：{mistake.word}
              </p>
              <p className="mt-1 text-xs text-[var(--muted-soft)]">
                {new Date(mistake.lastSeenAt).toLocaleString()}
              </p>

              {mistake.listId ? (
                <Link
                  className="secondary-button mt-4"
                  href={`/practice?listId=${encodeURIComponent(mistake.listId)}`}
                >
                  {getListTitle(mistake.listId)}
                </Link>
              ) : (
                <p className="mt-4 text-sm font-medium text-[var(--muted)]">
                  {getListTitle(mistake.listId)}
                </p>
              )}
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <AlertCircle className="h-12 w-12 text-[var(--accent)]" />
          <h2>还没有错词记录</h2>
          <p>完成几次练习后，错词会自动出现在这里。</p>
        </div>
      )}

      {confirmingDeleteIds.length > 0 ? (
        <div className="modal-backdrop">
          <section className="modal-surface max-w-md">
            <div className="section-header">
              <div>
                <h2 className="section-title">删除错词</h2>
                <p className="section-subtitle">
                  确认删除 {confirmingDeleteIds.length} 条错词吗？删除后它们的次数和
                  AI 解析都会被移除。
                </p>
              </div>
              <button
                className="icon-button"
                onClick={() => setConfirmingDeleteIds([])}
                title="关闭"
                type="button"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 max-h-28 overflow-auto rounded-lg border border-[var(--line)] bg-[var(--paper-strong)] p-3 text-sm font-medium">
              {selectedMistakes.map((mistake) => mistake.expected).join("、")}
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                className="secondary-button"
                onClick={() => setConfirmingDeleteIds([])}
                type="button"
              >
                取消
              </button>
              <button
                className="danger-button"
                disabled={deleting}
                onClick={() => void handleDelete()}
                type="button"
              >
                {deleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                删除
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}
