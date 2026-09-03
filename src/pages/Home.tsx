import PageTransition from "../components/PageTransition";
import Header from "../components/Header";
import Hero from "../components/Hero";
import HomeOrderTeaser from "../components/HomeOrderTeaser";
import FeaturedReels from "../components/FeaturedReels";
import Footer from "../components/Footer";

export default function Home() {
  return (
    <PageTransition>
      <div className="min-h-screen w-full bg-[#080706] text-white flex flex-col items-center justify-between selection:bg-[#e8a33d]/30 selection:text-white">
        <Header />
        <Hero />
        <HomeOrderTeaser />
        <FeaturedReels />
        <Footer />
      </div>
    </PageTransition>
  );
}
