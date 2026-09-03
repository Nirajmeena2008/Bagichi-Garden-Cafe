import React from 'react';
import { Link } from 'react-router-dom';
import KitchenDisplaySystem from '../components/KitchenDisplaySystem';
import PageTransition from '../components/PageTransition';
import { ArrowLeft, ChefHat, ShieldCheck, Home } from 'lucide-react';

export default function KitchenDisplayPage() {
  return (
    <PageTransition>
      <div className="min-h-screen bg-[#080706] text-white flex flex-col selection:bg-[#e8a33d]/30 selection:text-white">
        {/* Top Minimal Navigation for Kitchen Screens / Tablets */}
        <header className="sticky top-0 z-40 bg-[#0d0b09]/90 backdrop-blur-md border-b border-white/10 px-4 sm:px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#e8a33d]/15 border border-[#e8a33d]/30 flex items-center justify-center text-[#e8a33d]">
              <ChefHat className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-serif font-bold text-base text-white tracking-wide">
                The Bagichi • Live Kitchen Display (KDS)
              </h1>
              <p className="text-[10px] text-white/50">Kitchen Order Station • Real-Time Website Orders & KOT Stream</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              to="/admin"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-xs border border-white/10 transition-colors"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-[#e8a33d]" />
              <span>Admin Portal</span>
            </Link>
            <Link
              to="/"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-xs border border-white/10 transition-colors"
            >
              <Home className="w-3.5 h-3.5" />
              <span>Website</span>
            </Link>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 max-w-[1600px] mx-auto w-full">
          <KitchenDisplaySystem isAdminView={false} />
        </main>
      </div>
    </PageTransition>
  );
}
