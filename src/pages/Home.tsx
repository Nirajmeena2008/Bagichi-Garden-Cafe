import PageTransition from "../components/PageTransition";
import Header from "../components/Header";
import Hero from "../components/Hero";
import OnlineOrderSection from "../components/OnlineOrderSection";
import FeaturedReels from "../components/FeaturedReels";
import Footer from "../components/Footer";

export default function Home() {
  return (
    <PageTransition>
      <div className="min-h-screen w-full bg-[#080706] text-white flex flex-col items-center justify-between selection:bg-[#e8a33d]/30 selection:text-white">
        <Header />
        <Hero />
        <OnlineOrderSection isEmbedded={true} />
        <FeaturedReels />
        <Footer />
      </div>
    </PageTransition>
  );
}
