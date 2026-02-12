//declaration of components and types used in the dashboard feature
export type InventoryCacheRow = {
  sector?: string;
  status_uns?: unknown;
  status_svc?: unknown;
  status_ber?: unknown;
};

export type DashboardCard = {
  name: string;
  skus: number;
  units: number;
};

export const CATEGORY_VALUES = [
  "All",
  "Ammunition",
  "Firearms",
  "Accessories",
] as const;
export type Category = (typeof CATEGORY_VALUES)[number];

export const SORT_VALUES = ["DEFAULT", "UNITS_DESC", "SKUS_DESC"] as const;
export type SortOption = (typeof SORT_VALUES)[number];

export type CategorizedCard = DashboardCard & {
  category: Exclude<Category, "All">;
};
