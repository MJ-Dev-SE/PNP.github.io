//modal like in edit
import {
  DISPOSITION_OPTIONS,
  ISSUANCE_OPTIONS,
  STATUS_OPTIONS,
} from "../constants";
import type { InventoryItem } from "../model";

type ColumnTotals = {
  totalRows: number;
  validated: { yes: number; no: number; rate: number };
  attention: {
    unserviceable: number;
    ber: number;
    issued: number;
    idleServiceable: number;
  };
  matrix: Record<string, Record<string, number>>;
};

type ValidatedItem = {
  id: string;
  date: Date;
  name: string;
  ppo: string;
  station: string;
  serialNumber: string;
};

type EditInventoryModalProps = {
  isOpen: boolean;
  editItem: InventoryItem | null;
  editForm: Partial<InventoryItem>;
  setEditForm: (value: Partial<InventoryItem>) => void;
  applySmartDefaults: (field: "status" | "disposition", value: string) => void;
  onClose: () => void;
  onSave: () => void | Promise<void>;
};

export function EditInventoryModal({
  isOpen,
  editItem,
  editForm,
  setEditForm,
  applySmartDefaults,
  onClose,
  onSave,
}: EditInventoryModalProps) {
  if (!isOpen || !editItem) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 text-lg font-bold">Edit Inventory Item</h2>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Serial No.
            </label>
            <div className="text-xs text-slate-400 mb-1">
              Current: {editItem.serialNumber || "-"}
            </div>
            <input
              className="w-full rounded border px-2 py-1"
              value={editForm.serialNumber ?? ""}
              onChange={(e) =>
                setEditForm({ ...editForm, serialNumber: e.target.value })
              }
              placeholder="Enter serial number"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Type
            </label>
            <div className="text-xs text-slate-400 mb-1">
              Current: {editItem.typeChild || "-"}
            </div>
            <input
              className="w-full rounded border px-2 py-1"
              value={editForm.typeChild ?? ""}
              onChange={(e) =>
                setEditForm({ ...editForm, typeChild: e.target.value })
              }
              placeholder="Enter type"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Make
            </label>
            <div className="text-xs text-slate-400 mb-1">
              Current: {editItem.makeChild || "-"}
            </div>
            <input
              className="w-full rounded border px-2 py-1"
              value={editForm.makeChild ?? ""}
              onChange={(e) =>
                setEditForm({ ...editForm, makeChild: e.target.value })
              }
              placeholder="Enter make"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Model
            </label>
            <div className="text-xs text-slate-400 mb-1">
              Current: {editItem.model || "-"}
            </div>
            <input
              className="w-full rounded border px-2 py-1"
              value={editForm.model ?? ""}
              onChange={(e) =>
                setEditForm({ ...editForm, model: e.target.value })
              }
              placeholder="Enter model"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Equipment Name
            </label>
            <div className="text-xs text-slate-400 mb-1">
              Current: {editItem.name || "-"}
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

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Status
            </label>
            <div className="text-xs text-slate-400 mb-1">
              Current: {editItem.status || "-"}
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

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Disposition
            </label>
            <div className="text-xs text-slate-400 mb-1">
              Current: {editItem.disposition || "-"}
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

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Issuance Type
            </label>
            <div className="text-xs text-slate-400 mb-1">
              Current: {editItem.issuanceType || "-"}
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
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-lg border px-4 py-2 text-sm"
          >
            Cancel
          </button>
          <button
            onClick={() => void onSave()}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

type SummaryModalProps = {
  show: boolean;
  onClose: () => void;
  columnTotals: ColumnTotals;
  validatedList: ValidatedItem[];
};

export function SummaryModal({
  show,
  onClose,
  columnTotals,
  validatedList,
}: SummaryModalProps) {
  if (!show) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 text-lg font-bold">Inventory Summary</h2>

        <p className="mb-4 text-sm text-slate-600">
          This summary is based on the currently displayed records (
          {columnTotals.totalRows} total).
        </p>

        <div className="space-y-5">
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <div className="text-xs font-semibold text-red-700">
              Attention Required
            </div>
            <div className="mt-2 text-sm space-y-1">
              <div>
                Unserviceable: <b>{columnTotals.attention.unserviceable}</b>
              </div>
              <div>
                BER: <b>{columnTotals.attention.ber}</b>
              </div>
              <div>
                Issued: <b>{columnTotals.attention.issued}</b>
              </div>
              <div>
                Serviceable but Onhand:{" "}
                <b>{columnTotals.attention.idleServiceable}</b>
              </div>
            </div>
          </div>

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
                    <div className="font-semibold text-slate-800">{v.name}</div>
                    <div className="text-slate-600">
                      {v.ppo} - {v.station}
                    </div>
                    <div className="text-slate-500">SN: {v.serialNumber}</div>
                    <div className="text-slate-400 text-[11px]">
                      Validated: {v.date.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-slate-500">No validated records</div>
            )}
          </div>

          <div className="rounded-lg border p-4">
            <div className="text-xs text-slate-500">Validation Health</div>
            <div className="mt-1 text-2xl font-bold">
              {columnTotals.validated.rate}%
            </div>
            <div className="text-sm text-slate-600">
              Validated: {columnTotals.validated.yes}
              <br />
              Pending: {columnTotals.validated.no}
            </div>
          </div>

          <div className="rounded-lg border p-4">
            <div className="text-xs text-slate-500 mb-2">
              Status x Issuance Matrix
            </div>

            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-100 text-xs">
                  <th className="border px-2 py-1 text-left">Status</th>
                  {ISSUANCE_OPTIONS.map((label) => (
                    <th key={label} className="border px-2 py-1">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(columnTotals.matrix).map(
                  ([status, issuance]) => (
                    <tr key={status}>
                      <td className="border px-2 py-1 font-semibold">
                        {status}
                      </td>
                      {ISSUANCE_OPTIONS.map((label) => (
                        <td key={label} className="border px-2 py-1 text-center">
                          {issuance[label] || 0}
                        </td>
                      ))}
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-lg border px-4 py-2 text-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

type LoginModalProps = {
  show: boolean;
  onClose: () => void;
  loginDept: string;
  setLoginDept: (value: string) => void;
  loginPassword: string;
  setLoginPassword: (value: string) => void;
  isCheckingAccess: boolean;
  onSubmit: () => void | Promise<void>;
};

export function LoginModal({
  show,
  onClose,
  loginDept,
  setLoginDept,
  loginPassword,
  setLoginPassword,
  isCheckingAccess,
  onSubmit,
}: LoginModalProps) {
  if (!show) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
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
            <label className="block text-xs font-semibold mb-1">Password</label>
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
            onClick={onClose}
            className="rounded border px-4 py-2 text-sm"
          >
            Cancel
          </button>

          <button
            onClick={() => void onSubmit()}
            disabled={isCheckingAccess}
            className="rounded bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            {isCheckingAccess ? "Checking..." : "Login"}
          </button>
        </div>
      </div>
    </div>
  );
}
