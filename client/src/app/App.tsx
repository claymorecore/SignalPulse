import AppRoutes from "../routes/AppRoutes";
import GlobalErrorBoundary from "../components/feedback/GlobalErrorBoundary";

export default function App() {
  return (
    <GlobalErrorBoundary>
      <AppRoutes />
    </GlobalErrorBoundary>
  );
}


