"use client";
/* Komponen UI dasar (Tailwind). */
import { useEffect, useId, useRef, type ButtonHTMLAttributes, type ReactNode } from "react";

type BtnVariant = "primary" | "secondary" | "ghost" | "danger" | "accent";

const btnBase =
  "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-50";
const btnVariants: Record<BtnVariant, string> = {
  primary: "bg-brand-navy text-white hover:bg-brand-blue",
  accent: "bg-brand-red text-white hover:bg-[#a00000]",
  secondary: "border border-line bg-white text-brand-navy hover:border-brand-blue hover:bg-mist",
  ghost: "text-brand-blue hover:bg-mist",
  danger: "border border-red-200 bg-white text-brand-red hover:bg-brand-red-soft",
};

export function Button({
  variant = "primary",
  className = "",
  busy,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; busy?: boolean }) {
  return (
    <button className={`${btnBase} ${btnVariants[variant]} ${className}`} disabled={busy || rest.disabled} {...rest}>
      {busy ? <Spinner /> : null}
      {children}
    </button>
  );
}

export function Spinner({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent ${className}`}
    />
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-line bg-white p-5 shadow-[0_1px_0_rgba(4,41,75,0.04)] ${className}`}>{children}</section>;
}

export function SectionTitle({ children, hint }: { children: ReactNode; hint?: ReactNode }) {
  return (
    <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
      <h2 className="text-sm font-extrabold uppercase tracking-[0.14em] text-brand-navy">{children}</h2>
      {hint ? <span className="text-xs text-muted">{hint}</span> : null}
    </div>
  );
}

type BadgeTone = "navy" | "red" | "green" | "amber" | "gray" | "sky";
const badgeTones: Record<BadgeTone, string> = {
  navy: "bg-brand-navy text-white",
  red: "bg-brand-red-soft text-brand-red",
  green: "bg-emerald-50 text-done",
  amber: "bg-amber-50 text-warn",
  gray: "bg-mist text-muted",
  sky: "bg-brand-sky text-brand-navy",
};

export function Badge({ tone = "gray", children, className = "" }: { tone?: BadgeTone; children: ReactNode; className?: string }) {
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${badgeTones[tone]} ${className}`}>{children}</span>;
}

export function LevelChip({ level, code }: { level: number; code?: string }) {
  const bg = ["", "bg-lv1", "bg-lv2", "bg-lv3", "bg-lv4"][level] ?? "bg-muted";
  return <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-extrabold text-white ${bg}`}>{code ?? `Lv.${level}`}</span>;
}

export function Field({
  label,
  hint,
  required,
  children,
  error,
}: {
  label: string;
  hint?: ReactNode;
  required?: boolean;
  children: (id: string) => ReactNode;
  error?: string;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-bold text-ink">
        {label}
        {required ? <span className="text-brand-red"> *</span> : null}
      </label>
      {children(id)}
      {error ? <p className="text-xs font-semibold text-brand-red">{error}</p> : hint ? <p className="text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

export const inputCls =
  "w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-[15px] text-ink placeholder:text-slate-400 focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-sky";

export function Checkbox({
  checked,
  onChange,
  label,
  description,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
}) {
  return (
    <label className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3.5 py-3 ${checked ? "border-brand-blue bg-mist" : "border-line bg-white"} ${disabled ? "opacity-60" : ""}`}>
      <input
        type="checkbox"
        className="mt-0.5 h-4 w-4 accent-[#04294b]"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="flex flex-col">
        <span className="text-sm font-semibold text-ink">{label}</span>
        {description ? <span className="text-xs text-muted">{description}</span> : null}
      </span>
    </label>
  );
}

export function Alert({ tone = "info", children }: { tone?: "info" | "warn" | "error" | "success"; children: ReactNode }) {
  const cls = {
    info: "border-brand-sky bg-mist text-brand-navy",
    warn: "border-amber-200 bg-amber-50 text-[#7a4f12]",
    error: "border-red-200 bg-brand-red-soft text-[#8a0000]",
    success: "border-emerald-200 bg-emerald-50 text-[#1f5a40]",
  }[tone];
  return (
    <div role={tone === "error" ? "alert" : "status"} className={`rounded-xl border px-4 py-3 text-sm ${cls}`}>
      {children}
    </div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    ref.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-brand-navy/40 p-0 sm:items-center sm:p-6" onMouseDown={onClose}>
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(e) => e.stopPropagation()}
        className={`flex max-h-[94dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl ${wide ? "sm:max-w-6xl" : "sm:max-w-2xl"}`}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="text-lg font-extrabold text-brand-navy">{title}</h2>
          <button onClick={onClose} className="rounded-lg px-2 py-1 text-2xl leading-none text-muted hover:bg-mist" aria-label="Tutup">
            ×
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-5">{children}</div>
      </div>
    </div>
  );
}

export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { id: T; label: ReactNode }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div role="tablist" className="flex gap-1 overflow-x-auto rounded-2xl bg-mist p-1">
      {tabs.map((t) => (
        <button
          key={t.id}
          role="tab"
          aria-selected={value === t.id}
          onClick={() => onChange(t.id)}
          className={`whitespace-nowrap rounded-xl px-4 py-2 text-sm font-bold transition ${value === t.id ? "bg-white text-brand-navy shadow-sm" : "text-muted hover:text-brand-navy"}`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

export function Stat({ value, label, sub }: { value: ReactNode; label: string; sub?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-line bg-white px-4 py-3">
      <div className="text-3xl font-extrabold text-brand-navy">{value}</div>
      <div className="text-xs font-extrabold uppercase tracking-wider text-muted">{label}</div>
      {sub ? <div className="text-xs text-muted">{sub}</div> : null}
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-2xl border-2 border-dashed border-line px-6 py-10 text-center">
      <p className="font-extrabold text-brand-navy">{title}</p>
      {children ? <div className="mt-2 text-sm text-muted">{children}</div> : null}
    </div>
  );
}
