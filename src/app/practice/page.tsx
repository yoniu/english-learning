"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  Bookmark,
  BookmarkCheck,
  Database,
  Eye,
  Keyboard,
  Loader2,
  Volume2,
} from "lucide-react";
import {
  loadActivePracticeListId,
  loadCurrentIndex,
  loadPracticeItems,
  loadPracticeList,
  loadPracticeLists,
  recordMistakes,
  saveActivePracticeListId,
  saveCurrentIndex,
  savePracticeItem,
} from "@/lib/storage";
import { primeSpeechSynthesis, speakEnglishText } from "@/lib/speech";
import { isWordCorrect, tokenizeText } from "@/lib/words";
import type { PracticeItem, PracticeList } from "@/types/app";

function practiceHref(listId: string): string {
  return `/practice?listId=${encodeURIComponent(listId)}`;
}

export default function PracticePage() {
  const [listId, setListId] = useState("");
  const [list, setList] = useState<PracticeList>();
  const [items, setItems] = useState<PracticeItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [wordStatuses, setWordStatuses] = useState<
    Record<number, "correct" | "wrong">
  >({});
  const [showTextHint, setShowTextHint] = useState(false);
  const hintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const currentItem = items[currentIndex];
  const tokens = currentItem ? tokenizeText(currentItem.text) : [];

  useEffect(() => {
    primeSpeechSynthesis();

    return () => {
      if (hintTimerRef.current) {
        clearTimeout(hintTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    async function hydrate() {
      const requestedListId = new URLSearchParams(window.location.search).get(
        "listId",
      );
      const [activeListId, lists] = await Promise.all([
        loadActivePracticeListId(),
        loadPracticeLists(),
      ]);
      const targetListId = requestedListId || activeListId || lists[0]?.id || "";

      if (!targetListId) {
        setLoading(false);
        return;
      }

      window.history.replaceState(null, "", practiceHref(targetListId));
      await loadList(targetListId);
    }

    hydrate().catch((caughtError) => {
      setError(
        caughtError instanceof Error ? caughtError.message : "读取练习失败。",
      );
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    setAnswers(tokens.map(() => ""));
    setWordStatuses({});
    setNotice("");
    setShowTextHint(false);
    if (hintTimerRef.current) {
      clearTimeout(hintTimerRef.current);
      hintTimerRef.current = null;
    }
  }, [currentItem?.id]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.isComposing) {
        return;
      }

      if (event.ctrlKey && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void speakCurrentItem();
        return;
      }

      if (event.ctrlKey && event.key.toLowerCase() === "m") {
        event.preventDefault();
        void toggleCurrentMark();
        return;
      }

      if (event.ctrlKey && event.key.toLowerCase() === "d") {
        event.preventDefault();
        revealTextHint();
        return;
      }

      if (event.key === "Enter") {
        event.preventDefault();
        void checkCurrentItem();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  async function loadList(nextListId: string) {
    setLoading(true);
    setError("");
    const [storedList, storedItems, storedIndex] = await Promise.all([
      loadPracticeList(nextListId),
      loadPracticeItems(nextListId),
      loadCurrentIndex(nextListId),
    ]);

    setListId(nextListId);
    setList(storedList);
    setItems(storedItems);
    setCurrentIndex(
      storedItems.length > 0 ? Math.min(storedIndex, storedItems.length - 1) : 0,
    );
    await saveActivePracticeListId(nextListId);
    setLoading(false);
  }

  function validateWord(index: number) {
    const token = tokens[index];

    if (!token || !answers[index]) {
      return;
    }

    setWordStatuses((current) => ({
      ...current,
      [index]: isWordCorrect(answers[index], token.word) ? "correct" : "wrong",
    }));
  }

  async function checkCurrentItem() {
    if (!currentItem || tokens.length === 0 || !listId) {
      return;
    }

    const wrongWords = tokens
      .map((token, index) => ({
        token,
        answer: answers[index] ?? "",
      }))
      .filter(({ token, answer }) => !isWordCorrect(answer, token.word));

    setWordStatuses(
      tokens.reduce<Record<number, "correct" | "wrong">>(
        (statuses, token, index) => {
          statuses[index] = isWordCorrect(answers[index] ?? "", token.word)
            ? "correct"
            : "wrong";
          return statuses;
        },
        {},
      ),
    );

    if (wrongWords.length > 0) {
      await recordMistakes(
        wrongWords.map(({ token, answer }) => ({
          word: answer,
          expected: token.word,
          itemId: currentItem.id,
          listId,
        })),
      );
      setNotice("还有拼写需要修正，错词已记录。");
      return;
    }

    const nextIndex = Math.min(currentIndex + 1, items.length - 1);
    await saveCurrentIndex(listId, nextIndex);
    setCurrentIndex(nextIndex);
    setNotice(
      currentIndex + 1 >= items.length ? "已完成全部练习。" : "已进入下一条。",
    );
  }

  async function speakCurrentItem() {
    if (!currentItem) {
      return;
    }

    setError("");
    setNotice("正在播放英语提示。");

    try {
      await speakEnglishText(currentItem.text);
      setNotice("已播放英语提示。");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "语音播放失败，请检查浏览器语音权限或系统语音设置。",
      );
    }
  }

  async function toggleCurrentMark() {
    if (!currentItem) {
      return;
    }

    const updatedItem = {
      ...currentItem,
      marked: !currentItem.marked,
    };
    const nextItems = items.map((item) =>
      item.id === currentItem.id ? updatedItem : item,
    );

    await savePracticeItem(updatedItem);
    setItems(nextItems);
    setNotice(updatedItem.marked ? "已标记当前内容。" : "已取消标记。");
  }

  function revealTextHint() {
    setShowTextHint(true);

    if (hintTimerRef.current) {
      clearTimeout(hintTimerRef.current);
    }

    hintTimerRef.current = setTimeout(() => {
      setShowTextHint(false);
      hintTimerRef.current = null;
    }, 5000);
  }

  function goToItem(index: number) {
    if (!listId) {
      return;
    }

    const nextIndex = Math.max(0, Math.min(index, items.length - 1));
    setCurrentIndex(nextIndex);
    void saveCurrentIndex(listId, nextIndex);
  }

  if (loading) {
    return (
      <section className="panel flex min-h-[520px] items-center justify-center rounded-lg text-[var(--muted)]">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        正在读取练习
      </section>
    );
  }

  if (!list || !currentItem) {
    return (
      <section className="panel flex min-h-[520px] flex-col items-center justify-center rounded-lg p-6 text-center">
        <Database className="h-12 w-12 text-[var(--teal)]" />
        <h2 className="mt-4 text-2xl font-black">没有找到练习列表</h2>
        <p className="mt-2 max-w-md text-[var(--muted)]">
          返回首页选择一个已有练习列表，或生成新的练习列表。
        </p>
        <Link
          className="mt-5 rounded-md bg-[var(--teal)] px-5 py-2.5 font-black text-white hover:bg-[var(--teal-dark)]"
          href="/"
        >
          返回练习列表
        </Link>
      </section>
    );
  }

  return (
    <section className="panel flex min-h-[640px] flex-col rounded-lg p-5 sm:p-6">
      <div className="flex flex-col justify-between gap-4 border-b border-[rgba(23,49,45,0.12)] pb-4 sm:flex-row sm:items-start">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-[rgba(15,109,115,0.12)] px-3 py-1 text-sm font-bold text-[var(--teal-dark)]">
              {currentItem.kind === "sentence" ? "短句" : "短语"}
            </span>
            <span className="text-sm font-semibold text-[var(--muted)]">
              {list.title}
            </span>
            <span className="text-sm font-semibold text-[var(--muted)]">
              {currentIndex + 1} / {items.length}
            </span>
          </div>
          <p className="mt-3 text-2xl font-black leading-snug sm:text-4xl">
            {currentItem.zhHint}
          </p>
          {showTextHint ? (
            <p className="mt-2 flex flex-wrap gap-x-1 gap-y-2 text-lg font-bold text-[var(--accent-strong)]">
              {tokens.map((token, index) => {
                const isMissing = !answers[index]?.trim();

                return (
                  <span
                    className={
                      isMissing
                        ? "rounded bg-[var(--mark-surface)] px-1 text-[var(--accent-strong)] ring-1 ring-[var(--line)]"
                        : "text-[var(--muted)]"
                    }
                    key={`${token.word}-hint-${index}`}
                  >
                    {token.word}
                    {token.trailing}
                  </span>
                );
              })}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            className="practice-tool-button text-[var(--teal-dark)]"
            onClick={() => void speakCurrentItem()}
            title="播放语音"
            type="button"
          >
            <Volume2 className="h-5 w-5" />
            <span>播放</span>
            <kbd>Ctrl+S</kbd>
          </button>
          <button
            className="practice-tool-button text-[var(--gold)]"
            onClick={() => void toggleCurrentMark()}
            title="标记当前内容"
            type="button"
          >
            {currentItem.marked ? (
              <BookmarkCheck className="h-5 w-5" />
            ) : (
              <Bookmark className="h-5 w-5" />
            )}
            <span>标记</span>
            <kbd>Ctrl+M</kbd>
          </button>
          <button
            className="practice-tool-button text-[var(--muted)]"
            onClick={revealTextHint}
            title="显示 5 秒英文提示"
            type="button"
          >
            <Eye className="h-5 w-5" />
            <span>提示</span>
            <kbd>Ctrl+D</kbd>
          </button>
        </div>
      </div>

      <div className="flex flex-1 content-start items-start gap-x-3 gap-y-5 py-8">
        <div className="flex flex-wrap items-end gap-x-3 gap-y-5">
          {tokens.map((token, index) => (
            <label className="flex items-end gap-1" key={`${token.word}-${index}`}>
              <input
                aria-label={`word-${index + 1}`}
                className={`word-input rounded-md px-3 py-3 text-lg font-black ${
                  wordStatuses[index] ?? ""
                } ${
                  showTextHint && !answers[index]?.trim() ? "hint-missing" : ""
                }`}
                onBlur={() => validateWord(index)}
                onChange={(event) => {
                  const nextAnswers = [...answers];
                  nextAnswers[index] = event.target.value;
                  setAnswers(nextAnswers);
                }}
                value={answers[index] ?? ""}
              />
              {token.trailing ? (
                <span className="pb-2 text-2xl font-black text-[var(--muted)]">
                  {token.trailing}
                </span>
              ) : null}
            </label>
          ))}
        </div>
      </div>

      {error ? (
        <div className="mb-3 rounded-md border border-[rgba(200,84,56,0.28)] bg-[rgba(200,84,56,0.1)] p-3 text-sm font-bold text-[var(--coral)]">
          {error}
        </div>
      ) : null}

      <div className="flex flex-col gap-3 border-t border-[rgba(23,49,45,0.12)] pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-[var(--muted)]">
          <Keyboard className="h-4 w-4" />
          {notice || "输入后失焦会即时校验，回车检查整条。"}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className="rounded-md border border-[rgba(23,49,45,0.16)] bg-white/70 px-4 py-2 font-bold text-[var(--ink)] hover:bg-white disabled:opacity-50"
            disabled={currentIndex === 0}
            onClick={() => goToItem(currentIndex - 1)}
            type="button"
          >
            上一条
          </button>
          <button
            className="inline-flex items-center rounded-md bg-[var(--teal)] px-5 py-2 font-black text-white hover:bg-[var(--teal-dark)]"
            onClick={() => void checkCurrentItem()}
            type="button"
          >
            检查<kbd className="shortcut-key ml-2">Enter</kbd>
          </button>
          <button
            className="rounded-md border border-[rgba(23,49,45,0.16)] bg-white/70 px-4 py-2 font-bold text-[var(--ink)] hover:bg-white disabled:opacity-50"
            disabled={currentIndex >= items.length - 1}
            onClick={() => goToItem(currentIndex + 1)}
            type="button"
          >
            下一条
          </button>
        </div>
      </div>
    </section>
  );
}
