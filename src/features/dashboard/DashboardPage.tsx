//filtering and navigation - dashboard
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MiniStat } from "../../components/UI";
import { supabase } from "../../lib/supabase";
import { SECTOR_BADGES } from "../../utils/storage";
import {
  SearchInput,
  SelectControl,
  ShieldIcon,
} from "./components/DashboardControls";
import {
  categorizeCards,
  filterVisibleCards,
  getDashboardCards,
  isCategory,
  isSortOption,
} from "./selectors";
import type { Category, SortOption } from "./types";

type ActivityLogRow = {
  id: string | number;
  action?: string | null;
  sector?: string | null;
  station?: string | null;
  performed_department?: string | null;
  performed_by?: string | null;
  created_at?: string | null;
  snapshot?: unknown;
};

type ActivityEntry = {
  id: string;
  action: string;
  sector: string;
  station: string;
  actor: string;
  label: string;
  timestamp: string;
};

const toRecord = (value: unknown): Record<string, unknown> | null =>
  value !== null && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;

const buildSnapshotLabel = (snapshot: unknown): string => {
  const row = toRecord(snapshot);
  if (!row) return "Inventory record";

  const parts = [row.type, row.make, row.caliber, row.serial_no]
    .map((part) => String(part ?? "").trim())
    .filter(Boolean);

  return parts.length > 0 ? parts.join(" / ") : "Inventory record";
};

export default function Dashboard() {
  const nav = useNavigate();

  const cards = useMemo(() => getDashboardCards(), []);

  const [q, setQ] = useState("");
  const [cat, setCat] = useState<Category>("All");
  const [sort, setSort] = useState<SortOption>("DEFAULT");
  const [now, setNow] = useState(() => new Date());
  const [activityEntries, setActivityEntries] = useState<ActivityEntry[]>([]);
  const [activityLoading, setActivityLoading] = useState(true);
  const [activityError, setActivityError] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let mounted = true;

    const fetchRecentActivity = async (isInitial = false) => {
      if (isInitial) setActivityLoading(true);

      const { data, error } = await supabase
        .from("inventory_activity_log")
        .select(
          "id, action, sector, station, performed_department, performed_by, created_at, snapshot",
        )
        .order("created_at", { ascending: false })
        .limit(6);

      if (!mounted) return;

      if (error) {
        setActivityError("Unable to load live inventory activity.");
        setActivityLoading(false);
        return;
      }

      const rows = (data ?? []) as ActivityLogRow[];
      const mapped: ActivityEntry[] = rows.map((row) => ({
        id: String(row.id),
        action: String(row.action ?? "EVENT"),
        sector: String(row.sector ?? "Unknown sector"),
        station: String(row.station ?? "Unknown station"),
        actor: String(
          row.performed_by ?? row.performed_department ?? "Unknown user",
        ),
        label: buildSnapshotLabel(row.snapshot),
        timestamp: row.created_at ?? new Date().toISOString(),
      }));

      setActivityEntries(mapped);
      setActivityError(null);
      setActivityLoading(false);
    };

    void fetchRecentActivity(true);
    const poll = window.setInterval(() => {
      void fetchRecentActivity();
    }, 30000);

    return () => {
      mounted = false;
      window.clearInterval(poll);
    };
  }, []);

  const categorized = useMemo(() => categorizeCards(cards), [cards]);

  const visible = useMemo(
    () => filterVisibleCards(categorized, q, cat, sort),
    [categorized, q, cat, sort],
  );

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
                <div className="group relative">
                  <span className="inline-flex items-center rounded-full border border-slate-200 bg-white/80 px-2.5 py-1 text-[12px] font-semibold text-slate-700">
                    {now.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </span>
                  <div className="pointer-events-none absolute right-0 top-full z-20 mt-2 w-80 rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-700 opacity-0 shadow-xl transition duration-150 group-hover:pointer-events-auto group-hover:opacity-100">
                    <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                      Live Inventory Activity
                    </div>
                    {activityLoading ? (
                      <div className="text-slate-500">Loading recent activity...</div>
                    ) : activityError ? (
                      <div className="text-red-600">{activityError}</div>
                    ) : activityEntries.length > 0 ? (
                      <div className="space-y-2">
                        {activityEntries.map((entry) => (
                          <div
                            key={entry.id}
                            className="rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-2"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-semibold text-slate-800">
                                {entry.label}
                              </span>
                              <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                                {entry.action}
                              </span>
                            </div>
                            <div className="mt-0.5 text-slate-600">
                              {entry.sector} / {entry.station}
                            </div>
                            <div className="mt-0.5 text-[11px] text-slate-500">
                              by {entry.actor}
                            </div>
                            <div className="mt-0.5 text-[11px] text-slate-500">
                              {new Date(entry.timestamp).toLocaleString()}{" "}
                              (live)
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-slate-500">
                        No live inventory activity yet.
                      </div>
                    )}
                  </div>
                </div>
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
                Generate Data
              </button>

              <button
                onClick={() => nav("/")}
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
                <SearchInput
                  value={q}
                  onChange={setQ}
                  placeholder="Search sector (e.g., RHQ, Cavite, Laguna...)"
                />
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <SelectControl
                    ariaLabel="Category filter"
                    value={cat}
                    onChange={(value) => {
                      if (isCategory(value)) setCat(value);
                    }}
                  >
                    <option value="All">All Categories</option>
                    <option value="Ammunition">Ammunition</option>
                    <option value="Firearms">Firearms</option>
                    <option value="Accessories">Accessories</option>
                  </SelectControl>
                  <SelectControl
                    ariaLabel="Sort filter"
                    value={sort}
                    onChange={(value) => {
                      if (isSortOption(value)) setSort(value);
                    }}
                  >
                    <option value="DEFAULT">Region Order (R4A)</option>
                    <option value="UNITS_DESC">Units (high to low)</option>
                    <option value="SKUS_DESC">SKUs (high to low)</option>
                  </SelectControl>
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
