//fetch and render data
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { toGroupedRows } from "./transform";
import type { CStationInventoryRow, QuicklookRow } from "./types";

export const useQuicklookData = () => {
  const [rows, setRows] = useState<QuicklookRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("cstation_inventory")
          .select("sector, station, type, status, source")
          .order("sector")
          .order("station")
          .order("type");

        if (error) {
          console.error("Failed to fetch cstation inventory:", error);
          setRows([]);
          return;
        }

        setRows(toGroupedRows((data as CStationInventoryRow[]) ?? []));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return { rows, loading };
};
