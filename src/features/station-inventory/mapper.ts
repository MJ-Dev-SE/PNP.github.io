import { toNum } from "../../utils/storage";
import type { Item } from "./types";

export const mapRowToItem = (row: any): Item => ({
  id: row.id,
  sector: row.sector,
  station: row.station,
  caliber: row.caliber ?? "",
  type: row.type ?? "",
  make: row.make ?? "",
  serial_no: row.serial_no ?? "",
  semi_expendable_property_nr: row.semi_expendable_property_nr ?? "",
  acquisition_date: row.acquisition_date ?? null,
  acquisition_cost: toNum(row.acquisition_cost),
  cost_of_repair: toNum(row.cost_of_repair),
  current_or_depreciated: row.current_or_depreciated ?? "",
  status: row.status ?? "svc",
  source: row.source ?? "organic",
  disposition: row.disposition ?? "onhand",
  issuance: row.issuance ?? "assigned",
  on_hand_qty: toNum(row.on_hand_qty),
  on_hand_value: toNum(row.on_hand_value),
  whereabouts: {
    user_office: row.user_office ?? "",
    user_name: row.user_name ?? "",
  },
  imageUrls: row.image_urls ?? (row.image_url ? [row.image_url] : []),
  createdAt: row.created_at,
});
