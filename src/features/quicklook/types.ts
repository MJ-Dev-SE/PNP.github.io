// declations to recognize this types and also to use in other .tsx
export type EquipmentStats = {
  svc: number;
  unsvc: number;
  ber: number;
  organic: number;
  donated: number;
  loaned: number;
  fas: number;
};

export type QuicklookRow = {
  unit: string;
  station: string;
  type: string;
  equipments: {
    all: EquipmentStats;
  };
};

export type CStationInventoryRow = {
  sector: string | null;
  station: string | null;
  type: string | null;
  status: string | null;
  source: string | null;
};
