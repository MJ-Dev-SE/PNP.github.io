//also declaration but declaration in terms of what filtering and limitations
import type { EquipmentStats } from "./types";

export const EMPTY_STATS: EquipmentStats = {
  svc: 0,
  unsvc: 0,
  ber: 0,
  organic: 0,
  donated: 0,
  loaned: 0,
  fas: 0,
};

export const PPO_LOGOS = [
  "/ppo/rhq.png",
  "/ppo/rmfb4a.png",
  "/ppo/ppo1.png",
  "/ppo/ppo2.png",
  "/ppo/ppo3.png",
  "/ppo/ppo4.png",
  "/ppo/ppo5.png",
];

export const ITEMS_PER_PAGE = 10;

export const ALL_PPOS = "All PPOs";
export const ALL_TYPES = "All Types";
