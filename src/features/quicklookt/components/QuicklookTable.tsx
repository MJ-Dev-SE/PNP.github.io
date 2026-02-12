//table datas, and effects like the color in status
import type { ReactNode } from "react";
import {
  DISPOSITION_OPTIONS,
  ISSUANCE_OPTIONS,
  STATUS_OPTIONS,
} from "../constants";
import type { InventoryItem } from "../model";

type EditingCell = {
  id: number;
  field: keyof InventoryItem;
} | null;

type QuicklookTableProps = {
  equipmentTitle: string;
  exportToExcel: () => void;
  onShowSummary: () => void;
  paginatedRows: InventoryItem[];
  search: string;
  highlightText: (text: string, query: string) => ReactNode;
  editingCell: EditingCell;
  inlineValue: string;
  setInlineValue: (value: string) => void;
  handleInlineBlur: (item: InventoryItem, field: keyof InventoryItem) => void;
  saveInlineEdit: (
    item: InventoryItem,
    field: keyof InventoryItem,
    value: string,
  ) => void | Promise<void>;
  cancelInlineEdit: () => void;
  handleValidationClick: (item: InventoryItem) => void;
  onEdit: (item: InventoryItem) => void;
  onDelete: (item: InventoryItem) => void | Promise<void>;
  isFiltered: boolean;
  totalRows: number;
  totalPages: number;
  currentPage: number;
  setCurrentPage: (value: number | ((prev: number) => number)) => void;
  rowsLength: number;
};

