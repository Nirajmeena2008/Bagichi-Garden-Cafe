import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { MenuItem } from "../types";

export default function Menu() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/menu")
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
    <section id="menu" className="py-24 bg-[#f5f5f0]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16 flex flex-col items-center">
          <h2 className="text-xs uppercase tracking-[0.2em] font-bold text-[#5A5A40] mb-4">
            Chef's Specials
          </h2>
          <h3 className="text-4xl md:text-5xl font-serif text-[#141414] mb-6">
            Our Menu
          </h3>
          <div className="w-16 h-px bg-[#5A5A40]/30 mx-auto"></div>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#5A5A40]"></div>
          </div>
        ) : (
          <>
            {/* Category Filter */}
            <div className="flex flex-wrap justify-center gap-3 mb-12">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setActiveCategory(category)}
                  className={`px-6 py-2 rounded-full text-xs uppercase tracking-widest font-bold transition-all ${
                    activeCategory === category
                      ? "bg-[#5A5A40] text-white shadow-lg shadow-[#5A5A40]/20"
                      : "bg-transparent text-[#5A5A40] hover:bg-[#5A5A40]/5 border border-[#5A5A40]/20"
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>

            {/* Menu Grid */}
            <motion.div 
              layout
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
            >
              <AnimatePresence>
                {filteredItems.map((item) => (
                  <motion.div
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.3 }}
                    key={item.id}
                    className="p-4 rounded-2xl border border-white bg-[#fdfdfb] shadow-sm hover:shadow-md flex flex-col group transition-shadow"
                  >
                    <div className="h-48 overflow-hidden relative rounded-xl mb-4">
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                    </div>
                    <div className="flex-1 flex flex-col">
                      <div className="flex justify-between items-start mb-1 font-serif">
                        <h3 className="font-bold text-[#5A5A40] text-lg leading-tight">
                          {item.name}
                        </h3>
                        <span className="italic text-[#5A5A40] whitespace-nowrap ml-2">₹{item.price}</span>
                      </div>
                      <p className="text-[11px] text-[#141414]/60 mt-1 uppercase tracking-wider mb-3">
                        {item.category}
                      </p>
                      <p className="text-stone-500 text-sm font-light leading-relaxed flex-1">
                        {item.description}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          </>
        )}
      </div>
    </section>
  );
}
