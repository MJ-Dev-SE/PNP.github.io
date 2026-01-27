import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toNum } from "../utils/storage";
import { Card, Th, Input } from "../components/UI";
import { supabase } from "../lib/supabase";
import Swal from "sweetalert2";
import QuicklooktEntryForm from "./QuicklooktEntryForm";
import PpoGridLoader from "../components/PpoGridLoader";

const CSV_HEADERS = [
  "station",
  "equipment",
  "type",
  "make",
  "serialNo",
  "propertyNo",
  "acquisitionDate",
  "acquisitionCost",
  "costOfRepair",
  "currentOrDepreciated",
  "svc",
  "uns",
  "ber",
  "procured",
  "donated",
  "foundAtStation",
  "loaned",
  "userOffice",
  "userName",
];
const QUICKLOOK_HEADERS = [
  "type_parent",
  "type_child",
  "make_parent",
  "make_child",
  "serial_number",
  "model",
  "name",
  "status",
  "disposition",
  "issuance_type",
  "validated",
];

const PPO_LOGOS = [
  "/ppo/rhq.png", // 👈 RHQ
  "/ppo/rmfb4a.png", // 👈 RMFB4A
  "/ppo/ppo1.png",
  "/ppo/ppo2.png",
  "/ppo/ppo3.png",
  "/ppo/ppo4.png",
  "/ppo/ppo5.png",
];

type Item = {
  id: string;
  sector: string;
  station: string;
  equipment: string;
  type: string;
  make: string;
  serialNo: string;
  propertyNo: string;
  acquisitionDate: string | number;
  acquisitionCost: number;
  costOfRepair: number;
  currentOrDepreciated: string;
  status: { svc: number; uns: number; ber: number };
  source: {
    procured: number;
    donated: number;
    foundAtStation: number;
    loaned: number;
  };
  whereabouts: { userOffice: string; userName: string };
  imageUrls?: string[];
  createdAt: string;
};

const mapRowToItem = (row: any): Item => ({
  id: row.id,
  sector: row.sector,
  station: row.station,
  equipment: row.equipment ?? "",
  type: row.type ?? "",
  make: row.make ?? "",
  serialNo: row.serial_no ?? "",
  propertyNo: row.property_no ?? "",
  acquisitionDate: row.acquisition_date ?? null,
  acquisitionCost: toNum(row.acquisition_cost),
  costOfRepair: toNum(row.cost_of_repair),
  currentOrDepreciated: row.current_or_depreciated ?? "",
  status: {
    svc: toNum(row.status_svc),
    uns: toNum(row.status_uns),
    ber: toNum(row.status_ber),
  },
  source: {
    procured: toNum(row.source_procured),
    donated: toNum(row.source_donated),
    foundAtStation: toNum(row.source_found_at_station),
    loaned: toNum(row.source_loaned),
  },
  whereabouts: {
    userOffice: row.user_office ?? "",
    userName: row.user_name ?? "",
  },
  imageUrls: row.image_urls ?? (row.image_url ? [row.image_url] : []),
  createdAt: row.created_at,
});

