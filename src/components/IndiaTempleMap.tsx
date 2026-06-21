/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * IndiaTempleMap — Static image of India with temple illustrations
 * Placed in the Temple Bazaar / ProductCatalog page section
 */

// NOTE: place India_Temple.png in your project's assets folder (e.g. src/assets/)
// and adjust the import path below if needed.
import indiaTempleImg from "../assets/images/India_Temple.png";

export default function IndiaTempleMap() {
  return (
    <div className="w-full bg-[#021816] rounded-3xl border border-white/10 overflow-hidden p-4 sm:p-6">

      {/* Section Header */}
      <div className="text-center mb-6">
        <span className="text-[10px] font-mono text-[#FFB347]/80 uppercase tracking-widest">Sacred Geography</span>
        <h3 className="font-serif text-xl font-black text-white mt-1">India's Divine Temple Network</h3>
      </div>

      {/* Static Map Image */}
      <div className="relative w-full mx-auto" style={{ maxWidth: 520 }}>
        <img
          src={indiaTempleImg}
          alt="Map of India with iconic temples"
          className="w-full h-auto rounded-2xl drop-shadow-2xl"
        />
      </div>

    </div>
  );
}
