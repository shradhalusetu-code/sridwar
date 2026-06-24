/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Temple {
  id: string;
  name: string;
  city: string;
  state: string;
  deity: string;
  story: string;
  deityInfo: string;
  timings: string;
  rituals: string[];
  imageUrl: string;
  symbol: string; // Sanskrit/sacred characters or shorthand
}

export interface Seva {
  id: string;
  name: string;
  templeAssociation: string;
  significance: string;
  blessingExplanation: string;
  impactStat: string;
  donationTiers: { amount: number; label: string; description: string }[];
  imageUrl?: string;
}

export interface Puja {
  id: string;
  name: string;
  category: "health" | "wealth" | "protection" | "career" | "marriage" | "education" | "festivals" | "graha_shanti" | "ancestor";
  templeName: string;
  deityName: string;
  benefits: string;
  priestDetails: string;
  videoAvailable: boolean;
  prasadIncluded: boolean;
  price: number;
  imageUrl: string;
  duration?: string;
  materialsIncluded?: string[];
}

export interface Product {
  id: string;
  name: string;
  category: "prasad" | "rudraksha" | "incense" | "diyas" | "jewellery" | "books" | "kits" | "hampers";
  templeStory: string;
  significance: string;
  authenticity: string;
  blessings: string;
  price: number;
  imageUrl: string;
  rating: number;
  deliveryTimeline: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface DevoteeProfile {
  name: string;
  gotra: string;
  primaryDeity: string;
  visitedTemples: string[];
  dharmicID: string;
  joinedAt: string;
  donationHistory: { id: string; date: string; purpose: string; amount: number; type: string }[];
}

export interface Mantra {
  text: string;
  translation: string;
  significance: string;
  audioSimText: string;
}

export interface DailyHoroscope {
  sign: string;
  prediction: string;
  luckyNumber: number;
  luckyColor: string;
  remedy: string;
}
