//automatic change of status, actions related like delete and validations also involve in this part
import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import Swal from "sweetalert2";
import { supabase } from "../../lib/supabase";
import type { InventoryItem } from "./model";

export const applySmartDefaultsForEdit = (
  prev: Partial<InventoryItem>,
  field: "status" | "disposition",
  value: string,
) => {
  const next: Partial<InventoryItem> = { ...prev, [field]: value };

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

  if (field === "disposition") {
    if (value === "ASSIGNED") {
      next.issuanceType = "ISSUED";
    }

    if (value === "FOR REPAIR" || value === "FOR DISPOSAL") {
      next.issuanceType = "NOT ISSUED";
    }
  }

  return next;
};

export const deriveByStatus = (current: InventoryItem, newStatus: string) => {
  let disposition = current.disposition;
  let issuanceType = current.issuanceType;

  if (newStatus === "UNSERVICEABLE") {
    if (current.disposition !== "FOR REPAIR") {
      disposition = "FOR DISPOSAL";
    }
    issuanceType = "NOT ISSUED";
  }

  if (newStatus === "FOR REPAIR") {
    disposition = "FOR REPAIR";
    issuanceType = "NOT ISSUED";
  }

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

type SaveInlineEditParams = {
  item: InventoryItem;
  field: keyof InventoryItem;
  value: string;
  isSavingInlineRef: MutableRefObject<boolean>;
  setItems: Dispatch<SetStateAction<InventoryItem[]>>;
  setEditingCell: Dispatch<
    SetStateAction<{ id: number; field: keyof InventoryItem } | null>
  >;
};

export const saveInlineEditAction = async ({
  item,
  field,
  value,
  isSavingInlineRef,
  setItems,
  setEditingCell,
}: SaveInlineEditParams) => {
  isSavingInlineRef.current = true;

  let updatePayload: Record<string, string> = {};

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
            ...(field === "status" ? deriveByStatus(i, value) : { [field]: value }),
          }
        : i,
    ),
  );

  setEditingCell(null);
};

type ToggleValidationParams = {
  item: InventoryItem;
  setItems: Dispatch<SetStateAction<InventoryItem[]>>;
};

export const toggleValidationAction = async ({
  item,
  setItems,
}: ToggleValidationParams) => {
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
    return false;
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

  return true;
};

type SubmitDepartmentLoginParams = {
  loginDept: string;
  setIsCheckingAccess: Dispatch<SetStateAction<boolean>>;
  editItem: InventoryItem | null;
  toggleValidation: (item: InventoryItem) => Promise<boolean>;
  setShowLoginModal: Dispatch<SetStateAction<boolean>>;
  setLoginDept: Dispatch<SetStateAction<string>>;
  setCanValidate: Dispatch<SetStateAction<boolean>>;
};

export const submitDepartmentLoginAction = async ({
  loginDept,
  setIsCheckingAccess,
  editItem,
  toggleValidation,
  setShowLoginModal,
  setLoginDept,
  setCanValidate,
}: SubmitDepartmentLoginParams) => {
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

  if (editItem) {
    const ok = await toggleValidation(editItem);
    if (!ok) return;

    const actionText = editItem.validated ? "Validation removed" : "Item validated";

    await Swal.fire({
      icon: "success",
      title: actionText,
      text: "Inventory validation updates",
      timer: 2500,
      showConfirmButton: false,
    });
  }

  setShowLoginModal(false);
  setLoginDept("");
  setCanValidate(false);
};

type DeleteItemParams = {
  item: InventoryItem;
  setItems: Dispatch<SetStateAction<InventoryItem[]>>;
};

export const deleteInventoryItemAction = async ({
  item,
  setItems,
}: DeleteItemParams) => {
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
    .eq("quicklook_id", item.id);

  if (error) {
    Swal.fire("Error", "Failed to delete record", "error");
    return;
  }

  Swal.fire("Deleted!", "Record has been removed.", "success");
  setItems((prev) => prev.filter((i) => i.id !== item.id));
};

type SaveEditParams = {
  editItem: InventoryItem | null;
  editForm: Partial<InventoryItem>;
  setItems: Dispatch<SetStateAction<InventoryItem[]>>;
  setIsEditOpen: Dispatch<SetStateAction<boolean>>;
};

export const saveEditInventoryItemAction = async ({
  editItem,
  editForm,
  setItems,
  setIsEditOpen,
}: SaveEditParams) => {
  if (!editItem) return;

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
      i.id === editItem.id ? ({ ...i, ...editForm } as InventoryItem) : i,
    ),
  );

  setIsEditOpen(false);
};
