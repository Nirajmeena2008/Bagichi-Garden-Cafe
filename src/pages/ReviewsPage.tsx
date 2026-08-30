import PageTransition from "../components/PageTransition";
import Header from "../components/Header";
import Reviews from "../components/Reviews";
import Footer from "../components/Footer";

export default function ReviewsPage() {
  return (
    <PageTransition>
      <div className="min-h-screen bg-[#080706] text-white flex flex-col justify-between selection:bg-[#e8a33d]/30 selection:text-white pt-24">
        <Header />
        <main className="flex-1 flex flex-col justify-start">
          <Reviews />
        </main>
        <Footer />
      </div>
    </PageTransition>
  );
}
