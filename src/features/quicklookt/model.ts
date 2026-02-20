// setting data type and involving filtering
export const TYPE_CONFIG = {
  "Long FAS": {
    equipmentKey: "long",
    children: ["RIFLE", "SHOTGUN", "CARBINE", "GALIL", "M4A1"],
  },
  "Short FAS": {
    equipmentKey: "short",
    children: ["PISTOL", "REVOLVER", "BERETTA"],
  },


  "Other Equipment": {
    equipmentKey: "other",
    children: ["OTHER"],
  },
} as const;

export type TypeParent = keyof typeof TYPE_CONFIG;

export type InventoryItem = {
  id: string;
  ppo: string;
  station: string;
  serialNumber: string;
  typeParent: TypeParent;
  typeChild: string;
  makeParent: TypeParent;
  makeChild: string;
  model: string;
  name: string;
  status: string;
  disposition: string;
  issuanceType: string;
  validated: boolean;
  validatedAt?: string | null;
  source: string;
  user_office: string;
};

type CStationInventoryRow = {
  id: string;
  sector?: string | null;
  station?: string | null;
  equipment?: string | null;
  type: string | null;
  make: string | null;
  serial_no?: string | null;
  serialNo?: string | null;
  serialno?: string | null;
  source?: string | null;
  user_office?: string | null;
  status: string | null;
  disposition: string | null;
  issuance: string | null;
  validated?: boolean | null;
  validated_at?: string | null;
  validatedAt?: string | null;
  created_at?: string | null;
  createdAt?: string | null;
  createdat?: string | null;
  // view aliases from cstation_inventory_form
  acquisitionDate?: string | null;
  acquisitionCost?: number | null;
  costOfRepair?: number | null;
  currentOrDepreciated?: string | null;
  userOffice?: string | null;
  userName?: string | null;
};

const STATUS_DB_TO_UI: Record<string, string> = {
  svc: "SERVICEABLE",
  uns: "UNSERVICEABLE",
  ber: "BER",
};

const STATUS_UI_TO_DB: Record<string, "svc" | "uns" | "ber"> = {
  SERVICEABLE: "svc",
  UNSERVICEABLE: "uns",
  BER: "ber",
};

const DISPOSITION_DB_TO_UI: Record<string, string> = {
  onhand: "ONHAND",
  issued: "ISSUED",
};

const DISPOSITION_UI_TO_DB: Record<string, "onhand" | "issued"> = {
  ONHAND: "onhand",
  ISSUED: "issued",
};

const ISSUANCE_DB_TO_UI: Record<string, string> = {
  assigned: "ASSIGNED",
  temporary: "TEMPORARY",
  permanent: "PERMANENT",
};

const ISSUANCE_UI_TO_DB: Record<string, "assigned" | "temporary" | "permanent"> = {
  ASSIGNED: "assigned",
  TEMPORARY: "temporary",
  PERMANENT: "permanent",
};

const inferTypeParent = (type: string | null, equipment: string): TypeParent => {
  const haystack = `${type ?? ""} ${equipment}`.toUpperCase();





  if (
    haystack.includes("PISTOL") ||
    haystack.includes("REVOLVER") ||
    haystack.includes("BERETTA")
  ) {
    return "Short FAS";
  }

  if (
    haystack.includes("RIFLE") ||
    haystack.includes("SHOTGUN") ||
    haystack.includes("CARBINE") ||
    haystack.includes("GALIL") ||
    haystack.includes("M4")
  ) {
    return "Long FAS";
  }

  return "Other Equipment";
};

export const mapStatusToDb = (status: string): "svc" | "uns" | "ber" =>
  STATUS_UI_TO_DB[status] ?? "svc";

export const mapDispositionToDb = (disposition: string): "onhand" | "issued" =>
  DISPOSITION_UI_TO_DB[disposition] ?? "onhand";

export const mapIssuanceToDb = (
  issuanceType: string,
): "assigned" | "temporary" | "permanent" => ISSUANCE_UI_TO_DB[issuanceType] ?? "assigned";

export const mapCstationRowToItem = (row: CStationInventoryRow): InventoryItem => {
  const equipment = row.equipment ?? "";
  const station = row.station ?? "";
  const sector = row.sector ?? "";
  const serial = row.serial_no ?? row.serialNo ?? row.serialno ?? "";
  const typeParent = inferTypeParent(row.type, equipment);

  return {
    id: row.id,
    ppo: sector,
    station,
    serialNumber: serial,
    typeParent,
    typeChild: (row.type ?? equipment ?? "OTHER").toUpperCase(),
    makeParent: typeParent,
    makeChild: (row.make ?? "N/A").toUpperCase(),
    model: row.type ?? "",
    name: equipment,
    status: STATUS_DB_TO_UI[row.status ?? "svc"] ?? "SERVICEABLE",
    disposition: DISPOSITION_DB_TO_UI[row.disposition ?? "onhand"] ?? "ONHAND",
    issuanceType: ISSUANCE_DB_TO_UI[row.issuance ?? "assigned"] ?? "ASSIGNED",
    validated: Boolean(row.validated ?? false),
    validatedAt: row.validated_at ?? row.validatedAt ?? null,
    source: row.source ?? "",
    user_office: row.user_office ?? "",
  };
};
