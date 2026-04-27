"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AlertCircle,
  BookmarkCheck,
  Keyboard,
  ListChecks,
  Settings,
} from "lucide-react";

const navItems = [
  { href: "/", label: "练习列表", icon: ListChecks },
  { href: "/practice", label: "练习", icon: Keyboard },
  { href: "/marked", label: "短语标记", icon: BookmarkCheck },
  { href: "/mistakes", label: "错词", icon: AlertCircle },
  { href: "/settings", label: "设置", icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[1500px] flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
      <header className="flex flex-col justify-between gap-4 border-b border-[rgba(23,49,45,0.14)] pb-5 xl:flex-row xl:items-end">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--coral)]">
            AI English Spelling
          </p>
          <h1 className="mt-2 text-3xl font-black text-[var(--ink)] sm:text-5xl">
            主题生成，逐词拼写
          </h1>
        </div>
        <nav className="flex flex-wrap gap-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active =
              item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

            return (
              <Link
                className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-black transition ${
                  active
                    ? "border-[rgba(15,109,115,0.42)] bg-[rgba(15,109,115,0.14)] text-[var(--teal-dark)]"
                    : "border-[rgba(23,49,45,0.12)] bg-white/55 text-[var(--muted)] hover:bg-white"
                }`}
                href={item.href}
                key={item.href}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>
      {children}
    </main>
  );
}
