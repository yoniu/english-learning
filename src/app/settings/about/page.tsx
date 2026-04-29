import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, Globe, Info } from "lucide-react";

const metaItems = [
  { label: "名称", value: "English Spelling AI" },
  { label: "版本", value: "0.1.0" },
  { label: "技术", value: "Next.js 16" },
];

const advantages = ["本地化", "可导出数据", "人工智能加持"];

export default function AboutPage() {
  return (
    <section className="page-stack">
      <section className="about-simple-hero">
        <Link className="ghost-button w-fit" href="/settings">
          <ChevronLeft className="h-4 w-4" />
          返回设置
        </Link>

        <div className="about-simple-brand">
          <div className="about-simple-logo">
            <Image
              alt="English Spelling AI logo"
              height={84}
              priority
              src="/logo-transparent.png"
              width={84}
            />
          </div>

          <div>
            <span className="about-kicker">About</span>
            <h1 className="about-simple-title">English Spelling AI</h1>
            <p className="about-simple-text">基于 AI 能力的英语学习工具。</p>
          </div>
        </div>
      </section>

      <section className="section-card">
        <div className="section-header">
          <div>
            <div className="flex items-center gap-2">
              <Info className="h-5 w-5 text-[var(--accent)]" />
              <h2 className="section-title">基础信息</h2>
            </div>
          </div>
        </div>

        <div className="about-meta-grid mt-6">
          {metaItems.map((item) => (
            <article className="about-meta-card" key={item.label}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </article>
          ))}
        </div>

        <div className="about-note-card mt-4">
          优点：{advantages.join("、")}。
        </div>
      </section>

      <section className="section-card">
        <div className="section-header">
          <div>
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-[var(--accent)]" />
              <h2 className="section-title">作者</h2>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-[minmax(220px,320px)_minmax(0,1fr)]">
          <article className="about-author-card">
            <span className="about-author-eyebrow">Creator</span>
            <h3 className="about-author-name">油油</h3>
          </article>

          <div className="about-note-card">
            项目由油油维护，个人网站为{" "}
            <a href="https://200011.net" rel="noreferrer" target="_blank">
              200011.net
            </a>
            。
          </div>
        </div>
      </section>
    </section>
  );
}
