//setting data type and involving filtering
export const TYPE_CONFIG = {
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

export type TypeParent = keyof typeof TYPE_CONFIG;

export type InventoryItem = {
  id: number;
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
};

type QuicklookInventoryRow = {
  quicklook_id: number;
  ppo: string;
  station: string;
  serial_number: string;
  type_parent: TypeParent;
  type_child: string;
  make_parent: TypeParent;
  make_child: string;
  model: string;
  name: string;
  status: string;
  disposition: string;
  issuance_type: string;
  validated: boolean;
  validated_at?: string | null;
};

export const mapQuicklookRowToItem = (row: QuicklookInventoryRow): InventoryItem => ({
  id: row.quicklook_id,
  ppo: row.ppo,
  station: row.station,
  serialNumber: row.serial_number,
  typeParent: row.type_parent,
  typeChild: row.type_child,
  makeParent: row.make_parent,
  makeChild: row.make_child,
  model: row.model,
  name: row.name,
  status: row.status,
  disposition: row.disposition,
  issuanceType: row.issuance_type,
  validated: row.validated,
  validatedAt: row.validated_at ?? null,
});
