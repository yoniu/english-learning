"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AlertCircle,
  BookmarkCheck,
  ClipboardList,
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
  loadMobileReminderDismissed,
  loadThemeColor,
  loadSidebarCollapsed,
  saveMobileReminderDismissed,
  saveSidebarCollapsed,
} from "@/lib/local-settings";

const navItems = [
  { href: "/", label: "练习列表", icon: ListChecks },
  { href: "/records", label: "练习记录", icon: ClipboardList },
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
      imageOpacity: 0.16,
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

  useEffect(() => {
    if (loadMobileReminderDismissed()) {
      return;
    }

    const mobileNavigator = navigator as Navigator & {
      userAgentData?: { mobile?: boolean };
    };
    const userAgent = navigator.userAgent.toLowerCase();
    const isMobileUser =
      mobileNavigator.userAgentData?.mobile ??
      /android|iphone|ipad|ipod|iemobile|opera mini|mobile/i.test(userAgent);

    if (!isMobileUser) {
      return;
    }

    const confirmed = window.confirm("使用电脑访问效果更佳");

    if (confirmed) {
      saveMobileReminderDismissed(true);
    }
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
          <Link className="brand-link" href="/" title="English Spelling AI">
            <span className="brand-mark">
              <Image
                alt="English Spelling AI logo"
                className="brand-logo-image"
                height={46}
                priority
                src="/new-logo.png"
                width={46}
              />
            </span>
            <span className="side-label">
              <span className="brand-title">English Spelling AI</span>
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
