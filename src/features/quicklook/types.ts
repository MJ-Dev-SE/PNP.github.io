// declations to recognize this types and also to use in other .tsx
export type EquipmentStats = {
  svc: number;
  unsvc: number;
  ber: number;
  organic: number;
  donated: number;
  loaned: number;
  fas: number;
  asd: number;
  asda: number;
};

export type QuicklookRow = {
  station: string;
  type: string;
  equipments: {
    all: EquipmentStats;
  };
  sector: string;
};

export type CStationInventoryRow = {
  sector: string | null;
  station: string | null;
  type: string | null;
  status: string | null;
  source: string | null;
  make: string | null;
};
