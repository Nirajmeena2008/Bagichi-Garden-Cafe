import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Calendar, ArrowLeft } from "lucide-react";
import { MenuItem } from "../types";

export default function Menu() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("/menu.json")
      .then((res) => res.json())
      .then((data) => {
        setItems(data);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch menu:", err);
        setIsLoading(false);
      });
  }, []);

  const categories = ["All", ...Array.from(new Set(items.map((item) => item.category)))];

  const filteredItems = activeCategory === "All"
    ? items
    : items.filter((item) => item.category === activeCategory);

  return (
    <section id="menu" className="py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-white/60 hover:text-[#e8a33d] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>
        <div className="text-center">
          <h2 className="text-xs uppercase tracking-[0.2em] font-bold text-[#e8a33d] mb-1">
            Garden Kitchen & Grill
          </h2>
          <h1 className="text-3xl sm:text-4xl font-serif text-white">
            Our Culinary Menu
          </h1>
        </div>
        <Link
          to="/booking"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#e8a33d] text-black text-xs font-bold uppercase tracking-wider hover:bg-[#f3b55c] transition-all shadow-lg shadow-[#e8a33d]/15"
        >
          <Calendar className="w-3.5 h-3.5" /> Book Table
        </Link>
      </div>

      {/* Category Tabs */}
      <div className="flex flex-wrap justify-center gap-2 mb-8">
        {categories.map((category) => {
          const isActive = activeCategory === category;
          return (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`px-5 py-2 rounded-full text-xs uppercase tracking-wider font-semibold transition-all ${
                isActive
                  ? "bg-[#e8a33d] text-black shadow-md shadow-[#e8a33d]/20"
                  : "bg-white/5 text-white/70 hover:text-white hover:bg-white/10 border border-white/10"
              }`}
            >
              {category}
            </button>
          );
        })}
      </div>

      {/* Menu Grid */}
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#e8a33d]"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="p-4 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm flex flex-col group hover:border-[#e8a33d]/40 transition-colors"
            >
              <div className="h-44 overflow-hidden relative rounded-xl mb-4 bg-black/40">
                <img
                  src={item.imageUrl}
                  alt={item.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
                <span className="absolute top-3 right-3 bg-black/80 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold text-[#e8a33d] border border-white/10">
                  ₹{item.price}
                </span>
              </div>
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-bold text-white text-base">
                      {item.name}
                    </h3>
                    <span className="text-[10px] uppercase tracking-wider text-[#e8a33d] font-semibold">
                      {item.category}
                    </span>
                  </div>
                  <p className="text-white/60 text-xs font-light leading-relaxed mb-4">
                    {item.description}
                  </p>
                </div>
                <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                  <span className="text-[11px] text-[#e8a33d]/80">Freshly prepared</span>
                  <Link
                    to="/booking"
                    className="text-xs text-[#e8a33d] hover:underline font-medium"
                  >
                    Reserve to order →
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
