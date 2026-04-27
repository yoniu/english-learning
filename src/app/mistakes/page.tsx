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
import {
  loadActiveProfileId,
  loadAiProfiles,
} from "@/lib/local-settings";
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
      setError("请先到设置页面保存一个 AI 配置。");
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
        `已生成 ${updates.length} 个错词解析，跳过 ${
          sortedMistakes.length - targets.length
        } 个已有解析的错词。`,
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
      setNotice(`已删除 ${confirmingDeleteIds.length} 个错词。`);
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
    <section className="space-y-5">
      <div className="panel flex flex-col justify-between gap-4 rounded-lg p-5 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-6 w-6 text-[var(--coral)]" />
            <h2 className="text-2xl font-black">错词</h2>
          </div>
          <p className="mt-1 text-sm font-semibold text-[var(--muted)]">
            拼写检查失败的单词会自动累计到这里。
          </p>
        </div>
        <button
          className="flex items-center justify-center gap-2 rounded-md bg-[var(--button)] px-5 py-3 font-black text-white transition hover:bg-[var(--button-hover)] disabled:cursor-not-allowed disabled:opacity-60"
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
        <div className="flex flex-col justify-between gap-3 rounded-lg border border-[rgba(23,49,45,0.12)] bg-white/58 p-3 text-sm font-bold text-[var(--muted)] sm:flex-row sm:items-center">
          <span>
            待解析 {pendingAnalysisCount} 个，已跳过{" "}
            {sortedMistakes.length - pendingAnalysisCount} 个已有解析的错词。
          </span>
          <div className="flex flex-wrap gap-2">
            <button
              className="inline-flex items-center justify-center gap-2 rounded-md border border-[rgba(23,49,45,0.14)] bg-white/70 px-3 py-2 font-bold text-[var(--ink)] hover:bg-white"
              onClick={toggleSelectAll}
              type="button"
            >
              <CheckSquare className="h-4 w-4" />
              {allSelected ? "取消全选" : "全选"}
            </button>
            <button
              className="inline-flex items-center justify-center gap-2 rounded-md border border-[rgba(200,84,56,0.28)] bg-[rgba(200,84,56,0.08)] px-3 py-2 font-bold text-[var(--coral)] hover:bg-[rgba(200,84,56,0.12)] disabled:cursor-not-allowed disabled:opacity-60"
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

      {error ? (
        <div className="rounded-lg border border-[rgba(200,84,56,0.28)] bg-[rgba(200,84,56,0.1)] p-4 text-sm font-bold text-[var(--coral)]">
          {error}
        </div>
      ) : null}
      {notice ? (
        <div className="rounded-lg border border-[rgba(15,109,115,0.2)] bg-[rgba(15,109,115,0.1)] p-4 text-sm font-bold text-[var(--teal-dark)]">
          {notice}
        </div>
      ) : null}

      {loading ? (
        <div className="panel flex min-h-[360px] items-center justify-center rounded-lg text-[var(--muted)]">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          正在读取错词
        </div>
      ) : sortedMistakes.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {sortedMistakes.map((mistake) => (
            <article className="panel rounded-lg p-4" key={mistake.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <label className="flex items-start gap-3">
                    <input
                      checked={selectedIds.includes(mistake.id)}
                      className="mt-2 h-4 w-4 accent-[var(--button)]"
                      onChange={() => toggleSelected(mistake.id)}
                      type="checkbox"
                    />
                    <span className="min-w-0">
                      <span className="block break-words text-2xl font-black">
                        {mistake.expected}
                      </span>
                    </span>
                  </label>
                  {mistake.aiAnalysis ? (
                    <p className="mt-1 pl-7 text-sm font-black text-[var(--muted)]">
                      {mistake.aiAnalysis.phonetic}
                    </p>
                  ) : null}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="rounded-full bg-[rgba(200,84,56,0.12)] px-3 py-1 text-sm font-black text-[var(--coral)]">
                    x{mistake.count}
                  </span>
                  <button
                    className="rounded-md border border-[rgba(200,84,56,0.28)] bg-[rgba(200,84,56,0.08)] p-2 text-[var(--coral)] hover:bg-[rgba(200,84,56,0.12)]"
                    onClick={() => setConfirmingDeleteIds([mistake.id])}
                    title="删除错词"
                    type="button"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {mistake.aiAnalysis ? (
                <div className="mt-4 space-y-3 rounded-md border border-[rgba(23,49,45,0.12)] bg-white/55 p-3">
                  <p className="text-sm font-bold leading-relaxed">
                    {mistake.aiAnalysis.definition}
                  </p>
                  <p className="text-sm font-semibold leading-relaxed text-[var(--muted)]">
                    {mistake.aiAnalysis.example}
                  </p>
                </div>
              ) : (
                <div className="mt-4 rounded-md border border-[rgba(23,49,45,0.12)] bg-white/55 p-3 text-sm font-bold text-[var(--muted)]">
                  尚未生成 AI 解析
                </div>
              )}

              <p className="mt-3 text-sm font-semibold text-[var(--muted)]">
                最近输入：{mistake.word}
              </p>
              <p className="mt-1 text-xs font-semibold text-[var(--muted)]">
                {new Date(mistake.lastSeenAt).toLocaleString()}
              </p>
              {mistake.listId ? (
                <Link
                  className="mt-4 inline-flex rounded-md border border-[rgba(23,49,45,0.14)] bg-white/70 px-3 py-2 text-sm font-bold text-[var(--ink)] hover:bg-white"
                  href={`/practice?listId=${encodeURIComponent(mistake.listId)}`}
                >
                  {getListTitle(mistake.listId)}
                </Link>
              ) : (
                <p className="mt-4 text-sm font-bold text-[var(--muted)]">
                  {getListTitle(mistake.listId)}
                </p>
              )}
            </article>
          ))}
        </div>
      ) : (
        <div className="panel flex min-h-[360px] items-center justify-center rounded-lg p-6 text-center text-[var(--muted)]">
          还没有错词记录。
        </div>
      )}

      {confirmingDeleteIds.length > 0 ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(23,49,45,0.42)] p-4">
          <section className="panel w-full max-w-md rounded-lg p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-black">删除错词</h2>
                <p className="mt-2 text-sm font-semibold leading-relaxed text-[var(--muted)]">
                  确定删除 {confirmingDeleteIds.length} 个错词吗？删除后它们的次数和
                  AI 解析都会被移除。
                </p>
                <div className="mt-3 max-h-28 overflow-auto rounded-md border border-[rgba(23,49,45,0.12)] bg-white/55 p-2 text-sm font-bold">
                  {selectedMistakes.map((mistake) => mistake.expected).join("、")}
                </div>
              </div>
              <button
                className="rounded-md border border-[rgba(23,49,45,0.12)] bg-white/70 p-2 hover:bg-white"
                onClick={() => setConfirmingDeleteIds([])}
                title="关闭"
                type="button"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                className="rounded-md border border-[rgba(23,49,45,0.14)] bg-white/70 px-4 py-2.5 font-bold text-[var(--ink)] hover:bg-white"
                onClick={() => setConfirmingDeleteIds([])}
                type="button"
              >
                取消
              </button>
              <button
                className="flex items-center justify-center gap-2 rounded-md bg-[var(--button)] px-4 py-2.5 font-black text-white transition hover:bg-[var(--button-hover)] disabled:cursor-not-allowed disabled:opacity-60"
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
