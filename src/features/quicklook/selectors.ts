//Filtering in quicklook
import { ALL_PPOS, ALL_TYPES } from "./constants";
import type { QuicklookRow } from "./types";

export const getPpoOptions = (rows: QuicklookRow[]) => {
  const unique = new Set(rows.map((row) => row.sector));
  return [ALL_PPOS, ...Array.from(unique)];
};

export const getTypeOptions = (rows: QuicklookRow[]) => {
  const unique = new Set(rows.map((row) => row.type));
  return [ALL_TYPES, ...Array.from(unique)];
};

export const filterRows = (
  rows: QuicklookRow[],
  ppo: string,
  type: string,
  search: string,
) => {
  const query = search.trim().toLowerCase();

  return rows.filter((row) => {
    if (ppo !== ALL_PPOS && row.sector !== ppo) return false;
    if (type !== ALL_TYPES && row.type !== type) return false;
    if (!query) return true;

    const haystack = `${row.sector} ${row.station} ${row.type}`.toLowerCase();
    return haystack.includes(query);
  });
};
