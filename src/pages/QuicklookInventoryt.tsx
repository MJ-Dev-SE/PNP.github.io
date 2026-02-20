import { useMemo, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import PpoGridLoader from "../components/PpoGridLoader";
import {
  CALABARZON_ORDER,
  ITEMS_PER_PAGE,
  PPO_LOGOS,
} from "../features/quicklookt/constants";
import {
  TYPE_CONFIG,
  type InventoryItem,
  type TypeParent,
} from "../features/quicklookt/model";
import { useQuicklooktData } from "../features/quicklookt/hooks";
import {
  applySmartDefaultsForEdit,
  deleteInventoryItemAction,
  saveEditInventoryItemAction,
  submitDepartmentLoginAction,
  toggleValidationAction,
} from "../features/quicklookt/actions";
import { QuicklookFilters } from "../features/quicklookt/components/QuicklookFilters";
import { QuicklookTable } from "../features/quicklookt/components/QuicklookTable";
import {
  EditInventoryModal,
  LoginModal,
  SummaryModal,
} from "../features/quicklookt/components/QuicklookModals";
import { supabase } from "../lib/supabase";

export default function QuicklookInventory() {
  const nav = useNavigate();

  const { items, setItems, loading, setCanValidate, setUser } =
    useQuicklooktData();

  // filter states drive all memoized selectors below
  const [ppo, setPpo] = useState("All PPOs");
  const [station, setStation] = useState("All Stations");
  const [selectedType, setSelectedType] = useState<TypeParent | "All">("All");
  const [selectedChild, setSelectedChild] = useState<string>("All");

  // edit-related states are isolated so table rendering stays pure
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editItem, setEditItem] = useState<InventoryItem | null>(null);
  const [editForm, setEditForm] = useState<Partial<InventoryItem>>({});
  const [showSummary, setShowSummary] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginDept, setLoginDept] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [isCheckingAccess, setIsCheckingAccess] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

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
  }, [setCanValidate, setUser]);

  useEffect(() => {
    setCurrentPage(1);
  }, [ppo, station, selectedType, selectedChild, search]);

  useEffect(() => {
    const currentIds = new Set(items.map((item) => item.id));
    setSelectedIds((prev) => prev.filter((id) => currentIds.has(id)));
  }, [items]);

  const isFiltered =
    ppo !== "All PPOs" ||
    station !== "All Stations" ||
    selectedType !== "All" ||
    selectedChild !== "All";

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const toggleSelectAll = (rows: InventoryItem[]) => {
    const pageIds = rows.map((r) => r.id);

    const allSelected = pageIds.every((id) => selectedIds.includes(id));

    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !pageIds.includes(id)));
    } else {
      setSelectedIds((prev) => [...new Set([...prev, ...pageIds])]);
    }
  };

  const ppos = useMemo(() => {
    const unique = new Set(items.map((i) => i.ppo));
    const sortedPpos = Array.from(unique).sort((a, b) => {
      const getOrder = (ppo: string) => {
        const upper = ppo.toUpperCase();

        // RHQ always first (priority -1)
        if (upper.includes("RHQ")) return -1;

        // RMFB4A always last (priority 999)
        if (upper.includes("RMFB4A")) return 999;

        // CALABARZON provinces in the middle (priority 0-4)
        const index = CALABARZON_ORDER.findIndex((p) => upper.includes(p));
        return index === -1 ? 998 : index;
      };

      return getOrder(a) - getOrder(b);
    });
    return ["All PPOs", ...sortedPpos];
  }, [items]);

  const stations = useMemo(() => {
    const filtered =
      ppo === "All PPOs" ? items : items.filter((i) => i.ppo === ppo);

    const unique = new Set(filtered.map((i) => i.station));
    return ["All Stations", ...Array.from(unique)];
  }, [items, ppo]);

  const typeChildren = useMemo(() => {
    if (selectedType === "All") return ["All"];

    const normalizeSpell = (value: string) =>
      value.toLowerCase().replace(/[^a-z0-9]/g, "");

    const selectedTypeNormalized = normalizeSpell(selectedType);
    const typeHints = TYPE_CONFIG[selectedType].children.map(normalizeSpell);

    const unique = new Set(
      items
        .filter((i) => {
          const rowType = normalizeSpell(i.typeChild || "");
          return (
            rowType === selectedTypeNormalized ||
            rowType.includes(selectedTypeNormalized) ||
            i.typeParent === selectedType ||
            typeHints.some(
              (hint) =>
                rowType === hint ||
                rowType.includes(hint) ||
                hint.includes(rowType),
            )
          );
        })
        .map((i) => i.typeChild)
        .filter(Boolean),
    );

    return ["All", ...Array.from(unique).sort((a, b) => a.localeCompare(b))];
  }, [items, selectedType]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const normalizeSpell = (value: string) =>
      value.toLowerCase().replace(/[^a-z0-9]/g, "");

    return items
      .filter((i) => {
        if (ppo !== "All PPOs" && i.ppo !== ppo) return false;
        if (station !== "All Stations" && i.station !== station) return false;

        if (selectedType !== "All") {
          const rowType = normalizeSpell(i.typeChild || "");
          const selectedTypeNormalized = normalizeSpell(selectedType);
          const selectedTypeHints =
            TYPE_CONFIG[selectedType].children.map(normalizeSpell);
          const typeMatch =
            rowType === selectedTypeNormalized ||
            rowType.includes(selectedTypeNormalized) ||
            i.typeParent === selectedType ||
            selectedTypeHints.some(
              (hint) =>
                rowType === hint ||
                rowType.includes(hint) ||
                hint.includes(rowType),
            );

          if (!typeMatch) return false;

          if (
            selectedChild !== "All" &&
            normalizeSpell(i.typeChild || "") !== normalizeSpell(selectedChild)
          ) {
            return false;
          }
        }

        if (q) {
          // 🔒 ISSUANCE-ONLY search
          if ("issued".startsWith(q)) {
            return i.disposition === "ISSUED";
          }

          if ("onhand".startsWith(q.replace(/\s+/g, " "))) {
            return i.disposition === "ONHAND";
          }

          // 🔒 STATUS-ONLY search (PARTIAL / PREFIX MATCH)
          if ("serviceable".startsWith(q)) {
            return i.status === "SERVICEABLE";
          }

          if ("unserviceable".startsWith(q)) {
            return i.status === "UNSERVICEABLE";
          }

          if ("ber".startsWith(q)) {
            return i.status === "BER";
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

          // RHQ always first (priority -1)
          if (upper.includes("RHQ")) return -1;

          // RMFB4A always last (priority 999)
          if (upper.includes("RMFB4A")) return 999;

          // CALABARZON provinces in the middle (priority 0-4)
          const index = CALABARZON_ORDER.findIndex((p) => upper.includes(p));
          return index === -1 ? 998 : index;
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

  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    return rows.slice(start, end);
  }, [rows, currentPage]);

  const columnTotals = useMemo(() => {
    const validatedYes = rows.filter((r) => r.validated).length;
    const validatedNo = rows.length - validatedYes;
    const validationRate =
      rows.length === 0 ? 0 : Math.round((validatedYes / rows.length) * 100);

    const attention = {
      unserviceable: rows.filter((r) => r.status === "UNSERVICEABLE").length,
      ber: rows.filter((r) => r.status === "BER").length,
      issued: rows.filter((r) => r.disposition === "ISSUED").length,
      idleServiceable: rows.filter(
        (r) => r.status === "SERVICEABLE" && r.disposition === "ONHAND",
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
      validated: {
        yes: validatedYes,
        no: validatedNo,
        rate: validationRate,
      },
      attention,
      matrix: statusIssuanceMatrix,
    };
  }, [rows]);

  const equipmentTitle = useMemo(() => {
    switch (selectedType) {
      case "Long FAS":
        return "STATUS OF LONG FIREARMS";
      case "Short FAS":
        return "STATUS OF SHORT FIREARMS";

      default:
        return "STATUS OF EQUIPMENTS";
    }
  }, [selectedType]);
  const applySmartDefaults = (
    field: "status" | "disposition",
    value: string,
  ) => {
    setEditForm((prev) => applySmartDefaultsForEdit(prev, field, value));
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

  const toggleValidation = async (item: InventoryItem) => {
    return toggleValidationAction({
      item,
      setItems,
    });
  };

  const handleValidationClick = (item: InventoryItem) => {
    setEditItem(item);
    setShowLoginModal(true);
  };

  const submitDepartmentLogin = async () => {
    await submitDepartmentLoginAction({
      loginDept,
      setIsCheckingAccess,
      editItem,
      toggleValidation,
      setShowLoginModal,
      setLoginDept,
      setCanValidate,
    });
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
        <QuicklookFilters
          search={search}
          onSearchChange={setSearch}
          onClearSearch={() => setSearch("")}
          ppo={ppo}
          ppos={ppos}
          onPpoChange={setPpo}
          station={station}
          stations={stations}
          onStationChange={setStation}
          selectedType={selectedType}
          onSelectedTypeChange={(value) => {
            setSelectedType(value);
            setSelectedChild("All");
          }}
          selectedChild={selectedChild}
          onSelectedChildChange={setSelectedChild}
          typeChildren={typeChildren}
        />

        <QuicklookTable
          equipmentTitle={equipmentTitle}
          exportToExcel={exportToExcel}
          onShowSummary={() => setShowSummary(true)}
          paginatedRows={paginatedRows}
          search={search}
          highlightText={highlightText}
          handleValidationClick={handleValidationClick}
          onEdit={(item) => {
            setEditItem(item);
            setEditForm({ ...item });
            setIsEditOpen(true);
          }}
          onDelete={async (item) => {
            await deleteInventoryItemAction({
              item,
              setItems,
            });
          }}
          isFiltered={isFiltered}
          totalRows={columnTotals.totalRows}
          totalPages={totalPages}
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          rowsLength={rows.length}
          onToggleSelect={toggleSelect}
          selectedIds={selectedIds}
          onToggleSelectAll={() => toggleSelectAll(paginatedRows)}
          setSelectedIds={setSelectedIds}
          setItems={setItems}
        />

        <EditInventoryModal
          isOpen={isEditOpen}
          editItem={editItem}
          editForm={editForm}
          setEditForm={setEditForm}
          applySmartDefaults={applySmartDefaults}
          onClose={() => setIsEditOpen(false)}
          onSave={async () => {
            await saveEditInventoryItemAction({
              editItem,
              editForm,
              setItems,
              setIsEditOpen,
            });
          }}
        />

        <SummaryModal
          show={showSummary}
          onClose={() => setShowSummary(false)}
          columnTotals={columnTotals}
          validatedList={validatedList}
        />

        <LoginModal
          show={showLoginModal}
          onClose={() => setShowLoginModal(false)}
          loginDept={loginDept}
          setLoginDept={setLoginDept}
          loginPassword={loginPassword}
          setLoginPassword={setLoginPassword}
          isCheckingAccess={isCheckingAccess}
          onSubmit={submitDepartmentLogin}
        />
      </main>
    </div>
  );
}
