import { Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import SectorDashboard from "./pages/SectorDashboard";
import StationInventory from "./pages/StationInventory";
import QuicklookInventory from "./pages/QuicklookInventory";
import QuicklookInventoryt from "./pages/QuicklookInventoryt";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/sector/:sector" element={<SectorDashboard />} />
      <Route path="/sector/:sector/:station" element={<StationInventory />} />
      <Route path="/quicklook" element={<QuicklookInventory />} />
      <Route path="/quicklookt" element={<QuicklookInventoryt />} />
    </Routes>
  );
}
