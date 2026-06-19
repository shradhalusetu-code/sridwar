/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";

interface SacredIconProps {
  type: 
    | "puri-jagannath"
    | "bbsr-lingaraj"
    | "ghatgaon-tarini"
    | "purushottampur-tara-tarini"
    | "jajpur-biraja"
    | "sambalpur-samaleswari"
    | "jagatsinghpur-sarala"
    | "kakatpur-mangala"
    | "cuttack-dhabaleswar"
    | "bhadrak-akhandaalamani"
    | "kantilo-nilamadhab"
    | "jajpur-chhatia-bata"
    | "kendrapara-baladevjew"
    | "dhenkanal-kapilash"
    | "varanasi-kashi-vishwanath"
    | "kedarnath-kedarnath"
    | "badrinath-badrinath"
    | "katra-vaishno-devi"
    | "vrindavan-banke-bihari"
    | "vrindavan-prem-mandir"
    | "haridwar-har-ki-pauri"
    | "kangra-jwala-ji"
    | "somnath-somnath"
    | "dwarka-dwarkadhish"
    | "nashik-trimbakeshwar"
    | "mumbai-siddhivinayak"
    | "kolhapur-mahalakshmi"
    | "sarangpur-kashtabhanjan-hanuman"
    | "guwahati-kamakhya"
    | "kolkata-kalighat"
    | "kolkata-dakshineswar"
    | "deoghar-baidyanath"
    // Online Pujas
    | "puja-health-mrityunjaya"
    | "puja-wealth-laxmi"
    | "puja-protection-sarala"
    | "puja-career-ganesha"
    | "puja-marriage-milani"
    // Temple Bazaar Products
    | "prod-prasad-puri"
    | "prod-rudraksha-kashi"
    | "prod-incense-vrindavan"
    | "prod-kit-festive"
    // Other system-wide pages
    | "divine-mission"
    | "live-darshan"
    | "gau-seva-feed";
  className?: string;
  size?: "sw" | "sm" | "md" | "lg" | "xl";
}

