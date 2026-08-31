import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence } from "motion/react";
import Home from "./pages/Home";
import MenuPage from "./pages/MenuPage";
import BookingPage from "./pages/BookingPage";
import ReviewsPage from "./pages/ReviewsPage";
import ContactPage from "./pages/ContactPage";
import ManageBooking from "./pages/ManageBooking";
import VoiceAgent from "./components/VoiceAgent";
import CursorParticles from "./components/CursorParticles";
import BackgroundRipples from "./components/BackgroundRipples";

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Home />} />
        <Route path="/menu" element={<MenuPage />} />
        <Route path="/booking" element={<BookingPage />} />
        <Route path="/reserve" element={<BookingPage />} />
        <Route path="/reviews" element={<ReviewsPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/location" element={<ContactPage />} />
        <Route path="/manage" element={<ManageBooking />} />
      </Routes>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <BackgroundRipples />
      <CursorParticles />
      <AnimatedRoutes />
      <VoiceAgent />
    </BrowserRouter>
  );
}
