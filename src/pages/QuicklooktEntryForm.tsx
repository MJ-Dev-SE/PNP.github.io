import { useEffect, useState, type FormEvent } from "react";
import Swal from "sweetalert2";
import { supabase } from "../lib/supabase";
import { Input } from "../components/UI";

type Props = {
  sector: string;
  station: string;
  visible: boolean;
  onClose: () => void;
  seed?: any;
};

const TYPE_PARENTS = [
  "Long FAS",
  "Short FAS",
  "Motor Vehicle",
  "Communication Equipment",
];

export default function QuicklookEntryForm({
  sector,
  station,
  onClose,
  visible,
  seed,
}: Props) {
  const [form, setForm] = useState<any>({
    ppo: sector,
    station,
    validated: false,
  });
  const [isDirty, setIsDirty] = useState(false);
  const updateForm = (patch: any) => {
    setIsDirty(true);
    setForm((p: any) => ({ ...p, ...patch }));
  };
  const handleBackdropClick = () => {
    if (isDirty) {
      Swal.fire({
        icon: "warning",
        title: "Discard changes?",
        text: "You have unsaved changes.",
        showCancelButton: true,
        confirmButtonText: "Discard",
      }).then((r) => r.isConfirmed && onClose());
    } else {
      onClose();
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const payload = {
      ppo: sector,
      station,
      type_parent: form.type_parent || null,
      type_child: form.type_child || null,
      make_parent: form.make_parent || null,
      make_child: form.make_child || null,
      serial_number: form.serial_number || null,
      model: form.model || null,
      name: form.name || null,
      status: form.status || null,
      disposition: form.disposition || null,
      issuance_type: form.issuance_type || null,
      validated: !!form.validated,
    };

    if (!form.status) {
      Swal.fire("Missing field", "Status is required", "warning");
      return;
    }

    const { error } = await supabase
      .from("quicklook_inventory_t")
      .insert(payload);

    if (error) {
      Swal.fire("Error", error.message, "error");
      return;
    }

    Swal.fire("Saved", "Added to Quicklook Inventory", "success");
    onClose();
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;

      if (isDirty) {
        Swal.fire({
          icon: "warning",
          title: "Discard changes?",
          text: "You have unsaved changes.",
          showCancelButton: true,
          confirmButtonText: "Discard",
        }).then((r) => r.isConfirmed && onClose());
      } else {
        onClose();
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isDirty, onClose]);

  useEffect(() => {
    document.body.style.overflow = visible ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [visible]);
  useEffect(() => {
    if (!seed) return;

    setForm((prev: any) => ({
      ...prev,
      ...seed,
    }));
  }, [seed]);

  return (
    <div
      className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center"
      onClick={handleBackdropClick}
    >
      {/* 👇 THIS is the animated panel */}
      <div
        className={`
    panel panel-pad w-full max-w-5xl
    bg-gradient-to-b from-slate-700/80 via-slate-600/70 to-slate-500/60
    rounded-2xl
    transform transition-all duration-[2250ms] ease-[cubic-bezier(0.22,1,0.36,1)]
    ${
      visible
        ? "translate-x-0 opacity-100 scale-100"
        : "translate-x-full opacity-0 scale-95"
    }
  `}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-semibold mb-4">Quicklook Entry — {station}</h2>

        <form onSubmit={handleSubmit} className="grid gap-4">
          {/* Row 1 */}
          <div className="grid md:grid-cols-4 gap-3">
            <input value={sector} disabled className="text-input" />
            <input value={station} disabled className="text-input" />

            <select
              className="text-input"
              value={form.type_parent || ""}
              onChange={(e) => updateForm({ type_parent: e.target.value })}
            >
              <option value="">Type (Parent)</option>
              {TYPE_PARENTS.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>

            <Input
              placeholder="Type (Child)"
              onChange={(e) => updateForm({ type_child: e.target.value })}
              value={form.type_child || ""}
            />
          </div>

          {/* Row 2 */}
          <div className="grid md:grid-cols-4 gap-3">
            <select
              className="text-input"
              onChange={(e) => updateForm({ make_parent: e.target.value })}
              value={form.make_parent || ""}
            >
              <option value="">Make (Parent)</option>
              {TYPE_PARENTS.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>

            <Input
              placeholder="Make (Child)"
              onChange={(e) => updateForm({ make_child: e.target.value })}
              value={form.make_child || ""}
            />

            <Input
              placeholder="Serial Number"
              onChange={(e) => updateForm({ serial_number: e.target.value })}
              value={form.serial_number || ""}
            />

            <Input
              placeholder="Model"
              onChange={(e) => updateForm({ model: e.target.value })}
              value={form.model || ""}
            />
          </div>

          {/* Row 3 */}
          <div className="grid md:grid-cols-4 gap-3">
            <Input
              placeholder="Equipment Name"
              onChange={(e) => updateForm({ name: e.target.value })}
              value={form.name || ""}
            />

            <select
              className="text-input"
              value={form.status || ""}
              onChange={(e) => updateForm({ status: e.target.value })}
            >
              <option value="">Status</option>
              <option>OPERATIONAL</option>
              <option>SERVICEABLE</option>
              <option>UNSERVICEABLE</option>
            </select>

            <select
              className="text-input"
              onChange={(e) => updateForm({ disposition: e.target.value })}
              value={form.disposition || ""}
            >
              <option value="">Disposition</option>
              <option>ON HAND</option>
              <option>ISSUED</option>
            </select>

            <select
              className="text-input"
              onChange={(e) =>
                updateForm({
                  issuance_type: e.target.value,
                })
              }
              value={form.issuance_type || ""}
            >
              <option value="">Issuance</option>
              <option>ASSIGNED</option>
              <option>TEMPORARY</option>
              <option>PERMANENT</option>
            </select>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={!!form.validated}
              onChange={(e) => updateForm({ validated: e.target.checked })}
            />
            Validated
          </label>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="soft-btn px-4 py-2"
            >
              Cancel
            </button>
            <button className="solid-btn px-4 py-2">Save</button>
          </div>
        </form>
      </div>
    </div>
  );
}
