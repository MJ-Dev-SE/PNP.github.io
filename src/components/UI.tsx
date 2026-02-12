import React from "react";

/* -------------------------------------------------------------------------- */
/*  Layout helpers                                                            */
/* -------------------------------------------------------------------------- */

export const Section: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className = "",
  ...p
}) => (
  <div
    {...p}
    className={`w-full max-w-[95rem] px-4 xl:px-8 mx-auto ${className}`}
  />
);

export const Panel: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className = "",
  ...p
}) => (
  <div
    {...p}
    className={`bg-white/90 backdrop-blur rounded-3xl border border-slate-200/70 shadow-sm ${className}`}
  />
);

export const PanelPad: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className = "",
  ...p
}) => <Panel {...p} className={`p-5 md:p-6 ${className}`} />;

/* -------------------------------------------------------------------------- */
/*  Buttons / Inputs                                                          */
/* -------------------------------------------------------------------------- */

type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "soft" | "solid" | "ghost" | "outline";
};

export const Button: React.FC<BtnProps> = ({
  variant = "soft",
  className = "",
  ...p
}) => (
  <button
    {...p}
    className={`${
      variant === "solid"
        ? "rounded-2xl bg-slate-900 text-white hover:brightness-95 active:brightness-90"
        : variant === "ghost"
          ? "rounded-2xl text-slate-700 hover:bg-slate-100 active:bg-slate-200"
          : variant === "outline"
            ? "rounded-2xl border border-slate-200 text-slate-700 hover:bg-slate-50 active:bg-slate-100"
            : "rounded-2xl border border-slate-200 bg-white/80 text-slate-900 shadow-sm hover:shadow-md active:shadow-sm"
    } transition ${className}`}
  />
);

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const { className = "", ...rest } = props;
  return (
    <input
      {...rest}
      className={`w-full rounded-2xl border border-slate-200/80 bg-white text-slate-900 px-3.5 py-2.5 shadow-inner placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-slate-200 ${className}`}
    />
  );
}

/* -------------------------------------------------------------------------- */
/*  Table header                                                              */
/* -------------------------------------------------------------------------- */

export function Th({
  children,
  onClick,
  active,
  dir,
  className = "",
  rowSpan,
  colSpan,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  active?: boolean;
  dir?: "asc" | "desc";
  className?: string;
  rowSpan?: number;
  colSpan?: number;
}) {
  return (
    <th
      rowSpan={rowSpan}
      colSpan={colSpan}
      className={`px-4 py-2 text-left select-none whitespace-nowrap font-medium text-slate-700 bg-white ${className}`}
    >
      {onClick ? (
        <button
          onClick={onClick}
          className={`inline-flex items-center gap-1 hover:opacity-80 transition ${
            active ? "font-semibold" : "font-medium"
          }`}
        >
          {children}
          <span className="text-xs opacity-60">
            {active ? (dir === "asc" ? "▲" : "▼") : "↕"}
          </span>
        </button>
      ) : (
        <span className="inline-flex items-center gap-1">{children}</span>
      )}
    </th>
  );
}

/* -------------------------------------------------------------------------- */
/*  Stats / Chips                                                             */
/* -------------------------------------------------------------------------- */

export function Card({
  title,
  value,
  footer,
}: {
  title: string;
  value: React.ReactNode;
  footer?: string;
}) {
  return (
    <Panel className="p-4">
      <div className="text-xs uppercase tracking-wide text-slate-500">
        {title}
      </div>
      <div className="text-3xl font-bold mt-1">{value}</div>
      {footer && <div className="text-xs text-slate-500 mt-1">{footer}</div>}
    </Panel>
  );
}

export function MiniStat({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-slate-100/70 p-3">
      <div className="text-sm text-slate-600 font-medium">{label}</div>
      <div className="font-bold text-lg text-slate-900 mt-1">{value}</div>
    </div>
  );
}

export const Chip = ({ children }: { children: React.ReactNode }) => (
  <span className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium bg-slate-100 text-slate-700">
    {children}
  </span>
);

/* -------------------------------------------------------------------------- */
/*  Status & Badge Components (NEW - MODERN)                                 */
/* -------------------------------------------------------------------------- */

export function Badge({
  variant = "default",
  children,
}: {
  variant?: "default" | "success" | "warning" | "danger" | "info";
  children: React.ReactNode;
}) {
  const variants = {
    default: "bg-slate-100 text-slate-700 border border-slate-200",
    success: "bg-green-50 text-green-700 border border-green-200",
    warning: "bg-amber-50 text-amber-700 border border-amber-200",
    danger: "bg-red-50 text-red-700 border border-red-200",
    info: "bg-blue-50 text-blue-700 border border-blue-200",
  };

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${variants[variant]}`}
    >
      {children}
    </span>
  );
}

export function StatusIndicator({
  status,
  label,
}: {
  status: "active" | "inactive" | "pending" | "error";
  label: string;
}) {
  const statusColors = {
    active: "bg-green-500",
    inactive: "bg-slate-300",
    pending: "bg-amber-500",
    error: "bg-red-500",
  };

  return (
    <div className="inline-flex items-center gap-2">
      <div
        className={`h-2.5 w-2.5 rounded-full animate-pulse ${statusColors[status]}`}
      />
      <span className="text-sm font-medium text-slate-700">{label}</span>
    </div>
  );
}

export function ModernCard({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200/50 bg-white/70 backdrop-blur shadow-sm p-5 transition hover:shadow-md">
      <div className="mb-3">
        <h3 className="text-base font-semibold text-slate-900">{title}</h3>
        {subtitle && <p className="text-sm text-slate-600 mt-1">{subtitle}</p>}
      </div>
      <div className="mb-4">{children}</div>
      {footer && (
        <div className="pt-3 border-t border-slate-200 text-sm text-slate-600">
          {footer}
        </div>
      )}
    </div>
  );
}

export function StatCard({
  label,
  value,
  change,
  icon,
}: {
  label: string;
  value: string | number;
  change?: { value: number; trend: "up" | "down" };
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-gradient-to-br from-blue-50 to-slate-50 border border-blue-100 p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-600">{label}</p>
          <p className="text-3xl font-bold text-slate-900 mt-2">{value}</p>
        </div>
        {icon && <div className="text-blue-400 opacity-70">{icon}</div>}
      </div>
      {change && (
        <div
          className={`mt-3 text-sm font-semibold ${change.trend === "up" ? "text-green-600" : "text-red-600"}`}
        >
          {change.trend === "up" ? "↑" : "↓"} {change.value}%
        </div>
      )}
    </div>
  );
}
