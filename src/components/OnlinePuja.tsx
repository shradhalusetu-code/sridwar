/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import { ON_LINE_PUJAS } from "../data/spiritualData";
import { ShieldAlert, Heart, Briefcase, Award, TrendingUp, Sparkles, CheckCircle2, UserCheck, Video, HelpCircle } from "lucide-react";
import SacredIcon from "./SacredIcon";
import { getDiscountedPrice, isDiscountActive, DISCOUNT_DEADLINE_LABEL } from "../utils/discount";

interface OnlinePujaProps {
  onBookNowClick: (pujaName: string, price: number) => void;
}

export default function OnlinePuja({ onBookNowClick }: OnlinePujaProps) {
  const [selectedCategory, setSelectedCategory] = useState<"all" | "health" | "wealth" | "protection" | "career" | "marriage">("all");

  const categories = [
    { id: "all", label: "All Holy Pujas", icon: Sparkles },
    { id: "health", label: "Health & Longevity", icon: Heart },
    { id: "wealth", label: "Wealth & Prosperity", icon: TrendingUp },
    { id: "protection", label: "Protection & Victory", icon: ShieldAlert },
    { id: "career", label: "Career & Business", icon: Briefcase },
    { id: "marriage", label: "Family & Marriage", icon: Award }
  ];

  const filteredPujas = selectedCategory === "all" 
    ? ON_LINE_PUJAS 
    : ON_LINE_PUJAS.filter(p => p.category === selectedCategory);

  return (
    <section id="online-pujas-section" className="py-20 bg-[#021816] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Title Block */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-xs font-semibold text-[#FFB347]/80 tracking-wider font-mono">Sacred rites online</span>
          <h2 className="text-3xl font-serif font-black text-white tracking-tight mt-1">
            Online Pujas & Vedic Rituals
          </h2>
          <p className="text-xs text-white/70 mt-2">
            Schedule a customized remote offering performed inside ancient temple sanctums. All prayers are authenticated via live video recordings and physical Prasad dispatches.
          </p>
        </div>

        {/* Filter Tabs list */}
        <div className="flex flex-wrap justify-center gap-3 mb-12">
          {categories.map((cat) => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.id}
                id={`puja-tab-${cat.id}`}
                onClick={() => setSelectedCategory(cat.id as any)}
                className={`flex items-center space-x-2 px-5 py-2.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  selectedCategory === cat.id
                    ? "bg-[#FFB347] text-[#021816] shadow-md border border-[#FFB347]"
                    : "bg-[#092320] text-white/80 hover:bg-white/5 hover:text-white border border-white/10"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Puja Items Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredPujas.map((puja) => (
            <div
              key={puja.id}
              id={`puja-card-${puja.id}`}
              className="bg-[#092320] rounded-3xl border border-white/10 overflow-hidden shadow-sm hover:shadow-lg hover:border-[#5EEAD4]/30 transition-all flex flex-col justify-between scale-100 hover:scale-[1.01] duration-300"
            >
              <div>
                {/* Product Image */}
                <div className="relative aspect-video bg-[#021816]/70 overflow-hidden">
                  {puja.imageUrl ? (
                    <img
                      src={puja.imageUrl}
                      alt={puja.name}
                      className="w-full h-full object-cover select-none filter brightness-90 transition-transform duration-700 hover:scale-105"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <SacredIcon
                      type={puja.id as any}
                      size="md"
                      className="absolute inset-0 w-full h-full border-none"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#021816]/95 via-transparent to-transparent" />
                  
                  {/* Temple Association badge at bottom left */}
                  <div className="absolute bottom-3 left-4 text-left text-white text-xs">
                    <span className="block font-mono text-[9px] uppercase tracking-wider text-[#FFB347] font-extrabold">Temple Association:</span>
                    <span className="block font-bold text-white">{puja.templeName}</span>
                  </div>

                  {/* Pricing Float Badge (Book-Before-July promo discount) */}
                  <div className="absolute top-4 right-4 bg-[#021816]/95 border border-[#FFB347]/45 text-[#FFB347] text-xs font-black font-serif px-3.5 py-2 rounded-2xl shadow-lg flex flex-col items-end spacing-y-0.5">
                    {isDiscountActive() ? (
                      <>
                        <span className="text-[10px] line-through text-white/50 tracking-tight">₹{puja.price}</span>
                        <span className="text-sm font-bold text-[#5EEAD4] tracking-normal">
                          ₹{getDiscountedPrice(puja.price)}
                          <span className="text-[9px] font-sans font-bold text-[#FFB347] block text-right mt-0.5">50% OFF · {DISCOUNT_DEADLINE_LABEL}</span>
                        </span>
                      </>
                    ) : (
                      <span className="text-sm font-bold text-white tracking-normal">₹{puja.price}</span>
                    )}
                  </div>
                </div>

                {/* Puja specs */}
                <div className="p-6 text-left space-y-4">
                  <span className="text-[10px] uppercase font-mono tracking-widest text-[#5EEAD4] font-bold bg-[#5EEAD4]/10 border border-[#5EEAD4]/25 px-2.5 py-1 rounded-full">
                    {puja.deityName} Ritual
                  </span>

                  <h3 className="font-serif text-lg font-black text-white leading-tight min-h-[44px]">
                    {puja.name}
                  </h3>

                  {/* Benefits */}
                  <div className="space-y-1.5 bg-[#021816]/75 p-3 rounded-2xl border border-white/5">
                    <span className="block text-[10px] font-bold text-[#FFB347] uppercase tracking-wide">Sacred Benefits:</span>
                    <p className="text-xs text-white/80 font-sans leading-relaxed">
                      {puja.benefits}
                    </p>
                  </div>

                  {/* Priest details */}
                  <div className="flex items-center space-x-2.5 text-xs text-white/80">
                    <div className="w-8 h-8 rounded-full bg-[#FFB347]/10 flex items-center justify-center p-0.5 border border-[#FFB347]/20 text-[#FFB347] font-bold text-xs shrink-0">
                      ॐ
                    </div>
                    <div>
                      <span className="block text-[10px] text-white/40 font-mono">Assigned Priest:</span>
                      <span className="block font-semibold text-[#5EEAD4]">{puja.priestDetails}</span>
                    </div>
                  </div>

                  {/* Video recording/Prasad check indicators */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5 text-[10px] font-mono text-white/50">
                    <div className="flex items-center space-x-1">
                      <Video className="w-3.5 h-3.5 text-emerald-400" />
                      <span>HD Video dispatch</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#5EEAD4]" />
                      <span>{puja.prasadIncluded ? "Prasad Shipped Eco" : "Sankalpa E-Patrika"}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="p-6 pt-0">
                <button
                  id={`puja-book-btn-${puja.id}`}
                  onClick={() => onBookNowClick(puja.name, getDiscountedPrice(puja.price))}
                  className="w-full bg-[#FFB347] hover:bg-[#F27D26] text-[#021816] font-extrabold py-3 rounded-xl text-xs transition-colors tracking-widest shadow cursor-pointer uppercase"
                >
                  BOOK SANKALPA PUJA
                </button>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
