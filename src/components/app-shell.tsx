"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AlertCircle,
  BookmarkCheck,
  Keyboard,
  ListChecks,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  applyBackgroundSettings,
  applyThemeColor,
  BACKGROUND_SETTINGS_CHANGED_EVENT,
  type BackgroundSettings,
  loadBackgroundSettings,
  loadThemeColor,
  loadSidebarCollapsed,
  saveSidebarCollapsed,
} from "@/lib/local-settings";

const navItems = [
  { href: "/", label: "练习列表", icon: ListChecks },
  { href: "/practice", label: "开始练习", icon: Keyboard },
  { href: "/marked", label: "标记内容", icon: BookmarkCheck },
  { href: "/mistakes", label: "错词本", icon: AlertCircle },
  { href: "/settings", label: "设置", icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [backgroundSettings, setBackgroundSettings] =
    useState<BackgroundSettings>({
      imageUrl: "",
      blur: 0,
      scale: 1,
      glassBlur: 22,
      glassOpacity: 0.68,
    });

  useEffect(() => {
    setCollapsed(loadSidebarCollapsed());
    applyThemeColor(loadThemeColor());
    const storedBackgroundSettings = loadBackgroundSettings();
    setBackgroundSettings(storedBackgroundSettings);
    applyBackgroundSettings(storedBackgroundSettings);

    function handleBackgroundSettingsChanged(event: Event) {
      const nextSettings = (event as CustomEvent<BackgroundSettings>).detail;
      setBackgroundSettings(nextSettings);
      applyBackgroundSettings(nextSettings);
    }

    window.addEventListener(
      BACKGROUND_SETTINGS_CHANGED_EVENT,
      handleBackgroundSettingsChanged,
    );
    return () =>
      window.removeEventListener(
        BACKGROUND_SETTINGS_CHANGED_EVENT,
        handleBackgroundSettingsChanged,
      );
  }, []);

  function toggleCollapsed() {
    setCollapsed((current) => {
      const next = !current;
      saveSidebarCollapsed(next);
      return next;
    });
  }

  return (
    <main className={`app-frame ${collapsed ? "nav-collapsed" : ""}`}>
      <div aria-hidden="true" className="app-background">
        <div
          className="app-background-image"
          style={{
            backgroundImage: backgroundSettings.imageUrl
              ? `url(${JSON.stringify(backgroundSettings.imageUrl)})`
              : "none",
            filter: `blur(${backgroundSettings.blur}px)`,
            transform: `scale(${backgroundSettings.scale})`,
          }}
        />
      </div>

      <aside className="app-sidebar">
        <div className="sidebar-header">
          <Link className="brand-link" href="/" title="AI English Spelling">
            <span className="brand-mark">AI</span>
            <span className="side-label">
              <span className="brand-title">English Spelling</span>
              <span className="brand-subtitle">
                AI 生成练习，逐词拼写，持续复盘
              </span>
            </span>
          </Link>
          <button
            className="sidebar-toggle"
            onClick={toggleCollapsed}
            title={collapsed ? "展开侧栏" : "收起侧栏"}
            type="button"
          >
            {collapsed ? (
              <PanelLeftOpen className="h-5 w-5" />
            ) : (
              <PanelLeftClose className="h-5 w-5" />
            )}
          </button>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active =
              item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

            return (
              <Link
                className={`nav-link ${active ? "active" : ""}`}
                href={item.href}
                key={item.href}
                title={item.label}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="side-label">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <ThemeToggle />
        </div>
      </aside>

      <section className="app-content">{children}</section>
    </main>
  );
}
