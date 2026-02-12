import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import { supabase } from "../../lib/supabase";
import { mapQuicklookRowToItem, type InventoryItem } from "./model";

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
        const { data, error } = await supabase
          .from("quicklook_inventory_t_ordered")
          .select(
            `
    quicklook_id,
    ppo,
    station,
    serial_number,
    type_parent,
    type_child,
    make_parent,
    make_child,
    model,
    name,
    status,
    disposition,
    issuance_type,
    validated,
    validated_at
  `,
          )
          .order("ppo")
          .order("station");

        if (error) {
          console.error("Fetch error:", error);
          Swal.fire("Error", "Failed to fetch inventory data", "error");
          return;
        }

        setItems((data ?? []).map(mapQuicklookRowToItem));
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
    const checkAccess = async () => {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (!authUser) return;

      const { data, error } = await supabase
        .from("inventory_access")
        .select("department")
        .eq("user_id", authUser.id)
        .single();

      if (error) {
        console.error("Access check failed", error);
        return;
      }

      setCanValidate(data.department === "ADMIN");
    };

    checkAccess();
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
