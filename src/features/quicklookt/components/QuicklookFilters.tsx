//filtering and searching
import { TYPE_CONFIG, type TypeParent } from "../model";

type QuicklookFiltersProps = {
  search: string;
  onSearchChange: (value: string) => void;
  onClearSearch: () => void;
  ppo: string;
  ppos: string[];
  onPpoChange: (value: string) => void;
  station: string;
  stations: string[];
  onStationChange: (value: string) => void;
  selectedType: TypeParent | "All";
  onSelectedTypeChange: (value: TypeParent | "All") => void;
  selectedChild: string;
  onSelectedChildChange: (value: string) => void;
};

export function QuicklookFilters({
  search,
  onSearchChange,
  onClearSearch,
  ppo,
  ppos,
  onPpoChange,
  station,
  stations,
  onStationChange,
  selectedType,
  onSelectedTypeChange,
  selectedChild,
  onSelectedChildChange,
}: QuicklookFiltersProps) {
  return (
    <section className="rounded-2xl border border-slate-200/70 bg-white/70 p-4 shadow-sm backdrop-blur">
      <div className="grid gap-3 md:grid-cols-3">
        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search serial, model, name, station..."
            className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-3 pr-10 text-sm shadow-sm focus:ring-4 focus:ring-blue-200"
          />

          {search && (
            <button
              type="button"
              onClick={onClearSearch}
              className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer text-slate-400 hover:text-slate-700"
              aria-label="Clear search"
            >
              x
            </button>
          )}
        </div>

        <select
          value={ppo}
          onChange={(e) => onPpoChange(e.target.value)}
          className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm shadow-sm focus:ring-4 focus:ring-blue-200"
        >
          {ppos.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>

        <select
          value={station}
          onChange={(e) => onStationChange(e.target.value)}
          className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm shadow-sm focus:ring-4 focus:ring-blue-200"
        >
          {stations.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>

        <select
          value={selectedType}
          onChange={(e) =>
            onSelectedTypeChange(
              (e.target.value as TypeParent | "All") ?? "All",
            )
          }
          className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm shadow-sm"
        >
          <option value="All">All Types</option>
          {Object.keys(TYPE_CONFIG).map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>

        <select
          value={selectedChild}
          disabled={selectedType === "All"}
          onChange={(e) => onSelectedChildChange(e.target.value)}
          className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm shadow-sm disabled:opacity-50"
        >
          <option value="All">All</option>
          {selectedType !== "All" &&
            TYPE_CONFIG[selectedType].children.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
        </select>
      </div>
    </section>
  );
}
