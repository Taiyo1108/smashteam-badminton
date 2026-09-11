"use client";

import { memo, useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export const THEME_KEY = "smash-theme";

/** Nút chế độ ban đêm dùng chung mọi loại tài khoản (chỉ icon trăng/trời). */
function ThemeToggleBase({ className = "", iconClassName = "w-4 h-4" }: { className?: string; iconClassName?: string }) {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(THEME_KEY) === "dark";
      setDark(saved);
      document.documentElement.classList.toggle("dark", saved);
    } catch {}
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    try {
      localStorage.setItem(THEME_KEY, next ? "dark" : "light");
    } catch {}
    document.documentElement.classList.toggle("dark", next);
  };

  return (
    <button
      onClick={toggle}
      aria-pressed={dark}
      title={dark ? "Chế độ ban ngày" : "Chế độ ban đêm"}
      className={`w-10 h-10 rounded-full flex items-center justify-center border border-slate-200 bg-white text-slate-600 hover:text-black hover:border-black/30 transition-colors shrink-0 cursor-pointer ${className}`}
    >
      {dark ? <Sun className={iconClassName} /> : <Moon className={iconClassName} />}
    </button>
  );
}

const ThemeToggle = memo(ThemeToggleBase);
export default ThemeToggle;
