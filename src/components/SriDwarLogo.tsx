/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
// @ts-ignore
import logoImgSrc from "../assets/images/sri_dwar_logo_1781768992775.jpg";

interface SriDwarLogoProps {
  className?: string; // Additional classes for outer wrapper
  iconSize?: "sm" | "md" | "lg" | "xl"; // Size of the temple-lotus icon
  showTagline?: boolean; // Whether to show the tagline block
  variant?: "light" | "colored"; // Color styling theme
  useImageOnly?: boolean; // Option to render the raw generated JPG asset
}

export default function SriDwarLogo({
  className = "",
  iconSize = "md",
  showTagline = true,
  variant = "colored",
  useImageOnly = true, // Default to true to apply the clean branding logo image everywhere
}: SriDwarLogoProps) {
  // Dimension definitions for icon sizes
  const iconDimensions = {
    sm: "w-8 h-8",
    md: "w-11 h-11",
    lg: "w-14 h-14",
    xl: "w-20 h-20",
  };

  const selectedSize = iconDimensions[iconSize];

  // Colors based on variant
  const brandOrange = "#f27420"; // Sacred Saffron
  const brandGold = "#FFB347";   // Devotional Gold

  if (useImageOnly) {
    // Dynamic height mapping based on icon size
    const heightClasses = {
      sm: "h-6 md:h-7",
      md: "h-8 md:h-9",
      lg: "h-10 md:h-12",
      xl: "h-14 md:h-16"
    };
    const selectedHeight = heightClasses[iconSize] || heightClasses.md;

    const isCentered = className.includes("justify-center") || className.includes("mx-auto");
    const justifyClass = isCentered ? "justify-center" : "justify-start";
    const isDarkBackground = variant === "colored";

    return (
      <div 
        className={`inline-flex items-center ${justifyClass} transition-all duration-300 ${className}`}
        style={{ mixBlendMode: isDarkBackground ? "screen" : "multiply" }}
      >
        <img
          src={logoImgSrc}
          alt="Sri Dwar Logo"
          referrerPolicy="no-referrer"
          className={`${selectedHeight} w-auto object-contain select-none transition-all duration-300`}
          style={{
            filter: isDarkBackground 
              ? "invert(1) contrast(1.4) brightness(1.2) saturate(1.15)" 
              : "contrast(1.05)",
            mixBlendMode: isDarkBackground ? "screen" : "multiply"
          }}
        />
      </div>
    );
  }

  return (
    <div className={`flex items-center space-x-3.5 select-none transition-all duration-300 ${className}`}>
      {/* 1. SACRED VECTOR EMBLEM: Lotus base with Temple Dome Shikhara and Flag */}
      <div className={`${selectedSize} shrink-0 relative flex items-center justify-center`}>
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full drop-shadow-[0_2px_10px_rgba(242,116,32,0.25)]"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Sacred Temple Flagpole & Saffron Flag (waving right with Om ॐ details) */}
          <line
            x1="50"
            y1="40"
            x2="50"
            y2="12"
            stroke={brandOrange}
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          {/* Waving flag path */}
          <path
            d="M50 12 C 58 11, 57 18, 68 18 C 73 18, 75 14, 75 14 L 50 14 Z"
            fill={brandOrange}
          />
          {/* Small Om Text inside flag area */}
          <text
            x="56"
            y="17"
            fill="white"
            fontSize="4.5"
            fontWeight="bold"
            fontFamily="serif"
          >
            ॐ
          </text>

          {/* Temple Shikhara Dome Structure */}
          {/* Outer contours */}
          <path
            d="M36 60 C 37 40, 43 28, 50 25 C 57 28, 63 40, 64 60 Z"
            fill="transparent"
            stroke={brandOrange}
            strokeWidth="3"
            strokeLinejoin="round"
          />
          {/* Horizontal shikhara bands/ridges */}
          <path
            d="M40 42 Q 50 44 60 42"
            stroke={brandOrange}
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <path
            d="M38 50 Q 50 52 62 50"
            stroke={brandOrange}
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <path
            d="M36 58 Q 50 60 64 58"
            stroke={brandOrange}
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          
          {/* Vertical segments inside the dome */}
          <path
            d="M46 29 C 47 40, 47 50, 48 59"
            stroke={brandOrange}
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M54 29 C 53 40, 53 50, 52 59"
            stroke={brandOrange}
            strokeWidth="2"
            strokeLinecap="round"
          />

          {/* Blooming Lotus Silhouette Base */}
          {/* Primary central petal */}
          <path
            d="M50 66 C 44 76, 50 94, 50 94 C 50 94, 56 76, 50 66 Z"
            fill={brandOrange}
          />
          {/* Left petals */}
          <path
            d="M44 68 C 30 72, 33 88, 50 94 C 33 83, 38 72, 44 68 Z"
            fill={brandOrange}
            opacity="0.95"
          />
          <path
            d="M38 72 C 22 75, 20 88, 50 94 C 20 80, 26 73, 38 72 Z"
            fill={brandOrange}
            opacity="0.85"
          />
          {/* Right petals */}
          <path
            d="M56 68 C 70 72, 67 88, 50 94 C 67 83, 62 72, 56 68 Z"
            fill={brandOrange}
            opacity="0.95"
          />
          <path
            d="M62 72 C 78 75, 80 88, 50 94 C 80 80, 74 73, 62 72 Z"
            fill={brandOrange}
            opacity="0.85"
          />
          {/* Small lotus core divider dot */}
          <circle cx="50" cy="94" r="3.5" fill={brandOrange} />
        </svg>
      </div>

      {/* 2. PREMIUM BRAND TYPOGRAPHY: Serif "SRI DWAR" + Line and Tagline */}
      <div className="flex flex-col items-start text-left">
        <h1 className="text-lg md:text-xl font-serif font-black tracking-widest leading-none flex items-center">
          <span className={variant === "colored" ? "text-white" : "text-[#021816]"}>SRI</span>
          <span className={`mx-2 w-1.5 h-1.5 rounded-full ${variant === "colored" ? "bg-[#FFB347]" : "bg-[#f27420]"}`} />
          <span className={variant === "colored" ? "text-[#FFB347]" : "text-[#f27420]"}>DWAR</span>
        </h1>

        {/* Separator Horizontal Saffron Line with Diamond Divider in Middle */}
        {showTagline && (
          <div className="w-full flex items-center justify-between my-1 max-w-[140px]">
            <div className="h-[1px] bg-gradient-to-r from-[#f27420] to-transparent w-[42%]" />
            <span className="text-[5px] text-[#FFB347]">◆</span>
            <div className="h-[1px] bg-gradient-to-l from-[#f27420] to-transparent w-[42%]" />
          </div>
        )}

        {/* "CONNECT. CONTRIBUTE. PRESERVE." Tagline */}
        {showTagline && (
          <span className="text-[7px] font-semibold tracking-[0.16em] font-sans text-white/60 uppercase leading-none mt-0.5">
            Faith Beyond Distance
          </span>
        )}
      </div>
    </div>
  );
}
