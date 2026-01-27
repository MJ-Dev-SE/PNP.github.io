import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createClient } from "@supabase/supabase-js";
import Swal from "sweetalert2";
import PpoGridLoader from "../components/PpoGridLoader";

type EquipmentStats = {
  svc: number;
  unsvc: number;
  ber: number;
  organic: number;
  donated: number;
  loaned: number;
  fas: number;
};

type Row = {
  unit: string;
  station: string;
  equipments: {
    all: EquipmentStats;
    long: EquipmentStats;
    short: EquipmentStats;
    mobility: EquipmentStats;
    radio: EquipmentStats;
  };
};
const PPO_LOGOS = [
  "/ppo/rhq.png", // 👈 RHQ
  "/ppo/rmfb4a.png", // 👈 RMFB4A
  "/ppo/ppo1.png",
  "/ppo/ppo2.png",
  "/ppo/ppo3.png",
  "/ppo/ppo4.png",
  "/ppo/ppo5.png",
];

// Supabase client is initialized once and reused across fetch/update/delete
const supabaseUrl = "https://blxrymicjowtplrkusck.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJseHJ5bWljam93dHBscmt1c2NrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc1NTkwODQsImV4cCI6MjA4MzEzNTA4NH0.Q1y53hRP0PS91IbRdX4jUIqJBqtJAmqVbOg6PgPhAi4";
const supabase = createClient(supabaseUrl, supabaseKey);