export default function SacredIcon({ type, className = "", size = "md" }: SacredIconProps) {
  // Setup sizing
  const dimensions = {
    sw: "w-8 h-8",
    sm: "w-24 h-24",
    md: "w-full h-48",
    lg: "w-full h-64",
    xl: "w-full h-80"
  }[size];

  // Colors & Symbols for rendering beautiful SVGs
  const getIconData = () => {
    switch (type) {
      case "puja-health-mrityunjaya":
      case "deoghar-baidyanath":
      case "bbsr-lingaraj":
      case "cuttack-dhabaleswar":
      case "bhadrak-akhandaalamani":
      case "dhenkanal-kapilash":
      case "varanasi-kashi-vishwanath":
      case "kedarnath-kedarnath":
      case "somnath-somnath":
      case "nashik-trimbakeshwar":
        return {
          symbol: "ॐ",
          title: "LORD SHIVA",
          sub: "Trident & Cosmic Light",
          bgGradient: "from-[#021816] via-[#0b332d] to-[#011110]",
          accentColor: "#5EEAD4",
          svgType: "trishul"
        };
      case "puja-wealth-laxmi":
      case "kolhapur-mahalakshmi":
      case "ghatgaon-tarini":
      case "purushottampur-tara-tarini":
      case "jajpur-biraja":
      case "sambalpur-samaleswari":
      case "kakatpur-mangala":
      case "katra-vaishno-devi":
      case "kolkata-kalighat":
      case "kolkata-dakshineswar":
      case "guwahati-kamakhya":
        return {
          symbol: "श्री",
          title: "SHAKTI DEVI",
          sub: "Precious Lotus & Blessings",
          bgGradient: "from-[#021816] via-[#2a1309] to-[#011110]",
          accentColor: "#FFB347",
          svgType: "lotus"
        };
      case "puja-protection-sarala":
      case "jagatsinghpur-sarala":
        return {
          symbol: "ॐ",
          title: "MAA SARALA",
          sub: "Wisdom Shield & Sword",
          bgGradient: "from-[#021816] via-[#102d28] to-[#011110]",
          accentColor: "#FFB347",
          svgType: "durga"
        };
      case "puja-career-ganesha":
      case "mumbai-siddhivinayak":
        return {
          symbol: "卐",
          title: "LORD GANESHA",
          sub: "Success & Obstacle Remover",
          bgGradient: "from-[#021816] via-[#241e0b] to-[#011110]",
          accentColor: "#FFB347",
          svgType: "ganesha"
        };
      case "puja-marriage-milani":
      case "vrindavan-banke-bihari":
      case "vrindavan-prem-mandir":
        return {
          symbol: "राधे",
          title: "RADHA KRISHNA",
          sub: "Divine Love & Flute",
          bgGradient: "from-[#021816] via-[#1b1c3d] to-[#011110]",
          accentColor: "#5EEAD4",
          svgType: "flute"
        };
      case "puri-jagannath":
      case "prod-prasad-puri":
      case "kantilo-nilamadhab":
      case "jajpur-chhatia-bata":
      case "kendrapara-baladevjew":
      case "badrinath-badrinath":
      case "dwarka-dwarkadhish":
        return {
          symbol: "जगन्नाथ",
          title: "LORD JAGANNATH",
          sub: "Absolute Spiritual Nectar",
          bgGradient: "from-[#021816] via-[#2f1807] to-[#011110]",
          accentColor: "#FFB347",
          svgType: "mandir"
        };
      case "prod-rudraksha-kashi":
        return {
          symbol: "ॐ",
          title: "PANCHMUKHI RUDRAKSHA",
          sub: "Holy Cosmic Bead",
          bgGradient: "from-[#021816] via-[#152e2a] to-[#011110]",
          accentColor: "#FFB347",
          svgType: "rudraksha"
        };
      case "prod-incense-vrindavan":
        return {
          symbol: "श्री",
          title: "SACRED INCENSE",
          sub: "Organic Petal Smoke",
          bgGradient: "from-[#021816] via-[#1c1c1f] to-[#011110]",
          accentColor: "#5EEAD4",
          svgType: "incense"
        };
      case "prod-kit-festive":
        return {
          symbol: "ॐ",
          title: "SAMPOORNA PUJA KIT",
          sub: "Vedas Altar Essentials",
          bgGradient: "from-[#021816] via-[#221d0a] to-[#011110]",
          accentColor: "#FFB347",
          svgType: "pujalit"
        };
      case "divine-mission":
        return {
          symbol: "ॐ",
          title: "SRI DWAR MISSION",
          sub: "Bridging faith through space",
          bgGradient: "from-[#021816] via-[#09302a] to-[#05201c]",
          accentColor: "#FFB347",
          svgType: "mission"
        };
      case "live-darshan":
        return {
          symbol: "🛕",
          title: "LIVE TEMPLE SANCTUM",
          sub: "Vedic Chants Broadcast",
          bgGradient: "from-[#021816] via-[#143d3b] to-[#05201c]",
          accentColor: "#5EEAD4",
          svgType: "live"
        };
      case "gau-seva-feed":
        return {
          symbol: "🐂",
          title: "AYODHYA GAUSALA FEED",
          sub: "Nurturing divine Kamadhenu",
          bgGradient: "from-[#021816] via-[#1d2d14] to-[#05201b]",
          accentColor: "#FFB347",
          svgType: "cow"
        };
      default:
        return {
          symbol: "ॐ",
          title: "SRI DWAR RITUAL",
          sub: "Pure Spiritual Energy",
          bgGradient: "from-[#021816] via-[#0b2b27] to-[#011110]",
          accentColor: "#FFB347",
          svgType: "mandir"
        };
    }
  };

  const data = getIconData();

  // Render decorative visual vectors based on svgType to make it look hyper polished
  const renderGraphicContent = () => {
    switch (data.svgType) {
      case "trishul":
        return (
          <g transform="translate(100, 40)" stroke={data.accentColor} strokeWidth="2.5" fill="none">
            {/* Trishul outer hooks */}
            <path d="M 60 70 C 60 120, 140 120, 140 70" strokeLinecap="round" />
            {/* Center Spear */}
            <line x1="100" y1="50" x2="100" y2="150" strokeLinecap="round" />
            <path d="M 100 50 L 92 65 L 108 65 Z" fill={data.accentColor} />
            {/* Damru center bound */}
            <path d="M 85 150 L 115 168 L 85 168 L 115 150 Z" strokeWidth="2" fill={`${data.accentColor}22`} />
            <circle cx="100" cy="159" r="3" fill={data.accentColor} />
            {/* Crescent Moon */}
            <path d="M 120 90 A 20 20 0 0 1 110 125 A 25 25 0 0 0 130 95 Z" fill={`${data.accentColor}bb`} stroke="none" />
          </g>
        );
      case "lotus":
        return (
          <g transform="translate(100, 45)" stroke={data.accentColor} strokeWidth="2" fill={`${data.accentColor}11`}>
            {/* Central petal */}
            <path d="M 100 40 C 85 70, 85 110, 100 130 C 115 110, 115 70, 100 40 Z" fill={`${data.accentColor}22`} />
            {/* Left petal */}
            <path d="M 100 60 C 60 80, 50 115, 100 130 C 70 110, 80 80, 100 60 Z" />
            {/* Right petal */}
            <path d="M 100 60 C 140 80, 150 115, 100 130 C 130 110, 120 80, 100 60 Z" />
            {/* Secondary lower petals */}
            <path d="M 100 80 C 40 100, 45 130, 95 132" strokeLinecap="round" />
            <path d="M 100 80 C 160 100, 155 130, 105 132" strokeLinecap="round" />
            {/* Base water lines */}
            <line x1="70" y1="145" x2="130" y2="145" strokeWidth="1.5" strokeDasharray="5 3" />
            <line x1="85" y1="151" x2="115" y2="151" strokeWidth="1" strokeDasharray="3 3" />
          </g>
        );
      case "ganesha":
        return (
          <g transform="translate(100, 40)" stroke={data.accentColor} strokeWidth="2.5" fill="none">
            {/* Styled outline of Ganesha face / ears / trunk */}
            <path d="M 70 60 C 70 30, 130 30, 130 60 C 130 90, 115 100, 110 120 C 105 140, 75 145, 80 160 C 83 168, 95 160, 95 150" strokeLinecap="round" />
            {/* Ear Left */}
            <path d="M 70 60 C 40 50, 45 90, 75 90" strokeLinecap="round" />
            {/* Ear Right */}
            <path d="M 130 60 C 160 50, 155 90, 125 90" strokeLinecap="round" strokeWidth="2" />
            {/* Swastika symbol inside crown */}
            <path d="M 94 40 L 106 40 L 106 46 L 100 46 L 100 34 L 94 34" strokeWidth="1.5" />
            {/* Ganesha modak outline */}
            <path d="M 125 140 Q 135 140 135 150 Q 135 160 125 160 Q 115 160 115 150 Q 115 140 125 140 Z" fill={`${data.accentColor}15`} />
            <circle cx="100" cy="70" r="2.5" fill={data.accentColor} />
          </g>
        );
      case "flute":
        return (
          <g transform="translate(90, 50)" stroke={data.accentColor} strokeWidth="2" fill="none">
            {/* Flute slanted body */}
            <line x1="40" y1="110" x2="180" y2="50" strokeWidth="4" strokeLinecap="round" />
            {/* Flute holes */}
            <circle cx="70" cy="97" r="2" fill={data.accentColor} />
            <circle cx="90" cy="89" r="2" fill={data.accentColor} />
            <circle cx="110" cy="80" r="2" fill={data.accentColor} />
            <circle cx="130" cy="71" r="2" fill={data.accentColor} />
            {/* Peacock Feather */}
            <path d="M 140 67 C 140 30, 180 30, 175 60 C 170 70, 155 70, 145 61" fill={`${data.accentColor}11`} />
            <path d="M 150 55 C 150 40, 170 40, 168 55 Z" fill={data.accentColor} opacity="0.3" />
            <circle cx="159" cy="48" r="4.5" fill={data.accentColor} />
            {/* Thread dangling */}
            <path d="M 45 110 C 35 125, 45 140, 35 155" strokeWidth="1.5" strokeDasharray="3 2" />
          </g>
        );
      case "mandir":
        return (
          <g transform="translate(100, 45)" stroke={data.accentColor} strokeWidth="2" fill="none">
            {/* Shikhara / Dome structure */}
            <path d="M 100 30 L 60 110 L 140 110 Z" fill={`${data.accentColor}11`} />
            <path d="M 100 30 L 80 110 M 100 30 L 120 110" />
            {/* Base platform */}
            <rect x="50" y="110" width="100" height="15" rx="3" fill={`${data.accentColor}22`} />
            <rect x="40" y="125" width="120" height="12" rx="2" />
            {/* Temple Flag (Dhwaja) */}
            <line x1="100" y1="30" x2="100" y2="10" strokeWidth="2" />
            <path d="M 100 10 L 122 17 L 100 24 Z" fill={data.accentColor} />
            {/* Sanctum Diya outline */}
            <path d="M 93 120 C 93 115, 107 115, 107 120 Z" fill={data.accentColor} />
          </g>
        );
      case "rudraksha":
        return (
          <g transform="translate(100, 45)" stroke={data.accentColor} strokeWidth="2" fill="none">
            {/* Natural rough rudraksha circle with lines */}
            <circle cx="100" cy="75" r="35" fill={`${data.accentColor}18`} strokeDasharray="6 2" />
            <circle cx="100" cy="75" r="28" strokeWidth="1" />
            {/* Five division facets face lines */}
            <path d="M 100 40 Q 90 75 100 110" />
            <path d="M 100 40 Q 110 75 100 110" />
            <path d="M 65 75 Q 100 65 135 75" />
            <path d="M 65 75 Q 100 85 135 75" />
            {/* Sacred Copper Caps top/bottom */}
            <path d="M 85 43 L 115 43 L 100 30 Z" fill={data.accentColor} />
            <path d="M 85 107 L 115 107 L 100 120 Z" fill={data.accentColor} />
            {/* Thread loops */}
            <line x1="100" y1="30" x2="100" y2="10" strokeWidth="2.5" />
            <line x1="100" y1="120" x2="100" y2="140" strokeWidth="2.5" />
          </g>
        );
      case "incense":
        return (
          <g transform="translate(100, 45)" stroke={data.accentColor} strokeWidth="2.5" fill="none">
            {/* Incense Sticks stand */}
            <rect x="80" y="130" width="40" height="15" rx="4" fill={`${data.accentColor}44`} />
            {/* The Sticks */}
            <line x1="95" y1="130" x2="75" y2="40" strokeWidth="2" />
            <line x1="100" y1="130" x2="100" y2="30" strokeWidth="2" />
            <line x1="105" y1="130" x2="125" y2="45" strokeWidth="2" />
            {/* Aesthetic smoke waves path */}
            <path d="M 75 30 Q 65 15 75 5 T 75 -10" strokeWidth="1" strokeDasharray="4 4" opacity="0.6" />
            <path d="M 100 20 Q 115 5 100 -10 T 110 -25" strokeWidth="1" strokeDasharray="4 4" opacity="0.8" />
            <path d="M 125 35 Q 135 20 125 10 T 130 -5" strokeWidth="1" strokeDasharray="4 4" opacity="0.6" />
          </g>
        );
      case "pujalit":
        return (
          <g transform="translate(100, 40)" stroke={data.accentColor} strokeWidth="2" fill="none">
            {/* Large Brass Puja Thali Plate */}
            <ellipse cx="100" cy="110" rx="60" ry="40" fill={`${data.accentColor}08`} strokeWidth="3" />
            <ellipse cx="100" cy="110" rx="52" ry="33" strokeDasharray="6 4" />
            {/* Inside item 1: Holy Ghee Diya lamp */}
            <path d="M 80 110 C 80 102, 95 102, 95 110 Z" fill={data.accentColor} />
            <circle cx="87.5" cy="101" r="2" fill="#FFB347" />
            {/* Inside item 2: Kalash water pot */}
            <path d="M 120 100 L 110 118 L 130 118 Z" fill={`${data.accentColor}33`} />
            <circle cx="120" cy="95" r="4.5" />
            {/* Inside item 3: Bell */}
            <path d="M 100 124 L 95 133 L 105 133 Z" />
            <line x1="100" y1="124" x2="100" y2="114" />
          </g>
        );
      case "mission":
        return (
          <g transform="translate(100, 40)" stroke={data.accentColor} strokeWidth="2" fill="none">
            {/* Central glowing Mandala rings */}
            <circle cx="100" cy="80" r="45" fill={`${data.accentColor}05`} />
            <circle cx="100" cy="80" r="35" strokeDasharray="8 4" opacity="0.6" />
            <circle cx="100" cy="80" r="25" strokeWidth="1" />
            {/* Glowing rays */}
            <line x1="100" y1="25" x2="100" y2="10" strokeDasharray="4 2" />
            <line x1="100" y1="135" x2="100" y2="150" strokeDasharray="4 2" />
            <line x1="45" y1="80" x2="30" y2="80" strokeDasharray="4 2" />
            <line x1="155" y1="80" x2="170" y2="80" strokeDasharray="4 2" />
            
            <text x="100" y="87" textAnchor="middle" fill={data.accentColor} className="text-xl font-serif font-bold select-none">ॐ</text>
          </g>
        );
      case "live":
        return (
          <g transform="translate(100, 35)" stroke={data.accentColor} strokeWidth="2" fill="none">
            {/* Shikhara outline */}
            <path d="M 100 20 L 70 95 L 130 95 Z" fill={`${data.accentColor}11`} />
            {/* Waving dynamic bells on side */}
            <path d="M 64 85 Q 52 87 60 97" strokeLinecap="round" />
            <circle cx="60" cy="97" r="2.5" fill={data.accentColor} />
            <path d="M 136 85 Q 148 87 140 97" strokeLinecap="round" />
            <circle cx="140" cy="97" r="2.5" fill={data.accentColor} />
            {/* Dynamic camera / live focus square */}
            <rect x="40" y="30" width="120" height="85" rx="8" strokeDasharray="5 5" opacity="0.4" />
            {/* Play triangle */}
            <path d="M 94 65 L 112 75 L 94 85 Z" fill={data.accentColor} stroke="none" />
          </g>
        );
      case "durga":
        return (
          <g transform="translate(100, 42)" stroke={data.accentColor} strokeWidth="2.5" fill="none">
            {/* Royal shield shape */}
            <path d="M 65 50 L 135 50 C 135 90, 100 125, 100 125 C 100 125, 65 90, 65 50 Z" fill={`${data.accentColor}12`} />
            {/* Crossed weapons (Trident & Sword) */}
            <line x1="50" y1="130" x2="150" y2="40" strokeWidth="1.5" />
            <line x1="150" y1="130" x2="50" y2="40" strokeWidth="1.5" />
            {/* Inner design of shield */}
            <circle cx="100" cy="80" r="15" strokeWidth="1.5" />
            <text x="100" y="85" textAnchor="middle" fill={data.accentColor} className="text-xs font-serif font-black select-none">ॐ</text>
          </g>
        );
      case "cow":
        return (
          <g transform="translate(100, 40)" stroke={data.accentColor} strokeWidth="2" fill="none">
            {/* Stylized geometric design of Cow horns and crown */}
            <path d="M 60 50 C 60 90, 140 90, 140 50" strokeWidth="3" strokeLinecap="round" />
            {/* Ears */}
            <path d="M 60 70 C 45 70, 40 85, 65 85 Z" fill={`${data.accentColor}18`} />
            <path d="M 140 70 C 155 70, 160 85, 135 85 Z" fill={`${data.accentColor}18`} />
            {/* Face shield forehead */}
            <path d="M 80 80 Q 100 130 120 80" />
            <path d="M 85 80 L 115 80" />
            {/* Garland around neck */}
            <path d="M 70 120 C 70 145, 130 145, 130 120" strokeLinecap="round" strokeDasharray="4 4" />
            <circle cx="85" cy="135" r="3.5" fill={data.accentColor} />
            <circle cx="100" cy="140" r="4.5" fill={data.accentColor} />
            <circle cx="115" cy="135" r="3.5" fill={data.accentColor} />
          </g>
        );
      default:
        return null;
    }
  };

  return (
    <div
      id={`sacred-icon-wrapper-${type}`}
      className={`relative rounded-3xl overflow-hidden bg-gradient-to-b ${data.bgGradient} flex flex-col justify-between items-center p-6 border border-white/10 text-center shadow-lg hover:border-[#5EEAD4]/30 transition-all duration-300 ${dimensions} ${className}`}
    >
      {/* Decorative starry / light sparkles stream overlay */}
      <div className="absolute top-2 left-2 text-[9px] text-[#FFB347] opacity-25 font-mono select-none">卐</div>
      <div className="absolute top-2 right-2 text-[9px] text-[#FFB347] opacity-25 font-mono select-none">ॐ</div>
      <div className="absolute bottom-2 left-2 text-[9px] text-white/10 font-mono select-none">ॐ</div>
      <div className="absolute bottom-2 right-2 text-[9px] text-white/10 font-mono select-none">卐</div>

      {/* Embedded SVG graphics representation */}
      <div className="w-full h-32 flex items-center justify-center relative mb-4">
        {/* Glow halo in back */}
        <div 
          className="absolute w-28 h-28 rounded-full opacity-10 filter blur-xl animate-pulse" 
          style={{ backgroundColor: data.accentColor }}
        />
        <svg 
          viewBox="0 0 200 180" 
          className="w-full h-full max-h-[140px] drop-shadow-[0_0_8px_rgba(255,179,71,0.25)]"
        >
          {renderGraphicContent()}
        </svg>

        {/* Central dynamic displaying symbol as a stamp */}
        <div className="absolute bottom-0 bg-[#021816]/90 border border-white/10 px-3 py-1 rounded-full text-[10px] font-mono tracking-widest text-[#FFB347] font-extrabold uppercase shadow-sm">
          {data.symbol}
        </div>
      </div>

      {/* Meta Text */}
      <div className="mt-1 space-y-1 text-center w-full">
        <h4 className="font-serif text-sm font-black tracking-wider text-white uppercase truncate">
          {data.title}
        </h4>
        <p className="text-[10px] font-mono tracking-widest text-white/60 uppercase truncate">
          {data.sub}
        </p>
      </div>
    </div>
  );
}
