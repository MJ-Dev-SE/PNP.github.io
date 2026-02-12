export const STATION_SORT_VALUES = [
  "NAME_ASC",
  "UNITS_DESC",
  "SKUS_DESC",
] as const;

export type StationSort = (typeof STATION_SORT_VALUES)[number];

export type StationCard = {
  name: string;
  skus: number;
  units: number;
};
