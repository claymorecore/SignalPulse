import { lazy } from "react";
import { Route, Routes } from "react-router-dom";
import AppShell from "../app/AppShell";
import RouteFrame from "./RouteFrame";

const HomePage = lazy(() => import("../pages/HomePage"));
const MarketPage = lazy(() => import("../pages/MarketPage"));
const SignalsPage = lazy(() => import("../pages/SignalsPage"));
const DashboardPage = lazy(() => import("../pages/DashboardPage"));
const ToolsPage = lazy(() => import("../pages/ToolsPage"));
const LearnPage = lazy(() => import("../pages/LearnPage"));
const DocsPage = lazy(() => import("../pages/DocsPage"));
const NewsPage = lazy(() => import("../pages/NewsPage"));
const AboutPage = lazy(() => import("../pages/AboutPage"));
const NotFoundPage = lazy(() => import("../pages/NotFoundPage"));

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<RouteFrame routeName="Home"><HomePage /></RouteFrame>} />
        <Route path="/market" element={<RouteFrame routeName="Market"><MarketPage /></RouteFrame>} />
        <Route path="/signals" element={<RouteFrame routeName="Signals"><SignalsPage /></RouteFrame>} />
        <Route path="/dashboard" element={<RouteFrame routeName="Dashboard"><DashboardPage /></RouteFrame>} />
        <Route path="/tools" element={<RouteFrame routeName="Tools"><ToolsPage /></RouteFrame>} />
        <Route path="/learn" element={<RouteFrame routeName="Learn"><LearnPage /></RouteFrame>} />
        <Route path="/docs" element={<RouteFrame routeName="Docs"><DocsPage /></RouteFrame>} />
        <Route path="/news" element={<RouteFrame routeName="News"><NewsPage /></RouteFrame>} />
        <Route path="/about" element={<RouteFrame routeName="About"><AboutPage /></RouteFrame>} />
        <Route path="*" element={<RouteFrame routeName="Not found"><NotFoundPage /></RouteFrame>} />
      </Route>
    </Routes>
  );
}


