//overall ui with Station Inventory
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toNum, getSession, clearSession } from "../../utils/storage";
import Swal from "sweetalert2";
import { Card, Th, Input } from "../../components/UI";
import { supabase } from "../../lib/supabase";
import PpoGridLoader from "../../components/PpoGridLoader";
import { CSV_HEADERS, PAGE_SIZE, PPO_LOGOS } from "./constants";
import { mapRowToItem } from "./mapper";
import { normalizeCSVDate } from "./csv";
import type { Item } from "./types";
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
  const [newItem, setNewItem] = useState<any>({});
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);

  const [modalImages, setModalImages] = useState<string[]>([]);
  const [modalIndex, setModalIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [editImageUrls, setEditImageUrls] = useState<string[]>([]);
  const [editImageFiles, setEditImageFiles] = useState<File[]>([]);
  const [editPreviewUrls, setEditPreviewUrls] = useState<string[]>([]);

  const [tableCleared, setTableCleared] = useState(false);
  const [page, setPage] = useState(1);
  const csvInputRef = useRef<HTMLInputElement | null>(null);

  const sleep = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));
  const [initialLoading, setInitialLoading] = useState(true);
  const [csvLimit, setCsvLimit] = useState<number | null>(null);
  const [noSession, setNoSession] = useState(false);

  const session = getSession();

  // Check for session on mount - redirect if not logged in
  useEffect(() => {
    if (!session) {
      setNoSession(true);
      Swal.fire({
        title: "Access Denied",
        text: "You must log in to access this station.",
        icon: "warning",
        confirmButtonText: "Go to Sector Dashboard",
        allowOutsideClick: false,
        allowEscapeKey: false,
      }).then(() => {
        nav(`/sector/${encodeURIComponent(sector)}`);
      });
    }
  }, [session, sector, nav]);

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

  useEffect(() => {
    if (!query && typeFilter === "All") {
      setCsvLimit(null);
    }
  }, [query, typeFilter]);

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
        .from("cstation_inventory")
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

  const types = useMemo(() => {
    return [
      "All",
      ...Array.from(new Set(stationItems.map((i) => i.type || ""))),
    ];
  }, [stationItems]);

  const baseRows = stationItems;

  const filtered = useMemo(() => {
    let rows = baseRows;

    // 🧹 Clear table
    if (tableCleared) return [];

    // 📄 CSV view (most recent N)
    if (csvLimit !== null) {
      rows = rows.slice(0, csvLimit);
    }

    if (typeFilter !== "All") {
      rows = rows.filter((i) => i.type === typeFilter);
    }

    if (query.trim()) {
      const q = query.trim().toLowerCase();
      rows = rows.filter(
        (i) =>
          (i.caliber || "").toLowerCase().includes(q) ||
          (i.type || "").toLowerCase().includes(q) ||
          (i.make || "").toLowerCase().includes(q) ||
          (i.serial_no || "").toLowerCase().includes(q) ||
          (i.semi_expendable_property_nr || "").toLowerCase().includes(q) ||
          (i.whereabouts?.user_name || "").toLowerCase().includes(q),
      );
    }

    return rows;
  }, [baseRows, query, typeFilter, csvLimit, tableCleared]);

  useEffect(() => {
    setPage(1);
  }, [filtered.length]);

  const REQUIRED_TEXT_FIELDS = [
    "caliber",
    "type",
    "make",
    "serial_no",
    "semi_expendable_property_nr",
    "current_or_depreciated",
    "status",
    "source",
    "disposition",
    "issuance",
    "user_office",
    "user_name",
  ];

  const REQUIRED_NUMBER_FIELDS = ["acquisition_cost"];

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
        caliber: String(newItem.caliber || "").trim(),
        type: String(newItem.type || "").trim(),
        make: String(newItem.make || "").trim(),
        serial_no: String(newItem.serial_no || "").trim(),
        semi_expendable_property_nr: String(
          newItem.semi_expendable_property_nr || "",
        ).trim(),
        acquisition_date: newItem.acquisition_date || null,
        acquisition_cost: toNum(newItem.acquisition_cost),
        cost_of_repair: toNum(newItem.cost_of_repair),
        current_or_depreciated: String(newItem.current_or_depreciated || ""),
        status: newItem.status || "svc",
        source: newItem.source || "organic",
        disposition: newItem.disposition || "onhand",
        issuance: newItem.issuance || "assigned",
        on_hand_qty: toNum(newItem.onHandQty),
        on_hand_value: toNum(newItem.onHandValue),

        user_office: String(newItem.user_office || ""),
        user_name: String(newItem.user_name || ""),
      };

      // 2️⃣ Validate FIRST
      const missingTextFields = REQUIRED_TEXT_FIELDS.filter(
        (key) => !String(newItem[key] || "").trim(),
      );

      const missingNumberFields = REQUIRED_NUMBER_FIELDS.filter(
        (key) =>
          newItem[key] === undefined ||
          newItem[key] === null ||
          Number.isNaN(Number(newItem[key])),
      );

      const missingDate = !newItem.acquisition_date;

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
        .from("cstation_inventory")
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

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  const paginatedRows = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

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
      const payload: any = {
        sector,
        station,
        caliber: String(editing.caliber || "").trim(),
        type: String(editing.type || "").trim(),
        make: String(editing.make || "").trim(),
        serial_no: String(editing.serial_no || "").trim(),
        semi_expendable_property_nr: String(
          editing.semi_expendable_property_nr || "",
        ).trim(),
        acquisition_date: editing.acquisition_date || null,
        acquisition_cost: toNum(editing.acquisition_cost),
        cost_of_repair: toNum(editing.cost_of_repair),
        current_or_depreciated: String(editing.current_or_depreciated || ""),
        on_hand_qty: toNum(editing.on_hand_qty),
        on_hand_value: toNum(editing.on_hand_value),
        user_office: String(editing.whereabouts?.user_office || ""),
        user_name: String(editing.whereabouts?.user_name || ""),
        image_urls: finalImageUrls,
      };

      // enums — conditional (same rule as CSV)
      if (editing.status) payload.status = editing.status;
      if (editing.source) payload.source = editing.source;
      if (editing.disposition) payload.disposition = editing.disposition;
      if (editing.issuance) payload.issuance = editing.issuance;

      // 4️⃣ Update DB
      const { data: updated, error } = await supabase
        .from("cstation_inventory")
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
      .from("cstation_inventory")
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

  const clean = (v: any) => {
    const s = String(v ?? "")
      .trim()
      .toLowerCase();
    return s === "" ? null : s;
  };

  const mapCSVRowToPayload = (row: any) => {
    const payload: any = {
      sector,
      station,
      caliber: String(row.caliber || "").trim(),
      type: String(row.type || "").trim(),
      make: String(row.make || "").trim(),
      serial_no: String(row.serial_no || "").trim(),
      semi_expendable_property_nr: String(
        row.semi_expendable_property_nr || "",
      ).trim(),
      acquisition_date: normalizeCSVDate(row.acquisition_date) || null,
      acquisition_cost: toNum(row.acquisition_cost),
      cost_of_repair: toNum(row.cost_of_repair),
      current_or_depreciated: String(row.current_or_depreciated || "").trim(),
      user_office: String(row.user_office || "").trim(),
      user_name: String(row.user_name || "").trim(),
    };

    const statusRaw = clean(row.status);
    const STATUS_MAP: Record<string, string> = {
      svc: "svc",
      serviceable: "svc",
      uns: "uns",
      unserviceable: "uns",
      ber: "ber",
      beyondrepair: "ber",
    };
    if (statusRaw && STATUS_MAP[statusRaw]) {
      payload.status = STATUS_MAP[statusRaw];
    }

    const sourceRaw = clean(row.source);
    const SOURCE_MAP: Record<string, string> = {
      organic: "organic",
      donated: "donated",
      loaned: "loaned",
    };
    if (sourceRaw && SOURCE_MAP[sourceRaw]) {
      payload.source = SOURCE_MAP[sourceRaw];
    }

    const dispositionRaw = clean(row.disposition);

    const DISPOSITION_MAP: Record<string, string> = {
      onhand: "onhand",
      issued: "issued",

      // common CSV mistakes
      "on hand": "onhand",
      "on-hand": "onhand",
      issue: "issued",
      issuedto: "issued",
      yes: "issued",
      no: "onhand",
    };

    if (dispositionRaw && DISPOSITION_MAP[dispositionRaw]) {
      payload.disposition = DISPOSITION_MAP[dispositionRaw];
    }
    // ❗ else → do NOT set payload.disposition at all

    const issuanceRaw = clean(row.issuance);

    const ISSUANCE_MAP: Record<string, string> = {
      assigned: "assigned",
      temporary: "temporary",
      permanent: "permanent",

      // common CSV mistakes
      issued: "assigned",
      onhand: "assigned",
    };

    if (issuanceRaw && ISSUANCE_MAP[issuanceRaw]) {
      payload.issuance = ISSUANCE_MAP[issuanceRaw];
    }

    return payload;
  };

  const getCSVValue = (i: any, h: string) => {
    const map: Record<string, any> = {
      station: i.station,
      caliber: i.caliber,
      serial_no: i.serial_no,
      semi_expendable_property_nr: i.semi_expendable_property_nr,
      acquisition_date: i.acquisition_date,
      acquisitionCost: i.acquisition_cost,
      cost_of_repair: i.cost_of_repair,
      current_or_depreciated: i.current_or_depreciated,
      svc: i?.status === "svc" ? 1 : 0,
      uns: i?.status === "uns" ? 1 : 0,
      ber: i?.status === "ber" ? 1 : 0,
      procured: i?.source === "organic" ? 1 : 0,
      donated: i?.source === "donated" ? 1 : 0,
      foundAtStation: 0,
      loaned: i?.source === "loaned" ? 1 : 0,
      user_office: i?.whereabouts?.user_office,
      user_name: i?.whereabouts?.user_name,
    };
    return h in map ? map[h] : i?.[h];
  };

  const exportCSV = () => {
    const rows = [
      CSV_HEADERS.join(","),
      ...filtered.map((i) =>
        CSV_HEADERS.map((h) => {
          const value = getCSVValue(i, h);
          // Always stringify values so Excel shows dates immediately
          // and avoids rendering column as #### until resized/clicked.
          if (value === undefined || value === null) return '""';
          return JSON.stringify(value);
        }).join(","),
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

  const handleExportClick = async () => {
    const result = await Swal.fire({
      title: "CSV viewing guide",
      icon: "info",
      width: 680,
      confirmButtonText: "Continue export",
      showCancelButton: true,
      cancelButtonText: "Cancel",
      html: `
        <div style="text-align:left">
          <p style="margin-bottom:8px;">
            After exporting, open the CSV in Excel and check date cells like <code>acquisition_date</code>.
          </p>
          <p style="margin-bottom:8px;">
            If date value looks hidden or appears as ####:
          </p>
          <ol style="margin:0 0 8px 18px; padding:0;">
            <li>Click the date cell once.</li>
            <li>Double-click the same cell to reveal full value.</li>
            <li>Widen the column if needed.</li>
          </ol>
          <p style="margin-bottom:0;">
            You can also format the column as <code>Date</code> to display it properly.
          </p>
        </div>
      `,
    });

    if (result.isConfirmed) {
      exportCSV();
    }
  };

  const handleImportClick = async () => {
    const headers = Array.from(new Set(CSV_HEADERS));
    const headerList = headers.map((h) => `<code>${h}</code>`).join(", ");

    const result = await Swal.fire({
      title: "CSV format check",
      icon: "info",
      width: 700,
      confirmButtonText: "I understand, continue",
      showCancelButton: true,
      cancelButtonText: "Cancel",
      html: `
        <div style="text-align:left">
          <p style="margin-bottom:8px;">
            Use exact column names and spelling to avoid import errors.
          </p>
          <p style="margin-bottom:8px;">
            <strong>Required headers:</strong><br/>${headerList}
          </p>
          <p style="margin-bottom:8px;">
            <strong>Accepted values:</strong><br/>
            <code>status</code>: svc, uns, ber<br/>
            <code>source</code>: organic, donated, loaned<br/>
            <code>disposition</code>: onhand, issued<br/>
            <code>issuance</code>: assigned, temporary, permanent
          </p>
          <p style="margin-bottom:0;">
            Use <code>YYYY-MM-DD</code> for <code>acquisition_date</code> and numeric values for cost columns.
          </p>
        </div>
      `,
    });

    if (result.isConfirmed) {
      csvInputRef.current?.click();
    }
  };

  // IMPORT CSV → insert into Supabase
  const importCSV = async (file: File) => {
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter(Boolean);
    const [header, ...rest] = lines;
    const cols = header.split(",").map((s) => s.replaceAll('"', ""));

    const isStationCSV = CSV_HEADERS.every((h) => cols.includes(h));

    if (!isStationCSV) {
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

    // 👉 STATION INVENTORY CSV → INSERT TO DB
    const payloads = rows.map(mapCSVRowToPayload);
    console.log(payloads.map((p) => p.disposition));
    payloads.forEach((p, i) => {
      if ("disposition" in p && !p.disposition) {
        delete p.disposition;
      }
      if ("issuance" in p && !p.issuance) {
        delete p.issuance;
      }
    });
    console.table(
      payloads.map((p) => ({
        disposition: p.disposition,
        issuance: p.issuance,
      })),
    );

    const { data: inserted, error } = await supabase
      .from("cstation_inventory")

      .insert(payloads)
      .select("*");

    if (error) {
      Swal.fire("Import failed", error.message, "error");
      return;
    }

    if (!inserted || inserted.length === 0) {
      Swal.fire("Import failed", "No rows were inserted.", "error");
      return;
    }

    // optional: activity log
    await supabase.from("inventory_activity_log").insert(
      inserted.map((row) => ({
        sector,
        station,
        inventory_id: row.id,
        action: "CSV_IMPORT",
        performed_department: session?.department ?? "Unknown",
        performed_by: session?.name ?? null,
        snapshot: row,
      })),
    );

    // 🔥 UPDATE TABLE IMMEDIATELY
    setItems((prev) => [...inserted.map(mapRowToItem), ...prev]);

    // 🔥 SHOW ONLY THE IMPORTED CSV ROWS
    setCsvLimit(inserted.length);
    setTableCleared(false);
    setQuery("");
    setTypeFilter("All");
    setPage(1);

    Swal.fire(
      "Import successful",
      `${inserted.length} items imported from CSV.`,
      "success",
    );
  };

  const totals = useMemo(() => {
    const totalSvc = filtered.reduce(
      (s, i) => s + (i?.status === "svc" ? 1 : 0),
      0,
    );
    const totalUns = filtered.reduce(
      (s, i) => s + (i?.status === "uns" ? 1 : 0),
      0,
    );
    const totalBer = filtered.reduce(
      (s, i) => s + (i?.status === "ber" ? 1 : 0),
      0,
    );
    const totalProcured = filtered.reduce(
      (s, i) => s + (i?.source === "organic" ? 1 : 0),
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
        <div className="mx-auto w-full max-w-[95rem] px-4 py-4 xl:px-8 flex items-center justify-between gap-3">
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
          <div className="flex gap-2 items-center">
            {session && (
              <span className="text-xs text-slate-700 bg-slate-100 px-2 py-1 rounded">
                {session.name || session.department}
              </span>
            )}
            <button
              onClick={() => {
                Swal.fire({
                  title: "Logout",
                  text: "Are you sure you want to logout?",
                  icon: "question",
                  showCancelButton: true,
                  confirmButtonText: "Yes, logout",
                  cancelButtonText: "Cancel",
                }).then((result) => {
                  if (result.isConfirmed) {
                    clearSession();
                    nav(`/sector/${encodeURIComponent(sector)}`);
                  }
                });
              }}
              className="soft-btn px-3 py-2 bg-red-50 text-red-700 hover:bg-red-100"
            >
              Logout
            </button>
            <button onClick={handleExportClick} className="soft-btn px-3 py-2">
              Export CSV
            </button>

            {tableCleared ? (
              <button
                onClick={() => {
                  setCsvLimit(null);
                  setTableCleared(false);
                }}
                className="soft-btn px-3 py-2"
              >
                Render All Data
              </button>
            ) : csvLimit !== null ? (
              <button
                onClick={() => setCsvLimit(null)}
                className="soft-btn px-3 py-2"
              >
                Render All Data
              </button>
            ) : (
              <button
                onClick={async () => {
                  const res = await Swal.fire({
                    title: "Clear table view?",
                    text: "This will NOT delete data from the database.",
                    icon: "warning",
                    showCancelButton: true,
                    confirmButtonText: "Clear view",
                    cancelButtonText: "Cancel",
                  });

                  if (res.isConfirmed) {
                    setTableCleared(true);
                    setCsvLimit(null); // ⬅️ IMPORTANT
                    setQuery("");
                    setTypeFilter("All");
                  }
                }}
                className="soft-btn px-3 py-2"
              >
                Clear Table
              </button>
            )}

            <button
              type="button"
              onClick={handleImportClick}
              className="soft-btn px-3 py-2"
            >
              Import CSV
            </button>
            <input
              ref={csvInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) {
                  importCSV(file);
                }
              }}
            />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[95rem] px-4 py-8 xl:px-8 grid gap-6">
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
              <select
                value={newItem.type || ""}
                onChange={(e) =>
                  setNewItem((prev: any) => ({
                    ...prev,
                    type: e.target.value as "Long FAs" | "Short FAs",
                  }))
                }
                className="text-input"
              >
                <option value="">Types</option>
                <option value="Long FAs">Long FAs</option>
                <option value="Short FAs">Short FAs</option>
              </select>
              <select
                value={newItem.make || ""}
                onChange={(e) =>
                  setNewItem((prev: any) => ({
                    ...prev,
                    make: e.target.value,
                  }))
                }
                className="text-input"
              >
                <option value="">Make</option>
                <option value="norinco">Norinco</option>
                <option value="elisco">Elisco</option>
                <option value="colt">Colt</option>
                <option value="ferfrans">Ferfrans</option>
                <option value="galil">GALIL ACE22N</option>
              </select>
              <Input
                name="caliber"
                placeholder="Caliber"
                value={newItem.caliber || ""}
                onChange={(e) =>
                  setNewItem((prev: any) => ({
                    ...prev,
                    caliber: e.target.value,
                  }))
                }
              />
            </div>
            {/* row 2 */}
            <div className="grid md:grid-cols-4 gap-3">
              <Input
                name="serial_no"
                placeholder="Serial No."
                value={newItem.serial_no || ""}
                onChange={(e) =>
                  setNewItem((prev: any) => ({
                    ...prev,
                    serial_no: e.target.value,
                  }))
                }
              />
              <Input
                name="semi_expendable_property_nr"
                placeholder="Semi-Expandable Property Nr"
                value={newItem.semi_expendable_property_nr || ""}
                onChange={(e) =>
                  setNewItem((prev: any) => ({
                    ...prev,
                    semi_expendable_property_nr: e.target.value,
                  }))
                }
              />
              <Input
                name="acquisition_date"
                type={newItem.acquisition_date ? "date" : "text"}
                placeholder="Acquisition Date"
                value={newItem.acquisition_date || ""}
                onFocus={(e) => (e.target.type = "date")}
                onBlur={(e) => {
                  if (!e.target.value) e.target.type = "text";
                }}
                onChange={(e) =>
                  setNewItem((prev: any) => ({
                    ...prev,
                    acquisition_date: e.target.value, // keep as YYYY-MM-DD
                  }))
                }
              />

              <Input
                name="acquisition_cost"
                type="number"
                min={0}
                placeholder="Acquisition Cost"
                value={newItem.acquisition_cost || ""}
                onChange={(e) =>
                  setNewItem((prev: any) => ({
                    ...prev,
                    acquisition_cost: Number(e.target.value),
                  }))
                }
              />
            </div>
            {/* row 3 */}
            <div className="grid md:grid-cols-4 gap-3">
              <Input
                name="cost_of_repair"
                type="number"
                min={0}
                placeholder="Cost of Repair (if any)"
                value={newItem.cost_of_repair || ""}
                onChange={(e) =>
                  setNewItem((prev: any) => ({
                    ...prev,
                    cost_of_repair: Number(e.target.value),
                  }))
                }
              />
              <Input
                name="current_or_depreciated"
                placeholder="Current or Depreciated"
                value={newItem.current_or_depreciated || ""}
                onChange={(e) =>
                  setNewItem((prev: any) => ({
                    ...prev,
                    current_or_depreciated: e.target.value,
                  }))
                }
              />
            </div>

            <fieldset className="border rounded-2xl p-3">
              <legend className="px-2 text-sm font-semibold text-slate-900">
                PROPERTIES
              </legend>
              <div className="grid md:grid-cols-4 gap-3">
                <select
                  value={newItem.source || ""}
                  onChange={(e) =>
                    setNewItem((prev: any) => ({
                      ...prev,
                      source: e.target.value,
                    }))
                  }
                  className="text-input"
                >
                  <option value="">Source</option>
                  <option value="organic">Organic</option>
                  <option value="donated">Donated</option>
                  <option value="loaned">Loaned</option>
                </select>

                <select
                  value={newItem.status || ""}
                  onChange={(e) =>
                    setNewItem((prev: any) => ({
                      ...prev,
                      status: e.target.value,
                    }))
                  }
                  className="text-input"
                >
                  <option value="">Status</option>
                  <option value="svc">Serviceable</option>
                  <option value="uns">Unserviceable</option>
                  <option value="ber">Beyond Economic Repair</option>
                </select>

                <select
                  value={newItem.disposition || ""}
                  onChange={(e) =>
                    setNewItem((prev: any) => ({
                      ...prev,
                      disposition: e.target.value,
                    }))
                  }
                  className="text-input"
                >
                  <option value="">Disposition</option>
                  <option value="onhand">On Hand</option>
                  <option value="issued">Issued</option>
                </select>

                <select
                  value={newItem.issuance || ""}
                  onChange={(e) =>
                    setNewItem((prev: any) => ({
                      ...prev,
                      issuance: e.target.value,
                    }))
                  }
                  className="text-input"
                >
                  <option value="">Issuance Type</option>
                  <option value="assigned">Assigned</option>
                  <option value="temporary">Temporary</option>
                  <option value="permanent">Permanent</option>
                </select>
              </div>
            </fieldset>

            <fieldset className="border rounded-2xl p-3">
              <legend className="px-2 text-sm text-slate-900">
                ON HAND PER COUNT
              </legend>
              <div className="grid md:grid-cols-2 gap-3">
                <Input
                  name="on_hand_qty"
                  type="number"
                  min={0}
                  placeholder="Qty"
                  value={newItem.on_hand_qty || ""}
                  onChange={(e) =>
                    setNewItem((prev: any) => ({
                      ...prev,
                      on_hand_qty: Number(e.target.value),
                    }))
                  }
                />
                <Input
                  name="on_hand_value"
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="Value"
                  value={newItem.on_hand_value || ""}
                  onChange={(e) =>
                    setNewItem((prev: any) => ({
                      ...prev,
                      on_hand_value: Number(e.target.value),
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
                  name="user_office"
                  placeholder="User Office"
                  value={newItem.user_office || ""}
                  onChange={(e) =>
                    setNewItem((prev: any) => ({
                      ...prev,
                      user_office: e.target.value,
                    }))
                  }
                />
                <Input
                  name="user_name"
                  placeholder="User Name"
                  value={newItem.user_name || ""}
                  onChange={(e) =>
                    setNewItem((prev: any) => ({
                      ...prev,
                      user_name: e.target.value,
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
        </section>

        {/* Filters */}
        <section className="rounded-2xl border border-slate-200/70 bg-white/70 p-4 shadow-sm backdrop-blur">
          <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
            <div className="flex gap-2 items-center flex-wrap">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by caliber, type, make, serial no. or user"
                className="h-11 w-full max-w-[28rem] rounded-xl border border-slate-200 bg-white pl-3 pr-10 text-sm shadow-sm focus:ring-4 focus:ring-blue-200"
              />
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm shadow-sm focus:ring-4 focus:ring-blue-200"
              >
                {types.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div className="text-sm text-slate-900">
              {`${filtered.length} results`}
            </div>
          </div>
        </section>

        {/* TABLE PANEL */}

        <section className="panel overflow-x-auto">
          {/* HEADER — full width, respects rounded corners */}

          <div className="rounded-t-2xl border-b bg-gradient-to-r from-slate-900 to-slate-800 px-4 py-3 text-sm font-semibold text-white">
            STATUS OF FIREARMS
          </div>

          {/* SCROLL AREA */}
          <div className="overflow-x-auto">
            <div className="p-5 md:p-6">
              <table className="min-w-[1800px] border-collapse text-sm">
                <thead className="sticky top-0 z-20 bg-slate-50">
                  <tr className="bg-slate-50 text-slate-600 uppercase text-xs tracking-wide">
                    <th className="px-4 py-2 text-center" colSpan={10}>
                      DESCRIPTION
                    </th>
                    <th className="px-4 py-2 text-center" colSpan={3}>
                      SOURCE
                    </th>
                    <th className="px-4 py-2 text-center">STATUS</th>
                    <th className="px-4 py-2 text-center" colSpan={2}>
                      ON HAND PER COUNT
                    </th>
                    <th className="px-4 py-2 text-center" colSpan={2}>
                      WHEREABOUTS
                    </th>
                  </tr>
                  <tr className="bg-white text-slate-500 text-xs border-t">
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
                      onClick={() => toggleSort("caliber")}
                      active={sort.by === "caliber"}
                      dir={sort.dir}
                    >
                      Caliber
                    </Th>
                    <Th
                      onClick={() => toggleSort("serial_no")}
                      active={sort.by === "serial_no"}
                      dir={sort.dir}
                    >
                      Serial No.
                    </Th>
                    <Th
                      onClick={() => toggleSort("semi_expendable_property_nr")}
                      active={sort.by === "semi_expendable_property_nr"}
                      dir={sort.dir}
                    >
                      Semi-Expendable Property Nr
                    </Th>
                    <Th
                      onClick={() => toggleSort("acquisition_date")}
                      active={sort.by === "acquisition_date"}
                      dir={sort.dir}
                    >
                      Acquisition Date
                    </Th>
                    <Th
                      onClick={() => toggleSort("acquisition_cost")}
                      active={sort.by === "acquisition_cost"}
                      dir={sort.dir}
                      className="text-center"
                    >
                      Acquisition Cost
                    </Th>
                    <Th
                      onClick={() => toggleSort("cost_of_repair")}
                      active={sort.by === "cost_of_repair"}
                      dir={sort.dir}
                      className="text-center"
                    >
                      Cost of Repair
                    </Th>
                    <Th
                      onClick={() => toggleSort("current_or_depreciated")}
                      active={sort.by === "current_or_depreciated"}
                      dir={sort.dir}
                    >
                      Current / Depreciated
                    </Th>
                    <Th className="px-4 py-2">Image</Th>

                    <Th
                      onClick={() => toggleSort("source")}
                      active={sort.by === "source"}
                      dir={sort.dir}
                      className="text-center bg-amber-50"
                    >
                      Source
                    </Th>

                    <Th
                      onClick={() => toggleSort("disposition")}
                      active={sort.by === "disposition"}
                      dir={sort.dir}
                      className="text-center bg-amber-50"
                    >
                      Disposition
                    </Th>
                    <Th
                      onClick={() => toggleSort("issuance")}
                      active={sort.by === "issuance"}
                      dir={sort.dir}
                      className="text-center bg-amber-50"
                    >
                      Issuance
                    </Th>

                    <Th
                      onClick={() => toggleSort("status")}
                      active={sort.by === "status"}
                      dir={sort.dir}
                      className="text-center bg-blue-50"
                    >
                      Status
                    </Th>

                    <Th
                      onClick={() => toggleSort("on_hand_qty")}
                      active={sort.by === "on_hand_qty"}
                      dir={sort.dir}
                      className="text-center bg-green-50"
                    >
                      Qty
                    </Th>
                    <Th
                      onClick={() => toggleSort("on_hand_value")}
                      active={sort.by === "on_hand_value"}
                      dir={sort.dir}
                      className="text-center bg-green-50"
                    >
                      Value
                    </Th>

                    <Th
                      onClick={() => toggleSort("whereabouts.user_office")}
                      active={sort.by === "whereabouts.user_office"}
                      dir={sort.dir}
                    >
                      User Office
                    </Th>
                    <Th
                      onClick={() => toggleSort("whereabouts.user_name")}
                      active={sort.by === "whereabouts.user_name"}
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
                  {paginatedRows.map((item) => {
                    return (
                      <tr key={item.id} className="border-t hover:bg-slate-50">
                        <td className="px-4 py-2 text-center">{item.type}</td>

                        <td className="px-4 py-2 text-center">{item.make}</td>

                        <td className="px-4 py-2 text-center">
                          {item.caliber}
                        </td>
                        <td className="px-4 py-2 text-center">
                          {item.serial_no}
                        </td>
                        <td className="px-4 py-2 text-center">
                          {item.semi_expendable_property_nr}
                        </td>
                        <td className="px-4 py-2 text-center">
                          {item.acquisition_date}
                        </td>
                        <td className="px-4 py-2 text-center">
                          {toNum(item.acquisition_cost)}
                        </td>
                        <td className="px-4 py-2 text-center">
                          {toNum(item.cost_of_repair)}
                        </td>
                        <td className="px-4 py-2 text-center">
                          {item.current_or_depreciated}
                        </td>
                        <td className="px-4 py-2 text-center">
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
                          {item?.source}
                        </td>
                        <td className="px-4 py-2 text-center bg-amber-50/40">
                          {item?.disposition}
                        </td>
                        <td className="px-4 py-2 text-center bg-amber-50/40">
                          {item?.issuance}
                        </td>

                        <td className="px-4 py-2 text-center bg-blue-50/40">
                          {item?.status}
                        </td>

                        <td className="px-4 py-2 text-center bg-green-50/40">
                          {toNum(item.on_hand_qty)}
                        </td>
                        <td className="px-4 py-2 text-center bg-green-50/40">
                          {toNum(item.on_hand_value)}
                        </td>

                        <td className="px-4 py-2 text-center">
                          {item.whereabouts?.user_office}
                        </td>
                        <td className="px-4 py-2 text-center">
                          {item.whereabouts?.user_name}
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
                </tbody>
              </table>
              {initialLoading && (
                <tr>
                  <td colSpan={17}>
                    <div className="fixed inset-0 z-40 flex items-center justify-center bg-white/60 backdrop-blur">
                      <PpoGridLoader logos={PPO_LOGOS} />
                    </div>
                  </td>
                </tr>
              )}
              {!tableCleared && totalPages > 1 && (
                <div className="mt-6 flex justify-center text-sm">
                  <div className="flex items-center gap-3 text-slate-700">
                    <button
                      disabled={page === 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      className="disabled:text-slate-300"
                    >
                      {"<"}
                    </button>

                    <span className="font-medium">
                      {page} / {totalPages}
                    </span>

                    <button
                      disabled={page === totalPages}
                      onClick={() =>
                        setPage((p) => Math.min(totalPages, p + 1))
                      }
                      className="disabled:text-slate-300"
                    >
                      {">"}
                    </button>
                  </div>
                </div>
              )}
            </div>
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
                  name="caliber"
                  placeholder="Caliber"
                  className="text-input"
                  value={editing.caliber || ""}
                  onChange={(e) =>
                    setEditing((prev) => ({
                      ...prev!,
                      caliber: e.target.value,
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
                  name="serial_no"
                  placeholder="Serial No."
                  className="text-input"
                  value={editing.serial_no || ""}
                  onChange={(e) =>
                    setEditing((prev) => ({
                      ...prev!,
                      serial_no: e.target.value,
                    }))
                  }
                />
                <Input
                  name="semi_expendable_property_nr"
                  placeholder="Semi-Expendable Property Nr."
                  className="text-input"
                  value={editing.semi_expendable_property_nr || ""}
                  onChange={(e) =>
                    setEditing((prev) => ({
                      ...prev!,
                      semi_expendable_property_nr: e.target.value,
                    }))
                  }
                />
                <Input
                  name="acquisition_date"
                  type={editing.acquisition_date ? "date" : "text"}
                  placeholder="Acquisition Date"
                  className="text-input"
                  value={editing.acquisition_date || ""}
                  onFocus={(e) => (e.target.type = "date")}
                  onBlur={(e) => {
                    if (!e.target.value) e.target.type = "text";
                  }}
                  onChange={(e) =>
                    setEditing((prev) => ({
                      ...prev!,
                      acquisition_date: e.target.value,
                    }))
                  }
                />
                <Input
                  name="acquisition_cost"
                  type="number"
                  min={0}
                  placeholder="Acquisition Cost"
                  className="text-input"
                  value={editing.acquisition_cost || ""}
                  onChange={(e) =>
                    setEditing((prev) => ({
                      ...prev!,
                      acquisition_cost: Number(e.target.value),
                    }))
                  }
                />
              </div>

              {/* Row 3 */}
              <div className="grid md:grid-cols-4 gap-3">
                <Input
                  name="cost_of_repair"
                  type="number"
                  min={0}
                  placeholder="Cost of Repair"
                  className="text-input"
                  value={editing.cost_of_repair || ""}
                  onChange={(e) =>
                    setEditing((prev) => ({
                      ...prev!,
                      cost_of_repair: Number(e.target.value),
                    }))
                  }
                />
                <Input
                  name="current_or_depreciated"
                  placeholder="Current or Depreciated"
                  className="text-input md:col-span-2"
                  value={editing.current_or_depreciated || ""}
                  onChange={(e) =>
                    setEditing((prev) => ({
                      ...prev!,
                      current_or_depreciated: e.target.value,
                    }))
                  }
                />
              </div>

              {/* STATUS */}
              <fieldset className="border rounded-2xl p-3">
                <legend className="px-2 text-sm text-slate-900">STATUS</legend>
                <div className="grid md:grid-cols-2 gap-3">
                  <select
                    value={editing.status || ""}
                    onChange={(e) =>
                      setEditing((prev) => ({
                        ...prev!,
                        status: e.target.value as "svc" | "uns" | "ber",
                      }))
                    }
                    className="text-input"
                  >
                    <option value="">Select Status</option>
                    <option value="svc">Svc (Serviceable)</option>
                    <option value="uns">Uns (Unserviceable)</option>
                    <option value="ber">Ber (Beyond Economic Repair)</option>
                  </select>
                </div>
              </fieldset>

              {/* SOURCE */}
              <fieldset className="border rounded-2xl p-3">
                <legend className="px-2 text-sm text-slate-900">SOURCE</legend>
                <div className="grid md:grid-cols-2 gap-3">
                  <select
                    value={editing.source || ""}
                    onChange={(e) =>
                      setEditing((prev) => ({
                        ...prev!,
                        source: e.target.value as
                          | "organic"
                          | "donated"
                          | "loaned",
                      }))
                    }
                    className="text-input"
                  >
                    <option value="">Select Source</option>
                    <option value="organic">Organic</option>
                    <option value="donated">Donated</option>
                    <option value="loaned">Loaned</option>
                  </select>
                </div>
              </fieldset>

              {/* DISPOSITION */}
              <fieldset className="border rounded-2xl p-3">
                <legend className="px-2 text-sm text-slate-900">
                  DISPOSITION
                </legend>
                <div className="grid md:grid-cols-2 gap-3">
                  <select
                    value={editing.disposition || ""}
                    onChange={(e) =>
                      setEditing((prev) => ({
                        ...prev!,
                        disposition: e.target.value as "onhand" | "issued",
                      }))
                    }
                    className="text-input"
                  >
                    <option value="">Select Disposition</option>
                    <option value="onhand">On Hand</option>
                    <option value="issued">Issued</option>
                  </select>
                </div>
              </fieldset>

              {/* ISSUANCE */}
              <fieldset className="border rounded-2xl p-3">
                <legend className="px-2 text-sm text-slate-900">
                  ISSUANCE
                </legend>
                <div className="grid md:grid-cols-2 gap-3">
                  <select
                    value={editing.issuance || ""}
                    onChange={(e) =>
                      setEditing((prev) => ({
                        ...prev!,
                        issuance: e.target.value as
                          | "assigned"
                          | "temporary"
                          | "permanent",
                      }))
                    }
                    className="text-input"
                  >
                    <option value="">Select Issuance Type</option>
                    <option value="assigned">Assigned</option>
                    <option value="temporary">Temporary</option>
                    <option value="permanent">Permanent</option>
                  </select>
                </div>
              </fieldset>

              {/* ON HAND PER COUNT */}
              <fieldset className="border rounded-2xl p-3">
                <legend className="px-2 text-sm text-slate-900">
                  ON HAND PER COUNT
                </legend>
                <div className="grid md:grid-cols-2 gap-3">
                  <Input
                    name="on_hand_qty"
                    type="number"
                    min={0}
                    placeholder="Qty"
                    className="text-input"
                    value={editing.on_hand_qty || ""}
                    onChange={(e) =>
                      setEditing((prev) => ({
                        ...prev!,
                        on_hand_qty: Number(e.target.value),
                      }))
                    }
                  />
                  <Input
                    name="on_hand_value"
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder="Value"
                    className="text-input"
                    value={editing.on_hand_value || ""}
                    onChange={(e) =>
                      setEditing((prev) => ({
                        ...prev!,
                        on_hand_value: Number(e.target.value),
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
                    name="user_office"
                    placeholder="User Office"
                    className="text-input"
                    value={editing.whereabouts?.user_office || ""}
                    onChange={(e) =>
                      setEditing((prev) => ({
                        ...prev!,
                        whereabouts: {
                          ...prev!.whereabouts,
                          user_office: e.target.value,
                        },
                      }))
                    }
                  />
                  <Input
                    name="user_name"
                    placeholder="User Name"
                    className="text-input"
                    value={editing.whereabouts?.user_name || ""}
                    onChange={(e) =>
                      setEditing((prev) => ({
                        ...prev!,
                        whereabouts: {
                          ...prev!.whereabouts,
                          user_name: e.target.value,
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