export function QuicklookTable({
  equipmentTitle,
  exportToExcel,
  onShowSummary,
  paginatedRows,
  search,
  highlightText,
  editingCell,
  inlineValue,
  setInlineValue,
  handleInlineBlur,
  saveInlineEdit,
  cancelInlineEdit,
  handleValidationClick,
  onEdit,
  onDelete,
  isFiltered,
  totalRows,
  totalPages,
  currentPage,
  setCurrentPage,
  rowsLength,
}: QuicklookTableProps) {
  return (
    <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200/70 bg-white/80 shadow-sm">
      <div className="border-b bg-gradient-to-r from-blue-700 to-blue-600 px-4 py-3 text-sm font-semibold text-white flex items-center justify-between backdrop-blur">
        <span>{equipmentTitle}</span>

        <div className="flex gap-2">
          <button
            onClick={exportToExcel}
            className="rounded-lg border border-white/30 px-4 py-1.5 text-sm font-semibold text-white hover:bg-white/10"
          >
            Export Excel
          </button>

          <button
            onClick={onShowSummary}
            className="rounded-lg border border-white/30 px-4 py-1.5 text-sm font-semibold text-white hover:bg-white/10"
          >
            View Summary
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10">
            <tr className="bg-slate-50 text-slate-600 uppercase text-xs tracking-wide">
              <th className="px-3 py-2">PPO / UNIT</th>
              <th className="px-3 py-2">Serial No.</th>
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2">Make</th>
              <th className="px-3 py-2">Model</th>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Disposition</th>
              <th className="px-3 py-2">Issuance</th>
              <th className="px-3 py-2">Validated</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>

          <tbody>
            {paginatedRows.map((r) => (
              <tr
                key={r.id}
                className="border-t border-slate-100 hover:bg-blue-50/40 transition-colors"
              >
                <td className="px-3 py-3 font-semibold text-slate-800">
                  <div className="leading-tight">
                    {highlightText(`${r.ppo}`, search)}
                    <div className="text-xs text-slate-500">
                      {highlightText(r.station, search)}
                    </div>
                  </div>
                </td>

                <td className="px-3 py-2 text-center">{r.serialNumber}</td>

                <td className="px-3 py-2 text-center">
                  {highlightText(r.typeChild, search)}
                </td>

                <td className="px-3 py-2 text-center">
                  <div className="text-xs text-slate-500">
                    {highlightText(r.makeChild, search)}
                  </div>
                </td>

                <td className="px-3 py-2 text-center">
                  {editingCell?.id === r.id && editingCell.field === "model" ? (
                    <input
                      autoFocus
                      className="rounded border px-2 py-1 text-xs w-full"
                      value={inlineValue}
                      onChange={(e) => setInlineValue(e.target.value)}
                      onBlur={() => handleInlineBlur(r, "model")}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          void saveInlineEdit(r, "model", inlineValue);
                        }

                        if (e.key === "Escape") {
                          cancelInlineEdit();
                        }
                      }}
                    />
                  ) : (
                    <span>{r.model || "-"}</span>
                  )}
                </td>

                <td className="px-3 py-2 text-center">
                  {editingCell?.id === r.id && editingCell.field === "name" ? (
                    <input
                      autoFocus
                      className="rounded border px-2 py-1 text-xs w-full"
                      value={inlineValue}
                      onChange={(e) => setInlineValue(e.target.value)}
                      onBlur={() => handleInlineBlur(r, "name")}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          void saveInlineEdit(r, "name", inlineValue);
                        }

                        if (e.key === "Escape") {
                          cancelInlineEdit();
                        }
                      }}
                    />
                  ) : (
                    <span>{r.name || "-"}</span>
                  )}
                </td>

                <td className="px-3 py-2 text-center">
                  {editingCell?.id === r.id &&
                  editingCell.field === "status" ? (
                    <select
                      autoFocus
                      className="rounded border px-2 py-1 text-xs"
                      value={inlineValue}
                      onChange={(e) => setInlineValue(e.target.value)}
                      onBlur={() => handleInlineBlur(r, "status")}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          void saveInlineEdit(r, "status", inlineValue);
                        }

                        if (e.key === "Escape") {
                          cancelInlineEdit();
                        }
                      }}
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        r.status === "SERVICEABLE"
                          ? "bg-green-100 text-green-700"
                          : r.status === "UNSERVICEABLE"
                            ? "bg-red-100 text-red-700"
                            : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {r.status}
                    </span>
                  )}
                </td>

                <td className="px-3 py-2 text-center">
                  {editingCell?.id === r.id &&
                  editingCell.field === "disposition" ? (
                    <select
                      autoFocus
                      className="rounded border px-2 py-1 text-xs"
                      value={inlineValue}
                      onChange={(e) => setInlineValue(e.target.value)}
                      onBlur={() => handleInlineBlur(r, "disposition")}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          void saveInlineEdit(r, "disposition", inlineValue);
                        }

                        if (e.key === "Escape") {
                          cancelInlineEdit();
                        }
                      }}
                    >
                      {DISPOSITION_OPTIONS.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span title="Auto-updated based on status">
                      {r.disposition}
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 text-center">
                  {editingCell?.id === r.id &&
                  editingCell.field === "issuanceType" ? (
                    <select
                      autoFocus
                      className="rounded border px-2 py-1 text-xs"
                      value={inlineValue}
                      onChange={(e) => setInlineValue(e.target.value)}
                      onBlur={() => handleInlineBlur(r, "issuanceType")}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          void saveInlineEdit(r, "issuanceType", inlineValue);
                        }

                        if (e.key === "Escape") {
                          cancelInlineEdit();
                        }
                      }}
                    >
                      {ISSUANCE_OPTIONS.map((i) => (
                        <option key={i} value={i}>
                          {i}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span>{r.issuanceType}</span>
                  )}
                </td>
                <td className="px-3 py-2 text-center">
                  <button
                    onClick={() => handleValidationClick(r)}
                    className="text-lg font-bold hover:scale-110 transition"
                    title="Click to validate (login required)"
                  >
                    <span
                      className={`inline-flex items-center justify-center rounded-full w-6 h-6 text-sm font-bold ${
                        r.validated
                          ? "bg-green-600 text-white"
                          : "bg-slate-300 text-slate-600"
                      }`}
                    >
                      {r.validated ? (
                        <span
                          title={`Validated at ${new Date(r.validatedAt!).toLocaleString()}`}
                        >
                          v
                        </span>
                      ) : (
                        "-"
                      )}
                    </span>
                  </button>
                </td>

                <td className="px-3 py-2 text-center">
                  <button
                    className="rounded-md px-2 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                    onClick={() => onEdit(r)}
                  >
                    Edit
                  </button>
                  <button
                    className="ml-2 rounded-md px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-100"
                    onClick={() => void onDelete(r)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {paginatedRows.length === 0 && (
              <tr>
                <td
                  colSpan={11}
                  className="px-3 py-6 text-center text-slate-500"
                >
                  No matching records found.
                </td>
              </tr>
            )}

            {isFiltered && (
              <tr className="border-t bg-slate-200 font-bold text-xs">
                <td className="px-3 py-2">TOTAL ({totalRows})</td>
              </tr>
            )}
          </tbody>
        </table>
        {totalPages > 1 && (
          <div className="border-t bg-slate-50/70 px-4 py-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-sm">
              <div className="text-slate-600 text-xs sm:text-sm">
                Page <b>{currentPage}</b> of <b>{totalPages}</b> ({rowsLength}{" "}
                records)
              </div>

              <div className="flex items-center gap-1">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                  className="h-8 rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-blue-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Prev
                </button>

                {Array.from({ length: totalPages }).map((_, i) => {
                  const page = i + 1;
                  return (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`h-8 min-w-[2rem] rounded-md border text-xs font-semibold transition ${
                        currentPage === page
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-white text-slate-700 border-slate-300 hover:bg-blue-50"
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}

                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => p + 1)}
                  className="h-8 rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-blue-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
