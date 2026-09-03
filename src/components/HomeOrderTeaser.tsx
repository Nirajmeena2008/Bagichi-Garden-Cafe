import { Link } from "react-router-dom";
import { ShoppingBag, Bike, Clock, Sparkles, ArrowRight, ChefHat, ShieldCheck } from "lucide-react";
import { motion } from "motion/react";
import { cafeConfig } from "../data/cafeConfig";

export default function HomeOrderTeaser() {
  const highlights = [
    {
      title: "Express Kitchen Delivery",
      desc: "Freshly prepared in our garden kitchen and delivered in 30–45 mins.",
      icon: Bike,
    },
    {
      title: "Live KDS Preparation Tracking",
      desc: "Watch your order status update in real-time from prep to delivery.",
      icon: Clock,
    },
    {
      title: "100% Hygienic Packaging",
      desc: "Eco-friendly, spill-proof containers keeping every dish piping hot.",
      icon: ShieldCheck,
    },
  ];

  const popularPicks = [
    { name: "Dal Makhani", tag: "Slow Cooked Overnight", price: "₹290" },
    { name: "Garlic Cheese Paneer Tikka", tag: "Tandoor Special", price: "₹340" },
    { name: "Butter Naan & Breads", tag: "Clay Oven Crisp", price: "₹60" },
    { name: "Virgin Mojito & Coolers", tag: "Handcrafted Drinks", price: "₹180" },
  ];

  return (
    <section id="order-online-teaser" className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-16">
      <div className="relative rounded-3xl bg-gradient-to-b from-[#16120e] to-[#0e0c0a] border border-[#e8a33d]/20 p-8 sm:p-12 overflow-hidden shadow-2xl">
        {/* Glow effect */}
        <div className="absolute -top-24 -right-24 w-80 h-80 bg-[#e8a33d]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-[#e8a33d]/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          {/* Left Column: Information & Call to Action */}
          <div className="lg:col-span-7 flex flex-col items-start text-left">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#e8a33d]/15 border border-[#e8a33d]/30 text-[#e8a33d] text-xs font-bold uppercase tracking-wider mb-4">
              <Sparkles className="w-3.5 h-3.5" />
              Online Ordering & Delivery
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-tight">
              Craving {cafeConfig.shortName} <br />
              <span className="text-[#e8a33d]">At Your Doorstep?</span>
            </h2>

            <p className="mt-4 text-white/70 text-sm sm:text-base leading-relaxed max-w-xl">
              Order our signature dishes, clay-oven tandoori breads, and artisan drinks online. Freshly prepared in our garden kitchen with live KDS order tracking and express local delivery.
            </p>

            {/* Feature Highlights */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 my-8 w-full">
              {highlights.map((h, i) => {
                const Icon = h.icon;
                return (
                  <div key={i} className="p-4 rounded-2xl bg-black/40 border border-white/5 flex flex-col">
                    <div className="w-8 h-8 rounded-lg bg-[#e8a33d]/10 text-[#e8a33d] flex items-center justify-center mb-2.5">
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-white mb-1">{h.title}</span>
                    <span className="text-[11px] text-white/50 leading-normal">{h.desc}</span>
                  </div>
                );
              })}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-4">
              <Link
                to="/order"
                id="home-order-online-cta"
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-[#e8a33d] text-black font-bold text-sm tracking-wide hover:bg-[#f3b55c] transition-all shadow-lg shadow-[#e8a33d]/25 group"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Go to Order Online</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>

              <Link
                to="/track"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-white/5 hover:bg-white/10 text-white/90 border border-white/15 font-semibold text-sm transition-all"
              >
                <Clock className="w-4 h-4 text-[#e8a33d]" />
                <span>Track Live Order</span>
              </Link>
            </div>
          </div>

          {/* Right Column: Menu Preview Card */}
          <div className="lg:col-span-5 flex flex-col w-full">
            <div className="rounded-2xl bg-[#120f0d] border border-white/10 p-6 shadow-xl relative">
              <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
                <div className="flex items-center gap-2">
                  <ChefHat className="w-5 h-5 text-[#e8a33d]" />
                  <span className="text-sm font-bold text-white">Popular Delivery Dishes</span>
                </div>
                <span className="text-[10px] font-bold text-[#e8a33d] uppercase tracking-wider bg-[#e8a33d]/10 px-2.5 py-1 rounded-full border border-[#e8a33d]/20">
                  Chef's Choice
                </span>
              </div>

              <div className="space-y-3">
                {popularPicks.map((pick, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/5 hover:border-[#e8a33d]/30 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium text-white">{pick.name}</p>
                      <p className="text-[11px] text-white/50">{pick.tag}</p>
                    </div>
                    <span className="text-sm font-bold text-[#e8a33d]">{pick.price}</span>
                  </div>
                ))}
              </div>

              <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between text-xs">
                <span className="text-white/60">Full digital menu available</span>
                <Link
                  to="/order"
                  className="text-[#e8a33d] font-bold hover:underline inline-flex items-center gap-1"
                >
                  View Full Menu & Order <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
