import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import { supabase } from "../../lib/supabase";
import { mapCstationRowToItem, type InventoryItem } from "./model";

export const useQuicklooktData = () => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [canValidate, setCanValidate] = useState(false);
  const [user, setUser] = useState<unknown>(null);

  useEffect(() => {
    const sleep = (ms: number) =>
      new Promise((resolve) => setTimeout(resolve, ms));

    const fetchData = async () => {
      setLoading(true);
      const minLoadingTime = 2500;
      const start = Date.now();
      try {
        const attempts = [
          async () =>
            supabase
              .from("cstation_inventory")
              .select("*")
              .order("sector")
              .order("station"),
          async () =>
            supabase
              .from("cstation_inventory_form")
              .select("*")
              .order("sector")
              .order("station"),
        ];

        let lastError:
          | { code?: string; message?: string; details?: string | null; hint?: string | null }
          | null = null;

        for (const query of attempts) {
          const result = await query();

          if (!result.error) {
            setItems((result.data ?? []).map(mapCstationRowToItem));
            return;
          }

          lastError = {
            code: result.error.code,
            message: result.error.message,
            details: result.error.details,
            hint: result.error.hint,
          };
        }

        console.error("Fetch error (table + view):", lastError);
        Swal.fire(
          "Error",
          `Failed to fetch inventory data.\n${lastError?.code ?? ""} ${lastError?.message ?? ""}`.trim(),
          "error",
        );
      } finally {
        const elapsed = Date.now() - start;
        if (elapsed < minLoadingTime) {
          await sleep(minLoadingTime - elapsed);
        }
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    const loadUser = async () => {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      setUser(authUser);

      if (!authUser) return;

      const { data } = await supabase
        .from("inventory_access")
        .select("department")
        .eq("user_id", authUser.id)
        .single();

      setCanValidate(data?.department === "ADMIN");
    };

    loadUser();
  }, []);

  return {
    items,
    setItems,
    loading,
    canValidate,
    setCanValidate,
    user,
    setUser,
  };
};
