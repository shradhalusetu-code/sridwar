/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Seva, Puja, Product, Mantra, DailyHoroscope } from "../types";

export const MANTRAS_OF_THE_DAY: Mantra[] = [
  {
    text: "Maha Mrityunjaya Mantra",
    translation: "Om Tryambakam Yajamahe Sugandhim Pushti-Vardhanam Utvarukamiva Bandhanan Mrityor Mukshiya Mamritat",
    significance: "Saves from untimely death, diseases, fear, and feeds inner spiritual awakening and liberation.",
    audioSimText: "Om Try-am-ba-kam Ya-ja-ma-he..."
  },
  {
    text: "Gayatri Mantra",
    translation: "Om Bhur Bhuvah Svah Tat Savitur Varenyam Bhargo Devasya Dheemahi Dhiyo Yo Nah Prachodayat",
    significance: "The supreme Vedic prayer for intellect, wisdom, purification, and alignment with the cosmic sun.",
    audioSimText: "Om Bhuur Bhu-vah Svah..."
  },
  {
    text: "Shiva Panchakshara Mantra",
    translation: "Om Namah Shivaya",
    significance: "I bow to the infinite auspicious inner Lord Shiva. Connects the five elemental states of consciousness.",
    audioSimText: "Om Na-mah Shi-vaay..."
  },
  {
    text: "Mahamantra (Hare Krishna)",
    translation: "Hare Krishna Hare Krishna Krishna Krishna Hare Hare, Hare Rama Hare Rama Rama Rama Hare Hare",
    significance: "Fosters ecstasy, divine love, absolute peace, and clears the toxic residues of modern life (Kali Yuga).",
    audioSimText: "Ha-re Krish-na Ha-re Krish-na..."
  }
];

export const DAILY_HOROSCOPES: DailyHoroscope[] = [
  {
    sign: "Aries (Mesha)",
    prediction: "Lord Kartikeya blesses you today with high energy and breakthrough ideas. Perfect time to initiate important discussions or projects that require courage.",
    luckyNumber: 9,
    luckyColor: "Saffron Red",
    remedy: "Offer a spoonful of honey to Lord Shiva or chant Om Saravanabhava Namaha."
  },
  {
    sign: "Taurus (Vrishabha)",
    prediction: "Sukh and Samriddhi are in alignment. High chance of unexpected news related to assets or family wellness. Calm speech is your key asset today.",
    luckyNumber: 6,
    luckyColor: "Sandalwood Cream",
    remedy: "Offer white rice grains or white flowers in your local temple's sanctum."
  },
  {
    sign: "Gemini (Mithuna)",
    prediction: "Maa Saraswati aligns your communications. Your wisdom will solve key blockages for friends or teams today. Journey of mind starts today.",
    luckyNumber: 5,
    luckyColor: "Teal Green",
    remedy: "Light a cow ghee diya in the north direction of your altar and pray for clarity."
  },
  {
    sign: "Cancer (Karkat)",
    prediction: "Emotional clarity arrives like the full moon. Lord Shiva protects your emotional realm. Keep standard focus on your wellness today.",
    luckyNumber: 2,
    luckyColor: "Chandra White",
    remedy: "Pour clean water on Lord Shiva's Lingam while chanting Om Namah Shivaya."
  },
  {
    sign: "Leo (Simha)",
    prediction: "Your solar energy shines. Divine fortune rewards your leadership. A perfect day to lead with compassion and support juniors.",
    luckyNumber: 1,
    luckyColor: "Surya Gold",
    remedy: "Offer clean copper glass water facing the rising sun in the morning."
  },
  {
    sign: "Virgo (Kanya)",
    prediction: "A stable, restorative day. Lord Ganesha resolves any long-standing operational errors in your routine. Focus on detailed planning.",
    luckyNumber: 5,
    luckyColor: "Forest Green",
    remedy: "Offer three fresh green grass stems (Durva) to Lord Ganesha."
  },
  {
    sign: "Libra (Tula)",
    prediction: "Harmonious cosmic alignment. Goddess Lakshmi blesses your commercial steps today. Wisdom and health go together.",
    luckyNumber: 7,
    luckyColor: "Lotus Pink",
    remedy: "Apply a sweet sandalwood paste bindi on your forehead before leaving."
  },
  {
    sign: "Scorpio (Vrishchika)",
    prediction: "Highly power-infused day. Lord Hanumanji protects your field. Blockage in state transactions is lifted. Trust your gut.",
    luckyNumber: 9,
    luckyColor: "Deep Ochre",
    remedy: "Chant the Hanuman Chalisa in the evening to harness positive vibration."
  },
  {
    sign: "Sagittarius (Dhanu)",
    prediction: "Lord Vishnu (Badrinarayan) opens new pathways of knowledge. Spiritual connection is high today. Intuitive leaps are very likely.",
    luckyNumber: 3,
    luckyColor: "Turmeric Yellow",
    remedy: "Tie a yellow thread on your wrist or offer yellow flowers to the altar."
  },
  {
    sign: "Capricorn (Makara)",
    prediction: "Steady, structured steps yield progress. Lord Shiva protects your work ethics. Your consistency earns praise today.",
    luckyNumber: 8,
    luckyColor: "Smoky Gray",
    remedy: "Donate any small amount or serve food to the needy on your commute."
  },
  {
    sign: "Aquarius (Kumbha)",
    prediction: "Intuitive energy is high. Your vision for community and technology aligns perfectly with contemporary goals. Engage with like-minded circles.",
    luckyNumber: 8,
    luckyColor: "Lotus Teal",
    remedy: "Offer sesame oil in a small iron diya at dusk."
  },
  {
    sign: "Pisces (Meena)",
    prediction: "Divine connection is deeply felt. Great day for meditation, listening to sacred mantras, and doing charity offerings. Inner joy grows.",
    luckyNumber: 3,
    luckyColor: "Dharmic Lemon Yellow",
    remedy: "Read spiritual verses or contribute to support Vedic Gurukul kids."
  }
];

