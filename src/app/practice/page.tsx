"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bookmark,
  BookmarkCheck,
  Clock3,
  Database,
  Eye,
  Keyboard,
  Loader2,
  Sparkles,
  Volume2,
  X,
} from "lucide-react";
import { generatePracticeEvaluation } from "@/lib/ai";
import { loadActiveProfileId, loadAiProfiles } from "@/lib/local-settings";
import {
  loadActivePracticeSessionId,
  loadPracticeItems,
  loadPracticeList,
  loadPracticeSession,
  recordMistakes,
  savePracticeItem,
  savePracticeRecord,
  stopPracticeSession,
} from "@/lib/storage";
import { primeSpeechSynthesis, speakEnglishText } from "@/lib/speech";
import { isWordCorrect, tokenizeText } from "@/lib/words";
import type {
  AiProfile,
  PracticeEvaluation,
  PracticeItem,
  PracticeList,
  PracticeRecord,
  PracticeSession,
} from "@/types/app";

function formatDuration(durationMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(durationMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function fallbackEvaluation(
  wrongWordCount: number,
  wrongSentenceCount: number,
  hintCount: number,
): PracticeEvaluation {
  return {
    summary: `本次练习已完成，共出现 ${wrongWordCount} 个错词、${wrongSentenceCount} 个错句，使用了 ${hintCount} 次提示。`,
    strengths: ["完成了整组练习。", "练习节奏保持得不错。"],
    improvements: ["继续复盘高频错词。", "下一轮关注提示较多的句子。"],
    encouragement: "继续保持，你的熟练度会在一轮轮练习中稳步提升。",
  };
}

function buildAttemptText(answers: string[]): string {
  return answers
    .map((answer) => answer.trim())
    .filter(Boolean)
    .join(" ");
}

export default function PracticePage() {
  const router = useRouter();
  const [session, setSession] = useState<PracticeSession>();
  const [list, setList] = useState<PracticeList>();
  const [items, setItems] = useState<PracticeItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [wordStatuses, setWordStatuses] = useState<
    Record<number, "correct" | "wrong">
  >({});
  const [showTextHint, setShowTextHint] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [wrongCheckNotice, setWrongCheckNotice] = useState("");
  const [elapsedMs, setElapsedMs] = useState(0);
  const [wrongWordCount, setWrongWordCount] = useState(0);
  const [mistakenItemIds, setMistakenItemIds] = useState<string[]>([]);
  const [wrongAttemptsByItemId, setWrongAttemptsByItemId] = useState<
    Record<string, string>
  >({});
  const [hintedItemIds, setHintedItemIds] = useState<string[]>([]);
  const [hintCountsByItemId, setHintCountsByItemId] = useState<Record<string, number>>({});
  const [finishing, setFinishing] = useState(false);
  const [completedRecord, setCompletedRecord] = useState<PracticeRecord>();
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [pendingLeaveHref, setPendingLeaveHref] = useState("/");
  const firstInputRef = useRef<HTMLInputElement | null>(null);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const hintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrongNoticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const frozenDurationMsRef = useRef<number | null>(null);

  const currentItem = items[currentIndex];
  const tokens = useMemo(
    () => (currentItem ? tokenizeText(currentItem.text) : []),
    [currentItem],
  );
  const isSessionActive = Boolean(session && !completedRecord);

  useEffect(() => {
    primeSpeechSynthesis();

    return () => {
      if (hintTimerRef.current) {
        clearTimeout(hintTimerRef.current);
      }
      if (wrongNoticeTimerRef.current) {
        clearTimeout(wrongNoticeTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    async function hydrate() {
      const sessionId = new URLSearchParams(window.location.search).get("sessionId");

      if (!sessionId) {
        setLoading(false);
        return;
      }

      const [activeSessionId, storedSession] = await Promise.all([
        loadActivePracticeSessionId(),
        loadPracticeSession(sessionId),
      ]);

      if (!storedSession || activeSessionId !== sessionId) {
        setLoading(false);
        return;
      }

      const [storedList, storedItems] = await Promise.all([
        loadPracticeList(storedSession.listId),
        loadPracticeItems(storedSession.listId),
      ]);

      if (!storedList || storedItems.length === 0) {
        setLoading(false);
        return;
      }

      const itemsById = new Map(storedItems.map((item) => [item.id, item]));
      const orderedItems = storedSession.shuffledItemIds
        .map((itemId) => itemsById.get(itemId))
        .filter((item): item is PracticeItem => Boolean(item));

      setSession(storedSession);
      setList(storedList);
      setItems(orderedItems);
      setCurrentIndex(0);
      setAnswers([]);
      setWordStatuses({});
      setWrongWordCount(0);
      setMistakenItemIds([]);
      setWrongAttemptsByItemId({});
      setHintedItemIds([]);
      setHintCountsByItemId({});
      setNotice("");
      setWrongCheckNotice("");
      setCompletedRecord(undefined);
      frozenDurationMsRef.current = null;
      setElapsedMs(Math.max(0, Date.now() - new Date(storedSession.startedAt).getTime()));
      setLoading(false);
    }

    hydrate().catch((caughtError) => {
      setError(
        caughtError instanceof Error ? caughtError.message : "读取练习失败。",
      );
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!session || completedRecord || frozenDurationMsRef.current !== null) {
      return;
    }

    const timer = window.setInterval(() => {
      setElapsedMs(Math.max(0, Date.now() - new Date(session.startedAt).getTime()));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [session, completedRecord]);

  useEffect(() => {
    setAnswers(tokens.map(() => ""));
    setWordStatuses({});
    setNotice("");
    setWrongCheckNotice("");
    setShowTextHint(false);

    if (hintTimerRef.current) {
      clearTimeout(hintTimerRef.current);
      hintTimerRef.current = null;
    }
    if (wrongNoticeTimerRef.current) {
      clearTimeout(wrongNoticeTimerRef.current);
      wrongNoticeTimerRef.current = null;
    }
  }, [currentItem?.id, tokens.length]);

  useEffect(() => {
    if (!currentItem || completedRecord || loading) {
      return;
    }

    const focusTimer = window.setTimeout(() => {
      firstInputRef.current?.focus();
      firstInputRef.current?.select();
    }, 0);

    return () => window.clearTimeout(focusTimer);
  }, [currentItem?.id, completedRecord, loading]);

  function showWrongCheckNotice(message: string) {
    setWrongCheckNotice(message);

    if (wrongNoticeTimerRef.current) {
      clearTimeout(wrongNoticeTimerRef.current);
    }

    wrongNoticeTimerRef.current = setTimeout(() => {
      setWrongCheckNotice("");
      wrongNoticeTimerRef.current = null;
    }, 5000);
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.isComposing || completedRecord) {
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
  }, [completedRecord, currentItem, answers, items, currentIndex, session, finishing]);

  useEffect(() => {
    if (!isSessionActive) {
      return;
    }

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    const handleDocumentClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      const anchor = target.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) {
        return;
      }

      if (
        anchor.target === "_blank" ||
        anchor.hasAttribute("download") ||
        anchor.href.startsWith("mailto:")
      ) {
        return;
      }

      const url = new URL(anchor.href, window.location.href);
      const nextHref = `${url.pathname}${url.search}${url.hash}`;
      const currentHref = `${window.location.pathname}${window.location.search}${window.location.hash}`;

      if (url.origin !== window.location.origin || nextHref === currentHref) {
        return;
      }

      event.preventDefault();
      setPendingLeaveHref(nextHref);
      setLeaveDialogOpen(true);
    };

    const handlePopState = () => {
      window.history.pushState({ practiceGuard: true }, "", window.location.href);
      setPendingLeaveHref("/");
      setLeaveDialogOpen(true);
    };

    window.history.pushState({ practiceGuard: true }, "", window.location.href);
    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", handleDocumentClick, true);
    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", handleDocumentClick, true);
      window.removeEventListener("popstate", handlePopState);
    };
  }, [isSessionActive]);

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

  async function markItemAsMistake(item: PracticeItem) {
    if (item.marked) {
      return;
    }

    const updatedItem = {
      ...item,
      marked: true,
    };
    await savePracticeItem(updatedItem);
    setItems((current) =>
      current.map((candidate) =>
        candidate.id === item.id ? updatedItem : candidate,
      ),
    );
  }

  async function checkCurrentItem() {
    if (!currentItem || tokens.length === 0 || !session || finishing) {
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
          listId: session.listId,
        })),
      );
      await markItemAsMistake(currentItem);

      setWrongWordCount((current) => current + wrongWords.length);
      setMistakenItemIds((current) =>
        current.includes(currentItem.id) ? current : [...current, currentItem.id],
      );
      setWrongAttemptsByItemId((current) => ({
        ...current,
        [currentItem.id]: buildAttemptText(answers),
      }));
      showWrongCheckNotice("检查发现拼写错误，已记录错词并自动标记当前句子。");
      setNotice("还有拼写需要修正，错词已经记录到错词本，错句已自动标记。");
      return;
    }

    if (currentIndex + 1 >= items.length) {
      await finishPractice();
      return;
    }

    setCurrentIndex((current) => current + 1);
    setNotice("已进入下一条练习。");
  }

  async function finishPractice() {
    if (!session || !list) {
      return;
    }

    const finalDurationMs =
      frozenDurationMsRef.current ??
      Math.max(0, Date.now() - new Date(session.startedAt).getTime());
    frozenDurationMsRef.current = finalDurationMs;
    setElapsedMs(finalDurationMs);
    setFinishing(true);
    setNotice("正在生成本次练习评价。");
    setError("");

    const completedAt = new Date().toISOString();
    const wrongSentenceCount = mistakenItemIds.length;
    const hintedItems = hintedItemIds
      .map((itemId) => {
        const item = items.find((candidate) => candidate.id === itemId);
        if (!item) {
          return null;
        }
        return {
          itemId,
          text: item.text,
          zhHint: item.zhHint,
          count: hintCountsByItemId[itemId] ?? 0,
        };
      })
      .filter(
        (
          item,
        ): item is {
          itemId: string;
          text: string;
          zhHint: string;
          count: number;
        } => Boolean(item),
      );
    const wrongItems = mistakenItemIds
      .map((itemId) => {
        const item = items.find((candidate) => candidate.id === itemId);
        if (!item) {
          return null;
        }
        return {
          itemId,
          text: item.text,
          zhHint: item.zhHint,
          userText: wrongAttemptsByItemId[itemId] ?? "",
        };
      })
      .filter(
        (
          item,
        ): item is {
          itemId: string;
          text: string;
          zhHint: string;
          userText: string;
        } => Boolean(item),
      );
    const hintCount = hintedItems.reduce((sum, item) => sum + item.count, 0);
    let evaluation = fallbackEvaluation(wrongWordCount, wrongSentenceCount, hintCount);

    try {
      const profiles = loadAiProfiles();
      const activeProfileId = loadActiveProfileId();
      const activeProfile =
        profiles.find((profile) => profile.id === activeProfileId) ?? profiles[0];

      if (activeProfile) {
        evaluation = await generatePracticeEvaluation(activeProfile as AiProfile, {
          listTitle: list.title,
          durationSeconds: Math.round(finalDurationMs / 1000),
          completedItemCount: items.length,
          hintCount,
          hintedItems: hintedItems.map((item) => ({
            text: item.text,
            zhHint: item.zhHint,
            count: item.count,
          })),
          wrongWordCount,
          wrongSentenceCount,
          wrongItems: wrongItems.map((item) => ({
            text: item.text,
            zhHint: item.zhHint,
            userText: item.userText,
          })),
        });
      }
    } catch (caughtError) {
      setNotice(
        caughtError instanceof Error
          ? `${caughtError.message}，已使用本地评价模板。`
          : "AI 评价生成失败，已使用本地评价模板。",
      );
    }

    const record: PracticeRecord = {
      id: `${session.id}-record`,
      sessionId: session.id,
      listId: session.listId,
      listTitle: list.title,
      startedAt: session.startedAt,
      completedAt,
      durationMs: finalDurationMs,
      hintCount,
      hintedItems,
      wrongWordCount,
      wrongSentenceCount,
      wrongItems,
      completedItemCount: items.length,
      evaluation,
    };

    await savePracticeRecord(record);
    setCompletedRecord(record);
    setFinishing(false);
    setNotice("本次练习已完成，记录已经保存。");
  }

  async function speakCurrentItem() {
    if (!currentItem) {
      return;
    }

    setError("");
    setNotice("正在播放英文提示。");

    try {
      await speakEnglishText(currentItem.text);
      setNotice("已播放英文提示。");
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
    if (!currentItem) {
      return;
    }

    setShowTextHint(true);
    setHintedItemIds((current) =>
      current.includes(currentItem.id) ? current : [...current, currentItem.id],
    );
    setHintCountsByItemId((current) => ({
      ...current,
      [currentItem.id]: (current[currentItem.id] ?? 0) + 1,
    }));

    if (hintTimerRef.current) {
      clearTimeout(hintTimerRef.current);
    }

    hintTimerRef.current = setTimeout(() => {
      setShowTextHint(false);
      hintTimerRef.current = null;
    }, 5000);
  }

  function goToItem(index: number) {
    const nextIndex = Math.max(0, Math.min(index, items.length - 1));
    setCurrentIndex(nextIndex);
  }

  async function confirmStopPractice() {
    if (session) {
      await stopPracticeSession(session.id);
    }

    setLeaveDialogOpen(false);
    router.push(pendingLeaveHref || "/");
  }

  if (loading) {
    return (
      <section className="loading-state">
        <Loader2 className="h-5 w-5 animate-spin" />
        <div>正在读取练习内容</div>
      </section>
    );
  }

  if (!session || !list || items.length === 0) {
    return (
      <section className="empty-state">
        <Database className="h-12 w-12 text-[var(--accent)]" />
        <h2>还没有开始练习</h2>
        <p className="max-w-md">
          请先回到练习列表，点击“开始练习”启动一轮新的练习。
        </p>
        <Link className="primary-button mt-2" href="/">
          返回练习列表
        </Link>
      </section>
    );
  }

  if (completedRecord) {
    return (
      <section className="page-stack">
        <div className="page-hero">
          <div>
            <h1 className="page-hero-title">练习完成</h1>
            <p className="page-hero-text">
              本轮练习已经完成，记录已保存。你可以查看 AI 评价，或者开始下一轮新练习。
            </p>
          </div>
        </div>

        <div className="section-card">
          <div className="grid gap-4 sm:grid-cols-4">
            <div className="rounded-xl border border-[var(--line)] bg-[var(--paper-strong)] p-4">
              <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
                <Clock3 className="h-4 w-4" />
                练习耗时
              </div>
              <p className="mt-2 text-lg font-semibold">
                {formatDuration(completedRecord.durationMs)}
              </p>
            </div>
            <div className="rounded-xl border border-[var(--line)] bg-[var(--paper-strong)] p-4">
              <div className="text-sm text-[var(--muted)]">提示次数</div>
              <p className="mt-2 text-lg font-semibold">
                {completedRecord.hintCount}
              </p>
            </div>
            <div className="rounded-xl border border-[var(--line)] bg-[var(--paper-strong)] p-4">
              <div className="text-sm text-[var(--muted)]">错词数量</div>
              <p className="mt-2 text-lg font-semibold">
                {completedRecord.wrongWordCount}
              </p>
            </div>
            <div className="rounded-xl border border-[var(--line)] bg-[var(--paper-strong)] p-4">
              <div className="text-sm text-[var(--muted)]">错句数量</div>
              <p className="mt-2 text-lg font-semibold">
                {completedRecord.wrongSentenceCount}
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-xl border border-[var(--line)] bg-[var(--paper-strong)] p-5">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[var(--accent)]" />
              <h2 className="text-lg font-semibold">AI 练习评价</h2>
            </div>
            <p className="mt-3 text-sm leading-6">
              {completedRecord.evaluation?.summary}
            </p>

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <div>
                <p className="text-sm font-semibold text-[var(--muted)]">做得不错</p>
                <ul className="mt-2 space-y-2 text-sm leading-6">
                  {(completedRecord.evaluation?.strengths ?? []).map((item, index) => (
                    <li key={`strength-${index}`}>- {item}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--muted)]">继续提升</p>
                <ul className="mt-2 space-y-2 text-sm leading-6">
                  {(completedRecord.evaluation?.improvements ?? []).map((item, index) => (
                    <li key={`improvement-${index}`}>- {item}</li>
                  ))}
                </ul>
              </div>
            </div>

            {completedRecord.hintedItems.length > 0 ? (
              <div className="mt-5">
                <p className="text-sm font-semibold text-[var(--muted)]">提示过的内容</p>
                <ul className="mt-2 space-y-2 text-sm leading-6">
                  {completedRecord.hintedItems.map((item) => (
                    <li key={`hinted-${item.itemId}`}>
                      - {item.text} / {item.zhHint}（{item.count} 次）
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {completedRecord.wrongItems.length > 0 ? (
              <div className="mt-5">
                <p className="text-sm font-semibold text-[var(--muted)]">检查出错的句子</p>
                <ul className="mt-2 space-y-2 text-sm leading-6">
                  {completedRecord.wrongItems.map((item) => (
                    <li key={`wrong-${item.itemId}`}>
                      - {item.text} / {item.zhHint}
                      {item.userText ? ` -> 你的输入: ${item.userText}` : ""}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <p className="mt-4 text-sm font-medium text-[var(--accent)]">
              {completedRecord.evaluation?.encouragement}
            </p>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link className="primary-button" href="/records">
              查看练习记录
            </Link>
            <Link className="secondary-button" href="/">
              开始新一轮练习
            </Link>
          </div>
        </div>
      </section>
    );
  }

  const currentDuration = formatDuration(elapsedMs);
  const currentHintCount = currentItem ? hintCountsByItemId[currentItem.id] ?? 0 : 0;

  return (
    <>
      <section className="practice-shell">
        <div className="practice-header">
          <div>
            <div className="meta-row">
              <span className="kind-tag">
                {currentItem?.kind === "sentence" ? "短句" : "短语"}
              </span>
              <span className="meta-chip">{list.title}</span>
              <span className="meta-chip">
                {currentIndex + 1} / {items.length}
              </span>
              <span className="meta-chip">
                <Clock3 className="h-4 w-4" />
                {currentDuration}
              </span>
              <span className="meta-chip">本句提示 {currentHintCount} 次</span>
            </div>

            <p className="mt-5 text-3xl font-semibold leading-tight sm:text-4xl">
              {currentItem?.zhHint}
            </p>

            {showTextHint ? (
              <p className="mt-4 flex flex-wrap gap-x-1 gap-y-2 text-lg font-medium text-[var(--ink)]">
                {tokens.map((token, index) => {
                  const isMissing = !answers[index]?.trim();

                  return (
                    <span
                      className={
                        isMissing
                          ? "rounded-md bg-[var(--mark-surface)] px-1.5 py-0.5 ring-1 ring-[var(--line)]"
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

          <div className="practice-tools">
            <button
              className="practice-tool-button"
              onClick={() => void speakCurrentItem()}
              title="播放语音"
              type="button"
            >
              <Volume2 className="h-4 w-4" />
              <span>播放</span>
              <kbd>Ctrl+S</kbd>
            </button>

            <button
              className="practice-tool-button"
              onClick={() => void toggleCurrentMark()}
              title="标记当前内容"
              type="button"
            >
              {currentItem?.marked ? (
                <BookmarkCheck className="h-4 w-4" />
              ) : (
                <Bookmark className="h-4 w-4" />
              )}
              <span>标记</span>
              <kbd>Ctrl+M</kbd>
            </button>

            <button
              className="practice-tool-button"
              onClick={revealTextHint}
              title="显示 5 秒英文提示"
              type="button"
            >
              <Eye className="h-4 w-4" />
              <span>提示</span>
              <kbd>Ctrl+D</kbd>
            </button>

            <button
              className="practice-tool-button"
              onClick={() => {
                setPendingLeaveHref("/");
                setLeaveDialogOpen(true);
              }}
              title="停止练习"
              type="button"
            >
              <X className="h-4 w-4" />
              <span>停止</span>
            </button>
          </div>
        </div>

        <div className="practice-body">
          <div className="flex flex-wrap items-end gap-x-3 gap-y-5">
            {tokens.map((token, index) => (
              <label className="flex items-end gap-1" key={`${token.word}-${index}`}>
                <input
                  aria-label={`word-${index + 1}`}
                  className={`word-input px-3 py-3 text-lg font-semibold ${
                    wordStatuses[index] ?? ""
                  } ${
                    showTextHint && !answers[index]?.trim() ? "hint-missing" : ""
                  }`}
                  ref={(element) => {
                    inputRefs.current[index] = element;
                    if (index === 0) {
                      firstInputRef.current = element;
                    }
                  }}
                  onBlur={() => validateWord(index)}
                  onChange={(event) => {
                    const nextAnswers = [...answers];
                    nextAnswers[index] = event.target.value;
                    setAnswers(nextAnswers);
                  }}
                  onKeyDown={(event) => {
                    if (event.key !== " " || index >= tokens.length - 1) {
                      return;
                    }

                    event.preventDefault();
                    const nextInput = inputRefs.current[index + 1];
                    nextInput?.focus();
                    nextInput?.select();
                  }}
                  value={answers[index] ?? ""}
                />
                {token.trailing ? (
                  <span className="pb-2 text-2xl font-semibold text-[var(--muted)]">
                    {token.trailing}
                  </span>
                ) : null}
              </label>
            ))}
          </div>
        </div>

        {error ? <div className="state-banner error">{error}</div> : null}
        {wrongCheckNotice ? (
          <div className="state-banner error">{wrongCheckNotice}</div>
        ) : null}

        <div className="practice-footer">
          <div className="flex items-center gap-2 text-sm font-medium text-[var(--muted)]">
            <Keyboard className="h-4 w-4" />
            {notice || "输入后失焦可校验单词，按 Enter 检查整条内容。"}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              className="secondary-button"
              disabled={currentIndex === 0 || finishing}
              onClick={() => goToItem(currentIndex - 1)}
              type="button"
            >
              上一条
            </button>

            <button
              className="primary-button"
              disabled={finishing}
              onClick={() => void checkCurrentItem()}
              type="button"
            >
              {finishing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              {currentIndex + 1 >= items.length ? "完成练习" : "检查"}
              <kbd className="shortcut-key">Enter</kbd>
            </button>

            <button
              className="secondary-button"
              disabled={currentIndex >= items.length - 1 || finishing}
              onClick={() => goToItem(currentIndex + 1)}
              type="button"
            >
              下一条
            </button>
          </div>
        </div>
      </section>

      {leaveDialogOpen ? (
        <div className="modal-backdrop">
          <section className="modal-surface max-w-md">
            <div className="section-header">
              <div>
                <h2 className="section-title">是否停止练习</h2>
                <p className="section-subtitle">
                  当前这轮练习还没有完成。离开后本轮会终止，想继续需要重新从练习列表开始。
                </p>
              </div>
              <button
                className="icon-button"
                onClick={() => setLeaveDialogOpen(false)}
                title="关闭"
                type="button"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                className="secondary-button"
                onClick={() => setLeaveDialogOpen(false)}
                type="button"
              >
                继续练习
              </button>
              <button
                className="danger-button"
                onClick={() => void confirmStopPractice()}
                type="button"
              >
                停止练习
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
