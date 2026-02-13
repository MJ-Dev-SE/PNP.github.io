//ui and a little filtering control in dashboard
import type { ReactNode } from "react";

export function ShieldIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={`transition-all duration-300 ease-in-out ${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path
        d="M12 2.8c3.4 2.6 6.2 3 8 3.3v7.2c0 5.2-3.2 8.6-8 10.9C7.2 21.9 4 18.5 4 13.3V6.1c1.8-.3 4.6-.7 8-3.3Z"
        strokeLinejoin="round"
      />
      <path
        d="M9.2 12.3l2 2 3.6-4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ShieldBadge({
  className = "",
  iconClassName = "",
}: {
  className?: string;
  iconClassName?: string;
}) {
  return (
    <div
      className={`inline-flex items-center justify-center rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100 p-2 shadow-sm transition-all duration-300 ease-in-out hover:scale-110 hover:border-blue-300 hover:shadow-md hover:from-blue-100 hover:to-blue-200 ${className}`}
    >
      <ShieldIcon
        className={`h-6 w-6 text-blue-700 transition-transform duration-300 ease-in-out group-hover:scale-105 ${iconClassName}`}
      />
    </div>
  );
}

export function SelectControl({
  value,
  onChange,
  children,
  ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  children: ReactNode;
  ariaLabel: string;
}) {
  return (
    <select
      aria-label={ariaLabel}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-11 w-full rounded-xl border border-slate-200 bg-white/80 px-3 text-sm text-slate-800 shadow-sm outline-none ring-0 transition focus:border-slate-300 focus:outline-none focus:ring-4 focus:ring-blue-200 sm:w-auto"
    >
      {children}
    </select>
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div className="relative w-full">
      <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path d="M10.8 18.2a7.4 7.4 0 1 1 0-14.8 7.4 7.4 0 0 1 0 14.8Z" />
          <path d="M16.4 16.4 21 21" strokeLinecap="round" />
        </svg>
      </div>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-xl border border-slate-200 bg-white/80 pl-10 pr-3 text-sm text-slate-800 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-slate-300 focus:outline-none focus:ring-4 focus:ring-blue-200"
      />
    </div>
  );
}