export const FEATURED_SEVAS: Seva[] = [
  {
    id: "seva-annadanam",
    name: "Annadanam (Feeding the Needy & Pilgrims)",
    templeAssociation: "Badrinath Temple — Uttarakhand",
    significance: "Considered the highest form of charity (Maha Dana) in Vedic philosophy. Feeding a hungry soul is equal to serving the supreme Lord.",
    blessingExplanation: "Receive a consecrated Prasad certificate and visual video capturing the cooked Mahaprasad being distributed lovingly to sadhus and devotees.",
    impactStat: "Over 15,000+ meals cooked daily by temple cooks.",
    donationTiers: [
      { amount: 501, label: "Feed 10 Sadhus", description: "Sponsor highly nutritious, fresh, sacred meals for 10 visiting sadhus." },
      { amount: 1501, label: "Feed 35 Pilgrims", description: "Provide hot, pure vegetarian meals to families arriving from remote quarters." },
      { amount: 5001, label: "Maha Bhandara (Full Day)", description: "Sponsor a fully-managed meal service in your name, including direct videos." }
    ],
    imageUrl: import.meta.env.BASE_URL + "images/seva_badrivishal_1781879619365.jpg"
  },
  {
    id: "seva-cow",
    name: "Gau Seva (Sacred Cow Feeding & Upkeep)",
    templeAssociation: "Tirumala Tirupati Devasthanams — Andhra Pradesh",
    significance: "Serving cows is equivalent to satisfying all 33 crore deities residing within Gau Mata according to Hindu scriptures.",
    blessingExplanation: "Fosters home peace, prosperity, and dissolves ancestors' karmic blockages. You will receive pictures with your name Sankalpa displayed at the Gaushala.",
    impactStat: "350+ native cows nurtured in green sanctuaries.",
    donationTiers: [
      { amount: 251, label: "One Day Green Fodder", description: "Fresh green grass, nutritious oil cakes, and pure water for 5 cows." },
      { amount: 1201, label: "Adoption Support (Monthly)", description: "Complete feeding, veterinary wellness, and cozy shelter maintenance for a cow." },
      { amount: 3500, label: "Sacred Gau-Daan Sponsor", description: "Contribute to building brand new sustainable shed spaces for cows." }
    ],
    imageUrl: import.meta.env.BASE_URL + "images/seva_venkatesaya_1781879635982.jpg"
  },
  {
    id: "seva-diya",
    name: "Akhanda Diya Lighting Seva",
    templeAssociation: "Somnath Temple — Gujarat",
    significance: "Lighting a lamp represents dispelling the darkness of ignorance, warding off negative energies, and invoking spiritual illumination.",
    blessingExplanation: "A copper diya will be lit on your behalf in front of Maa Tarini, continuously fueled with pure mustard/cow ghee.",
    impactStat: "12,000+ lamps glowing at the sacred shrine.",
    donationTiers: [
      { amount: 151, label: "3-Day Continuous Diya", description: "A beautiful clay diya constantly fed with quality oils on your behalf." },
      { amount: 501, label: "15-Day Akhanda Ghee Diya", description: "Sponsor a glowing copper ghee lamp with customized name placard." },
      { amount: 2101, label: "Annual Festival Light Supporter", description: "A special brass diya kept burning across key festivals like Navratri + Diwali." }
    ],
    imageUrl: import.meta.env.BASE_URL + "images/seva_somnath_1781879651117.jpg"
  },
  {
    id: "seva-gurukul",
    name: "Vedic Education Support (Gurukul Dan)",
    templeAssociation: "Dakshineswar Kali Temple — West Bengal",
    significance: "Preserves the oral Vedic chanting lineage, recognized by UNESCO as an intangible cultural heritage of humanity.",
    blessingExplanation: "Sponsor textbooks, nutritious meals, clean accommodation, and spiritual training for young Vedic pandas.",
    impactStat: "80+ Gurukul children training in ancient scriptures.",
    donationTiers: [
      { amount: 1001, label: "Vedic Scholar Kits", description: "Provides Sanskrit manuscripts, notebooks, sacred threads, and dress." },
      { amount: 3001, label: "Gurukul Child Sponsor", description: "Covers complete food, stay, and education for a student for 3 months." },
      { amount: 10001, label: "Patron of Ancient Wisdom", description: "Sponsor high-speed digitizer setups to record ancient leaf scrolls." }
    ],
    imageUrl: import.meta.env.BASE_URL + "images/seva_dakshineswar_1781879664944.jpg"
  }
];