export default function QuicklookInventory() {
  const nav = useNavigate();

  const [ppoRows, setPpoRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  // filter states drive all memoized selectors below
  const [ppo, setPpo] = useState("All PPOs");
  const [station, setStation] = useState("All Stations");
  const [type, setType] = useState("All");

  // edit-related states are isolated so table rendering stays pure
  const [editRow, setEditRow] = useState<Row | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editEquipmentKey, setEditEquipmentKey] =
    useState<keyof Row["equipments"]>("all");

  const [search, setSearch] = useState("");
  const ITEMS_PER_PAGE = 10;
  const [currentPage, setCurrentPage] = useState(1);
  type InlineEditState = {
    unit: string;
    station: string;
    equipmentKey: keyof Row["equipments"];
    field: keyof EquipmentStats;
  } | null;

  const [inlineEdit, setInlineEdit] = useState<InlineEditState>(null);
  const [inlineValue, setInlineValue] = useState<number>(0);

  const sleep = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));

  const [editValues, setEditValues] = useState<EquipmentStats>({
    svc: 0,
    unsvc: 0,
    ber: 0,
    organic: 0,
    donated: 0,
    loaned: 0,
    fas: 0,
  });

  const refetchData = async () => {
    // centralized refetch so edit/delete can reuse the same logic
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("quicklook_inventory")
        .select("*");

      if (error || !data) return;

      // grouping prevents duplicated rows per equipment type
      const grouped: Record<string, Row> = {};

      data.forEach((item: any) => {
        const key = item.unit + "|" + item.station;

        // initialize row once per unit + station combination
        if (!grouped[key]) {
          grouped[key] = {
            unit: item.unit,
            station: item.station,
            equipments: {
              all: {
                svc: 0,
                unsvc: 0,
                ber: 0,
                organic: 0,
                donated: 0,
                loaned: 0,
                fas: 0,
              },
              long: {
                svc: 0,
                unsvc: 0,
                ber: 0,
                organic: 0,
                donated: 0,
                loaned: 0,
                fas: 0,
              },
              short: {
                svc: 0,
                unsvc: 0,
                ber: 0,
                organic: 0,
                donated: 0,
                loaned: 0,
                fas: 0,
              },
              mobility: {
                svc: 0,
                unsvc: 0,
                ber: 0,
                organic: 0,
                donated: 0,
                loaned: 0,
                fas: 0,
              },
              radio: {
                svc: 0,
                unsvc: 0,
                ber: 0,
                organic: 0,
                donated: 0,
                loaned: 0,
                fas: 0,
              },
            },
          };
        }

        // each DB row fills a specific equipment bucket
        const typeKey = item.equipment_type as keyof Row["equipments"];
        grouped[key].equipments[typeKey] = {
          svc: item.svc ?? 0,
          unsvc: item.unsvc ?? 0,
          ber: item.ber ?? 0,
          organic: item.organic ?? 0,
          donated: item.donated ?? 0,
          loaned: item.loaned ?? 0,
          fas: item.fas ?? 0,
        };
      });

      setPpoRows(Object.values(grouped));
    } finally {
      setLoading(false);
    }
  };

  const saveEdit = async () => {
    // guard clause avoids accidental updates with no selected row
    if (!editRow) return;

    const result = await Swal.fire({
      title: "Save changes?",
      text: "This will update the selected equipment record.",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Yes, save it",
      cancelButtonText: "Cancel",
    });

    if (!result.isConfirmed) return;

    // update is scoped by unit + station + equipment type
    const { error } = await supabase
      .from("quicklook_inventory")
      .update({ ...editValues })
      .eq("unit", editRow.unit)
      .eq("station", editRow.station)
      .eq("equipment_type", editEquipmentKey);

    if (error) {
      await Swal.fire("Error", "Failed to update record.", "error");
      return;
    }

    await Swal.fire("Saved!", "Equipment record updated.", "success");

    // reset modal state and sync UI with latest DB state
    setEditRow(null);
    setIsEditOpen(false);
    await refetchData();
  };

  const saveInlineEdit = async () => {
    if (!inlineEdit) return;

    const { unit, station, equipmentKey, field } = inlineEdit;

    // 1️⃣ Optimistically update UI
    setPpoRows((prev) =>
      prev.map((row) => {
        if (row.unit !== unit || row.station !== station) return row;

        return {
          ...row,
          equipments: {
            ...row.equipments,
            [equipmentKey]: {
              ...row.equipments[equipmentKey],
              [field]: inlineValue,
            },
          },
        };
      }),
    );

    setInlineEdit(null);

    // 2️⃣ Persist to DB
    const { error } = await supabase
      .from("quicklook_inventory")
      .update({ [field]: inlineValue })
      .eq("unit", unit)
      .eq("station", station)
      .eq("equipment_type", equipmentKey);

    // 3️⃣ Rollback on failure (important)
    if (error) {
      Swal.fire("Error", "Failed to update value. Reverting.", "error");

      setPpoRows((prev) =>
        prev.map((row) => {
          if (row.unit !== unit || row.station !== station) return row;

          return {
            ...row,
            equipments: {
              ...row.equipments,
              [equipmentKey]: {
                ...row.equipments[equipmentKey],
                [field]: row.equipments[equipmentKey][field],
              },
            },
          };
        }),
      );
    }
  };

  useEffect(() => {
    // initial load happens once on mount
    const fetchData = async () => {
      setLoading(true);

      const MIN_LOADING_TIME = 2500; // 👈 5 seconds
      const start = Date.now();

      try {
        const { data, error } = await supabase
          .from("quicklook_inventory")
          .select("*");

        if (error || !data) return;

        const grouped: Record<string, Row> = {};

        data.forEach((item: any) => {
          const key = item.unit + "|" + item.station;

          if (!grouped[key]) {
            grouped[key] = {
              unit: item.unit,
              station: item.station,
              equipments: {
                all: {
                  svc: 0,
                  unsvc: 0,
                  ber: 0,
                  organic: 0,
                  donated: 0,
                  loaned: 0,
                  fas: 0,
                },
                long: {
                  svc: 0,
                  unsvc: 0,
                  ber: 0,
                  organic: 0,
                  donated: 0,
                  loaned: 0,
                  fas: 0,
                },
                short: {
                  svc: 0,
                  unsvc: 0,
                  ber: 0,
                  organic: 0,
                  donated: 0,
                  loaned: 0,
                  fas: 0,
                },
                mobility: {
                  svc: 0,
                  unsvc: 0,
                  ber: 0,
                  organic: 0,
                  donated: 0,
                  loaned: 0,
                  fas: 0,
                },
                radio: {
                  svc: 0,
                  unsvc: 0,
                  ber: 0,
                  organic: 0,
                  donated: 0,
                  loaned: 0,
                  fas: 0,
                },
              },
            };
          }

          const typeKey = item.equipment_type as keyof Row["equipments"];
          grouped[key].equipments[typeKey] = {
            svc: item.svc ?? 0,
            unsvc: item.unsvc ?? 0,
            ber: item.ber ?? 0,
            organic: item.organic ?? 0,
            donated: item.donated ?? 0,
            loaned: item.loaned ?? 0,
            fas: item.fas ?? 0,
          };
        });

        setPpoRows(Object.values(grouped));
      } finally {
        const elapsed = Date.now() - start;
        if (elapsed < MIN_LOADING_TIME) {
          await sleep(MIN_LOADING_TIME - elapsed);
        }
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [ppo, station, type, search]);

  const equipmentKey = useMemo(() => {
    // maps human-readable filter to internal equipment bucket
    switch (type) {
      case "Long FAS":
        return "long";
      case "Short FAS":
        return "short";
      case "Mobility":
        return "mobility";
      case "Radio":
        return "radio";
      default:
        return "all";
    }
  }, [type]);

  const ppos = useMemo(() => {
    // derived from loaded rows to stay in sync with DB
    const uniquePpos = new Set(ppoRows.map((r) => r.unit));
    return ["All PPOs", ...Array.from(uniquePpos)];
  }, [ppoRows]);

  const stations = useMemo(() => {
    // station list reacts to PPO filter to prevent invalid combos
    const filtered =
      ppo === "All PPOs" ? ppoRows : ppoRows.filter((r) => r.unit === ppo);

    const uniqueStations = new Set(filtered.map((r) => r.station));
    return ["All Stations", ...Array.from(uniqueStations)];
  }, [ppoRows, ppo]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();

    return ppoRows.filter((r) => {
      // PPO + station filters
      if (ppo !== "All PPOs" && r.unit !== ppo) return false;
      if (station !== "All Stations" && r.station !== station) return false;

      // 🔍 search filter
      if (q) {
        const haystack = `${r.unit} ${r.station}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      return true;
    });
  }, [ppoRows, ppo, station, search]);

  const totalPages = Math.ceil(rows.length / ITEMS_PER_PAGE);

  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    return rows.slice(start, end);
  }, [rows, currentPage]);

  const equipmentTitle = useMemo(() => {
    // title strictly reflects current equipment scope
    switch (type) {
      case "Long FAS":
        return "STATUS OF LONG FIREARMS";
      case "Short FAS":
        return "STATUS OF SHORT FIREARMS";
      case "Mobility":
        return "STATUS OF MOBILITY EQUIPMENTS";
      case "Radio":
        return "STATUS OF RADIO EQUIPMENTS";
      default:
        return "STATUS OF EQUIPMENTS";
    }
  }, [type]);

  const highlightText = (text: string, query: string) => {
    if (!query) return text;

    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(${escaped})`, "gi");

    return text.split(regex).map((part, i) =>
      regex.test(part) ? (
        <mark key={i} className="rounded bg-yellow-200 px-1 text-slate-900">
          {part}
        </mark>
      ) : (
        part
      ),
    );
  };
  function InlineCell({
    value,
    row,
    equipmentKey,
    field,
  }: {
    value: number;
    row: Row;
    equipmentKey: keyof Row["equipments"];
    field: keyof EquipmentStats;
  }) {
    const isEditing =
      inlineEdit?.unit === row.unit &&
      inlineEdit?.station === row.station &&
      inlineEdit?.equipmentKey === equipmentKey &&
      inlineEdit?.field === field;

    if (isEditing) {
      return (
        <input
          type="number"
          autoFocus
          value={inlineValue}
          onChange={(e) => setInlineValue(Number(e.target.value))}
          onBlur={saveInlineEdit}
          onKeyDown={(e) => {
            if (e.key === "Enter") saveInlineEdit();
            if (e.key === "Escape") setInlineEdit(null);
          }}
          className="w-16 rounded border border-blue-300 px-1 text-center text-sm focus:ring-2 focus:ring-blue-400"
        />
      );
    }

    return (
      <button
        onClick={() => {
          setInlineEdit({
            unit: row.unit,
            station: row.station,
            equipmentKey,
            field,
          });
          setInlineValue(value);
        }}
        className="w-full text-center hover:bg-blue-100 rounded px-1"
      >
        {value}
      </button>
    );
  }

  if (loading) return <PpoGridLoader logos={PPO_LOGOS} />;
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-blue-50 text-slate-900">
      {/* Header */}
      <header className="border-b border-slate-200/70 bg-white/70 backdrop-blur">
        <div className="mx-auto max-w-[95rem] px-4 py-4 xl:px-8 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-extrabold tracking-tight">
              Quicklook Inventory
            </h1>
            <p className="text-sm text-slate-600">
              Quick status overview of equipments
            </p>
          </div>
          <button
            onClick={() => nav(-1)}
            className="h-10 rounded-xl border border-slate-200 bg-white/80 px-4 text-sm font-semibold shadow-sm hover:bg-white focus:ring-4 focus:ring-blue-200"
          >
            Back
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-[95rem] px-4 py-8 xl:px-8">
        {/* Filters */}
        <section className="rounded-2xl border border-slate-200/70 bg-white/70 p-4 shadow-sm backdrop-blur">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="relative">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search…"
                className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-3 pr-10 text-sm shadow-sm focus:ring-4 focus:ring-blue-200"
              />

              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                  aria-label="Clear search"
                >
                  ✕
                </button>
              )}
            </div>
            {/* PPO filter */}
            <select
              value={ppo}
              onChange={(e) => setPpo(e.target.value)}
              className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm shadow-sm focus:ring-4 focus:ring-blue-200"
            >
              {ppos.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>

            {/* Station filter */}
            <select
              value={station}
              onChange={(e) => setStation(e.target.value)}
              className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm shadow-sm focus:ring-4 focus:ring-blue-200"
            >
              {stations.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>

            {/* Equipment Type filter */}
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm shadow-sm focus:ring-4 focus:ring-blue-200"
            >
              <option>All</option>
              <option>Long FAS</option>
              <option>Short FAS</option>
              <option>Mobility</option>
              <option>Radio</option>
            </select>
          </div>
        </section>

        {/* Table */}
        <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200/70 bg-white/80 shadow-sm">
          <div className="border-b bg-gradient-to-r from-blue-700 to-blue-600 px-4 py-3 text-sm font-semibold text-white backdrop-blur">
            {equipmentTitle}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-600 uppercase text-xs tracking-wide">
                  <th rowSpan={2} className="px-4 py-2 text-left">
                    PPO / UNIT
                  </th>
                  <th colSpan={4} className="px-4 py-2 text-center">
                    STATUS
                  </th>
                  <th colSpan={5} className="px-4 py-2 text-center">
                    SOURCE
                  </th>
                </tr>

                <tr className="bg-white text-slate-500 text-xs border-t">
                  <th className="px-3 py-2 text-center">SVC</th>
                  <th className="px-3 py-2 text-center">UNSVC</th>
                  <th className="px-3 py-2 text-center">BER</th>
                  <th className="px-3 py-2 text-center">TOTAL</th>
                  <th className="px-3 py-2 text-center">ORGANIC</th>
                  <th className="px-3 py-2 text-center">DONATED</th>
                  <th className="px-3 py-2 text-center">LOANED</th>
                  <th className="px-3 py-2 text-center">FAS</th>
                  <th className="px-3 py-2 text-center">TOTAL</th>
                  <th colSpan={5} className="px-4 py-2 text-center">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {paginatedRows.map((r) => {
                  const e = r.equipments[equipmentKey];
                  const statusTotal = e.svc + e.unsvc + e.ber;
                  const sourceTotal = e.organic + e.donated + e.loaned + e.fas;
                  return (
                    <tr
                      key={r.unit + r.station}
                      className="border-t border-slate-100 hover:bg-blue-50/40 transition-colors"
                    >
                      <td className="px-4 py-3 font-semibold text-slate-800">
                        <div className="leading-tight">
                          {highlightText(r.unit, search)}
                          <div className="text-xs text-slate-500">
                            {highlightText(r.station, search)}
                          </div>
                        </div>
                      </td>

                      <td className="px-3 py-2 text-center">
                        <InlineCell
                          value={e.svc}
                          row={r}
                          equipmentKey={equipmentKey}
                          field="svc"
                        />
                      </td>
                      <td className="px-3 py-2 text-center">
                        <InlineCell
                          value={e.unsvc}
                          row={r}
                          equipmentKey={equipmentKey}
                          field="unsvc"
                        />
                      </td>
                      <td className="px-3 py-2 text-center">
                        <InlineCell
                          value={e.ber}
                          row={r}
                          equipmentKey={equipmentKey}
                          field="ber"
                        />
                      </td>
                      <td className="px-3 py-2 text-center font-bold">
                        {statusTotal}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <InlineCell
                          value={e.organic}
                          row={r}
                          equipmentKey={equipmentKey}
                          field="organic"
                        />
                      </td>
                      <td className="px-3 py-2 text-center">
                        <InlineCell
                          value={e.donated}
                          row={r}
                          equipmentKey={equipmentKey}
                          field="donated"
                        />
                      </td>
                      <td className="px-3 py-2 text-center">
                        <InlineCell
                          value={e.loaned}
                          row={r}
                          equipmentKey={equipmentKey}
                          field="loaned"
                        />
                      </td>
                      <td className="px-3 py-2 text-center">
                        <InlineCell
                          value={e.fas}
                          row={r}
                          equipmentKey={equipmentKey}
                          field="fas"
                        />
                      </td>
                      <td className="px-3 py-2 text-center font-semibold bg-slate-50">
                        {sourceTotal}
                      </td>

                      <td className="px-4 py-2 text-center">
                        <button
                          className="rounded-md px-2 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-100"
                          onClick={() => {
                            setEditRow(r);
                            setEditEquipmentKey(equipmentKey);
                            setEditValues({ ...r.equipments[equipmentKey] });
                            setIsEditOpen(true);
                          }}
                        >
                          Edit
                        </button>
                        <button
                          className="rounded-md px-2 py-1 text-xs font-semibold text-red-600 hover:bg-blue-100"
                          onClick={async () => {
                            const result = await Swal.fire({
                              title: "Delete record?",
                              text: "This will permanently remove all equipment data for this station.",
                              icon: "warning",
                              showCancelButton: true,
                              confirmButtonColor: "#d33",
                              confirmButtonText: "Yes, delete it",
                              cancelButtonText: "Cancel",
                            });

                            if (!result.isConfirmed) return;

                            const { error } = await supabase
                              .from("quicklook_inventory")
                              .delete()
                              .eq("unit", r.unit)
                              .eq("station", r.station);

                            if (error) {
                              await Swal.fire(
                                "Error",
                                "Failed to delete record.",
                                "error",
                              );
                              return;
                            }

                            await Swal.fire(
                              "Deleted!",
                              "Record has been removed.",
                              "success",
                            );
                            await refetchData();
                          }}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {totalPages > 1 && (
              <div className="border-t bg-slate-50/70 px-4 py-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-sm">
                  {/* Left: info */}
                  <div className="text-slate-600 text-xs sm:text-sm">
                    Page <b>{currentPage}</b> of <b>{totalPages}</b> (
                    {rows.length} records)
                  </div>

                  {/* Right: pagination controls */}
                  <div className="flex items-center gap-1">
                    {/* Prev */}
                    <button
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage((p) => p - 1)}
                      className="h-8 rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700
          hover:bg-blue-50 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Prev
                    </button>

                    {/* Page numbers */}
                    {Array.from({ length: totalPages }).map((_, i) => {
                      const page = i + 1;
                      return (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`h-8 min-w-[2rem] rounded-md border text-xs font-semibold transition
                ${
                  currentPage === page
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-slate-700 border-slate-300 hover:bg-blue-50"
                }`}
                        >
                          {page}
                        </button>
                      );
                    })}

                    {/* Next */}
                    <button
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage((p) => p + 1)}
                      className="h-8 rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700
          hover:bg-blue-50 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>
      {isEditOpen && editRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-bold">
              Edit Equipment – {editRow.unit} / {editRow.station}
            </h2>

            <div className="grid grid-cols-2 gap-3 text-sm">
              {(Object.keys(editValues) as (keyof EquipmentStats)[]).map(
                (key) => (
                  <div key={key}>
                    <label className="block text-slate-600 uppercase">
                      {key}
                    </label>
                    <input
                      type="number"
                      value={editValues[key]}
                      onChange={(e) =>
                        setEditValues({
                          ...editValues,
                          [key]: Number(e.target.value),
                        })
                      }
                      className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1 focus:ring-4 focus:ring-blue-200"
                    />
                  </div>
                ),
              )}
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setIsEditOpen(false)}
                className="rounded-lg border px-4 py-2"
              >
                Cancel
              </button>
              <button
                onClick={saveEdit}
                className="rounded-lg bg-blue-600 px-4 py-2 text-white"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
