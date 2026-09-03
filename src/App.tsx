import { BrowserRouter, Routes, Route, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence } from "motion/react";
import { ArrowLeft } from "lucide-react";
import Home from "./pages/Home";
import MenuPage from "./pages/MenuPage";
import BookingPage from "./pages/BookingPage";
import ReviewsPage from "./pages/ReviewsPage";
import ContactPage from "./pages/ContactPage";
import ManageBooking from "./pages/ManageBooking";
import VoiceAgent from "./components/VoiceAgent";
import CursorParticles from "./components/CursorParticles";
import BackgroundRipples from "./components/BackgroundRipples";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import DriveRecordsPage from "./pages/DriveRecordsPage";
import KitchenDisplayPage from "./pages/KitchenDisplayPage";
import OrderOnlinePage from "./pages/OrderOnlinePage";
import OrderTrackingPage from "./pages/OrderTrackingPage";

function GlobalBackButton() {
  const location = useLocation();
  const navigate = useNavigate();

  if (location.pathname === "/") return null;

  return (
    <button
      onClick={() => navigate(-1)}
      className="fixed top-5 left-5 z-[100] w-12 h-12 flex items-center justify-center bg-black/40 border border-white/10 rounded-full text-white/80 hover:bg-[#e8a33d] hover:text-black hover:border-[#e8a33d] hover:scale-105 transition-all shadow-xl backdrop-blur-md group"
      aria-label="Go back"
    >
      <ArrowLeft size={24} className="group-hover:-translate-x-0.5 transition-transform" />
    </button>
  );
}

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Home />} />
        <Route path="/order" element={<OrderOnlinePage />} />
        <Route path="/order-online" element={<OrderOnlinePage />} />
        <Route path="/track" element={<OrderTrackingPage />} />
        <Route path="/track/:orderId" element={<OrderTrackingPage />} />
        <Route path="/order-tracking" element={<OrderTrackingPage />} />
        <Route path="/menu" element={<MenuPage />} />
        <Route path="/booking" element={<BookingPage />} />
        <Route path="/reserve" element={<BookingPage />} />
        <Route path="/reviews" element={<ReviewsPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/location" element={<ContactPage />} />
        <Route path="/manage" element={<ManageBooking />} />
        <Route path="/drive-records" element={<DriveRecordsPage />} />
        <Route path="/records" element={<DriveRecordsPage />} />
        <Route path="/kds" element={<KitchenDisplayPage />} />
        <Route path="/kitchen" element={<KitchenDisplayPage />} />
        <Route path="/admin" element={<AdminLogin />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
      </Routes>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <BackgroundRipples />
      <CursorParticles />
      <GlobalBackButton />
      <AnimatedRoutes />
      <VoiceAgent />
    </BrowserRouter>
  );
}
