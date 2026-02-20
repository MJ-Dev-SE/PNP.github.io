import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import PpoGridLoader from "../components/PpoGridLoader";
import { supabase } from "../lib/supabase";
import {
  ALL_PPOS,
  ALL_TYPES,
  ITEMS_PER_PAGE,
  PPO_LOGOS,
} from "../features/quicklook/constants";
import { useQuicklookData } from "../features/quicklook/hooks";
import {
  filterRows,
  getPpoOptions,
  getTypeOptions,
} from "../features/quicklook/selectors";
import type { QuicklookRow } from "../features/quicklook/types";

type StatusBucket = "svc" | "uns" | "ber";
type SourceBucket = "organic" | "donated" | "loaned";
type EditableField = "status" | "source";

const STATUS_LABEL: Record<StatusBucket, string> = {
  svc: "SVC",
  uns: "UNSVC",
  ber: "BER",
};

const SOURCE_LABEL: Record<SourceBucket, string> = {
  organic: "ORGANIC",
  donated: "DONATED",
  loaned: "LOANED",
};

function InlineCell({
  value,
  interactive = false,
  onClick,
}: {
  value: number;
  interactive?: boolean;
  onClick?: () => void;
}) {
  if (interactive && onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="w-full rounded px-1 text-center text-blue-700 underline-offset-2 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-300"
        title="Click to select row to update"
      >
        {value}
      </button>
    );
  }

  return <span className="w-full px-1 text-center">{value}</span>;
}

