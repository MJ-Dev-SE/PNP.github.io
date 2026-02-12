import { toNum } from "../../utils/storage";
import type { StationCard, StationSort } from "./types";

export const buildStationCards = (
  stations: string[],
  items: any[],
  sector: string,
  q: string,
  sort: StationSort,
): StationCard[] =>
  stations
    .map((name) => {
      const list = items.filter(
        (i) =>
          (i.station || "").trim() === name.trim() &&
          (i.sector || "").trim() === sector,
      );

      const skus = list.length;
      const units = list.reduce(
        (sum, i) =>
          sum + toNum(i?.status_uns) + toNum(i?.status_svc) + toNum(i?.status_ber),
        0,
      );

      return { name, skus, units };
    })
    .filter((c) => c.name.toLowerCase().includes(q.trim().toLowerCase()))
    .sort((a, b) => {
      if (sort === "NAME_ASC") return a.name.localeCompare(b.name);
      if (sort === "UNITS_DESC") return b.units - a.units;
      if (sort === "SKUS_DESC") return b.skus - a.skus;
      return 0;
    });