export const ON_LINE_PUJAS: Puja[] = [
  {
    id: "puja-health-mrityunjaya",
    name: "Maha Mrityunjaya Healing Puja",
    category: "health",
    templeName: "Baidyanath Temple — Deoghar",
    deityName: "Lord Baidyanath Shiva",
    benefits: "Dissolves severe health challenges, grants longevity, restores high energy, and destroys negative black energies.",
    priestDetails: "Pt. Ramakant Jha (Main Acharya, 24 years legacy)",
    videoAvailable: true,
    prasadIncluded: true,
    price: 1101,
    imageUrl: import.meta.env.BASE_URL + "images/puja_3.jpg"
  },
  {
    id: "puja-wealth-laxmi",
    name: "Maha Lakshmi Kubera Samriddhi Puja",
    category: "wealth",
    templeName: "Mahalakshmi Temple — Kolhapur",
    deityName: "Goddess Mahalakshmi",
    benefits: "Attracts financial opportunities, resolves business debts, unlocks stagnant funds, and establishes luxurious abundance.",
    priestDetails: "Pt. Shrikant Shinde (Temple Heritage Board)",
    videoAvailable: true,
    prasadIncluded: true,
    price: 2101,
    imageUrl: import.meta.env.BASE_URL + "images/puja_1.jpg"
  },
  {
    id: "puja-protection-sarala",
    name: "Ashtabhuja Durga Raksha Kawach Puja",
    category: "protection",
    templeName: "Maa Sarala Temple — Jagatsinghpur",
    deityName: "Maa Sarala",
    benefits: "Acts as a divine protective shield, wards off evil intentions, court cases, and secures family members from planetary shocks.",
    priestDetails: "Pt. Biswambar Panda (Maa Sarala Trust)",
    videoAvailable: true,
    prasadIncluded: true,
    price: 1501,
    imageUrl: import.meta.env.BASE_URL + "images/maa.jpg"
  },
  {
    id: "puja-career-ganesha",
    name: "Shree Jagannath Rath Yatra Success & Victory Sankalpa",
    category: "career",
    templeName: "Shree Jagannath Temple — Puri",
    deityName: "Lord Shri Jagannath",
    benefits: "Attracts outstanding career breakthrough, removes professional and financial hurdles, and bestows cosmic success and direction.",
    priestDetails: "Pt. Janardan Pattajoshi (Sevayat, Puri Temple)",
    videoAvailable: true,
    prasadIncluded: true,
    price: 1251,
    imageUrl: import.meta.env.BASE_URL + "images/puja_2.jpg"
  },
  {
    id: "puja-marriage-milani",
    name: "Swayamvara Parvathi Marriage Alignment",
    category: "marriage",
    templeName: "Prem Mandir — Vrindavan",
    deityName: "Radha Krishna",
    benefits: "Attracts compatible life partners, ensures cosmic harmony in marital bonds, and removes delays in marriage ceremonies.",
    priestDetails: "Pt. Gopabandhu Goswami (Prem Peeth)",
    videoAvailable: true,
    prasadIncluded: false,
    price: 1801,
    imageUrl: import.meta.env.BASE_URL + "images/puja.jpg"
  }
];

export const SPIRITUAL_SERVICES_LIST = [
  "Vedic Astrology Consultation",
  "Kundli Analysis",
  "Matchmaking & Kundali Milan",
  "Graha Shanti Puja",
  "Rudrabhishek Puja",
  "Satyanarayan Puja",
  "Griha Pravesh Puja",
  "Marriage Rituals",
  "Naamkaran",
  "Mundan Sanskar",
  "Pitru Dosh Rituals",
  "Navagraha Puja",
  "Vastu Shanti",
  "Spiritual Counseling"
];

