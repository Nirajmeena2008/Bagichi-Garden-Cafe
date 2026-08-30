import PageTransition from "../components/PageTransition";
import Header from "../components/Header";
import Menu from "../components/Menu";
import Footer from "../components/Footer";

export default function MenuPage() {
  return (
    <PageTransition>
      <div className="min-h-screen bg-[#080706] text-white flex flex-col justify-between selection:bg-[#e8a33d]/30 selection:text-white pt-24">
        <Header />
        <main className="flex-1 flex flex-col justify-start">
          <Menu />
        </main>
        <Footer />
      </div>
    </PageTransition>
  );
}
