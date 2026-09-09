"use client";

import { memo, useDeferredValue, useEffect, useState, type ReactNode } from "react";
import { Search, X } from "lucide-react";

/* ===== Chuẩn design hệ thống theo trang chủ: trắng/slate, rounded, nút đen pill ===== */

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-2xl border border-slate-100 shadow-sm ${className}`}>{children}</div>
  );
}

export function PageHeader({
  title,
  desc,
  actions,
}: {
  title: string;
  desc?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 pb-6 border-b border-slate-100">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">{title}</h1>
        {desc && <p className="text-slate-500 mt-1">{desc}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

type BtnVariant = "black" | "primary" | "ghost" | "danger";

export function PillButton({
  children,
  onClick,
  type = "button",
  variant = "black",
  loading = false,
  disabled = false,
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  variant?: BtnVariant;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  const styles: Record<BtnVariant, string> = {
    black: "bg-black text-white hover:bg-black/85",
    primary: "bg-primary text-white hover:bg-primary-hover",
    ghost: "bg-slate-100 text-slate-700 hover:bg-slate-200",
    danger: "bg-red-500 text-white hover:bg-red-600",
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 px-6 h-11 rounded-full text-sm font-bold transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none ${styles[variant]} ${className}`}
    >
      {loading ? "Đang xử lý..." : children}
    </button>
  );
}

export function StatCard({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      <div className="w-10 h-10 rounded-xl bg-black flex items-center justify-center mb-3">{icon}</div>
      <p className="text-2xl font-bold tabular-nums tracking-tight">{value}</p>
      <p className="text-sm text-slate-500 mt-0.5">{label}</p>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  desc,
  action,
}: {
  icon?: ReactNode;
  title: string;
  desc?: string;
  action?: ReactNode;
}) {
  return (
    <div className="text-center py-10 px-6">
      {icon && <div className="flex justify-center mb-3 text-slate-300">{icon}</div>}
      <p className="font-bold text-slate-700">{title}</p>
      {desc && <p className="text-sm text-slate-500 mt-1">{desc}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

export function CardSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3 animate-pulse" aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-14 rounded-2xl bg-slate-100" />
      ))}
    </div>
  );
}

function ModalBase({
  open,
  onClose,
  title,
  children,
  maxWidth = "max-w-md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  maxWidth?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className={`w-full ${maxWidth} bg-white rounded-3xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto animate-fade-up`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">{title}</h3>
          <button
            onClick={onClose}
            aria-label="Đóng"
            className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export const Modal = memo(ModalBase);

export function FormField({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-bold text-slate-600 mb-2">{label}</label>
      {children}
      {error && <p className="text-xs text-red-500 mt-2 font-medium">{error}</p>}
    </div>
  );
}

export const textInputClass =
  "w-full px-5 py-3.5 rounded-xl border border-slate-200 bg-slate-50 focus:border-black focus:ring-2 focus:ring-black/10 outline-none transition-all text-slate-900";

/** Ô tìm kiếm debounce dùng chung (chuẩn 300ms). */
function SearchInputBase({
  value,
  onChange,
  placeholder = "Tìm kiếm...",
  debounceMs = 300,
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  debounceMs?: number;
  className?: string;
}) {
  const [inner, setInner] = useState(value);
  const deferred = useDeferredValue(inner);

  useEffect(() => {
    const t = setTimeout(() => onChange(deferred), debounceMs);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deferred]);

  useEffect(() => setInner(value), [value]);

  return (
    <div className={`relative ${className}`}>
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
      <input
        value={inner}
        onChange={(e) => setInner(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        className="w-full h-11 pl-11 pr-4 rounded-xl bg-slate-100 text-sm outline-none focus:ring-2 focus:ring-black/10"
      />
    </div>
  );
}

export const SearchInput = memo(SearchInputBase);
