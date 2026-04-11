import CTASection from "../components/sections/CTASection";
import PageHeroSection from "../components/sections/PageHeroSection";

export default function NotFoundPage() {
  return (
    <>
      <PageHeroSection
        eyebrow="Route unavailable"
        title="This page does not exist in the SignalPulse system."
        description="The route is invalid or no longer available. Use the main workflow to return to a supported product surface."
        primary={{ label: "Go Home", to: "/" }}
        secondary={{ label: "Open Market", to: "/market" }}
        preview={{
          title: "Route safety",
          chips: ["Fallback", "Safe", "Contained"],
          rows: [
            { label: "Routing", value: "100%" },
            { label: "Recovery", value: "100%" },
            { label: "Continuity", value: "92%" },
          ],
        }}
      />
      <CTASection
        title="Return to a valid SignalPulse route."
        description="The app keeps invalid paths contained so navigation never leaves users in a broken state."
        primary={{ label: "Open Dashboard", to: "/dashboard" }}
        secondary={{ label: "Open Learn", to: "/learn" }}
      />
    </>
  );
}
