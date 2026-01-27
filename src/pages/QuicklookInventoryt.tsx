import { useMemo, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createClient } from "@supabase/supabase-js";
import Swal from "sweetalert2";
import PpoGridLoader from "../components/PpoGridLoader";
import * as XLSX from "xlsx";

const TYPE_CONFIG = {
  "Long FAS": {
    equipmentKey: "long",
    children: ["GALIL", "MTAN", "M4A1"],
  },
  "Short FAS": {
    equipmentKey: "short",
    children: ["BERETTA", "CLOCK"],
  },
  "Motor Vehicle": {
    equipmentKey: "mobility",
    children: ["MOTOR 1", "MOTOR 2"],
  },
  "Communication Equipment": {
    equipmentKey: "radio",
    children: ["RADIO 1", "RADIO 2"],
  },
} as const;
type InventoryItem = {
  id: number;
  ppo: string;
  station: string;

  serialNumber: string;
  typeParent: keyof typeof TYPE_CONFIG;
  typeChild: string;

  makeParent: keyof typeof TYPE_CONFIG;
  makeChild: string;

  model: string;
  name: string;

  status: string;
  disposition: string;
  issuanceType: string;
  validated: boolean;
  validatedAt?: string | null;
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
const STATUS_OPTIONS = ["SERVICEABLE", "UNSERVICEABLE", "FOR REPAIR"];

const DISPOSITION_OPTIONS = ["ASSIGNED", "FOR REPAIR", "FOR DISPOSAL", "STOCK"];

const ISSUANCE_OPTIONS = ["ISSUED", "NOT ISSUED"];

// Supabase client is initialized once and reused across fetch/update/delete
const supabaseUrl = "https://blxrymicjowtplrkusck.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJseHJ5bWljam93dHBscmt1c2NrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc1NTkwODQsImV4cCI6MjA4MzEzNTA4NH0.Q1y53hRP0PS91IbRdX4jUIqJBqtJAmqVbOg6PgPhAi4";
const supabase = createClient(supabaseUrl, supabaseKey);
const CALABARZON_ORDER = ["CAVITE", "LAGUNA", "BATANGAS", "RIZAL", "QUEZON"];

export default function QuicklookInventory() {
  const nav = useNavigate();

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  // filter states drive all memoized selectors below
  const [ppo, setPpo] = useState("All PPOs");
  const [station, setStation] = useState("All Stations");
  const [selectedType, setSelectedType] = useState<
    keyof typeof TYPE_CONFIG | "All"
  >("All");
  const [selectedChild, setSelectedChild] = useState<string>("All");

  // edit-related states are isolated so table rendering stays pure
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editItem, setEditItem] = useState<InventoryItem | null>(null);
  const [editForm, setEditForm] = useState<Partial<InventoryItem>>({});
  const [showSummary, setShowSummary] = useState(false);
  const [canValidate, setCanValidate] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginDept, setLoginDept] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [isCheckingAccess, setIsCheckingAccess] = useState(false);
  const ITEMS_PER_PAGE = 10;
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState("");
  const [editingCell, setEditingCell] = useState<{
    id: number;
    field: keyof InventoryItem;
  } | null>(null);

  const [inlineValue, setInlineValue] = useState<string>("");
  const [isSavingInline, setIsSavingInline] = useState(false);

  const isSavingInlineRef = useRef(false);
  const originalInlineValueRef = useRef<string>("");

  const sleep = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));
  useEffect(() => {
    // initial load happens once on mount
    const fetchData = async () => {
      setLoading(true);
      const MIN_LOADING_TIME = 2500; // 👈 5 seconds
      const start = Date.now();
      try {
        const { data, error } = await supabase
          .from("quicklook_inventory_t_ordered")
          .select(
            `
    quicklook_id,
    ppo,
    station,
    serial_number,
    type_parent,
    type_child,
    make_parent,
    make_child,
    model,
    name,
    status,
    disposition,
    issuance_type,
    validated,
    validated_at
  `,
          )
          .order("ppo")
          .order("station");

        if (error) {
          console.error("Fetch error:", error);
          Swal.fire("Error", "Failed to fetch inventory data", "error");
          return;
        }

        setItems(
          data.map((d: any) => ({
            id: d.quicklook_id,
            ppo: d.ppo,
            station: d.station,
            serialNumber: d.serial_number,
            typeParent: d.type_parent,
            typeChild: d.type_child,
            makeParent: d.make_parent,
            makeChild: d.make_child,
            model: d.model,
            name: d.name,
            status: d.status,
            disposition: d.disposition,
            issuanceType: d.issuance_type,
            validated: d.validated,
            validatedAt: d.validated_at ?? null,
          })),
        );
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
    const checkAccess = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data, error } = await supabase
        .from("inventory_access")
        .select("department")
        .eq("user_id", user.id)
        .single();

      if (error) {
        console.error("Access check failed", error);
        return;
      }

      setCanValidate(data.department === "ADMIN");
    };

    checkAccess();
  }, []);
  useEffect(() => {
    const loadUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      setUser(user);

      if (!user) return;

      const { data } = await supabase
        .from("inventory_access")
        .select("department")
        .eq("user_id", user.id)
        .single();

      setCanValidate(data?.department === "ADMIN");
    };

    loadUser();
  }, []);

  const exportToExcel = () => {
    const table = document.querySelector("table");
    if (!table) {
      Swal.fire("Error", "Table not found", "error");
      return;
    }

    const clonedTable = table.cloneNode(true) as HTMLTableElement;

    // Remove action buttons column
    clonedTable
      .querySelectorAll("th:last-child, td:last-child")
      .forEach((el) => el.remove());

    const html = `
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          table {
            border-collapse: collapse;
            width: 100%;
            font-family: Arial, sans-serif;
          }
          th {
            background: #2563eb;
            color: white;
            padding: 8px;
            border: 1px solid #ddd;
          }
          td {
            padding: 6px;
            border: 1px solid #ddd;
            text-align: center;
          }
          tr:nth-child(even) {
            background: #f8fafc;
          }
        </style>
      </head>
      <body>
        ${clonedTable.outerHTML}
      </body>
    </html>
  `;

    const blob = new Blob([html], {
      type: "application/vnd.ms-excel;charset=utf-8;",
    });

    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "Quicklook_Inventory.xls";
    link.click();
  };

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setUser(session?.user ?? null);

        if (!session?.user) return;

        const { data } = await supabase
          .from("inventory_access")
          .select("department")
          .eq("user_id", session.user.id)
          .single();

        setCanValidate(data?.department === "ADMIN");
        setShowLoginModal(false);
      },
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [ppo, station, selectedType, selectedChild, search]);

  const isFiltered =
    ppo !== "All PPOs" ||
    station !== "All Stations" ||
    selectedType !== "All" ||
    selectedChild !== "All";

  const ppos = useMemo(() => {
    const unique = new Set(items.map((i) => i.ppo));
    return ["All PPOs", ...Array.from(unique)];
  }, [items]);

  const stations = useMemo(() => {
    const filtered =
      ppo === "All PPOs" ? items : items.filter((i) => i.ppo === ppo);

    const unique = new Set(filtered.map((i) => i.station));
    return ["All Stations", ...Array.from(unique)];
  }, [items, ppo]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();

    return items
      .filter((i) => {
        if (ppo !== "All PPOs" && i.ppo !== ppo) return false;
        if (station !== "All Stations" && i.station !== station) return false;

        if (selectedType !== "All") {
          if (i.typeParent !== selectedType) return false;
          if (selectedChild !== "All" && i.makeChild !== selectedChild)
            return false;
        }

        if (q) {
          // 🔒 ISSUANCE-ONLY search
          if ("issued".startsWith(q)) {
            return i.issuanceType === "ISSUED";
          }

          if ("not issued".startsWith(q.replace(/\s+/g, " "))) {
            return i.issuanceType === "NOT ISSUED";
          }

          // 🔒 STATUS-ONLY search (PARTIAL / PREFIX MATCH)
          if ("serviceable".startsWith(q)) {
            return i.status === "SERVICEABLE";
          }

          if ("unserviceable".startsWith(q)) {
            return i.status === "UNSERVICEABLE";
          }

          if ("for repair".startsWith(q) || "repair".startsWith(q)) {
            return i.status === "FOR REPAIR";
          }

          // 🔍 normal text search fallback
          const haystack = [
            i.ppo,
            i.station,
            i.serialNumber,
            i.makeChild,
            i.model,
            i.name,
            i.disposition,
            i.typeChild,
          ]
            .join(" ")
            .toLowerCase();

          return haystack.includes(q);
        }

        return true;
      })
      .sort((a, b) => {
        const getOrder = (ppo: string) => {
          const upper = ppo.toUpperCase();
          const index = CALABARZON_ORDER.findIndex((p) => upper.includes(p));
          return index === -1 ? 999 : index;
        };

        const orderA = getOrder(a.ppo);
        const orderB = getOrder(b.ppo);

        if (orderA !== orderB) return orderA - orderB;

        // same province → normal ordering
        if (a.ppo !== b.ppo) return a.ppo.localeCompare(b.ppo);
        return a.station.localeCompare(b.station);
      });
  }, [items, ppo, station, selectedType, selectedChild, search]);

  const totalPages = Math.ceil(rows.length / ITEMS_PER_PAGE);
  const cancelInlineEdit = () => {
    setEditingCell(null);
    setInlineValue("");
  };

  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    return rows.slice(start, end);
  }, [rows, currentPage]);

  const columnTotals = useMemo(() => {
    const countBy = (key: keyof InventoryItem) =>
      rows.reduce<Record<string, number>>((acc, r) => {
        const v = String(r[key] ?? "—");
        acc[v] = (acc[v] || 0) + 1;
        return acc;
      }, {});

    const validatedYes = rows.filter((r) => r.validated).length;
    const validatedNo = rows.length - validatedYes;
    const validationRate =
      rows.length === 0 ? 0 : Math.round((validatedYes / rows.length) * 100);

    const attention = {
      unserviceable: rows.filter((r) => r.status === "UNSERVICEABLE").length,
      forRepair: rows.filter((r) => r.status === "FOR REPAIR").length,
      forDisposal: rows.filter((r) => r.disposition === "FOR DISPOSAL").length,
      idleServiceable: rows.filter(
        (r) => r.status === "SERVICEABLE" && r.issuanceType === "NOT ISSUED",
      ).length,
    };

    const statusIssuanceMatrix = rows.reduce<
      Record<string, Record<string, number>>
    >((acc, r) => {
      acc[r.status] ??= {};
      acc[r.status][r.issuanceType] = (acc[r.status][r.issuanceType] || 0) + 1;
      return acc;
    }, {});

    return {
      totalRows: rows.length,
      status: countBy("status"),
      issuance: countBy("issuanceType"),
      validated: {
        yes: validatedYes,
        no: validatedNo,
        rate: validationRate,
      },
      attention,
      matrix: statusIssuanceMatrix,
    };
  }, [rows]);

  const renderCounts = (obj: Record<string, number>) =>
    Object.entries(obj)
      .map(([k, v]) => `${k}: ${v}`)
      .join(" | ");

  const equipmentTitle = useMemo(() => {
    switch (selectedType) {
      case "Long FAS":
        return "STATUS OF LONG FIREARMS";
      case "Short FAS":
        return "STATUS OF SHORT FIREARMS";
      case "Motor Vehicle":
        return "STATUS OF MOTOR VEHICLES";
      case "Communication Equipment":
        return "STATUS OF COMMUNICATION EQUIPMENTS";
      default:
        return "STATUS OF EQUIPMENTS";
    }
  }, [selectedType]);
  const applySmartDefaults = (
    field: "status" | "disposition",
    value: string,
  ) => {
    setEditForm((prev) => {
      const next = { ...prev, [field]: value };

      // STATUS-based defaults
      if (field === "status") {
        if (value === "UNSERVICEABLE" || value === "FOR REPAIR") {
          next.disposition = "FOR REPAIR";
          next.issuanceType = "NOT ISSUED";
        }

        if (value === "SERVICEABLE") {
          if (!prev.disposition) next.disposition = "ASSIGNED";
          if (!prev.issuanceType) next.issuanceType = "ISSUED";
        }
      }

      // DISPOSITION-based defaults
      if (field === "disposition") {
        if (value === "ASSIGNED") {
          next.issuanceType = "ISSUED";
        }

        if (value === "FOR REPAIR" || value === "FOR DISPOSAL") {
          next.issuanceType = "NOT ISSUED";
        }
      }

      return next;
    });
  };

  const validatedList = useMemo(() => {
    return rows
      .filter((r) => r.validated && r.validatedAt)
      .map((r) => ({
        id: r.id,
        date: new Date(r.validatedAt!),
        name: r.name || r.model || "Unnamed item",
        ppo: r.ppo,
        station: r.station,
        serialNumber: r.serialNumber,
      }))
      .sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [rows]);

  const deriveByStatus = (current: InventoryItem, newStatus: string) => {
    let disposition = current.disposition;
    let issuanceType = current.issuanceType;

    // 🔴 UNSERVICEABLE default behavior
    if (newStatus === "UNSERVICEABLE") {
      // keep FOR REPAIR if user already chose it
      if (current.disposition !== "FOR REPAIR") {
        disposition = "FOR DISPOSAL";
      }
      issuanceType = "NOT ISSUED";
    }

    // 🟡 FOR REPAIR
    if (newStatus === "FOR REPAIR") {
      disposition = "FOR REPAIR";
      issuanceType = "NOT ISSUED";
    }

    // 🟢 SERVICEABLE
    if (newStatus === "SERVICEABLE") {
      disposition = "ASSIGNED";
      issuanceType = "ISSUED";
    }

    return {
      status: newStatus,
      disposition,
      issuanceType,
    };
  };

  const saveInlineEdit = async (
    item: InventoryItem,
    field: keyof InventoryItem,
    value: string,
  ) => {
    isSavingInlineRef.current = true;

    let updatePayload: any = {};

    if (field === "status") {
      const derived = deriveByStatus(item, value);
      updatePayload = {
        status: derived.status,
        disposition: derived.disposition,
        issuance_type: derived.issuanceType,
      };
    } else {
      const dbFieldMap: Record<string, string> = {
        model: "model",
        name: "name",
        disposition: "disposition",
        issuanceType: "issuance_type",
      };

      updatePayload = {
        [dbFieldMap[field]]: value,
      };
    }

    const { error } = await supabase
      .from("quicklook_inventory_t")
      .update(updatePayload)
      .eq("quicklook_id", item.id);

    isSavingInlineRef.current = false;

    if (error) {
      Swal.fire("Error", "Inline update failed", "error");
      return;
    }

    setItems((prev) =>
      prev.map((i) =>
        i.id === item.id
          ? {
              ...i,
              ...(field === "status"
                ? deriveByStatus(i, value)
                : { [field]: value }),
            }
          : i,
      ),
    );

    setEditingCell(null);
  };

  const handleInlineBlur = (
    item: InventoryItem,
    field: keyof InventoryItem,
  ) => {
    if (isSavingInlineRef.current) return;

    const original = originalInlineValueRef.current;
    const current = inlineValue;

    // nothing changed → just close editor
    if (current === original) {
      cancelInlineEdit();
      return;
    }

    // value changed → SAVE
    saveInlineEdit(item, field, current);
  };

  const toggleValidation = async (item: InventoryItem) => {
    const newValidated = !item.validated;

    const { error } = await supabase
      .from("quicklook_inventory_t")
      .update({
        validated: newValidated,
        validated_at: newValidated ? new Date().toISOString() : null,
      })
      .eq("quicklook_id", item.id);

    if (error) {
      Swal.fire("Error", "Failed to update validation", "error");
      return;
    }

    setItems((prev) =>
      prev.map((i) =>
        i.id === item.id
          ? {
              ...i,
              validated: newValidated,
              validatedAt: newValidated ? new Date().toISOString() : null,
            }
          : i,
      ),
    );
  };

  const handleValidationClick = (item: InventoryItem) => {
    // always ask for login
    setEditItem(item);
    setShowLoginModal(true);
  };

  const submitDepartmentLogin = async () => {
    if (!loginDept) {
      Swal.fire("Missing field", "Enter department", "warning");
      return;
    }

    setIsCheckingAccess(true);

    const { data, error } = await supabase
      .from("inventory_access")
      .select("can_validate")
      .eq("department", loginDept.trim().toUpperCase())
      .single();

    setIsCheckingAccess(false);

    if (error || !data) {
      Swal.fire("Access denied", "Department not found", "error");
      return;
    }

    if (!data.can_validate) {
      Swal.fire(
        "Access denied",
        "This department cannot validate inventory",
        "warning",
      );
      return;
    }

    // ✅ VALIDATE ONLY THIS ITEM
    // ✅ VALIDATE ONLY THIS ITEM
    if (editItem) {
      await toggleValidation(editItem);

      const actionText = editItem.validated
        ? "Validation removed"
        : "Item validated";

      await Swal.fire({
        icon: "success",
        title: actionText,
        text: "Inventory validation updates",
        timer: 2500,
        showConfirmButton: false,
      });
    }

    // 🔒 reset everything
    setShowLoginModal(false);
    setLoginDept("");
    setCanValidate(false);
  };
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
            {/* Search */}
            <div className="relative">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search serial, model, name, station…"
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
            {/* Type filter */}
            <select
              value={selectedType}
              onChange={(e) => {
                setSelectedType(e.target.value as any);
                setSelectedChild("All");
              }}
              className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm shadow-sm"
            >
              <option value="All">All Types</option>
              {Object.keys(TYPE_CONFIG).map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>

            {/* Sub-type filter */}
            <select
              value={selectedChild}
              disabled={selectedType === "All"}
              onChange={(e) => setSelectedChild(e.target.value)}
              className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm shadow-sm disabled:opacity-50"
            >
              <option value="All">All</option>
              {selectedType !== "All" &&
                TYPE_CONFIG[selectedType].children.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
            </select>

            {/* Generate */}
          </div>
        </section>

        {/* Table */}
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
                onClick={() => setShowSummary(true)}
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
                  <tr className="border-t border-slate-100 hover:bg-blue-50/40 transition-colors">
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
                      {highlightText(r.serialNumber, search)}
                    </td>

                    <td className="px-3 py-2 text-center">
                      <div className="text-xs text-slate-500">
                        {highlightText(r.makeChild, search)}
                      </div>
                    </td>

                    <td className="px-3 py-2 text-center">
                      {editingCell?.id === r.id &&
                      editingCell.field === "model" ? (
                        <input
                          autoFocus
                          className="rounded border px-2 py-1 text-xs w-full"
                          value={inlineValue}
                          onChange={(e) => setInlineValue(e.target.value)}
                          onBlur={() => handleInlineBlur(r, "model")}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              saveInlineEdit(r, "model", inlineValue);
                            }

                            if (e.key === "Escape") {
                              cancelInlineEdit();
                            }
                          }}
                        />
                      ) : (
                        <span
                          onClick={() => {
                            setEditingCell({ id: r.id, field: "model" });
                            setInlineValue(r.model);
                            originalInlineValueRef.current = r.model ?? "";
                          }}
                          className="cursor-pointer"
                        >
                          {r.model || "—"}
                        </span>
                      )}
                    </td>

                    <td className="px-3 py-2 text-center">
                      {editingCell?.id === r.id &&
                      editingCell.field === "name" ? (
                        <input
                          autoFocus
                          className="rounded border px-2 py-1 text-xs w-full"
                          value={inlineValue}
                          onChange={(e) => setInlineValue(e.target.value)}
                          onBlur={() => handleInlineBlur(r, "name")}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              saveInlineEdit(r, "name", inlineValue);
                            }

                            if (e.key === "Escape") {
                              cancelInlineEdit();
                            }
                          }}
                        />
                      ) : (
                        <span
                          onClick={() => {
                            setEditingCell({ id: r.id, field: "name" });
                            setInlineValue(r.name);
                            originalInlineValueRef.current = r.name ?? "";
                          }}
                          className="cursor-pointer"
                        >
                          {r.name || "—"}
                        </span>
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
                              saveInlineEdit(r, "status", inlineValue);
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
                          onClick={() => {
                            setEditingCell({ id: r.id, field: "status" });
                            setInlineValue(r.status);
                            originalInlineValueRef.current = r.status ?? "";
                          }}
                          className={`cursor-pointer rounded-full px-2 py-0.5 text-xs font-semibold
        ${
          r.status === "SERVICEABLE"
            ? "bg-green-100 text-green-700"
            : r.status === "UNSERVICEABLE"
              ? "bg-red-100 text-red-700"
              : "bg-yellow-100 text-yellow-700"
        }`}
                          title="Click to edit"
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
                              saveInlineEdit(r, "disposition", inlineValue);
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
                        <span
                          onClick={() => {
                            setEditingCell({ id: r.id, field: "disposition" });
                            setInlineValue(r.disposition);
                            originalInlineValueRef.current =
                              r.disposition ?? "";
                          }}
                          className="cursor-pointer"
                          title="Auto-updated based on status"
                        >
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
                              saveInlineEdit(r, "issuanceType", inlineValue);
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
                        <span
                          onClick={() => {
                            setEditingCell({ id: r.id, field: "issuanceType" });
                            setInlineValue(r.issuanceType);
                            originalInlineValueRef.current =
                              r.issuanceType ?? "";
                          }}
                          className="cursor-pointer"
                        >
                          {r.issuanceType}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <button
                        onClick={() => handleValidationClick(r)}
                        className="text-lg font-bold hover:scale-110 transition"
                        title="Click to validate (login required)"
                      >
                        <span
                          className={`inline-flex items-center justify-center rounded-full w-6 h-6 text-sm font-bold
    ${r.validated ? "bg-green-600 text-white" : "bg-slate-300 text-slate-600"}
  `}
                        >
                          {r.validated ? (
                            <span
                              title={`Validated at ${new Date(r.validatedAt!).toLocaleString()}`}
                            >
                              ✓
                            </span>
                          ) : (
                            "–"
                          )}
                        </span>
                      </button>
                    </td>

                    <td className="px-3 py-2 text-center">
                      <button
                        className="rounded-md px-2 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                        onClick={() => {
                          setEditItem(r);
                          setEditForm({ ...r });
                          setIsEditOpen(true);
                        }}
                      >
                        Edit
                      </button>
                      <button
                        className="ml-2 rounded-md px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-100"
                        onClick={async () => {
                          const result = await Swal.fire({
                            title: "Delete this record?",
                            text: "This action cannot be undone.",
                            icon: "warning",
                            showCancelButton: true,
                            confirmButtonColor: "#d33",
                            confirmButtonText: "Yes, delete it",
                          });

                          if (!result.isConfirmed) return;

                          const { error } = await supabase
                            .from("quicklook_inventory_t")
                            .delete()
                            .eq("quicklook_id", r.id);

                          if (error) {
                            Swal.fire(
                              "Error",
                              "Failed to delete record",
                              "error",
                            );
                            return;
                          }

                          Swal.fire(
                            "Deleted!",
                            "Record has been removed.",
                            "success",
                          );

                          setItems((prev) => prev.filter((i) => i.id !== r.id));
                        }}
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
                    <td className="px-3 py-2">
                      TOTAL ({columnTotals.totalRows})
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            {totalPages > 1 && (
              <div className="border-t bg-slate-50/70 px-4 py-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-sm">
                  {/* Left info */}
                  <div className="text-slate-600 text-xs sm:text-sm">
                    Page <b>{currentPage}</b> of <b>{totalPages}</b> (
                    {rows.length} records)
                  </div>

                  {/* Controls */}
                  <div className="flex items-center gap-1">
                    <button
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage((p) => p - 1)}
                      className="h-8 rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700
          hover:bg-blue-50 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Prev
                    </button>

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

        {isEditOpen && editItem && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
            onClick={() => setIsEditOpen(false)}
          >
            <div
              className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="mb-4 text-lg font-bold">Edit Inventory Item</h2>

              <div className="grid grid-cols-2 gap-4 text-sm">
                {/* Model */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Model
                  </label>
                  <div className="text-xs text-slate-400 mb-1">
                    Current: {editItem.model || "—"}
                  </div>
                  <input
                    className="w-full rounded border px-2 py-1"
                    value={editForm.model ?? ""}
                    onChange={(e) =>
                      setEditForm({ ...editForm, model: e.target.value })
                    }
                    placeholder="Enter new model"
                  />
                </div>

                {/* Name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Equipment Name
                  </label>
                  <div className="text-xs text-slate-400 mb-1">
                    Current: {editItem.name || "—"}
                  </div>
                  <input
                    className="w-full rounded border px-2 py-1"
                    value={editForm.name ?? ""}
                    onChange={(e) =>
                      setEditForm({ ...editForm, name: e.target.value })
                    }
                    placeholder="Enter equipment name"
                  />
                </div>

                {/* Status */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Status
                  </label>
                  <div className="text-xs text-slate-400 mb-1">
                    Current: {editItem.status || "—"}
                  </div>
                  <select
                    className="w-full rounded border px-2 py-1"
                    value={editForm.status ?? ""}
                    onChange={(e) =>
                      setEditForm({ ...editForm, status: e.target.value })
                    }
                  >
                    <option value="">Select status</option>
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Disposition */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Disposition
                  </label>
                  <div className="text-xs text-slate-400 mb-1">
                    Current: {editItem.disposition || "—"}
                  </div>
                  <select
                    className="w-full rounded border px-2 py-1"
                    value={editForm.disposition ?? ""}
                    onChange={(e) =>
                      applySmartDefaults("disposition", e.target.value)
                    }
                  >
                    <option value="">Select disposition</option>
                    {DISPOSITION_OPTIONS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Issuance Type */}
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Issuance Type
                  </label>
                  <div className="text-xs text-slate-400 mb-1">
                    Current: {editItem.issuanceType || "—"}
                  </div>
                  <select
                    className="w-full rounded border px-2 py-1"
                    value={editForm.issuanceType ?? ""}
                    onChange={(e) =>
                      setEditForm({ ...editForm, issuanceType: e.target.value })
                    }
                  >
                    <option value="">Select issuance type</option>
                    {ISSUANCE_OPTIONS.map((i) => (
                      <option key={i} value={i}>
                        {i}
                      </option>
                    ))}
                  </select>

                  <div className="mt-6 flex justify-end gap-3">
                    <button
                      onClick={() => setIsEditOpen(false)}
                      className="rounded-lg border px-4 py-2 text-sm"
                    >
                      Cancel
                    </button>

                    <button
                      onClick={async () => {
                        const result = await Swal.fire({
                          title: "Save changes?",
                          icon: "question",
                          showCancelButton: true,
                          confirmButtonText: "Save",
                        });

                        if (!result.isConfirmed) return;

                        const { error } = await supabase
                          .from("quicklook_inventory_t")
                          .update({
                            model: editForm.model,
                            name: editForm.name,
                            status: editForm.status,
                            disposition: editForm.disposition,
                            issuance_type: editForm.issuanceType,
                          })
                          .eq("quicklook_id", editItem.id);

                        if (error) {
                          Swal.fire("Error", "Update failed", "error");
                          return;
                        }

                        Swal.fire("Saved!", "Record updated.", "success");

                        setItems((prev) =>
                          prev.map((i) =>
                            i.id === editItem.id
                              ? ({ ...i, ...editForm } as InventoryItem)
                              : i,
                          ),
                        );

                        setIsEditOpen(false);
                      }}
                      className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white"
                    >
                      Save
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        {showSummary && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
            onClick={() => setShowSummary(false)}
          >
            <div
              className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="mb-4 text-lg font-bold">Inventory Summary</h2>

              {/* Context sentence */}
              <p className="mb-4 text-sm text-slate-600">
                This summary is based on the currently displayed records (
                {columnTotals.totalRows} total).
              </p>

              {/* Summary blocks */}
              <div className="space-y-5">
                {/* ⚠ ATTENTION REQUIRED */}
                <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                  <div className="text-xs font-semibold text-red-700">
                    ⚠ Attention Required
                  </div>
                  <div className="mt-2 text-sm space-y-1">
                    <div>
                      Unserviceable:{" "}
                      <b>{columnTotals.attention.unserviceable}</b>
                    </div>
                    <div>
                      For Repair: <b>{columnTotals.attention.forRepair}</b>
                    </div>
                    <div>
                      For Disposal: <b>{columnTotals.attention.forDisposal}</b>
                    </div>
                    <div>
                      Serviceable but Not Issued:{" "}
                      <b>{columnTotals.attention.idleServiceable}</b>
                    </div>
                  </div>
                </div>

                {/* VALIDATION HEALTH */}
                <div className="rounded-lg border p-4 bg-blue-50">
                  <div className="text-xs text-slate-500 mb-2">
                    Validated Items ({validatedList.length})
                  </div>

                  {validatedList.length > 0 ? (
                    <div className="max-h-60 overflow-y-auto space-y-2">
                      {validatedList.map((v) => (
                        <div
                          key={v.id}
                          className="rounded-md border bg-white px-3 py-2 text-xs"
                        >
                          <div className="font-semibold text-slate-800">
                            {v.name}
                          </div>

                          <div className="text-slate-600">
                            {v.ppo} — {v.station}
                          </div>

                          <div className="text-slate-500">
                            SN: {v.serialNumber}
                          </div>

                          <div className="text-slate-400 text-[11px]">
                            Validated: {v.date.toLocaleString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-slate-500">
                      No validated records
                    </div>
                  )}
                </div>

                <div className="rounded-lg border p-4">
                  <div className="text-xs text-slate-500">
                    Validation Health
                  </div>
                  <div className="mt-1 text-2xl font-bold">
                    {columnTotals.validated.rate}%
                  </div>
                  <div className="text-sm text-slate-600">
                    ✔ {columnTotals.validated.yes} validated <br />✖{" "}
                    {columnTotals.validated.no} pending
                  </div>
                </div>

                {/* STATUS × ISSUANCE MATRIX */}
                <div className="rounded-lg border p-4">
                  <div className="text-xs text-slate-500 mb-2">
                    Status × Issuance Matrix
                  </div>

                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-xs">
                        <th className="border px-2 py-1 text-left">Status</th>
                        <th className="border px-2 py-1">Issued</th>
                        <th className="border px-2 py-1">Not Issued</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(columnTotals.matrix).map(
                        ([status, issuance]) => (
                          <tr key={status}>
                            <td className="border px-2 py-1 font-semibold">
                              {status}
                            </td>
                            <td className="border px-2 py-1 text-center">
                              {issuance["ISSUED"] || 0}
                            </td>
                            <td className="border px-2 py-1 text-center">
                              {issuance["NOT ISSUED"] || 0}
                            </td>
                          </tr>
                        ),
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Footer */}
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowSummary(false)}
                  className="rounded-lg border px-4 py-2 text-sm"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
        {showLoginModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
            onClick={() => setShowLoginModal(false)}
          >
            <div
              className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-lg font-bold mb-3">Admin Validation Login</h2>

              <div className="space-y-3 text-sm">
                <div>
                  <label className="block text-xs font-semibold mb-1">
                    Department
                  </label>
                  <input
                    className="w-full rounded border px-3 py-2"
                    value={loginDept}
                    onChange={(e) => setLoginDept(e.target.value)}
                    placeholder="ADMIN"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    className="w-full rounded border px-3 py-2"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                  />
                </div>
              </div>

              <div className="mt-5 flex justify-end gap-3">
                <button
                  onClick={() => setShowLoginModal(false)}
                  className="rounded border px-4 py-2 text-sm"
                >
                  Cancel
                </button>

                <button
                  onClick={submitDepartmentLogin}
                  disabled={isCheckingAccess}
                  className="rounded bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-50"
                >
                  {isCheckingAccess ? "Checking…" : "Login"}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
