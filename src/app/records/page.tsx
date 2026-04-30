"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ClipboardList,
  Clock3,
  History,
  Loader2,
  Search,
  Sparkles,
  TriangleAlert,
  X,
} from "lucide-react";

import { loadPracticeRecords } from "@/lib/storage";
import type { PracticeRecord } from "@/types/app";

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatDuration(durationMs: number): string {
  const totalSeconds = Math.max(0, Math.round(durationMs / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours} 小时 ${minutes} 分 ${seconds} 秒`;
  }

  if (minutes === 0) {
    return `${seconds} 秒`;
  }

  return `${minutes} 分 ${seconds} 秒`;
}

function normalizeRecord(record: PracticeRecord) {
  return {
    ...record,
    hintCount: record.hintCount ?? 0,
    hintedItems: record.hintedItems ?? [],
    wrongItems: record.wrongItems ?? [],
    wrongWordCount: record.wrongWordCount ?? 0,
    wrongSentenceCount: record.wrongSentenceCount ?? 0,
    completedItemCount: record.completedItemCount ?? 0,
  };
}

function getStartOfLocalDay(value: string): number {
  const date = new Date(value);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function formatPracticeDays(records: PracticeRecord[]): string {
  if (records.length === 0) {
    return "0 天";
  }

  const earliestDay = Math.min(
    ...records.map((record) =>
      getStartOfLocalDay(record.startedAt || record.completedAt),
    ),
  );
  const today = new Date();
  const todayStart = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  ).getTime();
  const dayMs = 24 * 60 * 60 * 1000;

  return `${Math.max(1, Math.floor((todayStart - earliestDay) / dayMs) + 1)} 天`;
}

export default function RecordsPage() {
  const [records, setRecords] = useState<PracticeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [search, setSearch] = useState("");
  const [selectedRecord, setSelectedRecord] = useState<PracticeRecord | null>(
    null,
  );

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        setLoading(true);
        const nextRecords = await loadPracticeRecords();

        if (!alive) {
          return;
        }

        setRecords(nextRecords);
        setError("");
      } catch (loadError) {
        if (!alive) {
          return;
        }

        setError(
          loadError instanceof Error
            ? loadError.message
            : "练习记录加载失败，请稍后再试。",
        );
      } finally {
        if (alive) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      alive = false;
    };
  }, []);

  const filteredRecords = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) {
      return records.map(normalizeRecord);
    }

    return records
      .map(normalizeRecord)
      .filter((record) => {
        const summary = [
          record.listTitle,
          record.evaluation?.summary ?? "",
          record.evaluation?.encouragement ?? "",
          ...record.hintedItems.map((item) => `${item.text} ${item.zhHint}`),
          ...record.wrongItems.map((item) => `${item.text} ${item.zhHint}`),
        ]
          .join(" ")
          .toLowerCase();

        return summary.includes(keyword);
      });
  }, [records, search]);

  const recordStats = useMemo(() => {
    const normalizedRecords = records.map(normalizeRecord);
    const totalDurationMs = normalizedRecords.reduce(
      (total, record) => total + Math.max(0, record.durationMs || 0),
      0,
    );
    const latestRecord = normalizedRecords.reduce<PracticeRecord | undefined>(
      (latest, record) => {
        if (!latest) {
          return record;
        }

        return new Date(record.completedAt).getTime() >
          new Date(latest.completedAt).getTime()
          ? record
          : latest;
      },
      undefined,
    );

    return {
      totalDuration: formatDuration(totalDurationMs),
      totalCount: normalizedRecords.length,
      practiceDays: formatPracticeDays(normalizedRecords),
      lastCompletedAt: latestRecord ? formatDateTime(latestRecord.completedAt) : "--",
    };
  }, [records]);

  return (
    <div className="page-stack">
      <section className="page-hero">
        <div>
          <h1 className="page-hero-title">练习记录</h1>
          <p className="page-hero-text">
            用表格快速回看每次练习的耗时、提示、错词和 AI 评价。支持搜索，点开就能看完整详情。
          </p>
        </div>
      </section>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "14px",
        }}
        aria-label="练习统计"
      >
        {[
          {
            label: "练习总时长",
            value: recordStats.totalDuration,
            icon: <Clock3 size={18} />,
          },
          {
            label: "练习次数",
            value: `${recordStats.totalCount} 次`,
            icon: <ClipboardList size={18} />,
          },
          {
            label: "练习天数",
            value: recordStats.practiceDays,
            icon: <CalendarDays size={18} />,
          },
          {
            label: "最后练习时间",
            value: recordStats.lastCompletedAt,
            icon: <History size={18} />,
          },
        ].map((item) => (
          <div
            className="section-card"
            key={item.label}
            style={{
              padding: "16px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                color: "var(--muted)",
                fontSize: "0.8125rem",
                fontWeight: 700,
              }}
            >
              {item.icon}
              {item.label}
            </div>
            <div
              style={{
                marginTop: "10px",
                fontSize: "1.2rem",
                fontWeight: 800,
                lineHeight: 1.35,
              }}
            >
              {item.value}
            </div>
          </div>
        ))}
      </section>

      <section className="section-card">
        <div className="section-header">
          <div>
            <h2 className="section-title">记录列表</h2>
            <p className="section-subtitle">
              可按练习名称、AI 摘要、提示句子或错句内容搜索。
            </p>
          </div>
        </div>

        <div className="toolbar-strip" style={{ marginTop: "20px" }}>
          <label
            className="form-field"
            style={{ minWidth: "min(100%, 360px)", flex: "1 1 320px" }}
          >
            <span>搜索记录</span>
            <div style={{ position: "relative" }}>
              <Search
                size={16}
                style={{
                  position: "absolute",
                  left: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--muted-soft)",
                  pointerEvents: "none",
                }}
              />
              <input
                className="field"
                style={{ padding: "0 14px 0 38px" }}
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="搜索练习名称、AI 评价、提示内容或错句"
              />
            </div>
          </label>
          <span className="meta-chip">结果 {filteredRecords.length} 条</span>
        </div>

        {loading ? (
          <div className="loading-state" style={{ marginTop: "20px" }}>
            <Loader2 className="animate-spin" size={28} />
            <h2>正在加载练习记录</h2>
            <p>稍等一下，我们把最近的练习结果整理出来。</p>
          </div>
        ) : error ? (
          <div className="state-banner error" style={{ marginTop: "20px" }}>
            {error}
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="empty-state" style={{ marginTop: "20px" }}>
            <ClipboardList size={28} />
            <h2>{records.length === 0 ? "还没有练习记录" : "没有匹配的记录"}</h2>
            <p>
              {records.length === 0
                ? "完成一整组练习后，这里会自动保存练习结果和 AI 评价。"
                : "换个关键词试试，或者清空搜索条件。"}
            </p>
          </div>
        ) : (
          <div
            style={{
              marginTop: "20px",
              overflowX: "auto",
              border: "1px solid var(--line)",
              borderRadius: "12px",
              background: "color-mix(in srgb, var(--surface) 88%, var(--paper) 12%)",
            }}
          >
            <table
              style={{
                width: "100%",
                minWidth: "980px",
                borderCollapse: "collapse",
              }}
            >
              <thead>
                <tr
                  style={{
                    background:
                      "color-mix(in srgb, var(--mark-surface) 32%, transparent)",
                    color: "var(--muted)",
                    fontSize: "0.8125rem",
                    textAlign: "left",
                  }}
                >
                  {[
                    "练习列表",
                    "完成时间",
                    "耗时",
                    "提示",
                    "错词",
                    "错句",
                    "AI 摘要",
                    "操作",
                  ].map((label) => (
                    <th
                      key={label}
                      style={{
                        padding: "14px 16px",
                        borderBottom: "1px solid var(--line)",
                        fontWeight: 700,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((record) => (
                  <tr
                    key={record.id}
                    style={{
                      borderBottom: "1px solid var(--line)",
                    }}
                  >
                    <td style={{ padding: "16px", verticalAlign: "top" }}>
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "6px",
                        }}
                      >
                        <strong style={{ fontSize: "0.95rem" }}>
                          {record.listTitle}
                        </strong>
                        <span style={{ color: "var(--muted)", fontSize: "0.8125rem" }}>
                          完成 {record.completedItemCount} 句
                        </span>
                      </div>
                    </td>
                    <td
                      style={{
                        padding: "16px",
                        color: "var(--muted)",
                        fontSize: "0.875rem",
                        whiteSpace: "nowrap",
                        verticalAlign: "top",
                      }}
                    >
                      {formatDateTime(record.completedAt)}
                    </td>
                    <td
                      style={{
                        padding: "16px",
                        whiteSpace: "nowrap",
                        verticalAlign: "top",
                      }}
                    >
                      {formatDuration(record.durationMs)}
                    </td>
                    <td style={{ padding: "16px", verticalAlign: "top" }}>
                      {record.hintCount}
                    </td>
                    <td style={{ padding: "16px", verticalAlign: "top" }}>
                      {record.wrongWordCount}
                    </td>
                    <td style={{ padding: "16px", verticalAlign: "top" }}>
                      {record.wrongSentenceCount}
                    </td>
                    <td style={{ padding: "16px", verticalAlign: "top" }}>
                      <div
                        style={{
                          maxWidth: "320px",
                          color: "var(--muted)",
                          fontSize: "0.875rem",
                          lineHeight: 1.7,
                        }}
                      >
                        {record.evaluation?.summary ?? "这次练习还没有生成 AI 评价。"}
                      </div>
                    </td>
                    <td style={{ padding: "16px", verticalAlign: "top" }}>
                      <button
                        className="secondary-button"
                        type="button"
                        onClick={() => setSelectedRecord(record)}
                      >
                        查看详情
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selectedRecord ? (
        <div
          className="modal-backdrop"
          role="presentation"
          onClick={() => setSelectedRecord(null)}
        >
          <div
            className="modal-surface"
            style={{ maxWidth: "920px" }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="record-detail-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div
              className="section-header"
              style={{ alignItems: "center", marginBottom: "20px" }}
            >
              <div>
                <h2 id="record-detail-title" className="section-title">
                  {selectedRecord.listTitle}
                </h2>
                <p className="section-subtitle">
                  完成时间 {formatDateTime(selectedRecord.completedAt)}
                </p>
              </div>
              <button
                className="icon-button"
                type="button"
                aria-label="关闭详情"
                onClick={() => setSelectedRecord(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                gap: "12px",
              }}
            >
              {[
                { label: "练习耗时", value: formatDuration(selectedRecord.durationMs) },
                { label: "提示次数", value: `${selectedRecord.hintCount}` },
                { label: "错词数量", value: `${selectedRecord.wrongWordCount}` },
                { label: "错句数量", value: `${selectedRecord.wrongSentenceCount}` },
              ].map((item) => (
                <div
                  key={item.label}
                  style={{
                    border: "1px solid var(--line)",
                    borderRadius: "10px",
                    background:
                      "color-mix(in srgb, var(--surface) 84%, var(--paper) 16%)",
                    padding: "14px 16px",
                  }}
                >
                  <div
                    style={{
                      color: "var(--muted-soft)",
                      fontSize: "0.75rem",
                      fontWeight: 700,
                    }}
                  >
                    {item.label}
                  </div>
                  <div
                    style={{
                      marginTop: "8px",
                      fontSize: "1.1rem",
                      fontWeight: 700,
                    }}
                  >
                    {item.value}
                  </div>
                </div>
              ))}
            </div>

            <div
              className="section-card"
              style={{ marginTop: "20px", padding: "18px 20px" }}
            >
              <div className="meta-row" style={{ marginBottom: "10px" }}>
                <span className="meta-chip">
                  <Sparkles size={16} />
                  AI 练习评价
                </span>
              </div>
              <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.8 }}>
                {selectedRecord.evaluation?.summary ?? "这次练习还没有生成 AI 评价。"}
              </p>

              {selectedRecord.evaluation?.strengths?.length ? (
                <div style={{ marginTop: "16px" }}>
                  <strong>表现亮点</strong>
                  <ul style={{ margin: "10px 0 0", paddingLeft: "20px", lineHeight: 1.8 }}>
                    {selectedRecord.evaluation.strengths.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {selectedRecord.evaluation?.improvements?.length ? (
                <div style={{ marginTop: "16px" }}>
                  <strong>下一步建议</strong>
                  <ul style={{ margin: "10px 0 0", paddingLeft: "20px", lineHeight: 1.8 }}>
                    {selectedRecord.evaluation.improvements.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {selectedRecord.evaluation?.encouragement ? (
                <div className="state-banner info" style={{ marginTop: "16px" }}>
                  {selectedRecord.evaluation.encouragement}
                </div>
              ) : null}
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: "20px",
                marginTop: "20px",
              }}
            >
              <section
                style={{
                  border: "1px solid var(--line)",
                  borderRadius: "12px",
                  padding: "18px",
                  background:
                    "color-mix(in srgb, var(--surface) 84%, var(--paper) 16%)",
                }}
              >
                <div className="meta-row" style={{ marginBottom: "12px" }}>
                  <span className="meta-chip">
                    <Search size={16} />
                    提示内容
                  </span>
                </div>

                {selectedRecord.hintedItems.length === 0 ? (
                  <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.8 }}>
                    这次练习没有使用提示。
                  </p>
                ) : (
                  <div style={{ display: "grid", gap: "12px" }}>
                    {selectedRecord.hintedItems.map((item) => (
                      <div
                        key={item.itemId}
                        style={{
                          border: "1px solid var(--line)",
                          borderRadius: "10px",
                          padding: "12px 14px",
                          background: "var(--paper-strong)",
                        }}
                      >
                        <strong style={{ display: "block", lineHeight: 1.6 }}>
                          {item.text}
                        </strong>
                        <p
                          style={{
                            margin: "8px 0 0",
                            color: "var(--muted)",
                            lineHeight: 1.7,
                          }}
                        >
                          {item.zhHint}
                        </p>
                        <span
                          style={{
                            display: "inline-block",
                            marginTop: "10px",
                            color: "var(--accent)",
                            fontSize: "0.8125rem",
                            fontWeight: 600,
                          }}
                        >
                          提示 {item.count} 次
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section
                style={{
                  border: "1px solid var(--line)",
                  borderRadius: "12px",
                  padding: "18px",
                  background:
                    "color-mix(in srgb, var(--surface) 84%, var(--paper) 16%)",
                }}
              >
                <div className="meta-row" style={{ marginBottom: "12px" }}>
                  <span className="meta-chip">
                    <TriangleAlert size={16} />
                    错句记录
                  </span>
                </div>

                {selectedRecord.wrongItems.length === 0 ? (
                  <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.8 }}>
                    这次练习没有出现检查错误的句子。
                  </p>
                ) : (
                  <div style={{ display: "grid", gap: "12px" }}>
                    {selectedRecord.wrongItems.map((item) => (
                      <div
                        key={item.itemId}
                        style={{
                          border: "1px solid var(--danger-line)",
                          borderRadius: "10px",
                          padding: "12px 14px",
                          background: "var(--danger-surface)",
                        }}
                      >
                        <strong style={{ display: "block", lineHeight: 1.6 }}>
                          {item.text}
                        </strong>
                        <p
                          style={{
                            margin: "8px 0 0",
                            color: "var(--muted)",
                            lineHeight: 1.7,
                          }}
                        >
                          {item.zhHint}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
