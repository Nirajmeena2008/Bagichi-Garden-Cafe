import PageTransition from "../components/PageTransition";
import Header from "../components/Header";
import OnlineOrderSection from "../components/OnlineOrderSection";
import Footer from "../components/Footer";
import { Link } from "react-router-dom";
import { ArrowLeft, Home as HomeIcon, Clock } from "lucide-react";

export default function OrderOnlinePage() {
  return (
    <PageTransition>
      <div className="min-h-screen w-full bg-[#080706] text-white flex flex-col items-center justify-between selection:bg-[#e8a33d]/30 selection:text-white pt-24 pb-8">
        <Header />
        <main className="flex-1 flex flex-col items-center justify-start w-full max-w-7xl mx-auto px-4 sm:px-6">
          {/* Breadcrumb Navigation Bar */}
          <div className="w-full flex items-center justify-between py-2 mb-2 text-xs text-white/50 border-b border-white/5">
            <div className="flex items-center gap-2">
              <Link to="/" className="hover:text-[#e8a33d] transition-colors flex items-center gap-1">
                <HomeIcon className="w-3.5 h-3.5" />
                <span>Home</span>
              </Link>
              <span>/</span>
              <span className="text-[#e8a33d] font-semibold">Order Online</span>
            </div>

            <div className="flex items-center gap-4">
              <Link
                to="/track"
                className="hover:text-[#e8a33d] transition-colors flex items-center gap-1 text-white/70"
              >
                <Clock className="w-3.5 h-3.5 text-[#e8a33d]" />
                <span>Track Existing Order</span>
              </Link>
              <Link
                to="/"
                className="hidden sm:inline-flex items-center gap-1 text-white/60 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-3 h-3" />
                <span>Back to Home</span>
              </Link>
            </div>
          </div>

          <OnlineOrderSection />
        </main>
        <Footer />
      </div>
    </PageTransition>
  );
}
