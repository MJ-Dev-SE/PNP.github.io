import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import PpoGridLoader from "../components/PpoGridLoader";
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

function InlineCell({ value }: { value: number }) {
  return <span className="w-full px-1 text-center">{value}</span>;
}

export default function QuicklookInventory() {
  const nav = useNavigate();
  const { rows: ppoRows, loading } = useQuicklookData();
  const [ppo, setPpo] = useState(ALL_PPOS);
  const [type, setType] = useState(ALL_TYPES);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

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
                  <th className="px-3 py-2 text-center">ASDA</th>
                  <th className="px-3 py-2 text-center">ASD</th>
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
                  const makeTotal = equipment.asda + equipment.asd;

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
                        <InlineCell value={equipment.asda} />
                      </td>
                      <td className="px-3 py-2 text-center">
                        <InlineCell value={equipment.asd} />
                      </td>
                      <td className="bg-slate-50 px-3 py-2 text-center font-semibold">
                        {makeTotal}
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
