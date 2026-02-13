//overall ui within sector dashboard
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  itemsKey,
  loadStations,
  saveStations,
  getSession,
  clearSession,
} from "../../utils/storage";

import { MiniStat } from "../../components/UI";
import { supabase } from "../../lib/supabase";
import Swal from "sweetalert2";
import PpoGridLoader from "../../components/PpoGridLoader";
import { PPO_LOGOS, MIN_PIN_LENGTH } from "./constants";
import { SelectControl, SearchInput } from "./components/Filters";
import { hashPin } from "./security";
import { buildStationCards } from "./selectors";
import type { StationSort } from "./types";
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

  /**
   * Inventory items mirror Supabase rows.
   * Local state is a working copy for aggregation and filtering only.
   */
  const [items, setItems] = useState<any[]>([]);

  /**
   * UI state for filtering, sorting, and modal control.
   */
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<StationSort>("NAME_ASC");
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
  const [sessionActive, setSessionActive] = useState(false);
  const [activeSession, setActiveSession] = useState<{
    department: string;
    name: string;
    station?: string;
  } | null>(null);

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
      JSON.stringify({ department: dept, name, station: pendingStation }),
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
  const stationCards = useMemo(
    () => buildStationCards(stations, items, sector, q, sort),
    [stations, items, sector, q, sort],
  );

  /**
   * Aggregate metrics are derived from already-processed station cards
   * to avoid recomputing inventory-level calculations.
   */
  const totalSKUs = stationCards.reduce((s, c) => s + c.skus, 0);
  const totalUnits = stationCards.reduce((s, c) => s + c.units, 0);
  if (loading) return <PpoGridLoader logos={PPO_LOGOS} />;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-blue-50 text-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-slate-200/70 bg-white/80 backdrop-blur shadow-sm">
        <div className="max-w-[95rem] mx-auto px-4 xl:px-8 py-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => nav("/")}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white/80 px-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-white focus:outline-none focus:ring-4 focus:ring-blue-200"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path
                  d="M15 19l-7-7 7-7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Back to Sectors
            </button>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="inline-flex items-center rounded-full border border-slate-200 bg-white/70 px-3 py-1 text-[12px] font-semibold text-slate-700 shadow-sm">
                  <span className="h-2 w-2 rounded-full bg-blue-600 mr-2" />
                  {sector}
                </span>
                <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[12px] font-semibold text-blue-800">
                  Inventory
                </span>
              </div>
              <h1 className="text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">
                Manage Stations
              </h1>
            </div>
          </div>
          <button
            onClick={() => setShowNew(true)}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 text-sm font-semibold text-white shadow-md transition hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-blue-300"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path
                d="M12 5v14M5 12h14"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            New Station
          </button>
        </div>
      </header>

      {/* Filters & Summary */}
      <main className="max-w-[95rem] mx-auto px-4 xl:px-8 py-8">
        <div className="rounded-2xl border border-slate-200/70 bg-white/70 p-5 shadow-sm backdrop-blur mb-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1">
            <SearchInput
              value={q}
              onChange={setQ}
              placeholder="Search stations..."
            />
            <SelectControl
              value={sort}
              onChange={(v: string) => setSort(v as any)}
              ariaLabel="Sort stations"
            >
              <option value="NAME_ASC">Name (A–Z)</option>
              <option value="UNITS_DESC">Units (high → low)</option>
              <option value="SKUS_DESC">SKUs (high → low)</option>
            </SelectControl>
          </div>
          <div className="flex gap-3 flex-wrap">
            <MiniStat label="Stations" value={stationCards.length} />
            <MiniStat label="SKUs" value={totalSKUs} />
            <MiniStat label="Units" value={totalUnits} />
          </div>
        </div>

        {/* Station Cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {stationCards.map((card) => (
            <button
              key={card.name}
              onClick={() => {
                const existingSession = getSession();
                if (existingSession) {
                  setActiveSession(existingSession);
                  setSessionActive(true);
                  setPendingStation(card.name);
                } else {
                  setPendingStation(card.name);
                  setShowAccess(true);
                }
              }}
              className="group relative overflow-hidden rounded-2xl border border-slate-700/60 bg-gradient-to-br from-slate-800 via-slate-800 to-slate-900 p-5 text-left shadow-lg transition hover:-translate-y-0.5 hover:border-slate-500 hover:shadow-xl hover:ring-2 hover:ring-slate-600/60 focus:outline-none focus:ring-4 focus:ring-slate-600"
            >
              {/* Background glow effect */}
              <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-slate-700/30 blur-3xl transition group-hover:bg-slate-600/40" />

              <div className="relative z-10">
                {/* Station label and name */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                      Station
                    </div>
                    <div className="text-lg font-extrabold tracking-tight text-slate-100 mt-1">
                      {card.name}
                    </div>
                  </div>
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <div className="rounded-xl bg-slate-700/50 p-3 ring-1 ring-slate-600 transition group-hover:ring-slate-500">
                    <MiniStat label="SKUs" value={card.skus} />
                  </div>
                  <div className="rounded-xl bg-slate-700/50 p-3 ring-1 ring-slate-600 transition group-hover:ring-slate-500">
                    <MiniStat label="Units" value={card.units} />
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex gap-2 pt-3 border-t border-slate-700">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const existingSession = getSession();
                      if (existingSession) {
                        setActiveSession(existingSession);
                        setSessionActive(true);
                        setPendingStation(card.name);
                      } else {
                        setPendingStation(card.name);
                        setShowAccess(true);
                      }
                    }}
                    className="flex-1 px-3 py-2 rounded-lg bg-blue-600/80 text-white text-sm font-semibold transition hover:bg-blue-600 active:bg-blue-700"
                  >
                    Open
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteStation(card.name);
                    }}
                    className="flex-1 px-3 py-2 rounded-lg bg-slate-700/50 text-slate-200 text-sm font-semibold transition hover:bg-red-600/80 hover:text-white active:bg-red-700"
                  >
                    Delete
                  </button>
                </div>

                {/* Hover indicator */}
                <div className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-slate-200 opacity-0 transition group-hover:opacity-100">
                  View inventory
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
              </div>
            </button>
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
          className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowNew(false)}
        >
          <form
            onSubmit={createStation}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl border border-slate-200/50"
          >
            <h3 className="text-lg font-semibold text-slate-900 mb-1">
              Create New Station
            </h3>
            <p className="text-sm text-slate-600 mb-5">
              Add a new station to {sector}
            </p>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              autoFocus
              placeholder="Station name"
              className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-5"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowNew(false)}
                className="px-4 py-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 transition font-medium text-sm text-slate-700"
              >
                Cancel
              </button>
              <button className="px-4 py-2.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition font-medium text-sm">
                Create Station
              </button>
            </div>
          </form>
        </div>
      )}
      {showAccess && (
        <div
          className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowAccess(false)}
        >
          <div
            className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-slate-200/50"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-semibold text-slate-900 mb-1 text-lg">
              {isSignup ? "Create Department Access" : "Enter Station"}
            </h3>
            <p className="text-sm text-slate-600 mb-5">
              {isSignup
                ? "Create a new department account to access this station"
                : "Enter your department PIN to access this station"}
            </p>

            <input
              placeholder="Department"
              value={dept}
              onChange={(e) => setDept(e.target.value)}
              className="text-input w-full mb-3 px-4 py-2.5 rounded-xl"
            />

            {isSignup && (
              <input
                placeholder="Name (optional)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="text-input w-full mb-3 px-4 py-2.5 rounded-xl"
              />
            )}

            <input
              type="password"
              placeholder="PIN"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="text-input w-full mb-3 px-4 py-2.5 rounded-xl"
            />
            {isSignup && (
              <input
                type="password"
                placeholder="Confirm PIN"
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value)}
                className="text-input w-full mb-5 px-4 py-2.5 rounded-xl"
              />
            )}
            <div className="flex justify-between items-center gap-3 pt-3 border-t border-slate-200">
              <button
                onClick={() => setIsSignup((v) => !v)}
                className="text-xs text-blue-600 hover:text-blue-700 font-semibold transition"
              >
                {isSignup ? "← Back to Enter" : "Create Account →"}
              </button>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowAccess(false)}
                  className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 transition font-medium text-sm text-slate-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAccess}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition font-medium text-sm"
                >
                  {isSignup ? "Create Account" : "Enter"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Session Active Modal - Blocks access if user is already logged in */}
      {sessionActive && activeSession && (
        <div className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl border border-slate-200/50">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
                <svg
                  className="h-6 w-6 text-amber-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              </div>
              <h3 className="font-semibold text-slate-900 text-lg">
                Session Active
              </h3>
            </div>

            <p className="text-sm text-slate-600 mb-2">
              You are currently logged in as:
            </p>
            <div className="bg-slate-50 rounded-xl p-4 mb-5">
              <div className="text-sm font-medium text-slate-900">
                {activeSession.name || activeSession.department}
              </div>
              <div className="text-xs text-slate-500">
                Department: {activeSession.department}
              </div>
              {activeSession.station && (
                <div className="text-xs text-slate-500 mt-1">
                  Station: {activeSession.station}
                </div>
              )}
            </div>

            <p className="text-sm text-slate-600 mb-5">
              You must log out before accessing the Sector Dashboard.
            </p>

            <div className="flex flex-col gap-2">
              {activeSession.station && (
                <button
                  onClick={() => {
                    nav(
                      `/sector/${encodeURIComponent(sector)}/${encodeURIComponent(activeSession.station!)}`,
                    );
                  }}
                  className="w-full px-4 py-2.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition font-medium text-sm"
                >
                  Return to {activeSession.station}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
