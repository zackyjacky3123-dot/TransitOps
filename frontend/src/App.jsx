import { Routes, Route, Navigate } from 'react-router-dom';
import SidebarLayout from './layouts/SidebarLayout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import ResourceGuard from './components/ResourceGuard.jsx';

import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Fleet from './pages/Fleet.jsx';
import Drivers from './pages/Drivers.jsx';
import Trips from './pages/Trips.jsx';
import Maintenance from './pages/Maintenance.jsx';
import FuelExpenses from './pages/FuelExpenses.jsx';
import Analytics from './pages/Analytics.jsx';
import Settings from './pages/Settings.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route
        element={
          <ProtectedRoute>
            <SidebarLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/fleet" element={<ResourceGuard resource="fleet"><Fleet /></ResourceGuard>} />
        <Route path="/drivers" element={<ResourceGuard resource="drivers"><Drivers /></ResourceGuard>} />
        <Route path="/trips" element={<ResourceGuard resource="trips"><Trips /></ResourceGuard>} />
        <Route path="/maintenance" element={<Maintenance />} />
        <Route path="/fuel-expenses" element={<ResourceGuard resource="fuelExp"><FuelExpenses /></ResourceGuard>} />
        <Route path="/analytics" element={<ResourceGuard resource="analytics"><Analytics /></ResourceGuard>} />
        <Route path="/settings" element={<Settings />} />
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
