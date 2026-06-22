/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import { SPIRITUAL_PRODUCTS } from "../data/spiritualData";
import { Product } from "../types";
import { ShoppingBasket, Star, ShieldCheck, Heart, Clock, Store } from "lucide-react";
import SacredIcon from "./SacredIcon";
import UPIPaymentModal from "./UPIPaymentModal";
import IndiaTempleMap from "./IndiaTempleMap";
import { getDiscountedPrice, isDiscountActive, DISCOUNT_DEADLINE_LABEL } from "../utils/discount";

interface ProductCatalogProps {
  onAddToCart: (product: Product) => void;
  cart: Array<{ product: Product; quantity: number }>;
}

export default function ProductCatalog({ onAddToCart, cart }: ProductCatalogProps) {
  const [showUPI, setShowUPI] = useState(false);
  const [upiProduct, setUpiProduct] = useState<{ name: string; price: number } | null>(null);
  const [upiRefId, setUpiRefId] = useState("");

  const handleBuyNow = (product: Product) => {
    setUpiProduct({ name: product.name, price: getDiscountedPrice(product.price) });
    setUpiRefId("SDB-" + Math.floor(100000 + Math.random() * 900000));
    setShowUPI(true);
  };

  return (
    <section id="product-catalog-section" className="py-20 bg-[#021816] text-white text-left">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* India Temple Map (static image) */}
        <div className="mb-16">
          <IndiaTempleMap />
        </div>

        {/* Title Block */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-xs font-semibold text-[#FFB347]/80 tracking-wider font-mono">Temple bazaar store</span>
          <h2 className="text-3xl font-serif font-black text-white tracking-tight mt-1">
            Spiritual Commerce & Sacred Prasad
          </h2>
          <p className="text-xs text-white/70 mt-2">
            Procure authentic religious accessories, energized rudraksha beads, organic dhoop, and certified dry temple Mahaprasad vacuum-packed for global shipping freshness.
          </p>
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {SPIRITUAL_PRODUCTS.map((prod) => {
            const cartItem = cart.find(item => item.product.id === prod.id);
            const quantityInCart = cartItem ? cartItem.quantity : 0;

            return (
              <div
                key={prod.id}
                id={`product-card-${prod.id}`}
                className="bg-[#092320] rounded-3xl border border-white/10 overflow-hidden shadow-sm hover:shadow-lg hover:border-[#5EEAD4]/30 transition-all flex flex-col justify-between scale-100 hover:scale-[1.02] duration-300"
              >
                <div>
                  {/* Photo area with floating ratings and labels with high-res uploaded products */}
                  <div className="relative aspect-square bg-[#021816]/70 overflow-hidden group">
                    <img
                      src={prod.imageUrl}
                      alt={prod.name}
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      referrerPolicy="no-referrer"
                    />
                    
                    {/* Divine gradient shadow overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#021816] via-transparent to-transparent opacity-80 pointer-events-none" />

                    {/* Star Rating Badge */}
                    <div className="absolute top-3 left-3 bg-[#021816]/95 border border-white/10 px-2.5 py-1 rounded-full shadow text-[10px] font-bold text-white flex items-center space-x-1">
                      <Star className="w-3 h-3 text-[#FFB347] fill-[#FFB347]" />
                      <span>{prod.rating}</span>
                    </div>

                    {/* Category Label badge */}
                    <div className="absolute bottom-3 left-3 bg-[#021816]/90 backdrop-blur-md border border-white/10 text-[#5EEAD4] text-[9px] uppercase tracking-widest font-mono font-bold px-2.5 py-1 rounded-md">
                      {prod.category}
                    </div>
                  </div>

                  {/* Pricing and Details */}
                  <div className="p-5 text-left space-y-3.5 text-white">
                    <h3 className="font-serif text-sm font-bold text-white min-h-[38px] leading-snug">
                      {prod.name}
                    </h3>

                    {/* Price structure */}
                    <div className="flex items-baseline justify-between">
                      <div>
                        {isDiscountActive() ? (
                          <>
                            <span className="text-[10px] text-white/35 line-through font-mono block">₹{prod.price} INR</span>
                            <span className="text-lg font-black font-serif text-[#FFB347]">₹{getDiscountedPrice(prod.price)} INR</span>
                          </>
                        ) : (
                          <span className="text-lg font-black font-serif text-[#FFB347]">₹{prod.price} INR</span>
                        )}
                      </div>
                      {isDiscountActive() ? (
                        <span className="text-[10px] text-[#5EEAD4] font-mono">50% OFF 🎉</span>
                      ) : (
                        <span className="text-[10px] text-[#5EEAD4] font-mono">Free sacred Thread</span>
                      )}
                    </div>

                    {/* Temple Story segment */}
                    <p className="text-[11px] text-white/70 line-clamp-2 leading-relaxed">
                      {prod.templeStory}
                    </p>

                    {/* Key characteristics list: Significance & Authenticity */}
                    <div className="space-y-1.5 text-[10px] font-sans border-t border-white/5 pt-3">
                      <div className="flex items-start space-x-1">
                        <Heart className="w-3.5 h-3.5 text-[#FFB347] shrink-0 mt-0.5" />
                        <span className="text-white/80 leading-normal text-left">
                          <strong>Vedic Significance:</strong> {prod.significance}
                        </span>
                      </div>
                      <div className="flex items-start space-x-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-[#5EEAD4] shrink-0 mt-0.5" />
                        <span className="text-white/80 leading-normal text-left">
                          <strong>Verification:</strong> {prod.authenticity}
                        </span>
                      </div>
                    </div>

                    {/* Blessing details / shipping dates */}
                    <div className="bg-[#021816]/60 p-2.5 rounded-xl border border-white/5 grid grid-cols-2 gap-1 text-[9px] font-mono text-white/50">
                      <div>
                        <span className="block text-white/40 uppercase text-left">Timing</span>
                        <span className="font-bold text-white flex items-center space-x-0.5">
                          <Clock className="w-3 h-3 text-[#FFB347]" />
                          <span>{prod.deliveryTimeline}</span>
                        </span>
                      </div>
                      <div>
                        <span className="block text-white/40 uppercase text-left">Blessing</span>
                        <span className="font-bold text-[#5EEAD4]">✓ Mandir Puja</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Buy Button */}
                <div className="p-5 pt-0">
                  <div className="space-y-2">
                    <button
                      id={`buy-now-btn-${prod.id}`}
                      onClick={() => handleBuyNow(prod)}
                      className="w-full font-extrabold py-3 rounded-xl text-xs transition-all tracking-widest flex items-center justify-center space-x-1.5 shadow cursor-pointer bg-[#FFB347] text-[#021816] hover:bg-[#F27D26]"
                    >
                      <span>BUY NOW — PAY VIA UPI 🙏</span>
                    </button>
                    <button
                      id={`add-to-cart-btn-${prod.id}`}
                      onClick={() => onAddToCart(prod)}
                      className={`w-full font-extrabold py-2.5 rounded-xl text-xs transition-all tracking-widest flex items-center justify-center space-x-1.5 shadow cursor-pointer border ${
                        quantityInCart > 0
                          ? "bg-emerald-600 text-white hover:bg-[#07534D] border-emerald-500"
                          : "bg-white/5 text-white hover:bg-white/10 border-white/10"
                      }`}
                    >
                      <ShoppingBasket className="w-3.5 h-3.5" />
                      <span>{quantityInCart > 0 ? `IN BASKET (${quantityInCart})` : "ADD TO BASKET"}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

      </div>

      {/* UPI Payment Modal for Temple Bazaar */}
      {upiProduct && (
        <UPIPaymentModal
          isOpen={showUPI}
          onClose={() => setShowUPI(false)}
          onPaymentConfirmed={() => {
            setShowUPI(false);
            setUpiProduct(null);
          }}
          amount={upiProduct.price}
          bookingName={upiProduct.name}
          devoteeName="Devotee"
          refId={upiRefId}
        />
      )}
    </section>
  );
}
