// Shared constants & helpers
// At the top of storage.ts
import rhq from "../images/RHQ.png";
import cavite from "../images/CAVITE.png";
import laguna from "../images/LAGUNA.png";
import batangas from "../images/BATANGAS.png";
import rizal from "../images/RIZAL.png";
import quezon from "../images/QUEZON.png";
import rmfb from "../images/RMFB4A.png";

// Map sector name to badge image
export const SECTOR_BADGES: Record<string, string> = {
  RHQ: rhq,
  CAVITE: cavite,
  "CAVITE PPO": cavite,
  LAGUNA: laguna,
  "LAGUNA PPO": laguna,
  BATANGAS: batangas,
  "BATANGAS PPO": batangas,
  RIZAL: rizal,
  "RIZAL PPO": rizal,
  QUEZON: quezon,
  "QUEZON PPO": quezon,
  RMFB: rmfb,
};

export const SECTORS = ["RHQ", "CAVITE PPO", "LAGUNA PPO", "BATANGAS PPO", "RIZAL PPO", "QUEZON PPO", "RMFB"] as const;

export const itemsKey = (sector: string) => `inventory_items_v5_${sector}`;
export const stationsKey = (sector: string) => `stations_v1_${sector}`;

export function toNum(n: unknown) {
    const v = Number(n);
    return Number.isFinite(v) ? v : 0;
}

// Curated stations registry (per sector)
export function loadStations(sector: string): string[] {
    try {
        const raw = localStorage.getItem(stationsKey(sector));
        const list = raw ? JSON.parse(raw) : [];
        return Array.isArray(list) ? list : [];
    } catch {
        return [];
    }
}
export function saveStations(sector: string, list: string[]) {
    localStorage.setItem(stationsKey(sector), JSON.stringify(list));
}