export default function QuicklookInventory() {
  const nav = useNavigate();
  const { rows: ppoRows, loading, refresh } = useQuicklookData();
  const [ppo, setPpo] = useState(ALL_PPOS);
  const [type, setType] = useState(ALL_TYPES);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [updatingKey, setUpdatingKey] = useState<string | null>(null);

  useEffect(() => {
    setCurrentPage(1);
  }, [ppo, type, search]);

  const ppos = useMemo(() => getPpoOptions(ppoRows), [ppoRows]);
  const types = useMemo(() => getTypeOptions(ppoRows), [ppoRows]);
  const rows = useMemo(
    () => filterRows(ppoRows, ppo, type, search),
    [ppoRows, ppo, type, search],
  );

  const totalPages = Math.max(1, Math.ceil(rows.length / ITEMS_PER_PAGE));

  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return rows.slice(start, start + ITEMS_PER_PAGE);
  }, [rows, currentPage]);

  const rowKey = (row: QuicklookRow) =>
    `${row.sector}::${row.station}::${row.type}`;

  const updateFromBucket = async (
    row: QuicklookRow,
    field: EditableField,
    fromValue: StatusBucket | SourceBucket,
  ) => {
    const key = `${rowKey(row)}::${field}::${fromValue}`;
    if (updatingKey === key) return;
    setUpdatingKey(key);

    try {
      const isStatus = field === "status";
      const labelMap = isStatus ? STATUS_LABEL : SOURCE_LABEL;
      const fromLabel = labelMap[fromValue as keyof typeof labelMap];

      const targetOptions = (isStatus
        ? (["svc", "uns", "ber"] as StatusBucket[])
        : (["organic", "donated", "loaned"] as SourceBucket[])
      )
        .filter((value) => value !== fromValue)
        .map((value) => ({
          value,
          label: labelMap[value as keyof typeof labelMap],
        }));

      const targetResult = await Swal.fire({
        title: `Change ${fromLabel}`,
        text: `Select target value for ${row.sector} / ${row.station} / ${row.type}.`,
        input: "select",
        inputOptions: Object.fromEntries(
          targetOptions.map((option) => [option.value, option.label]),
        ),
        inputPlaceholder: "Select target",
        showCancelButton: true,
        confirmButtonText: "Next",
        inputValidator: (value) =>
          !value ? "Please select target value." : undefined,
      });

      if (!targetResult.isConfirmed || !targetResult.value) return;

      const targetValue = String(targetResult.value);
      const targetLabel = labelMap[targetValue as keyof typeof labelMap];

      const { data: candidates, error: fetchError } = await supabase
        .from("cstation_inventory")
        .select("id, serial_no, make, status, source")
        .eq("sector", row.sector)
        .eq("station", row.station)
        .eq("type", row.type)
        .eq(field, fromValue)
        .order("serial_no", { ascending: true });

      if (fetchError) {
        await Swal.fire("Failed", fetchError.message, "error");
        return;
      }

      if (!candidates || candidates.length === 0) {
        await Swal.fire(
          "No row found",
          `No ${fromLabel} row is available to update.`,
          "info",
        );
        return;
      }

      const inputOptions = Object.fromEntries(
        candidates.map((candidate: any, index: number) => [
          candidate.id,
          `${index + 1}. SN: ${candidate.serial_no || "N/A"} | Make: ${candidate.make || "N/A"}`,
        ]),
      );

      const result = await Swal.fire({
        title: `Select ${fromLabel} row`,
        text: `Pick one row under ${row.sector} / ${row.station} / ${row.type} to change to ${targetLabel}.`,
        input: "select",
        inputOptions,
        inputPlaceholder: "Select a row",
        showCancelButton: true,
        confirmButtonText: `Change to ${targetLabel}`,
        inputValidator: (value) =>
          !value ? "Please select a row." : undefined,
      });

      if (!result.isConfirmed || !result.value) {
        return;
      }

      const selectedId = String(result.value);
      const { error: updateError } = await supabase
        .from("cstation_inventory")
        .update({ [field]: targetValue })
        .eq("id", selectedId);

      if (updateError) {
        await Swal.fire("Update failed", updateError.message, "error");
        return;
      }

      await refresh();
      await Swal.fire("Updated", `Selected row is now ${targetLabel}.`, "success");
    } finally {
      setUpdatingKey(null);
    }
  };

  const openEditFlow = async (row: QuicklookRow) => {
    const equipment = row.equipments.all;

    type BucketOption = {
      key: string;
      label: string;
      field: EditableField;
      from: StatusBucket | SourceBucket;
      count: number;
    };

    const allBucketOptions: BucketOption[] = [
      {
        key: "status:svc",
        label: "Status SVC",
        field: "status",
        from: "svc",
        count: equipment.svc,
      },
      {
        key: "status:uns",
        label: "Status UNSVC",
        field: "status",
        from: "uns",
        count: equipment.unsvc,
      },
      {
        key: "status:ber",
        label: "Status BER",
        field: "status",
        from: "ber",
        count: equipment.ber,
      },
      {
        key: "source:organic",
        label: "Source ORGANIC",
        field: "source",
        from: "organic",
        count: equipment.organic,
      },
      {
        key: "source:donated",
        label: "Source DONATED",
        field: "source",
        from: "donated",
        count: equipment.donated,
      },
      {
        key: "source:loaned",
        label: "Source LOANED",
        field: "source",
        from: "loaned",
        count: equipment.loaned,
      },
    ];

    const bucketOptions = allBucketOptions.filter((option) => option.count > 0);

    if (bucketOptions.length === 0) {
      await Swal.fire("No editable bucket", "No rows available to modify.", "info");
      return;
    }

    const pickBucket = await Swal.fire({
      title: "Edit row bucket",
      text: "Choose which count bucket to edit.",
      input: "select",
      inputOptions: Object.fromEntries(
        bucketOptions.map((option) => [option.key, `${option.label} (${option.count})`]),
      ),
      inputPlaceholder: "Select bucket",
      showCancelButton: true,
      confirmButtonText: "Next",
      inputValidator: (value) => (!value ? "Please select bucket." : undefined),
    });

    if (!pickBucket.isConfirmed || !pickBucket.value) return;

    const selected = bucketOptions.find((option) => option.key === pickBucket.value);
    if (!selected) return;

    await updateFromBucket(row, selected.field, selected.from);
  };

  const highlightText = (text: string, query: string) => {
    if (!query) return text;

    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(${escaped})`, "gi");
    const parts = text.split(regex);

    return parts.map((part, index) => {
      if (part.toLowerCase() === query.toLowerCase()) {
        return (
          <mark key={`${part}-${index}`} className="rounded bg-yellow-200 px-1">
            {part}
          </mark>
        );
      }
      return <span key={`${part}-${index}`}>{part}</span>;
    });
  };

  if (loading) return <PpoGridLoader logos={PPO_LOGOS} />;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-slate-100 to-blue-50 text-slate-900">
      <header className="sticky top-0 z-10 border-b border-slate-200/70 bg-white/70 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[95rem] items-center justify-between px-4 py-4 xl:px-8">
          <div className="min-w-0">
            <h1 className="text-xl font-extrabold tracking-tight text-slate-900">
              Quicklook Inventory
            </h1>
            <p className="text-sm text-slate-600">
              Quick status overview of firearms
            </p>
          </div>
          <button
            onClick={() => nav(-1)}
            className="h-10 rounded-xl border border-slate-200 bg-white/80 px-4 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-white focus:outline-none focus:ring-4 focus:ring-blue-200"
          >
            Back
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-[95rem] px-4 py-8 xl:px-8">
        <section className="rounded-2xl border border-slate-200/70 bg-white/70 p-4 shadow-sm backdrop-blur">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="relative">
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search..."
                className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-3 pr-10 text-sm shadow-sm focus:ring-4 focus:ring-blue-200"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer text-slate-400 hover:text-slate-700"
                  aria-label="Clear search"
                >
                  x
                </button>
              )}
            </div>

            <select
              value={ppo}
              onChange={(event) => setPpo(event.target.value)}
              className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm shadow-sm focus:ring-4 focus:ring-blue-200"
            >
              {ppos.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>

            <select
              value={type}
              onChange={(event) => setType(event.target.value)}
              className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm shadow-sm focus:ring-4 focus:ring-blue-200"
            >
              {types.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>
        </section>

        <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200/70 bg-white/80 shadow-sm">
          <div className="flex items-center justify-between border-b bg-gradient-to-r from-blue-700 to-blue-600 px-4 py-3 text-sm font-semibold text-white backdrop-blur">
            STATUS OF EQUIPMENTS
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
                  <th rowSpan={2} className="px-4 py-2 text-left">
                    PPO / UNIT
                  </th>
                  <th colSpan={4} className="px-4 py-2 text-center">
                    STATUS
                  </th>
                  <th colSpan={4} className="px-4 py-2 text-center">
                    SOURCE
                  </th>
                  <th rowSpan={2} className="px-3 py-2 text-center">
                    Actions
                  </th>
                </tr>
                <tr className="border-t bg-white text-xs text-slate-500">
                  <th className="px-3 py-2 text-center">SVC</th>
                  <th className="px-3 py-2 text-center">UNSVC</th>
                  <th className="px-3 py-2 text-center">BER</th>
                  <th className="px-3 py-2 text-center">TOTAL</th>
                  <th className="px-3 py-2 text-center">ORGANIC</th>
                  <th className="px-3 py-2 text-center">DONATED</th>
                  <th className="px-3 py-2 text-center">LOANED</th>
                  <th className="px-3 py-2 text-center">TOTAL</th>
                </tr>
              </thead>
              <tbody>
                {paginatedRows.map((row) => {
                  const equipment = row.equipments.all;
                  const statusTotal =
                    equipment.svc + equipment.unsvc + equipment.ber;
                  const sourceTotal =
                    equipment.organic + equipment.donated + equipment.loaned;

                  return (
                    <tr
                      key={`${row.sector}-${row.station}-${row.type}`}
                      className="border-t border-slate-100 transition-colors hover:bg-slate-50/40"
                    >
                      <td className="px-4 py-3 font-semibold text-slate-800">
                        <div className="leading-tight">
                          {highlightText(row.sector, search)}
                        </div>
                        <div className="leading-tight text-slate-500">
                          {highlightText(row.station, search)}
                        </div>
                        <div className="leading-tight">
                          {highlightText(row.type, search)}
                        </div>
                      </td>

                      <td className="px-3 py-2 text-center">
                        <InlineCell value={equipment.svc} />
                      </td>
                      <td className="px-3 py-2 text-center">
                        <InlineCell value={equipment.unsvc} />
                      </td>
                      <td className="px-3 py-2 text-center">
                        <InlineCell value={equipment.ber} />
                      </td>
                      <td className="px-3 py-2 text-center font-bold">
                        {statusTotal}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <InlineCell value={equipment.organic} />
                      </td>
                      <td className="px-3 py-2 text-center">
                        <InlineCell value={equipment.donated} />
                      </td>
                      <td className="px-3 py-2 text-center">
                        <InlineCell value={equipment.loaned} />
                      </td>

                      <td className="bg-slate-50 px-3 py-2 text-center font-semibold">
                        {sourceTotal}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => void openEditFlow(row)}
                          className="rounded-md border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {totalPages > 1 && (
              <div className="border-t bg-slate-50/70 px-4 py-3">
                <div className="flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-xs text-slate-600 sm:text-sm">
                    Page <b>{currentPage}</b> of <b>{totalPages}</b> (
                    {rows.length} records)
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage((prev) => prev - 1)}
                      className="h-8 rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Prev
                    </button>

                    {Array.from({ length: totalPages }).map((_, index) => {
                      const page = index + 1;
                      return (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`h-8 min-w-[2rem] rounded-md border text-xs font-semibold transition ${
                            currentPage === page
                              ? "border-slate-900 bg-slate-900 text-white"
                              : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          {page}
                        </button>
                      );
                    })}

                    <button
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage((prev) => prev + 1)}
                      className="h-8 rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
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
    </div>
  );
}
