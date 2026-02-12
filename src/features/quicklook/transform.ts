//table declarations
import { EMPTY_STATS } from "./constants";
import type { CStationInventoryRow, QuicklookRow } from "./types";

export const toGroupedRows = (records: CStationInventoryRow[]): QuicklookRow[] => {
  const grouped: Record<string, QuicklookRow> = {};

  records.forEach((record) => {
    const unit = record.sector ?? "UNKNOWN";
    const station = record.station ?? "UNKNOWN";
    const type = record.type ?? "UNKNOWN";
    const key = `${unit}::${station}::${type}`;

    if (!grouped[key]) {
      grouped[key] = {
        unit,
        station,
        type,
        equipments: { all: { ...EMPTY_STATS } },
      };
    }

    const status = (record.status ?? "").toLowerCase();
    if (status === "svc" || status === "serviceable") {
      grouped[key].equipments.all.svc += 1;
    } else if (
      status === "uns" ||
      status === "unsvc" ||
      status === "unserviceable"
    ) {
      grouped[key].equipments.all.unsvc += 1;
    } else if (status === "ber") {
      grouped[key].equipments.all.ber += 1;
    }

    const source = (record.source ?? "organic").toLowerCase();
    if (source === "organic") {
      grouped[key].equipments.all.organic += 1;
    } else if (source === "donated") {
      grouped[key].equipments.all.donated += 1;
    } else if (source === "loaned") {
      grouped[key].equipments.all.loaned += 1;
    } else if (source === "fas") {
      grouped[key].equipments.all.fas += 1;
    }
  });

  return Object.values(grouped);
};
