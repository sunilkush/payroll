import { HashRouter, Routes, Route } from "react-router-dom";
import LandingPage from "../pages/LandingPage.jsx";
import LoginPage from "../pages/LoginPage.jsx";
import CompanyDashboardPage from "../pages/CompanyDashboardPage.jsx";

export const AppRouter = () => (
  <HashRouter>
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/dashboard" element={<CompanyDashboardPage />} />
    </Routes>
  </HashRouter>
);