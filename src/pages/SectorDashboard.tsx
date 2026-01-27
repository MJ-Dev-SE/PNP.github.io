import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { itemsKey, loadStations, saveStations, toNum } from "../utils/storage";
import { MiniStat } from "../components/UI";
import { supabase } from "../lib/supabase";
import Swal from "sweetalert2";
import PpoGridLoader from "../components/PpoGridLoader";

const PPO_LOGOS = [
  "/ppo/rhq.png", // 👈 RHQ
  "/ppo/rmfb4a.png", // 👈 RMFB4A
  "/ppo/ppo1.png",
  "/ppo/ppo2.png",
  "/ppo/ppo3.png",
  "/ppo/ppo4.png",
  "/ppo/ppo5.png",
];
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
  return (
    <div className="relative w-full">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-xl border border-slate-200 bg-white/80 pl-10 pr-3 text-sm text-slate-800 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-slate-300 focus:outline-none focus:ring-4 focus:ring-blue-200"
      />
    </div>
  );
}

export default function SectorDashboard() {
  /**
   * Routing context defines the active sector.
   * All station grouping and local persistence are scoped to this value.
   */
  const { sector = "" } = useParams();
  const nav = useNavigate();

  /**
   * Stations are treated as UI-level groupings.
   * They are initialized from localStorage to avoid DB dependency
   * and allow instant rendering on reload.
   */
  const [stations, setStations] = useState<string[]>(() =>
    loadStations(sector),
  );

  /**
   * Storage key is derived from sector to isolate data
   * between different dashboard contexts.
   */
  const STORAGE_KEY = itemsKey(sector);

  /**
   * Inventory items mirror Supabase rows.
   * Local state is a working copy for aggregation and filtering only.
   */
  const [items, setItems] = useState<any[]>([]);

  /**
   * UI state for filtering, sorting, and modal control.
   */
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<"NAME_ASC" | "UNITS_DESC" | "SKUS_DESC">(
    "NAME_ASC",
  );
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");

  const [showAccess, setShowAccess] = useState(false);
  const [pendingStation, setPendingStation] = useState<string | null>(null);

  const [dept, setDept] = useState("");
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [isSignup, setIsSignup] = useState(false);
  const [confirmPin, setConfirmPin] = useState("");
  const sleep = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));
  const [loading, setLoading] = useState(true);

  const MIN_PIN_LENGTH = 4;

  const hashPin = async (pin: string) => {
    const enc = new TextEncoder().encode(pin);
    const buf = await crypto.subtle.digest("SHA-256", enc);
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  };

  const handleAccess = async () => {
    if (!dept || !pin) {
      Swal.fire("Missing info", "Department and PIN required", "warning");
      return;
    }

    const pinHash = await hashPin(pin);

    const { data: rows, error: fetchError } = await supabase
      .from("inventory_access")
      .select("id, department, pin_hash")
      .eq("department", dept)
      .limit(1);

    if (fetchError) {
      console.error(fetchError);
      Swal.fire("Error", "Failed to check department", "error");
      return;
    }

    const existing = rows?.[0] ?? null;

    // 🆕 SIGNUP MODE
    if (isSignup) {
      if (pin.length < MIN_PIN_LENGTH) {
        Swal.fire(
          "Weak PIN",
          `PIN must be at least ${MIN_PIN_LENGTH} digits.`,
          "warning",
        );
        return;
      }

      if (pin !== confirmPin) {
        Swal.fire("PIN mismatch", "PIN and Confirm PIN do not match.", "error");
        return;
      }

      if (existing) {
        Swal.fire(
          "Department exists",
          "This department already has a PIN. Please use Enter.",
          "info",
        );
        return;
      }

      const { error: insertError } = await supabase
        .from("inventory_access")
        .insert({
          department: dept,
          name,
          pin_hash: pinHash,
        });

      if (insertError) {
        console.error(insertError);
        Swal.fire(
          "Signup failed",
          insertError.message || "Unable to create account",
          "error",
        );
        return;
      }

      // ✅ SIGNUP SUCCESS → RESET TO ENTER MODE
      await Swal.fire(
        "Account created",
        "Department PIN created. Please enter your PIN to continue.",
        "success",
      );

      setIsSignup(false);
      setPin("");
      setConfirmPin("");
      setName("");

      return; // ⛔ STOP HERE — NO AUTO LOGIN
    }

    // 🔐 ENTER MODE
    if (!existing || existing.pin_hash !== pinHash) {
      Swal.fire("Invalid PIN", "Access denied", "error");
      return;
    }

    // ✅ ENTER SUCCESS → SAVE SESSION & NAVIGATE
    localStorage.setItem(
      "inventory_session",
      JSON.stringify({ department: dept, name }),
    );

    setShowAccess(false);
    setDept("");
    setName("");
    setPin("");
    setConfirmPin("");

    nav(
      `/sector/${encodeURIComponent(sector)}/${encodeURIComponent(
        pendingStation!,
      )}`,
    );
  };

  /**
   * Re-sync stations when sector changes.
   * This prevents station bleed between routes.
   */
  useEffect(() => {
    setStations(loadStations(sector));
  }, [sector]);

  /**
   * Fetch inventory once on mount.
   * Supabase is the single source of truth for inventory data.
   */
  useEffect(() => {
    const fetchItems = async () => {
      setLoading(true);

      const MIN_LOADING_TIME = 2500; // 👈 5 seconds
      const start = Date.now();

      try {
        const { data, error } = await supabase
          .from("station_inventory")
          .select("*")
          .eq("sector", sector); // 👈 CRITICAL FIX
        if (error) {
          console.error("Error fetching inventory:", error);
          return;
        }

        setItems(data ?? []);
        // 🔑 sync Dashboard cache
        if (data?.length) {
          localStorage.setItem(itemsKey(sector), JSON.stringify(data));
        }
      } finally {
        const elapsed = Date.now() - start;

        if (elapsed < MIN_LOADING_TIME) {
          await sleep(MIN_LOADING_TIME - elapsed);
        }

        setLoading(false); // ✅ ONLY HERE
      }
    };

    fetchItems();
  }, [sector]);

  /**
   * Persist station structure locally.
   * Inventory is intentionally excluded from this responsibility.
   */
  useEffect(() => {
    saveStations(sector, stations);
  }, [sector, stations]);

  /**
   * Cache inventory snapshot locally for fast reloads.
   * This does not replace Supabase as the authoritative source.
   */
  useEffect(() => {
    setItems([]); // clear previous sector inventory
  }, [sector]);

  /**
   * Station creation modifies only local UI structure.
   * Inventory rows reference stations implicitly by name.
   */
  const createStation = (e: FormEvent) => {
    e.preventDefault();

    const name = newName.trim();
    if (!name) return;

    if (stations.some((s) => s.toLowerCase() === name.toLowerCase())) {
      alert("Station already exists in this sector.");
      return;
    }

    setStations((prev) => [...prev, name]);
    setShowNew(false);
    setNewName("");
  };

  /**
   * Station deletion is a controlled UI operation.
   * Inventory rows are filtered in memory to maintain consistency
   * without performing destructive DB actions.
   */
  const deleteStation = async (name: string) => {
    const result = await Swal.fire({
      title: `Delete station "${name}"?`,
      text: "This will delete all items under this station.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete it!",
      cancelButtonText: "Cancel",
    });

    if (!result.isConfirmed) return;

    setStations((prev) => prev.filter((s) => s !== name));
    setItems((prev) => prev.filter((i) => (i.station || "") !== name));

    await Swal.fire({
      icon: "success",
      title: "Deleted!",
      text: `Station "${name}" has been deleted.`,
      confirmButtonText: "OK",
    });
  };

  /**
   * Derives station-level summaries from flat inventory data.
   * This transformation layer keeps rendering logic simple
   * and avoids mutating source data.
   */
  const stationCards = useMemo(() => {
    return stations
      .map((name) => {
        const list = items.filter(
          (i) =>
            (i.station || "").trim() === name.trim() &&
            (i.sector || "").trim() === sector,
        );

        const skus = list.length;

        const units = list.reduce(
          (sum, i) =>
            sum +
            toNum(i?.status_uns) +
            toNum(i?.status_svc) +
            toNum(i?.status_ber),
          0,
        );

        return { name, skus, units };
      })
      .filter((c) => c.name.toLowerCase().includes(q.trim().toLowerCase()))
      .sort((a, b) => {
        if (sort === "NAME_ASC") return a.name.localeCompare(b.name);
        if (sort === "UNITS_DESC") return b.units - a.units;
        if (sort === "SKUS_DESC") return b.skus - a.skus;
        return 0;
      });
  }, [stations, items, q, sort]);

  /**
   * Aggregate metrics are derived from already-processed station cards
   * to avoid recomputing inventory-level calculations.
   */
  const totalSKUs = stationCards.reduce((s, c) => s + c.skus, 0);
  const totalUnits = stationCards.reduce((s, c) => s + c.units, 0);
  if (loading) return <PpoGridLoader logos={PPO_LOGOS} />;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-slate-50 to-blue-50 text-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-slate-200/70 bg-white/70 backdrop-blur shadow-sm">
        <div className="max-w-[95rem] mx-auto px-4 xl:px-8 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => nav("/")}
              className="px-4 py-2 rounded-xl bg-white border border-slate-200 hover:shadow-md transition text-sm font-medium"
            >
              ← Sectors
            </button>
            <h1 className="text-2xl font-bold tracking-tight truncate">
              {sector} — Stations
            </h1>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setShowNew(true)}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-medium shadow-md hover:shadow-lg transition"
            >
              + New Station
            </button>
          </div>
        </div>
      </header>

      {/* Filters & Summary */}
      <main className="max-w-[95rem] mx-auto px-4 xl:px-8 py-8">
        <div className="rounded-2xl border border-slate-200/70 bg-white/70 p-4 shadow-sm backdrop-blur mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <Input value={q} onChange={setQ} placeholder="Search stations..." />

            <Select
              value={sort}
              onChange={(v: string) => setSort(v as any)}
              aria-label="Sort stations"
            >
              <option value="NAME_ASC">Name (A–Z)</option>
              <option value="UNITS_DESC">Units (high → low)</option>
              <option value="SKUS_DESC">SKUs (high → low)</option>
            </Select>
          </div>
          <div className="flex gap-4 mt-3 sm:mt-0">
            <MiniStat label="Stations" value={stationCards.length} />
            <MiniStat label="Total SKUs" value={totalSKUs} />
            <MiniStat label="Total Units" value={totalUnits} />
          </div>
        </div>

        {/* Station Cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
          {stationCards.map((card) => (
            <div
              key={card.name}
              className="group relative p-6 bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl transition-all"
            >
              <div className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold mb-2">
                Station
              </div>
              <div className="text-xl font-bold mb-4 group-hover:text-blue-700 transition">
                {card.name}
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <MiniStat label="SKUs" value={card.skus} />
                <MiniStat label="Units" value={card.units} />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setPendingStation(card.name);
                    setShowAccess(true);
                  }}
                  className="px-3 py-2 rounded-lg bg-white border border-slate-200"
                >
                  Open
                </button>

                <button
                  onClick={() => deleteStation(card.name)}
                  className="px-3 py-2 rounded-lg bg-white border border-slate-200 hover:bg-red-50 hover:text-red-600 transition text-sm"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}

          {stationCards.length === 0 && (
            <div className="col-span-full text-slate-500 text-center py-10">
              No stations yet.
            </div>
          )}
        </div>
      </main>

      {/* Create Station Modal */}
      {showNew && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowNew(false)}
        >
          <form
            onSubmit={createStation}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl"
          >
            <h3 className="text-lg font-semibold mb-4">
              Create Station — {sector}
            </h3>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              autoFocus
              placeholder="Station name"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex justify-end gap-2 mt-5">
              <button
                type="button"
                onClick={() => setShowNew(false)}
                className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 transition"
              >
                Cancel
              </button>
              <button className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition">
                Create
              </button>
            </div>
          </form>
        </div>
      )}
      {showAccess && (
        <div
          className="fixed inset-0 bg-black/30 flex items-center justify-center"
          onClick={() => setShowAccess(false)}
        >
          <div
            className="bg-white rounded-xl p-5 w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-semibold mb-3">
              {isSignup ? "New / Signup Department" : "Enter Department PIN"}
            </h3>

            <input
              placeholder="Department"
              value={dept}
              onChange={(e) => setDept(e.target.value)}
              className="text-input w-full mb-2"
            />

            {isSignup && (
              <input
                placeholder="Name (optional)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="text-input w-full mb-2"
              />
            )}

            <input
              type="password"
              placeholder="PIN"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="text-input w-full mb-4"
            />
            {isSignup && (
              <input
                type="password"
                placeholder="Confirm PIN"
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value)}
                className="text-input w-full mb-4"
              />
            )}
            <div className="flex justify-between items-center gap-2">
              <button
                onClick={() => setIsSignup((v) => !v)}
                className="text-xs text-blue-600 hover:underline"
              >
                {isSignup ? "Back to Enter" : "New / Signup"}
              </button>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowAccess(false)}
                  className="soft-btn px-3 py-1"
                >
                  Cancel
                </button>
                <button onClick={handleAccess} className="solid-btn px-3 py-1">
                  {isSignup ? "Create" : "Enter"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
