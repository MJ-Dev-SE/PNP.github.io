//fetch and render data
import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { toGroupedRows } from "./transform";
import type { CStationInventoryRow, QuicklookRow } from "./types";

export const useQuicklookData = () => {
  const [rows, setRows] = useState<QuicklookRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("cstation_inventory")
        .select("sector, station, type, status, source, make")
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
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const channel = supabase
      .channel("quicklook-cstation-inventory")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "cstation_inventory" },
        () => {
          void refresh();
        },
      )
      .subscribe();

    const onFocus = () => {
      void refresh();
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void refresh();
      }
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      supabase.removeChannel(channel);
    };
  }, [refresh]);

  return { rows, loading, refresh };
};
