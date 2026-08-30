import PageTransition from "../components/PageTransition";
import Header from "../components/Header";
import Hero from "../components/Hero";

export default function Home() {
  return (
    <PageTransition>
      <div className="min-h-screen bg-[#080706] text-white flex flex-col justify-between selection:bg-[#e8a33d]/30 selection:text-white">
        <Header />
        <Hero />
      </div>
    </PageTransition>
  );
}