export const SPIRITUAL_PRODUCTS: Product[] = [
  {
    id: "prod-prasad-puri",
    name: "Puri Jagannath Sukhala Dry Mahaprasad",
    category: "prasad",
    templeStory: "Prepared in Asia's largest temple kitchen using clay pots stacked over wood ovens. Cooked through solar principles, it is offered to Goddess Vimala before being distributed.",
    significance: "Nectar of Jagannath. Consuming even a grain awards liberation from death cycle, purifying your bodily systems instantly.",
    authenticity: "Directly sourced from the Ananda Bazar inside Puri Temple, certified by certified Kotha-bhoga Sevakas.",
    blessings: "Blessed with Tulsi leaves directly from the sanctum sanctorum.",
    price: 351,
    imageUrl: import.meta.env.BASE_URL + "images/prasad.jpg",
    rating: 5,
    deliveryTimeline: "3-5 Business Days across India and globe."
  },
  {
    id: "prod-rudraksha-kashi",
    name: "Sacred Panchmukhi Rudraksha Bead (Kashi)",
    category: "rudraksha",
    templeStory: "Sourced from high-altitude Himalayan trees, washed in the sacred holy Ganges stream, and placed against the Jyotirlinga at Kashi Vishwanath for power alignment.",
    significance: "Governed by Lord Shiva. Decreases blood pressure, filters stress, and creates an energetic shield shielding you from negative astral spells.",
    authenticity: "Includes lab test card confirming 100% genuine Elaeocarpus ganitrus seed structure.",
    blessings: "Bead is strung in premium pure copper capping for optimal electric-magnetic conductivity.",
    price: 499,
    imageUrl: import.meta.env.BASE_URL + "images/bead_2.jpg",
    rating: 4.8,
    deliveryTimeline: "4-6 Business Days."
  },
  {
    id: "prod-incense-vrindavan",
    name: "Vrindavan Forest Temple Incense (Eco)",
    category: "incense",
    templeStory: "Lovingly crafted from recycled organic marigold, roses, and jasmine flowers collected daily from Krishna Deities in Vrindavan.",
    significance: "Fills the room with authentic sweet floral vibrations that replicate the pure aroma of traditional Vrindavan morning aarti.",
    authenticity: "100% natural, hand-rolled by village artisan women, charcoal-free and completely petroleum-free.",
    blessings: "Infused with pure Himalayan sandalwood extract oils.",
    price: 199,
    imageUrl: import.meta.env.BASE_URL + "images/incense.jpg",
    rating: 4.9,
    deliveryTimeline: "2-4 Business Days."
  },
  {
    id: "prod-kit-festive",
    name: "Sri Dwar Sampoorna Puja Kit",
    category: "kits",
    templeStory: "A holy selection curated by high-ranking priests in Varanasi to let you complete any puja at home with complete authentic ingredients.",
    significance: "Contains 18 sacred essentials (Pure cow ghee, Sandalwood paste, gangajal, incense, roli, grain, dhoop, kapoor, cotton wick).",
    authenticity: "Strictly pure items, packed in eco-friendly, biodegradable premium packaging.",
    blessings: "All items placed in Puja room ceremonies before box packing.",
    price: 899,
    imageUrl: import.meta.env.BASE_URL + "images/kit.jpg",
    rating: 5,
    deliveryTimeline: "2-3 Business Days."
  }
];

export const DIVINE_SANSKRIT_QUOTES = [
  {
    sanskrit: "कर्मण्येवाधिकारस्ते मा फलेषु कदाचन।",
    english: "Your right is to perform your duty, but never to claim its fruits.",
    source: "Bhagavad Gita 2.47"
  },
  {
    sanskrit: "एकं सद्विप्रा बहुधा वदन्ति।",
    english: "Truth is One, though the sages speak of it in various ways.",
    source: "Rig Veda 1.164.46"
  },
  {
    sanskrit: "वसुधैव कुटुम्बकम्।",
    english: "The whole world is indeed one single divine family.",
    source: "Maha Upanishad"
  },
  {
    sanskrit: "यतो धर्मस्ततो जयः।",
    english: "Where there is ultimate righteousness, there is eternal victory.",
    source: "Mahabharata"
  },
  {
    sanskrit: "कल्याणमस्तु सर्वदा।",
    english: "May all souls always achieve supreme auspiciousness and well-being.",
    source: "Ancient Vedic Blessing"
  }
];
