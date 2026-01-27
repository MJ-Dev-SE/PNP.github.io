import React, { useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { MiniStat } from "../components/UI";
import { SECTORS, itemsKey, toNum, SECTOR_BADGES } from "../utils/storage";

type Card = { name: Sector; skus: number; units: number };
type Sector = (typeof SECTORS)[number];

function ShieldIcon({ className = "" }: { className?: string }) {
  // purely visual component; no logic or state
  // isolated so icon changes won’t affect dashboard logic
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
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

function Select({
  value,
  onChange,
  children,
  "aria-label": ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
  "aria-label": string;
}) {
  // controlled select component
  // state is owned by parent, this only forwards user intent upward
  return (
    <select
      aria-label={ariaLabel}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-11 w-full sm:w-auto rounded-xl border border-slate-200 bg-white/80 px-3 text-sm text-slate-800 shadow-sm outline-none ring-0 transition focus:border-slate-300 focus:outline-none focus:ring-4 focus:ring-blue-200"
    >
      {children}
    </select>
  );
}

function Input({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  // text input used only for filtering
  // no debounce here since dataset is small and client-only
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
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-xl border border-slate-200 bg-white/80 pl-10 pr-3 text-sm text-slate-800 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-slate-300 focus:outline-none focus:ring-4 focus:ring-blue-200"
      />
    </div>
  );
}

export default function Dashboard() {
  const nav = useNavigate();

  const cards = useMemo(
    () =>
      SECTORS.map((name) => {
        const raw = localStorage.getItem(itemsKey(name));
        let skus = 0;
        let units = 0;

        try {
          const items = raw ? JSON.parse(raw) : [];

          // 🔑 OPTION B GUARD:
          // If NO item actually belongs to this sector → force zero
          const hasSectorData = items.some(
            (i: any) => (i.sector || "").trim() === name,
          );

          if (!hasSectorData) {
            return { name, skus: 0, units: 0 };
          }

          // Otherwise compute normally
          skus = items.length;
          units = items.reduce(
            (s: number, i: any) =>
              s +
              toNum(i?.status_uns) +
              toNum(i?.status_svc) +
              toNum(i?.status_ber),
            0,
          );
        } catch {
          // corrupted cache → safe zero
          return { name, skus: 0, units: 0 };
        }

        return { name, skus, units };
      }),
    [],
  );

  const [q, setQ] = useState("");
  const [cat, setCat] = useState<
    "All" | "Ammunition" | "Firearms" | "Accessories"
  >("All");
  const [sort, setSort] = useState<"DEFAULT" | "UNITS_DESC" | "SKUS_DESC">(
    "DEFAULT",
  );

  const categorized = useMemo(() => {
    // derives category purely from sector name
    // UI-only logic so it doesn’t affect persisted data structure
    const catOf = (name: string): "Ammunition" | "Firearms" | "Accessories" => {
      const n = name.toLowerCase();
      if (/(ammo|ammun|bala|munitions)/.test(n)) return "Ammunition";
      if (/(firearm|rifle|pistol|arm|weap|gun)/.test(n)) return "Firearms";
      return "Accessories";
    };

    // enrich base card data with computed category
    return cards.map((c) => ({ ...c, category: catOf(c.name) }));
  }, [cards]);

  const visible = useMemo(() => {
    // working copy so original memoized data remains untouched
    const query = q.trim().toLowerCase();
    let list = categorized.slice();

    // text filter happens first to reduce dataset early
    if (query) {
      list = list.filter((c) => c.name.toLowerCase().includes(query));
    }

    // category filter is applied only when not set to All
    if (cat !== "All") {
      list = list.filter((c) => c.category === cat);
    }

    // sorting logic is last since it’s most expensive
    if (sort === "DEFAULT") {
      const order = SECTORS;
      list.sort((a, b) => order.indexOf(a.name) - order.indexOf(b.name));
    } else if (sort === "UNITS_DESC") {
      list.sort((a, b) => (b.units ?? 0) - (a.units ?? 0));
    } else if (sort === "SKUS_DESC") {
      list.sort((a, b) => (b.skus ?? 0) - (a.skus ?? 0));
    }

    return list;
  }, [categorized, q, cat, sort]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-slate-100 to-blue-50 text-slate-900">
      <header className="sticky top-0 z-10 border-b border-slate-200/70 bg-white/70 backdrop-blur">
        <div className="mx-auto w-full max-w-[95rem] px-4 py-4 xl:px-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-3 py-1 text-[12px] font-semibold text-slate-700 shadow-sm">
                  <span className="h-2 w-2 rounded-full bg-blue-600" />
                  R4 / Police Inventory
                </span>
                <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[12px] font-semibold text-blue-800">
                  Dashboard
                </span>
              </div>
              <h1 className="mt-2 truncate text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">
                Inventory Overview
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                Sector summary for ammunition, firearms, and accessories.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => nav("/quicklook")}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white/80 px-4 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-white focus:outline-none focus:ring-4 focus:ring-blue-200"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5 text-slate-500"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path d="M4 5h16M7 12h10M10 19h4" strokeLinecap="round" />
                </svg>
                Quicklook
              </button>
              <button
                onClick={() => nav("/quicklookt")}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-400 bg-white/80 px-4 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-white focus:outline-none focus:ring-4 focus:ring-blue-200"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5 text-slate-500"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path d="M4 5h16M7 12h10M10 19h4" strokeLinecap="round" />
                </svg>
                Quicklookt
              </button>

              <button
                onClick={() => nav(".  ")}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-blue-200"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5 text-white/90"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
                </svg>
                Inventory
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[95rem] px-4 py-8 xl:px-8">
        <section className="grid gap-4">
          <div className="rounded-2xl border border-slate-200/70 bg-white/70 p-4 shadow-sm backdrop-blur">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-2">
                <ShieldIcon className="h-9 w-9 text-blue-700" />
                <div className="min-w-0">
                  <h2 className="text-base font-extrabold tracking-tight text-slate-900">
                    Sectors
                  </h2>
                  <p className="text-sm text-slate-600">
                    Search, filter, and sort sectors for faster access.
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Input
                  value={q}
                  onChange={setQ}
                  placeholder="Search sector (e.g., RHQ, Cavite, Laguna…)"
                />
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Select
                    aria-label="Category filter"
                    value={cat}
                    onChange={(v) => setCat(v as any)}
                  >
                    <option value="All">All Categories</option>
                    <option value="Ammunition">Ammunition</option>
                    <option value="Firearms">Firearms</option>
                    <option value="Accessories">Accessories</option>
                  </Select>
                  <Select
                    aria-label="Sort filter"
                    value={sort}
                    onChange={(v) => setSort(v as any)}
                  >
                    <option value="DEFAULT">Region Order (R4A)</option>
                    <option value="UNITS_DESC">Units (high → low)</option>
                    <option value="SKUS_DESC">SKUs (high → low)</option>
                  </Select>
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm text-slate-600">
              <div className="inline-flex items-center gap-2">
                <span className="inline-flex h-6 items-center rounded-full border border-slate-200 bg-white px-2.5 text-[12px] font-semibold text-slate-700">
                  Showing {visible.length}
                </span>
                <span className="text-slate-500">
                  of {visible.length} sectors
                </span>
              </div>
              <div className="text-slate-500">
                Tip: Use{" "}
                <span className="font-semibold text-slate-700">Units</span>{" "}
                sorting to spot high-stock sectors.
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {visible.map((card) => (
              <button
                key={card.name}
                onClick={() => nav(`/sector/${encodeURIComponent(card.name)}`)}
                className="
  group relative overflow-hidden rounded-3xl
  border border-slate-700/60
  bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900
  p-5 text-left shadow-lg
  transition
  hover:-translate-y-0.5
  hover:border-slate-500
  hover:shadow-xl
  hover:ring-2 hover:ring-slate-600/60
  focus:outline-none focus:ring-4 focus:ring-slate-600
"
              >
                <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-slate-700/40 blur-3xl transition group-hover:bg-slate-600/50" />

                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      Sector
                    </div>
                    <div className="mt-1 truncate text-xl font-extrabold tracking-tight text-slate-100">
                      {card.name}
                    </div>
                  </div>

                  <div className="flex h-12 w-12 items-center justify-center">
                    {SECTOR_BADGES[card.name] ? (
                      <img
                        src={SECTOR_BADGES[card.name]}
                        alt={`${card.name} badge`}
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <ShieldIcon className="h-6 w-6 text-slate-300" />
                    )}
                  </div>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center rounded-full border border-slate-600 bg-slate-800 px-2.5 py-1 text-[12px] font-semibold text-slate-200">
                    {card.category}
                  </span>
                  <span className="inline-flex items-center rounded-full border border-slate-700 bg-slate-900 px-2.5 py-1 text-[12px] font-semibold text-slate-300">
                    Local data
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-2xl bg-slate-800 p-3 ring-1 ring-slate-700 transition group-hover:ring-slate-500">
                    <MiniStat label="SKUs" value={card.skus} />
                  </div>
                  <div className="rounded-2xl bg-slate-800 p-3 ring-1 ring-slate-700 transition group-hover:ring-slate-500">
                    <MiniStat label="Units" value={card.units} />
                  </div>
                </div>

                <div className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-slate-200">
                  Open sector
                  <svg
                    viewBox="0 0 24 24"
                    className="h-4 w-4 transition group-hover:translate-x-0.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                  >
                    <path
                      d="M8 5l8 7-8 7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </button>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
