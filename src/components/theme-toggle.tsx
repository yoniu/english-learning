"use client";

import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import {
  applyThemeMode,
  loadThemeMode,
  saveThemeMode,
  type ThemeMode,
} from "@/lib/local-settings";

const themeOptions: Array<{
  value: ThemeMode;
  label: string;
  title: string;
  icon: typeof Monitor;
}> = [
  { value: "system", label: "系统", title: "跟随系统", icon: Monitor },
  { value: "light", label: "日间", title: "日间主题", icon: Sun },
  { value: "dark", label: "夜间", title: "夜间主题", icon: Moon },
];

export function ThemeToggle() {
  const [mode, setMode] = useState<ThemeMode>("system");

  useEffect(() => {
    const storedMode = loadThemeMode();
    setMode(storedMode);
    applyThemeMode(storedMode);

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      if (loadThemeMode() === "system") {
        applyThemeMode("system");
      }
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  function selectMode(nextMode: ThemeMode) {
    setMode(nextMode);
    saveThemeMode(nextMode);
    applyThemeMode(nextMode);
  }

  return (
    <div className="theme-toggle" aria-label="主题切换" role="group">
      {themeOptions.map((option) => {
        const Icon = option.icon;
        const active = mode === option.value;

        return (
          <button
            aria-pressed={active}
            className={active ? "active" : ""}
            key={option.value}
            onClick={() => selectMode(option.value)}
            title={option.title}
            type="button"
          >
            <Icon className="h-4 w-4" />
            <span>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
