import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";

export default function Hero() {
  return (
    <section className="relative h-[90vh] min-h-[600px] flex items-center justify-center overflow-hidden">
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat bg-[#2D3326]"
        style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&q=80&w=2070")' }}
      >
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(#C5A059 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.4) 60%, transparent 100%)' }}></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center mt-16">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="max-w-3xl mx-auto"
        >
          <div className="flex items-center justify-center space-x-4 mb-6">
            <div className="h-px w-12 bg-white/60"></div>
            <span className="text-xs uppercase tracking-[0.3em] font-medium text-white">Amer, Rajasthan</span>
            <div className="h-px w-12 bg-white/60"></div>
          </div>
          <h1 className="text-5xl md:text-7xl font-serif font-bold text-white mb-6 leading-[1.1]">
            Experience the magic of outdoor dining.
          </h1>
          <p className="text-lg md:text-xl text-white/80 mb-10 font-light max-w-2xl mx-auto leading-relaxed">
            A lush green sanctuary on the Delhi-Jaipur highway, serving authentic North Indian and Continental delicacies under the stars.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a 
              href="#booking"
              className="w-full sm:w-auto bg-[#5A5A40] hover:bg-[#4a4a35] text-white px-8 py-3.5 rounded-full text-xs uppercase tracking-widest font-bold shadow-lg shadow-[#5A5A40]/20 transition-all flex items-center justify-center gap-2"
            >
              Book a Table
              <ArrowRight className="h-4 w-4" />
            </a>
            <a 
              href="#menu"
              className="w-full sm:w-auto bg-white text-[#141414] hover:bg-stone-100 px-8 py-3.5 rounded-full text-xs uppercase tracking-widest font-bold shadow-lg transition-all"
            >
              View Menu
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
