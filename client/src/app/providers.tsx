import { BrowserRouter } from "react-router-dom";
import type { ReactNode } from "react";

type AppProvidersProps = {
  children: ReactNode;
};

export default function AppProviders({ children }: AppProvidersProps) {
  return <BrowserRouter>{children}</BrowserRouter>;
}
