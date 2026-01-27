import { createClient } from "@supabase/supabase-js";

// ---- Replace with your own Supabase URL and ANON KEY ----

const supabaseUrl = "https://blxrymicjowtplrkusck.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJseHJ5bWljam93dHBscmt1c2NrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc1NTkwODQsImV4cCI6MjA4MzEzNTA4NH0.Q1y53hRP0PS91IbRdX4jUIqJBqtJAmqVbOg6PgPhAi4";


const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testInsert() {
  try {
    // 1. Insert a test row
    const { data: inserted, error: insertError } = await supabase
      .from("station_inventory")
      .insert([
        {
          sector: "Test Sector",
          station: "Test Station",
          equipment: "Test Equipment",
          type: "Test Type",
          make: "Test Make",
          serial_no: "SN123456",
          property_no: "PN123456",
          acquisition_date: "2026-01-06",
          acquisition_cost: 1000,
          cost_of_repair: 0,
          current_or_depreciated: "Current",
          status_svc: 1,
          status_uns: 0,
          status_ber: 0,
          source_procured: 1,
          source_donated: 0,
          source_found_at_station: 0,
          source_loaned: 0,
          user_office: "Test Office",
          user_name: "Test User",
        },
      ])
      .select("*")
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      return;
    }

    console.log("Row inserted successfully!");
    console.log("Inserted row:");
    console.log(inserted);

    // 2. Fetch rows from table to double-check
    const { data: rows, error: fetchError } = await supabase
      .from("station_inventory")
      .select("*")
      .limit(1);

    if (fetchError) {
      console.error("Fetch error:", fetchError);
      return;
    }

    console.log("Fetched row(s) from station_inventory:");
    console.log(rows);
  } catch (err) {
    console.error("Unexpected error:", err);
  }
}

testInsert();
