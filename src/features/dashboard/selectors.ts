import { SECTORS, itemsKey, toNum } from "../../utils/storage";
import {
  CATEGORY_VALUES,
  SORT_VALUES,
  type CategorizedCard,
  type Category,
  type DashboardCard,
  type InventoryCacheRow,
  type SortOption,
} from "./types";

export const isCategory = (value: string): value is Category =>
  (CATEGORY_VALUES as readonly string[]).includes(value);

export const isSortOption = (value: string): value is SortOption =>
  (SORT_VALUES as readonly string[]).includes(value);

export const getDashboardCards = (): DashboardCard[] =>
  SECTORS.map((name) => {
    const raw = localStorage.getItem(itemsKey(name));

    try {
      const parsed: unknown = raw ? JSON.parse(raw) : [];
      const items: InventoryCacheRow[] = Array.isArray(parsed) ? parsed : [];
      const hasSectorData = items.some((item) => (item.sector ?? "").trim() === name);

      if (!hasSectorData) return { name, skus: 0, units: 0 };

      const skus = items.length;
      const units = items.reduce(
        (sum, item) =>
          sum + toNum(item.status_uns) + toNum(item.status_svc) + toNum(item.status_ber),
        0,
      );

      return { name, skus, units };
    } catch {
      return { name, skus: 0, units: 0 };
    }
  });

const categoryOf = (name: string): Exclude<Category, "All"> => {
  const normalized = name.toLowerCase();
  if (/(ammo|ammun|bala|munitions)/.test(normalized)) return "Ammunition";
  if (/(firearm|rifle|pistol|arm|weap|gun)/.test(normalized)) return "Firearms";
  return "Accessories";
};

export const categorizeCards = (cards: DashboardCard[]): CategorizedCard[] =>
  cards.map((card) => ({ ...card, category: categoryOf(card.name) }));

export const filterVisibleCards = (
  cards: CategorizedCard[],
  q: string,
  cat: Category,
  sort: SortOption,
) => {
  const query = q.trim().toLowerCase();
  let list = cards.slice();

  if (query) {
    list = list.filter((card) => card.name.toLowerCase().includes(query));
  }

  if (cat !== "All") {
    list = list.filter((card) => card.category === cat);
  }

  if (sort === "DEFAULT") {
    list.sort((a, b) => SECTORS.indexOf(a.name) - SECTORS.indexOf(b.name));
  } else if (sort === "UNITS_DESC") {
    list.sort((a, b) => b.units - a.units);
  } else if (sort === "SKUS_DESC") {
    list.sort((a, b) => b.skus - a.skus);
  }

  return list;
};
