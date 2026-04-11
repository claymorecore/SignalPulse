import { Outlet } from "react-router-dom";
import Navbar from "../components/navigation/Navbar";
import Footer from "../components/navigation/Footer";
import usePlatformData from "../hooks/usePlatformData";
import usePerformanceTracking from "../hooks/usePerformanceTracking";
import useUserFlowTracking from "../hooks/useUserFlowTracking";

export default function AppShell() {
  const platform = usePlatformData();
  usePerformanceTracking();
  useUserFlowTracking();

  return (
    <div className="app-shell">
      <div className="app-background" aria-hidden="true" />
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <Navbar status={platform.scanner.status?.label} />
      <main id="main-content" className="app-main" tabIndex={-1}>
        <Outlet context={platform} />
      </main>
      <Footer />
    </div>
  );
}


