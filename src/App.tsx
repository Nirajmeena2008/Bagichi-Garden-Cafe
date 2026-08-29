import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import ManageBooking from "./pages/ManageBooking";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/manage" element={<ManageBooking />} />
      </Routes>
    </BrowserRouter>
  );
}
