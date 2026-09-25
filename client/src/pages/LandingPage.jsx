import Navbar from "../components/Navbar.jsx";
import Hero from "../components/landing/Hero.jsx";
import TrustBar from "../components/landing/TrustBar.jsx";
import BuiltForStudents from "../components/landing/BuiltForStudents.jsx";
import KeyFeatures from "../components/landing/KeyFeatures.jsx";
import DashboardPreview from "../components/landing/DashboardPreview.jsx";
import HowItWorks from "../components/landing/HowItWorks.jsx";
import AIBanner from "../components/landing/AIBanner.jsx";
import CTABand from "../components/landing/CTABand.jsx";
import Footer from "../components/landing/Footer.jsx";

export default function LandingPage() {
  return (
    <div className="min-h-svh bg-mint-50">
      <Navbar />
      <main>
        <Hero />
        <TrustBar />
        <BuiltForStudents />
        <KeyFeatures />
        <DashboardPreview />
        <HowItWorks />
        <AIBanner />
        <CTABand />
      </main>
      <Footer />
    </div>
  );
}
