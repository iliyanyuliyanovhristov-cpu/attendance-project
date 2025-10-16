// src/App.tsx
import { Routes, Route } from "react-router-dom";

import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";
import ProtectedRoute from "./components/ProtectedRoute";

import DashboardPage from "./pages/Dashboard";
import DevicesPage from "./pages/Devices";
import EmployeesPage from "./pages/Employees";
import LogsPage from "./pages/Logs"; // 👈 eklendi
import LoginPage from "./pages/Login";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <div className="min-h-screen flex bg-slate-100">
              <Sidebar />
              <div className="flex-1">
                <Navbar />
                <main className="p-8">
                  <Routes>
                    <Route path="/" element={<DashboardPage />} />
                    <Route path="/devices" element={<DevicesPage />} />
                    <Route path="/employees" element={<EmployeesPage />} />
                    <Route path="/logs" element={<LogsPage />} /> {/* 👈 eklendi */}
                  </Routes>
                </main>
              </div>
            </div>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