export default function StationInventory() {
  const { sector = "", station = "" } = useParams();
  const nav = useNavigate();

  const [items, setItems] = useState<Item[]>([]);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [sort, setSort] = useState<{
    by: string;
    dir: "asc" | "desc";
  }>({
    by: "createdAt",
    dir: "desc",
  });

  const [editing, setEditing] = useState<Item | null>(null);
  const [loading, setLoading] = useState(false);
  const [newItem, setNewItem] = useState<any>({});
  const [importedRows, setImportedRows] = useState<any[]>([]);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);

  const [modalImages, setModalImages] = useState<string[]>([]);
  const [modalIndex, setModalIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [editImageUrls, setEditImageUrls] = useState<string[]>([]);
  const [editImageFiles, setEditImageFiles] = useState<File[]>([]);
  const [editPreviewUrls, setEditPreviewUrls] = useState<string[]>([]);

  const [quicklookOpen, setQuicklookOpen] = useState(false);
  const [quicklookVisible, setQuicklookVisible] = useState(false);
  const sleep = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));
  const openQuicklook = () => {
    setQuicklookOpen(true);
    requestAnimationFrame(() => setQuicklookVisible(true));
  };
  const closeQuicklook = () => {
    setQuicklookVisible(false);
    setTimeout(() => setQuicklookOpen(false), 250);
  };
  const [quicklookSeed, setQuicklookSeed] = useState<any | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);

  const normalizeCode = (v?: string) => (v ?? "").trim().toUpperCase();

  const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

  const session = JSON.parse(
    localStorage.getItem("inventory_session") || "null",
  );

  const handleEditImageUpload = (files: FileList) => {
    const arr = Array.from(files);
    setEditImageFiles(arr);
    setEditPreviewUrls(arr.map((f) => URL.createObjectURL(f)));
  };

  const uploadImages = async (files: File[]) => {
    const urls: string[] = [];

    for (const file of files) {
      const ext = file.name.split(".").pop();
      const filePath = `inventory/${crypto.randomUUID()}.${ext}`;

      const { error } = await supabase.storage
        .from("inventory-images")
        .upload(filePath, file);

      if (error) throw error;

      const { data } = supabase.storage
        .from("inventory-images")
        .getPublicUrl(filePath);

      urls.push(data.publicUrl);
    }

    return urls;
  };

  const handleImageUpload = (files: FileList) => {
    const arr = Array.from(files);

    setImageFiles(arr);
    setPreviewUrls(arr.map((f) => URL.createObjectURL(f)));
  };

  const normalizeCSVDate = (value: string) => {
    if (!value) return "";

    // Expected CSV format: DD/MM/YY or DD/MM/YYYY
    const parts = value.split("/");
    if (parts.length !== 3) return "";

    let [dd, mm, yy] = parts;

    // handle 2-digit year
    if (yy.length === 2) {
      yy = Number(yy) < 50 ? `20${yy}` : `19${yy}`;
    }

    return `${yy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
  };

  useEffect(() => {
    if (modalImages.length === 0) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        setModalIndex((i) => (i === modalImages.length - 1 ? 0 : i + 1));
      }

      if (e.key === "ArrowLeft") {
        setModalIndex((i) => (i === 0 ? modalImages.length - 1 : i - 1));
      }

      if (e.key === "Escape") {
        setModalImages([]);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [modalImages.length]);

  // FETCH from Supabase
  useEffect(() => {
    if (!sector || !station) return;

    const fetchItems = async () => {
      setInitialLoading(true);

      const start = Date.now();
      const MIN_LOADING_TIME = 2500;

      const { data, error } = await supabase
        .from("station_inventory")
        .select("*")
        .eq("sector", sector)
        .eq("station", station)
        .order("created_at", { ascending: false });

      if (!error) {
        setItems((data || []).map(mapRowToItem));
      }

      const elapsed = Date.now() - start;
      if (elapsed < MIN_LOADING_TIME) {
        await sleep(MIN_LOADING_TIME - elapsed);
      }

      setInitialLoading(false);
    };

    fetchItems();
  }, [sector, station]);

  const stationItems = useMemo(
    () => items.filter((i) => (i.station || "").trim() === station.trim()),
    [items, station],
  );

  const types = useMemo(
    () => [
      "All",
      ...Array.from(new Set(stationItems.map((i) => i.type || ""))),
    ],
    [stationItems],
  );

  const getField = (item: any, by: string) => {
    if (by.startsWith("status.")) return item?.status?.[by.split(".")[1]] ?? 0;
    if (by.startsWith("source.")) return item?.source?.[by.split(".")[1]] ?? 0;
    if (by.startsWith("whereabouts."))
      return item?.whereabouts?.[by.split(".")[1]] ?? "";
    return item?.[by] ?? "";
  };

  const filtered = useMemo(() => {
    let rows = stationItems;
    if (typeFilter !== "All") rows = rows.filter((i) => i.type === typeFilter);
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      rows = rows.filter(
        (i) =>
          (i.equipment || "").toLowerCase().includes(q) ||
          (i.type || "").toLowerCase().includes(q) ||
          (i.make || "").toLowerCase().includes(q) ||
          (i.serialNo || "").toLowerCase().includes(q) ||
          (i.propertyNo || "").toLowerCase().includes(q) ||
          (i.whereabouts?.userName || "").toLowerCase().includes(q),
      );
    }
    const mul = sort.dir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const av = getField(a, sort.by);
      const bv = getField(b, sort.by);
      if (typeof av === "number" && typeof bv === "number")
        return (av - bv) * mul;
      return String(av).localeCompare(String(bv)) * mul;
    });
  }, [stationItems, query, typeFilter, sort]);
  const REQUIRED_TEXT_FIELDS = [
    "equipment",
    "type",
    "make",
    "serialNo",
    "propertyNo",
    "currentOrDepreciated",
    "userOffice",
    "userName",
  ];

  const REQUIRED_NUMBER_FIELDS = [
    "acquisitionCost",
    "svc",
    "uns",
    "ber",
    "procured",
    "donated",
    "foundAtStation",
    "loaned",
  ];

  // costOfRepair ❌ NOT included (optional)

  // ADD (insert into Supabase)
  const handleAdd = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitting) return;

    setSubmitting(true);

    try {
      // 1️⃣ Build payload WITHOUT image first
      const payload: any = {
        sector,
        station,
        equipment: String(newItem.equipment || "").trim(),
        type: String(newItem.type || "").trim(),
        make: String(newItem.make || "").trim(),
        serial_no: String(newItem.serialNo || "").trim(),
        property_no: String(newItem.propertyNo || "").trim(),
        acquisition_date: newItem.acquisitionDate || null,
        acquisition_cost: toNum(newItem.acquisitionCost),
        cost_of_repair: toNum(newItem.costOfRepair),
        current_or_depreciated: String(newItem.currentOrDepreciated || ""),
        status_svc: toNum(newItem.svc),
        status_uns: toNum(newItem.uns),
        status_ber: toNum(newItem.ber),
        source_procured: toNum(newItem.procured),
        source_donated: toNum(newItem.donated),
        source_found_at_station: toNum(newItem.foundAtStation),
        source_loaned: toNum(newItem.loaned),
        user_office: String(newItem.userOffice || ""),
        user_name: String(newItem.userName || ""),
      };

      // 2️⃣ Validate FIRST
      const requiredFields = [
        "equipment",
        "type",
        "make",
        "serial_no",
        "property_no",
        "acquisition_date",
        "acquisition_cost",
        "current_or_depreciated",
        "status_svc",
        "status_uns",
        "status_ber",
        "source_procured",
        "source_donated",
        "source_found_at_station",
        "source_loaned",
        "user_office",
        "user_name",
      ];

      const missingTextFields = REQUIRED_TEXT_FIELDS.filter(
        (key) => !String(newItem[key] || "").trim(),
      );

      const missingNumberFields = REQUIRED_NUMBER_FIELDS.filter(
        (key) =>
          newItem[key] === undefined ||
          newItem[key] === null ||
          Number.isNaN(Number(newItem[key])),
      );

      const missingDate = !newItem.acquisitionDate;

      const missingFieldsCount =
        missingTextFields.length +
        missingNumberFields.length +
        (missingDate ? 1 : 0);

      const noImage = imageFiles.length === 0;

      if (missingFieldsCount > 0 || noImage) {
        const result = await Swal.fire({
          icon: "warning",
          title: "Incomplete entry",
          html: `
      <p>Some information is missing:</p>
      <ul style="text-align:left;margin-top:8px">
        ${
          missingTextFields.length
            ? `<li>• ${missingTextFields.length} text field(s)</li>`
            : ""
        }
        ${
          missingNumberFields.length
            ? `<li>• ${missingNumberFields.length} numeric field(s)</li>`
            : ""
        }
        ${missingDate ? "<li>• Acquisition date</li>" : ""}
        ${noImage ? "<li>• No image uploaded</li>" : ""}
      </ul>
      <br/>
      <strong>Do you want to proceed anyway?</strong>
    `,
          showCancelButton: true,
          confirmButtonText: "Yes, proceed",
          cancelButtonText: "Cancel",
        });

        if (!result.isConfirmed) {
          setSubmitting(false);
          return;
        }
      }

      // 3️⃣ Upload image AFTER validation
      let imageUrls: string[] = [];

      if (imageFiles.length) {
        try {
          imageUrls = await uploadImages(imageFiles);
          payload.image_urls = imageUrls;
        } catch (e) {
          console.error("UPLOAD FAILED:", e);
          Swal.fire("Upload error", "Failed to upload images", "error");
          return;
        }
      }

      // 4️⃣ Insert
      const { data: inserted, error } = await supabase
        .from("station_inventory")
        .insert(payload)
        .select("*")
        .single();

      if (error) {
        console.error("INSERT FAILED:", error);
        Swal.fire("Insert error", error.message, "error");
        return;
      }
      await supabase.from("inventory_activity_log").insert({
        sector,
        station,
        inventory_id: inserted.id,
        action: "ADD",
        performed_department: session?.department ?? "Unknown",
        performed_by: session?.name ?? null,
        snapshot: inserted,
      });

      // 5️⃣ Success UI
      setItems((prev) => [mapRowToItem(inserted), ...prev]);
      setNewItem({});
      setImageFiles([]);
      setPreviewUrls([]);

      Swal.fire("Added!", "Item added successfully.", "success");
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "Something went wrong while adding item.", "error");
    } finally {
      setSubmitting(false); // ✅ ALWAYS RUNS
    }
  };

  // EDIT SAVE (update Supabase)
  const handleEditSave = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editing) return;

    const confirm = await Swal.fire({
      title: "Save changes?",
      text: "This will update the item information.",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Yes, save it",
      cancelButtonText: "Cancel",
    });

    if (!confirm.isConfirmed) return;

    try {
      const safeNum = (v: any) => (Number.isFinite(v) ? v : 0);

      // 1️⃣ Start with remaining OLD images
      let finalImageUrls: string[] = [...editImageUrls];

      // 2️⃣ Upload NEW images (if any)
      if (editImageFiles.length > 0) {
        const uploaded = await uploadImages(editImageFiles);
        finalImageUrls = [...finalImageUrls, ...uploaded];
      }

      // 3️⃣ Build payload
      const payload = {
        equipment: (editing.equipment || "").trim(),
        type: (editing.type || "").trim(),
        make: (editing.make || "").trim(),
        serial_no: (editing.serialNo || "").trim(),
        property_no: (editing.propertyNo || "").trim(),
        acquisition_date: editing.acquisitionDate || null,

        acquisition_cost: safeNum(toNum(editing.acquisitionCost)),
        cost_of_repair: safeNum(toNum(editing.costOfRepair)),
        current_or_depreciated: (editing.currentOrDepreciated || "").trim(),

        status_svc: safeNum(editing.status?.svc),
        status_uns: safeNum(editing.status?.uns),
        status_ber: safeNum(editing.status?.ber),

        source_procured: safeNum(editing.source?.procured),
        source_donated: safeNum(editing.source?.donated),
        source_found_at_station: safeNum(editing.source?.foundAtStation),
        source_loaned: safeNum(editing.source?.loaned),

        user_office: (editing.whereabouts?.userOffice || "").trim(),
        user_name: (editing.whereabouts?.userName || "").trim(),

        // ⭐ images (FULL REPLACEMENT)
        image_urls: finalImageUrls,
      };

      // 4️⃣ Update DB
      const { data: updated, error } = await supabase
        .from("station_inventory")
        .update(payload)
        .eq("id", editing.id)
        .select("*")
        .single();

      if (error) {
        console.error(error);
        Swal.fire("Failed", "Could not save changes.", "error");
        return;
      }
      await supabase.from("inventory_activity_log").insert({
        sector,
        station,
        inventory_id: updated.id,
        action: "UPDATE",
        performed_department: session?.department ?? "Unknown",
        performed_by: session?.name ?? null,
        snapshot: updated,
      });

      // 5️⃣ Update local state
      setItems((prev) =>
        prev.map((it) => (it.id === editing.id ? mapRowToItem(updated) : it)),
      );

      // 6️⃣ Cleanup edit state
      setEditing(null);
      setEditImageUrls([]);
      setEditImageFiles([]);
      setEditPreviewUrls([]);

      Swal.fire({
        icon: "success",
        title: "Saved!",
        text: "Item updated successfully.",
        confirmButtonText: "Ok",
      });
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "Something went wrong while saving.", "error");
    }
  };

  // DELETE (Supabase)
  // DELETE (Supabase) with SweetAlert2
  const handleDelete = async (id: string) => {
    const result = await Swal.fire({
      title: "Are you sure?",
      text: "This item will be permanently deleted!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete it!",
      cancelButtonText: "Cancel",
    });

    if (!result.isConfirmed) return;
    const item = items.find((i) => i.id === id);

    const { error } = await supabase
      .from("station_inventory")
      .delete()
      .eq("id", id);

    if (error) {
      console.error(error);
      Swal.fire("Failed!", "Could not delete item.", "error");
      return;
    }

    await supabase.from("inventory_activity_log").insert({
      sector,
      station,
      inventory_id: id,
      action: "DELETE",
      performed_department: session?.department ?? "Unknown",
      performed_by: session?.name ?? null,
      snapshot: item,
    });

    setItems((prev) => prev.filter((i) => i.id !== id));
    Swal.fire("Deleted!", "Item has been deleted.", "success");
  };

  const toggleSort = (by: string) =>
    setSort((s) =>
      s.by === by
        ? { by, dir: s.dir === "asc" ? "desc" : "asc" }
        : { by, dir: "asc" },
    );

  const getCSVValue = (i: any, h: string) => {
    const map: Record<string, any> = {
      station: i.station,
      equipment: i.equipment,
      serialNo: i.serialNo,
      propertyNo: i.propertyNo,
      acquisitionDate: i.acquisitionDate,
      acquisitionCost: i.acquisitionCost,
      costOfRepair: i.costOfRepair,
      currentOrDepreciated: i.currentOrDepreciated,
      svc: i?.status?.svc,
      uns: i?.status?.uns,
      ber: i?.status?.ber,
      procured: i?.source?.procured,
      donated: i?.source?.donated,
      foundAtStation: i?.source?.foundAtStation,
      loaned: i?.source?.loaned,
      userOffice: i?.whereabouts?.userOffice,
      userName: i?.whereabouts?.userName,
    };
    return h in map ? map[h] : i?.[h];
  };

  const exportCSV = () => {
    const rows = [
      CSV_HEADERS.join(","),
      ...filtered.map((i) =>
        CSV_HEADERS.map((h) => JSON.stringify(getCSVValue(i, h))).join(","),
      ),
    ].join("\n");
    const blob = new Blob([rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${sector}-${station}-inventory-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // IMPORT CSV → insert into Supabase
  // IMPORT CSV → only show in Add Form
  const isQuicklookCSV = (cols: string[]) =>
    QUICKLOOK_HEADERS.every((h: string) => cols.includes(h));

  const importCSV = async (file: File) => {
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter(Boolean);
    const [header, ...rest] = lines;
    const cols = header.split(",").map((s) => s.replaceAll('"', ""));

    const isStationCSV = CSV_HEADERS.every((h) => cols.includes(h));
    const isQuicklook = isQuicklookCSV(cols);

    if (!isStationCSV && !isQuicklook) {
      alert("CSV format not recognized");
      return;
    }

    const rows = rest.map((line) => {
      const values =
        line
          .match(/"(?:[^"]|"")*"|[^,]+/g)
          ?.map((s) => s.replace(/^"|"$/g, "").replaceAll('""', '"')) ?? [];
      return Object.fromEntries(cols.map((c, idx) => [c, values[idx] ?? ""]));
    });

    if (rows.length === 0) return;
    // 🔀 ROUTING DECISION
    if (isQuicklookCSV(cols)) {
      // 👉 QUICKLOOK CSV
      setImportedRows(rows); // keep all rows if you want bulk later
      openQuicklook();

      // pass first row to Quicklook form
      setQuicklookSeed({
        type_parent: rows[0].type_parent,
        type_child: rows[0].type_child,
        make_parent: rows[0].make_parent,
        make_child: rows[0].make_child,
        serial_number: rows[0].serial_number,
        model: rows[0].model,
        name: rows[0].name,
        status: rows[0].status,
        disposition: rows[0].disposition,
        issuance_type: rows[0].issuance_type,
        validated: rows[0].validated === "true",
      });

      return; // ⛔ stop here
    }
    // 1️⃣ autofill Add Form with first row
    setNewItem({
      equipment: rows[0].equipment || "",
      type: rows[0].type || "",
      make: rows[0].make || "",
      serialNo: rows[0].serialNo || "",
      propertyNo: rows[0].propertyNo || "",
      acquisitionDate: normalizeCSVDate(rows[0].acquisitionDate),
      acquisitionCost: toNum(rows[0].acquisitionCost),
      costOfRepair: toNum(rows[0].costOfRepair),
      currentOrDepreciated: rows[0].currentOrDepreciated || "",
      svc: toNum(rows[0].svc),
      uns: toNum(rows[0].uns),
      ber: toNum(rows[0].ber),
      procured: toNum(rows[0].procured),
      donated: toNum(rows[0].donated),
      foundAtStation: toNum(rows[0].foundAtStation),
      loaned: toNum(rows[0].loaned),
      userOffice: rows[0].userOffice || "",
      userName: rows[0].userName || "",
    });

    // 2️⃣ store all imported rows in a temporary state for later addition
    setImportedRows(rows); // 👈 you’ll need: const [importedRows, setImportedRows] = useState<any[]>([]);
  };

  const totals = useMemo(() => {
    const totalSvc = filtered.reduce((s, i) => s + toNum(i?.status?.svc), 0);
    const totalUns = filtered.reduce((s, i) => s + toNum(i?.status?.uns), 0);
    const totalBer = filtered.reduce((s, i) => s + toNum(i?.status?.ber), 0);
    const totalProcured = filtered.reduce(
      (s, i) => s + toNum(i?.source?.procured),
      0,
    );
    return {
      skus: filtered.length,
      units: totalSvc + totalUns + totalBer,
      serviceable: totalSvc,
      procured: totalProcured,
    };
  }, [filtered]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-cyan-700 via-sky-400 to-blue-300 text-slate-900 overflow-x-hidden">
      <header className="sticky top-0 z-10 bg-white/70 backdrop-blur border-b">
        <div className="section py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => nav(`/sector/${encodeURIComponent(sector)}`)}
              className="soft-btn px-3 py-2"
            >
              ← {sector} Stations
            </button>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">
              {sector} • {station} — Inventory
            </h1>
          </div>
          <div className="flex gap-2">
            <button onClick={exportCSV} className="soft-btn px-3 py-2">
              Export CSV
            </button>
            <label className="soft-btn px-3 py-2 cursor-pointer">
              Import CSV
              <input
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) =>
                  e.target.files?.[0] && importCSV(e.target.files[0])
                }
              />
            </label>
          </div>
        </div>
      </header>

      <main className="section py-6 grid gap-6">
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card title="Total SKUs" value={totals.skus} footer="unique items" />
          <Card
            title="Total Units"
            value={totals.units}
            footer="Svc + Uns + BER"
          />
          <Card
            title="Serviceable"
            value={totals.serviceable}
            footer="this station"
          />
          <Card
            title="Procured"
            value={totals.procured}
            footer="this station"
          />
        </section>

        {/* ADD FORM */}
        <section className="panel panel-pad bg-gradient-to-b from-slate-700/80 via-slate-600/70 to-slate-500/60 border border-slate-600 rounded-2xl text-slate-900">
          <h2 className="font-semibold mb-3">Add Item — {station}</h2>
          <form onSubmit={handleAdd} className="grid gap-4">
            {/* row 1 */}
            <div className="grid md:grid-cols-4 gap-3">
              <input value={station} disabled readOnly className="text-input" />
              <Input
                name="equipment"
                placeholder="Equipment"
                value={newItem.equipment || ""}
                onChange={(e) =>
                  setNewItem((prev: any) => ({
                    ...prev,
                    equipment: e.target.value,
                  }))
                }
              />
              <Input
                name="type"
                placeholder="Type"
                value={newItem.type || ""}
                onChange={(e) =>
                  setNewItem((prev: any) => ({ ...prev, type: e.target.value }))
                }
              />
              <Input
                name="make"
                placeholder="Make"
                value={newItem.make || ""}
                onChange={(e) =>
                  setNewItem((prev: any) => ({ ...prev, make: e.target.value }))
                }
              />
            </div>
            {/* row 2 */}
            <div className="grid md:grid-cols-4 gap-3">
              <Input
                name="serialNo"
                placeholder="Serial No."
                value={newItem.serialNo || ""}
                onChange={(e) =>
                  setNewItem((prev: any) => ({
                    ...prev,
                    serialNo: e.target.value,
                  }))
                }
              />
              <Input
                name="propertyNo"
                placeholder="Property No."
                value={newItem.propertyNo || ""}
                onChange={(e) =>
                  setNewItem((prev: any) => ({
                    ...prev,
                    propertyNo: e.target.value,
                  }))
                }
              />
              <Input
                name="acquisitionDate"
                type={newItem.acquisitionDate ? "date" : "text"}
                placeholder="Acquisition Date"
                value={newItem.acquisitionDate || ""}
                onFocus={(e) => (e.target.type = "date")}
                onBlur={(e) => {
                  if (!e.target.value) e.target.type = "text";
                }}
                onChange={(e) =>
                  setNewItem((prev: any) => ({
                    ...prev,
                    acquisitionDate: e.target.value, // keep as YYYY-MM-DD
                  }))
                }
              />

              <Input
                name="acquisitionCost"
                type="number"
                min={0}
                placeholder="Acquisition Cost"
                value={newItem.acquisitionCost || ""}
                onChange={(e) =>
                  setNewItem((prev: any) => ({
                    ...prev,
                    acquisitionCost: Number(e.target.value),
                  }))
                }
              />
            </div>
            {/* row 3 */}
            <div className="grid md:grid-cols-4 gap-3">
              <Input
                name="costOfRepair"
                type="number"
                min={0}
                placeholder="Cost of Repair (if any)"
                value={newItem.costOfRepair || ""}
                onChange={(e) =>
                  setNewItem((prev: any) => ({
                    ...prev,
                    costOfRepair: Number(e.target.value),
                  }))
                }
              />
              <Input
                name="currentOrDepreciated"
                placeholder="Current or Depreciated"
                value={newItem.currentOrDepreciated || ""}
                onChange={(e) =>
                  setNewItem((prev: any) => ({
                    ...prev,
                    currentOrDepreciated: e.target.value,
                  }))
                }
              />
            </div>

            <fieldset className="border rounded-2xl p-3">
              <legend className="px-2 text-sm text-slate-900">STATUS</legend>
              <div className="grid md:grid-cols-3 gap-3">
                <Input
                  name="svc"
                  type="number"
                  placeholder="svc"
                  value={newItem.svc || ""}
                  onChange={(e) =>
                    setNewItem((prev: any) => ({
                      ...prev,
                      svc:
                        e.target.value === ""
                          ? undefined
                          : Number(e.target.value),
                    }))
                  }
                />
                <Input
                  name="uns"
                  type="number"
                  placeholder="uns"
                  value={newItem.uns || ""}
                  onChange={(e) =>
                    setNewItem((prev: any) => ({
                      ...prev,
                      uns:
                        e.target.value === ""
                          ? undefined
                          : Number(e.target.value),
                    }))
                  }
                />

                <Input
                  name="ber"
                  type="number"
                  placeholder="ber"
                  value={newItem.ber || ""}
                  onChange={(e) =>
                    setNewItem((prev: any) => ({
                      ...prev,
                      ber:
                        e.target.value === ""
                          ? undefined
                          : Number(e.target.value),
                    }))
                  }
                />
              </div>
            </fieldset>

            <fieldset className="border rounded-2xl p-3">
              <legend className="px-2 text-sm text-slate-900">SOURCE</legend>
              <div className="grid md:grid-cols-4 gap-3">
                <Input
                  name="procured"
                  type="number"
                  placeholder="Procured"
                  value={newItem.procured || ""}
                  onChange={(e) =>
                    setNewItem((prev: any) => ({
                      ...prev,
                      procured:
                        e.target.value === ""
                          ? undefined
                          : Number(e.target.value),
                    }))
                  }
                />
                <Input
                  name="donated"
                  type="number"
                  placeholder="Donated"
                  value={newItem.donated || ""}
                  onChange={(e) =>
                    setNewItem((prev: any) => ({
                      ...prev,
                      donated:
                        e.target.value === ""
                          ? undefined
                          : Number(e.target.value),
                    }))
                  }
                />
                <Input
                  name="foundAtStation"
                  type="number"
                  placeholder="Found at Station"
                  value={newItem.foundAtStation || ""}
                  onChange={(e) =>
                    setNewItem((prev: any) => ({
                      ...prev,
                      foundAtStation:
                        e.target.value === ""
                          ? undefined
                          : Number(e.target.value),
                    }))
                  }
                />
                <Input
                  name="loaned"
                  type="number"
                  placeholder="Loaned"
                  value={newItem.loaned ?? ""}
                  onChange={(e) =>
                    setNewItem((prev: any) => ({
                      ...prev,
                      loaned:
                        e.target.value === ""
                          ? undefined
                          : Number(e.target.value),
                    }))
                  }
                />
              </div>
            </fieldset>

            <fieldset className="border rounded-2xl p-3">
              <legend className="px-2 text-sm text-slate-900">
                WHEREABOUTS
              </legend>
              <div className="grid md:grid-cols-2 gap-3">
                <Input
                  name="userOffice"
                  placeholder="User Office"
                  value={newItem.userOffice || ""}
                  onChange={(e) =>
                    setNewItem((prev: any) => ({
                      ...prev,
                      userOffice: e.target.value,
                    }))
                  }
                />
                <Input
                  name="userName"
                  placeholder="User Name"
                  value={newItem.userName || ""}
                  onChange={(e) =>
                    setNewItem((prev: any) => ({
                      ...prev,
                      userName: e.target.value,
                    }))
                  }
                />
              </div>
            </fieldset>

            <div className="flex justify-end gap-2">
              {/* Upload Image */}
              <label className="soft-btn px-4 py-2 cursor-pointer">
                Upload Image
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) =>
                    e.target.files && handleImageUpload(e.target.files)
                  }
                />
              </label>

              {/* Add Item */}
              <button disabled={submitting} className="solid-btn px-4 py-2">
                {submitting ? "Adding..." : "Add"}
              </button>
            </div>
            {previewUrls.length > 0 && (
              <div className="mt-4">
                <div className="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-3 max-w-xl">
                  {previewUrls.map((url, idx) => {
                    const file = imageFiles[idx];

                    return (
                      <div
                        key={idx}
                        className="group relative rounded-xl border bg-white shadow-sm hover:shadow-md transition"
                      >
                        {/* Image */}
                        <img
                          src={url}
                          className="h-28 w-full object-cover rounded-t-xl cursor-pointer"
                          onClick={() => {
                            setModalImages(previewUrls);
                            setModalIndex(idx);
                          }}
                        />

                        {/* Filename */}
                        <div className="px-2 py-1 text-[11px] text-slate-600 truncate">
                          {file?.name}
                        </div>

                        {/* Remove button */}
                        <button
                          type="button"
                          className="absolute top-1 right-1 bg-black/70 text-white text-xs px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition"
                          onClick={() => {
                            setImageFiles((prev) =>
                              prev.filter((_, i) => i !== idx),
                            );
                            setPreviewUrls((prev) =>
                              prev.filter((_, i) => i !== idx),
                            );
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </form>
          <div className="flex justify-center gap-2 mt-6">
            <button
              className="h-2.5 w-2.5 rounded-full bg-slate-900"
              title="Add Item (Station Inventory)"
            />
            <button
              onClick={openQuicklook}
              className="h-2.5 w-2.5 rounded-full bg-slate-400 hover:bg-slate-600"
              title="Add to Quicklook Inventory"
            />
          </div>

          {quicklookOpen && (
            <QuicklooktEntryForm
              station={station}
              sector={sector}
              visible={quicklookVisible}
              seed={quicklookSeed} // 👈 NEW
              onClose={closeQuicklook}
            />
          )}
        </section>

        {/* Filters (kept from your earlier version if you want) */}
        <section className="panel panel-pad flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
          <div className="flex gap-2 items-center flex-wrap">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by equipment, type, make, serial no. or user"
              className="text-input w-[18rem] md:w-[28rem]"
            />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="text-input"
            >
              {types.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div className="text-sm text-slate-900">
            {loading ? "Loading..." : `${filtered.length} results`}
          </div>
        </section>

        {/* TABLE PANEL */}
        <section className="panel overflow-x-auto">
          <div className="panel-pad">
            <table className="min-w-[76rem] text-sm text-center">
              <thead>
                <tr className="bg-slate-100">
                  <th
                    className="px-4 py-2 text-center bg-slate-100"
                    colSpan={9}
                  >
                    DESCRIPTION
                  </th>
                  <th className="px-4 py-2 text-center bg-amber-50" colSpan={5}>
                    SOURCE
                  </th>
                  <th className="px-4 py-2 text-center bg-blue-50" colSpan={4}>
                    STATUS
                  </th>
                  <th
                    className="px-4 py-2 text-center bg-slate-100"
                    colSpan={2}
                  >
                    WHEREABOUTS
                  </th>
                </tr>
                <tr className="bg-slate-50">
                  <Th
                    onClick={() => toggleSort("equipment")}
                    active={sort.by === "equipment"}
                    dir={sort.dir}
                  >
                    Equipment
                  </Th>
                  <Th
                    onClick={() => toggleSort("type")}
                    active={sort.by === "type"}
                    dir={sort.dir}
                  >
                    Type
                  </Th>
                  <Th
                    onClick={() => toggleSort("make")}
                    active={sort.by === "make"}
                    dir={sort.dir}
                  >
                    Make
                  </Th>
                  <Th
                    onClick={() => toggleSort("serialNo")}
                    active={sort.by === "serialNo"}
                    dir={sort.dir}
                  >
                    Serial No.
                  </Th>
                  <Th
                    onClick={() => toggleSort("propertyNo")}
                    active={sort.by === "propertyNo"}
                    dir={sort.dir}
                  >
                    Property No.
                  </Th>
                  <Th
                    onClick={() => toggleSort("acquisitionDate")}
                    active={sort.by === "acquisitionDate"}
                    dir={sort.dir}
                  >
                    Acquisition Date
                  </Th>
                  <Th
                    onClick={() => toggleSort("acquisitionCost")}
                    active={sort.by === "acquisitionCost"}
                    dir={sort.dir}
                    className="text-center"
                  >
                    Acquisition Cost
                  </Th>
                  <Th
                    onClick={() => toggleSort("costOfRepair")}
                    active={sort.by === "costOfRepair"}
                    dir={sort.dir}
                    className="text-center"
                  >
                    Cost of Repair
                  </Th>
                  <Th
                    onClick={() => toggleSort("currentOrDepreciated")}
                    active={sort.by === "currentOrDepreciated"}
                    dir={sort.dir}
                  >
                    Current / Depreciated
                  </Th>
                  <Th className="px-4 py-2">Image</Th>

                  <Th
                    onClick={() => toggleSort("source.procured")}
                    active={sort.by === "source.procured"}
                    dir={sort.dir}
                    className="text-center bg-amber-50"
                  >
                    Procured
                  </Th>

                  <Th
                    onClick={() => toggleSort("source.donated")}
                    active={sort.by === "source.donated"}
                    dir={sort.dir}
                    className="text-center bg-amber-50"
                  >
                    Donated
                  </Th>
                  <Th
                    onClick={() => toggleSort("source.foundAtStation")}
                    active={sort.by === "source.foundAtStation"}
                    dir={sort.dir}
                    className="text-center bg-amber-50"
                  >
                    Found at Station
                  </Th>
                  <Th
                    onClick={() => toggleSort("source.loaned")}
                    active={sort.by === "source.loaned"}
                    dir={sort.dir}
                    className="text-center bg-amber-50"
                  >
                    Loaned
                  </Th>
                  <th className="px-4 py-2 text-center bg-amber-50">Total</th>

                  <Th
                    onClick={() => toggleSort("status.svc")}
                    active={sort.by === "status.svc"}
                    dir={sort.dir}
                    className="text-center bg-blue-50"
                  >
                    Svc
                  </Th>
                  <Th
                    onClick={() => toggleSort("status.uns")}
                    active={sort.by === "status.uns"}
                    dir={sort.dir}
                    className="text-center bg-blue-50"
                  >
                    Uns
                  </Th>
                  <Th
                    onClick={() => toggleSort("status.ber")}
                    active={sort.by === "status.ber"}
                    dir={sort.dir}
                    className="text-center bg-blue-50"
                  >
                    BER
                  </Th>
                  <th className="px-4 py-2 text-center bg-blue-50">Total</th>

                  <Th
                    onClick={() => toggleSort("whereabouts.userOffice")}
                    active={sort.by === "whereabouts.userOffice"}
                    dir={sort.dir}
                  >
                    User Office
                  </Th>
                  <Th
                    onClick={() => toggleSort("whereabouts.userName")}
                    active={sort.by === "whereabouts.userName"}
                    dir={sort.dir}
                  >
                    User Name
                  </Th>
                  <th className="px-4 py-2" rowSpan={2}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => {
                  const statusTotal =
                    toNum(item?.status?.svc) +
                    toNum(item?.status?.uns) +
                    toNum(item?.status?.ber);
                  const sourceTotal =
                    toNum(item?.source?.procured) +
                    toNum(item?.source?.donated) +
                    toNum(item?.source?.foundAtStation) +
                    toNum(item?.source?.loaned);

                  return (
                    <tr key={item.id} className="border-t hover:bg-slate-50">
                      <td className="px-4 py-2">{item.equipment}</td>
                      <td className="px-4 py-2">{item.type}</td>
                      <td className="px-4 py-2">{item.make}</td>
                      <td className="px-4 py-2">{item.serialNo}</td>
                      <td className="px-4 py-2">{item.propertyNo}</td>
                      <td className="px-4 py-2">{item.acquisitionDate}</td>
                      <td className="px-4 py-2 text-center">
                        {toNum(item.acquisitionCost)}
                      </td>
                      <td className="px-4 py-2 text-center">
                        {toNum(item.costOfRepair)}
                      </td>
                      <td className="px-4 py-2">{item.currentOrDepreciated}</td>
                      <td className="px-4 py-2">
                        {item.imageUrls?.length ? (
                          <button
                            className="text-blue-600 underline"
                            onClick={() => {
                              setModalImages(item.imageUrls || []);
                              setModalIndex(0);
                            }}
                          >
                            View ({item.imageUrls.length})
                          </button>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      <td className="px-4 py-2 text-center bg-amber-50/40">
                        {toNum(item?.source?.procured)}
                      </td>
                      <td className="px-4 py-2 text-center bg-amber-50/40">
                        {toNum(item?.source?.donated)}
                      </td>
                      <td className="px-4 py-2 text-center bg-amber-50/40">
                        {toNum(item?.source?.foundAtStation)}
                      </td>
                      <td className="px-4 py-2 text-center bg-amber-50/40">
                        {toNum(item?.source?.loaned)}
                      </td>
                      <td className="px-4 py-2 text-center bg-amber-50/40">
                        {sourceTotal}
                      </td>

                      <td className="px-4 py-2 text-center bg-blue-50/40">
                        {toNum(item?.status?.svc)}
                      </td>
                      <td className="px-4 py-2 text-center bg-blue-50/40">
                        {toNum(item?.status?.uns)}
                      </td>
                      <td className="px-4 py-2 text-center bg-blue-50/40">
                        {toNum(item?.status?.ber)}
                      </td>
                      <td className="px-4 py-2 text-center bg-blue-50/40">
                        {statusTotal}
                      </td>

                      <td className="px-4 py-2">
                        {item.whereabouts?.userOffice}
                      </td>
                      <td className="px-4 py-2">
                        {item.whereabouts?.userName}
                      </td>

                      <td className="px-4 py-2 text-center">
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => {
                              setEditing(item);
                              setEditImageUrls(item.imageUrls || []);
                              setEditImageFiles([]);
                              setEditPreviewUrls([]);
                            }}
                            className="soft-btn px-3 py-1"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="soft-btn px-3 py-1 hover:bg-red-50"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {initialLoading && (
                  <tr>
                    <td colSpan={21}>
                      <div className="fixed inset-0 z-40 flex items-center justify-center bg-white/60 backdrop-blur">
                        <PpoGridLoader logos={PPO_LOGOS} />
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <footer className="text-center text-xs text-slate-900 pb-8">
          {sector} • {station}
        </footer>
      </main>
      {modalImages.length > 0 && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center"
          onClick={() => setModalImages([])} // 👈 click OUTSIDE closes
        >
          <div
            className="relative flex flex-col items-center gap-4 max-w-[95vw] max-h-[95vh]"
            onClick={(e) => e.stopPropagation()} // 👈 click INSIDE does NOT close
          >
            {/* Main Image */}
            <img
              src={modalImages[modalIndex]}
              className="max-w-[90vw] max-h-[80vh] object-contain rounded-xl shadow-lg"
            />

            {/* Navigation */}
            {modalImages.length > 1 && (
              <>
                <button
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/60 text-white px-3 py-2 rounded-full"
                  onClick={() =>
                    setModalIndex((i) =>
                      i === 0 ? modalImages.length - 1 : i - 1,
                    )
                  }
                >
                  ‹
                </button>

                <button
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/60 text-white px-3 py-2 rounded-full"
                  onClick={() =>
                    setModalIndex((i) =>
                      i === modalImages.length - 1 ? 0 : i + 1,
                    )
                  }
                >
                  ›
                </button>
              </>
            )}

            {/* Thumbnails */}
            {modalImages.length > 1 && (
              <div className="flex gap-2 overflow-x-auto max-w-full px-2">
                {modalImages.map((url, idx) => (
                  <img
                    key={idx}
                    src={url}
                    onClick={() => setModalIndex(idx)}
                    className={`h-16 w-16 object-cover rounded cursor-pointer border-2 ${
                      idx === modalIndex
                        ? "border-blue-500"
                        : "border-transparent"
                    }`}
                  />
                ))}
              </div>
            )}

            {/* Close button */}
            <button
              className="absolute top-2 right-2 bg-black/70 text-white px-3 py-1 rounded"
              onClick={() => setModalImages([])}
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {editing && (
        <div
          className="fixed inset-0 bg-black/20 flex items-center justify-center p-4"
          onClick={() => setEditing(null)}
        >
          <div
            className="panel panel-pad w-full max-w-4xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-semibold mb-3">Edit Item — {station}</h3>
            <form onSubmit={handleEditSave} className="grid gap-4">
              {/* Row 1 */}
              <div className="grid md:grid-cols-4 gap-3">
                <input
                  value={station}
                  disabled
                  readOnly
                  className="text-input"
                />
                <Input
                  name="equipment"
                  placeholder="Equipment"
                  className="text-input"
                  value={editing.equipment || ""}
                  onChange={(e) =>
                    setEditing((prev) => ({
                      ...prev!,
                      equipment: e.target.value,
                    }))
                  }
                />
                <Input
                  name="type"
                  placeholder="Type"
                  className="text-input"
                  value={editing.type || ""}
                  onChange={(e) =>
                    setEditing((prev) => ({ ...prev!, type: e.target.value }))
                  }
                />
                <Input
                  name="make"
                  placeholder="Make"
                  className="text-input"
                  value={editing.make || ""}
                  onChange={(e) =>
                    setEditing((prev) => ({ ...prev!, make: e.target.value }))
                  }
                />
              </div>

              {/* Row 2 */}
              <div className="grid md:grid-cols-4 gap-3">
                <Input
                  name="serialNo"
                  placeholder="Serial No."
                  className="text-input"
                  value={editing.serialNo || ""}
                  onChange={(e) =>
                    setEditing((prev) => ({
                      ...prev!,
                      serialNo: e.target.value,
                    }))
                  }
                />
                <Input
                  name="propertyNo"
                  placeholder="Property No."
                  className="text-input"
                  value={editing.propertyNo || ""}
                  onChange={(e) =>
                    setEditing((prev) => ({
                      ...prev!,
                      propertyNo: e.target.value,
                    }))
                  }
                />
                <Input
                  name="acquisitionDate"
                  type={editing.acquisitionDate ? "date" : "text"}
                  placeholder="Acquisition Date"
                  className="text-input"
                  value={editing.acquisitionDate || ""}
                  onFocus={(e) => (e.target.type = "date")}
                  onBlur={(e) => {
                    if (!e.target.value) e.target.type = "text";
                  }}
                  onChange={(e) =>
                    setEditing((prev) => ({
                      ...prev!,
                      acquisitionDate: e.target.value,
                    }))
                  }
                />
                <Input
                  name="acquisitionCost"
                  type="number"
                  min={0}
                  placeholder="Acquisition Cost"
                  className="text-input"
                  value={editing.acquisitionCost || ""}
                  onChange={(e) =>
                    setEditing((prev) => ({
                      ...prev!,
                      acquisitionCost: Number(e.target.value),
                    }))
                  }
                />
              </div>

              {/* Row 3 */}
              <div className="grid md:grid-cols-4 gap-3">
                <Input
                  name="costOfRepair"
                  type="number"
                  min={0}
                  placeholder="Cost of Repair"
                  className="text-input"
                  value={editing.costOfRepair || ""}
                  onChange={(e) =>
                    setEditing((prev) => ({
                      ...prev!,
                      costOfRepair: Number(e.target.value),
                    }))
                  }
                />
                <Input
                  name="currentOrDepreciated"
                  placeholder="Current or Depreciated"
                  className="text-input md:col-span-2"
                  value={editing.currentOrDepreciated || ""}
                  onChange={(e) =>
                    setEditing((prev) => ({
                      ...prev!,
                      currentOrDepreciated: e.target.value,
                    }))
                  }
                />
              </div>

              {/* STATUS */}
              <fieldset className="border rounded-2xl p-3">
                <legend className="px-2 text-sm text-slate-900">STATUS</legend>
                <div className="grid md:grid-cols-3 gap-3">
                  <Input
                    name="svc"
                    type="number"
                    min={0}
                    placeholder="Svc"
                    className="text-input"
                    value={editing.status?.svc || ""}
                    onChange={(e) =>
                      setEditing((prev) => ({
                        ...prev!,
                        status: {
                          ...prev!.status,
                          svc: Number(e.target.value),
                        },
                      }))
                    }
                  />
                  <Input
                    name="uns"
                    type="number"
                    min={0}
                    placeholder="Uns"
                    className="text-input"
                    value={editing.status?.uns || ""}
                    onChange={(e) =>
                      setEditing((prev) => ({
                        ...prev!,
                        status: {
                          ...prev!.status,
                          uns: Number(e.target.value),
                        },
                      }))
                    }
                  />
                  <Input
                    name="ber"
                    type="number"
                    min={0}
                    placeholder="Ber"
                    className="text-input"
                    value={editing.status?.ber || ""}
                    onChange={(e) =>
                      setEditing((prev) => ({
                        ...prev!,
                        status: {
                          ...prev!.status,
                          ber: Number(e.target.value),
                        },
                      }))
                    }
                  />
                </div>
              </fieldset>

              {/* SOURCE */}
              <fieldset className="border rounded-2xl p-3">
                <legend className="px-2 text-sm text-slate-900">SOURCE</legend>
                <div className="grid md:grid-cols-4 gap-3">
                  <Input
                    name="procured"
                    type="number"
                    min={0}
                    placeholder="Procured"
                    className="text-input"
                    value={editing.source?.procured || ""}
                    onChange={(e) =>
                      setEditing((prev) => ({
                        ...prev!,
                        source: {
                          ...prev!.source,
                          procured: Number(e.target.value),
                        },
                      }))
                    }
                  />
                  <Input
                    name="donated"
                    type="number"
                    min={0}
                    placeholder="Donated"
                    className="text-input"
                    value={editing.source?.donated || ""}
                    onChange={(e) =>
                      setEditing((prev) => ({
                        ...prev!,
                        source: {
                          ...prev!.source,
                          donated: Number(e.target.value),
                        },
                      }))
                    }
                  />
                  <Input
                    name="foundAtStation"
                    type="number"
                    min={0}
                    placeholder="Found at Station"
                    className="text-input"
                    value={editing.source?.foundAtStation || ""}
                    onChange={(e) =>
                      setEditing((prev) => ({
                        ...prev!,
                        source: {
                          ...prev!.source,
                          foundAtStation: Number(e.target.value),
                        },
                      }))
                    }
                  />
                  <Input
                    name="loaned"
                    type="number"
                    min={0}
                    placeholder="Loaned"
                    className="text-input"
                    value={editing.source?.loaned || ""}
                    onChange={(e) =>
                      setEditing((prev) => ({
                        ...prev!,
                        source: {
                          ...prev!.source,
                          loaned: Number(e.target.value),
                        },
                      }))
                    }
                  />
                </div>
              </fieldset>

              {/* WHEREABOUTS */}
              <fieldset className="border rounded-2xl p-3">
                <legend className="px-2 text-sm text-slate-900">
                  WHEREABOUTS
                </legend>
                <div className="grid md:grid-cols-2 gap-3">
                  <Input
                    name="userOffice"
                    placeholder="User Office"
                    className="text-input"
                    value={editing.whereabouts?.userOffice || ""}
                    onChange={(e) =>
                      setEditing((prev) => ({
                        ...prev!,
                        whereabouts: {
                          ...prev!.whereabouts,
                          userOffice: e.target.value,
                        },
                      }))
                    }
                  />
                  <Input
                    name="userName"
                    placeholder="User Name"
                    className="text-input"
                    value={editing.whereabouts?.userName || ""}
                    onChange={(e) =>
                      setEditing((prev) => ({
                        ...prev!,
                        whereabouts: {
                          ...prev!.whereabouts,
                          userName: e.target.value,
                        },
                      }))
                    }
                  />
                </div>
              </fieldset>
              {/* IMAGES */}
              <fieldset className="border rounded-2xl p-3">
                <legend className="px-2 text-sm text-slate-900">IMAGES</legend>

                {/* Existing images */}
                {editImageUrls.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs mb-1">Current images</p>

                    <div className="grid grid-cols-[repeat(auto-fill,minmax(110px,1fr))] gap-3">
                      {editImageUrls.map((url, idx) => {
                        const fileName = decodeURIComponent(
                          url.split("/").pop() || "",
                        );

                        return (
                          <div
                            key={idx}
                            className="group relative rounded-lg border bg-white overflow-hidden shadow-sm"
                          >
                            {/* Image (clickable) */}
                            <img
                              src={url}
                              className="h-24 w-full object-cover cursor-pointer"
                              onClick={() => {
                                setModalImages(editImageUrls);
                                setModalIndex(idx);
                              }}
                            />

                            {/* Filename */}
                            <div className="px-1 py-0.5 text-[10px] text-slate-600 truncate">
                              {fileName}
                            </div>

                            {/* Remove */}
                            <button
                              type="button"
                              className="absolute top-1 right-1 bg-black/70 text-white text-xs px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition"
                              onClick={() =>
                                setEditImageUrls((prev) =>
                                  prev.filter((_, i) => i !== idx),
                                )
                              }
                            >
                              ✕
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* New uploads */}
                <div className="flex items-center gap-3">
                  <label className="soft-btn px-3 py-2 cursor-pointer">
                    Upload New Images
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) =>
                        e.target.files && handleEditImageUpload(e.target.files)
                      }
                    />
                  </label>
                </div>

                {editPreviewUrls.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs mb-1">New images (to be uploaded)</p>

                    <div className="grid grid-cols-[repeat(auto-fill,minmax(110px,1fr))] gap-3">
                      {editPreviewUrls.map((url, idx) => {
                        const file = editImageFiles[idx];

                        return (
                          <div
                            key={idx}
                            className="group relative rounded-lg border bg-white overflow-hidden shadow-sm"
                          >
                            {/* Image (clickable) */}
                            <img
                              src={url}
                              className="h-24 w-full object-cover cursor-pointer"
                              onClick={() => {
                                setModalImages(editPreviewUrls);
                                setModalIndex(idx);
                              }}
                            />

                            {/* Filename */}
                            <div className="px-1 py-0.5 text-[10px] text-slate-600 truncate">
                              {file?.name}
                            </div>

                            {/* Remove */}
                            <button
                              type="button"
                              className="absolute top-1 right-1 bg-black/70 text-white text-xs px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition"
                              onClick={() => {
                                setEditImageFiles((prev) =>
                                  prev.filter((_, i) => i !== idx),
                                );
                                setEditPreviewUrls((prev) =>
                                  prev.filter((_, i) => i !== idx),
                                );
                              }}
                            >
                              ✕
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </fieldset>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditing(null);
                    setEditImageUrls([]);
                    setEditImageFiles([]);
                    setEditPreviewUrls([]);
                  }}
                  className="soft-btn px-4 py-2"
                >
                  Cancel
                </button>
                <button className="solid-btn px-4 py-2">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
