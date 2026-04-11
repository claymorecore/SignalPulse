import { useOutletContext } from "react-router-dom";
import type { PlatformContext } from "../types/platform";

export default function usePlatformContext() {
  return useOutletContext<PlatformContext>();
}


