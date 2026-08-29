import Header from "../components/Header";
import Hero from "../components/Hero";
import Menu from "../components/Menu";
import Booking from "../components/Booking";
import Reviews from "../components/Reviews";
import Footer from "../components/Footer";

export default function Home() {
  return (
    <main className="min-h-screen font-sans bg-[#f5f5f0] text-[#1a1a1a] selection:bg-[#C5A059]/30 selection:text-[#1a1a1a]">
      <Header />
      <Hero />
      <Menu />
      <Booking />
      <Reviews />
      <Footer />
    </main>
  );
}
