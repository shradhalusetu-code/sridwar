/**
 * HolisticWellness.tsx
 * Sri Dwar — Holistic Wellness & Yogic Sciences Section
 * Sits below the Online Puja section as its own richly-designed segment.
 */

import { useState } from "react";
import {
  ChevronRight, Star, Clock, Users, Award, Leaf, Heart,
  Flame, Moon, Sun, Wind, Droplets, Zap, Shield, BookOpen
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface WellnessService {
  id: string;
  category: string;
  categoryColor: string;
  categoryBg: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  description: string;
  duration: string;
  participants: string;
  price: number;
  badge?: string;
  benefits: string[];
  tradition: string;
}

interface WellnessCategory {
  key: string;
  label: string;
  emoji: string;
  color: string;
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const CATEGORIES: WellnessCategory[] = [
  { key: "all",       label: "All Offerings",      emoji: "🙏", color: "#FFB347" },
  { key: "yoga",      label: "Yoga & Asana",        emoji: "🧘", color: "#5EEAD4" },
  { key: "ayurveda",  label: "Ayurveda",            emoji: "🌿", color: "#86EFAC" },
  { key: "healing",   label: "Yogic Healing",       emoji: "✨", color: "#C4B5FD" },
  { key: "training",  label: "Training & Classes",  emoji: "🏋️", color: "#FCA5A5" },
  { key: "retreat",   label: "Retreats & Detox",    emoji: "🏔️", color: "#93C5FD" },
];

const SERVICES: WellnessService[] = [
  // ── YOGA & ASANA ──────────────────────────────────────────────────
  {
    id: "hatha-yoga",
    category: "yoga",
    categoryColor: "#5EEAD4",
    categoryBg: "#0D2F2B",
    icon: <Sun className="w-5 h-5" />,
    title: "Hatha Yoga Session",
    subtitle: "Classical Asana & Pranayama",
    description: "Traditional Hatha yoga rooted in the Sivananda lineage. Balances solar and lunar energies through deliberate asana sequencing, breath retention (kumbhaka), and closing meditation.",
    duration: "75 min",
    participants: "1–8",
    price: 799,
    badge: "Most Popular",
    benefits: ["Spinal flexibility", "Breath control", "Nervous system balance", "Stress relief"],
    tradition: "Sivananda · Rishikesh lineage",
  },
  {
    id: "ashtanga-yoga",
    category: "yoga",
    categoryColor: "#5EEAD4",
    categoryBg: "#0D2F2B",
    icon: <Flame className="w-5 h-5" />,
    title: "Ashtanga Vinyasa Flow",
    subtitle: "Eight-Limbed Dynamic Practice",
    description: "A structured, heat-building practice following Patanjali's eight-limbed path. Each series progressively detoxifies, strengthens and purifies the subtle body through synchronised breath-movement.",
    duration: "90 min",
    participants: "1–6",
    price: 1099,
    benefits: ["Core strength", "Internal heat (tapas)", "Mental clarity", "Dexterity"],
    tradition: "Pattabhi Jois · Mysore tradition",
  },
  {
    id: "kundalini-yoga",
    category: "yoga",
    categoryColor: "#5EEAD4",
    categoryBg: "#0D2F2B",
    icon: <Zap className="w-5 h-5" />,
    title: "Kundalini Awakening Yoga",
    subtitle: "Shakti Energy Activation",
    description: "Kriyas (action sets), mantra chanting, mudras, and pranayama designed to awaken dormant Kundalini Shakti at the base of the spine and channel it through all seven chakras for transformation.",
    duration: "90 min",
    participants: "1–4",
    price: 1499,
    badge: "Advanced",
    benefits: ["Chakra activation", "Heightened awareness", "Emotional release", "Spiritual upliftment"],
    tradition: "Yogi Bhajan · Sat Nam lineage",
  },
  {
    id: "prenatal-yoga",
    category: "yoga",
    categoryColor: "#5EEAD4",
    categoryBg: "#0D2F2B",
    icon: <Heart className="w-5 h-5" />,
    title: "Prenatal & Postnatal Yoga",
    subtitle: "Sacred Motherhood Practice",
    description: "Gentle, trimester-adapted sequences for expecting and new mothers. Combines restorative asanas, birth-preparation breathwork, and devotional chanting to honour the divine feminine.",
    duration: "60 min",
    participants: "1–5",
    price: 899,
    benefits: ["Safe movement for pregnancy", "Reduces back pain", "Birth preparation", "Postpartum recovery"],
    tradition: "Garbha Sanskar · Vedic motherhood",
  },

  // ── AYURVEDA ──────────────────────────────────────────────────────
  {
    id: "panchakarma",
    category: "ayurveda",
    categoryColor: "#86EFAC",
    categoryBg: "#0A2010",
    icon: <Leaf className="w-5 h-5" />,
    title: "Panchakarma Detox Programme",
    subtitle: "Five-Fold Purification Therapy",
    description: "The cornerstone of Ayurvedic cleansing: Vamana (emesis), Virechana (purgation), Basti (medicated enema), Nasya (nasal therapy), and Raktamokshana — personalised to your Prakriti (constitution).",
    duration: "7–21 days",
    participants: "1",
    price: 8999,
    badge: "Signature",
    benefits: ["Deep cellular detox", "Dosha rebalancing", "Metabolic reset", "Chronic condition management"],
    tradition: "Kerala Ayurveda · Charaka Samhita",
  },
  {
    id: "abhyanga",
    category: "ayurveda",
    categoryColor: "#86EFAC",
    categoryBg: "#0A2010",
    icon: <Droplets className="w-5 h-5" />,
    title: "Abhyanga Full-Body Massage",
    subtitle: "Warm Medicated Oil Therapy",
    description: "Two-therapist synchronized herbal oil massage following marma point mapping. Calms vata, lubricates joints, activates the lymphatic system, and grounds an overworked nervous system in 90 minutes.",
    duration: "90 min",
    participants: "1",
    price: 2499,
    benefits: ["Lymphatic drainage", "Joint lubrication", "Deep relaxation", "Skin nourishment"],
    tradition: "Ashtanga Hridayam · classical protocol",
  },
  {
    id: "shirodhara",
    category: "ayurveda",
    categoryColor: "#86EFAC",
    categoryBg: "#0A2010",
    icon: <Moon className="w-5 h-5" />,
    title: "Shirodhara — Third Eye Ritual",
    subtitle: "Continuous Warm Oil Stream",
    description: "A continuous warm medicated oil stream poured over the Ajna chakra (forehead). Profoundly quiets mental chatter, relieves insomnia, migraines, anxiety, and neurological tension in a single session.",
    duration: "60 min",
    participants: "1",
    price: 1999,
    badge: "Bestseller",
    benefits: ["Deep sleep restoration", "Migraine relief", "Anxiety management", "Third eye activation"],
    tradition: "Kerala Panchakarma heritage",
  },
  {
    id: "prakriti-consultation",
    category: "ayurveda",
    categoryColor: "#86EFAC",
    categoryBg: "#0A2010",
    icon: <BookOpen className="w-5 h-5" />,
    title: "Prakriti & Dosha Assessment",
    subtitle: "Personalised Ayurvedic Consultation",
    description: "A 1-on-1 consultation with an AYUSH-certified Vaidya. Includes pulse diagnosis (Nadi Pariksha), body-constitution mapping, seasonal diet plan, and personalised herbal supplement recommendations.",
    duration: "45 min",
    participants: "1",
    price: 1199,
    benefits: ["Know your body type", "Personalised diet plan", "Herbal supplements", "Seasonal lifestyle guide"],
    tradition: "AYUSH certified · Sushruta tradition",
  },

  // ── YOGIC HEALING ─────────────────────────────────────────────────
  {
    id: "pranic-healing",
    category: "healing",
    categoryColor: "#C4B5FD",
    categoryBg: "#140F2A",
    icon: <Zap className="w-5 h-5" />,
    title: "Pranic Healing Session",
    subtitle: "Life-Force Energy Cleansing",
    description: "A non-touch energy healing modality that scans, cleanses, and energises the bioplasmic body. Removes diseased energy from chakras and the aura, accelerating the body's natural self-repair mechanisms.",
    duration: "60 min",
    participants: "1",
    price: 1599,
    badge: "No-touch therapy",
    benefits: ["Aura cleansing", "Chakra energisation", "Accelerated healing", "Emotional balance"],
    tradition: "Grand Master Choa Kok Sui lineage",
  },
  {
    id: "sound-healing",
    category: "healing",
    categoryColor: "#C4B5FD",
    categoryBg: "#140F2A",
    icon: <Wind className="w-5 h-5" />,
    title: "Tibetan Sound Bath",
    subtitle: "Singing Bowls & Mantra Vibration",
    description: "Handcrafted 7-metal Tibetan singing bowls tuned to each chakra are placed on and around the body. Resonant frequencies disrupt stagnant energy, induce theta brainwave states, and restore harmonic coherence.",
    duration: "75 min",
    participants: "1–10",
    price: 999,
    benefits: ["Deep meditative states", "Pain reduction", "Emotional release", "Sleep quality"],
    tradition: "Himalayan bowl healing · Buddhist tradition",
  },
  {
    id: "reiki-healing",
    category: "healing",
    categoryColor: "#C4B5FD",
    categoryBg: "#140F2A",
    icon: <Sun className="w-5 h-5" />,
    title: "Reiki Energy Healing",
    subtitle: "Universal Life Energy Transfer",
    description: "A certified Usui Reiki Master channels universal life energy through gentle hand placements on or just above the body's energy centres. Balances chakras, dissolves blockages, and rekindles spiritual vitality.",
    duration: "60 min",
    participants: "1",
    price: 1299,
    benefits: ["Stress dissolution", "Pain management", "Emotional wounds", "Spiritual reconnection"],
    tradition: "Mikao Usui · Japanese Reiki tradition",
  },
  {
    id: "mantra-chikitsa",
    category: "healing",
    categoryColor: "#C4B5FD",
    categoryBg: "#140F2A",
    icon: <Flame className="w-5 h-5" />,
    title: "Mantra Chikitsa (Mantra Therapy)",
    subtitle: "Vedic Sound as Medicine",
    description: "One-on-one sessions with a Vedic chanting therapist who prescribes specific mantras matched to your astrological chart, current dosha imbalance, and karmic patterns — for chanting, japa, or listening therapy.",
    duration: "60 min",
    participants: "1",
    price: 1499,
    badge: "Unique to Sri Dwar",
    benefits: ["Neurological recalibration", "Karmic clearing", "Mental fortitude", "Devotional deepening"],
    tradition: "Sama Veda · Nada Brahma science",
  },

  // ── TRAINING & CLASSES ────────────────────────────────────────────
  {
    id: "yoga-teacher-training",
    category: "training",
    categoryColor: "#FCA5A5",
    categoryBg: "#200A0A",
    icon: <Award className="w-5 h-5" />,
    title: "Yoga Teacher Training (YTT 200)",
    subtitle: "RYS-200 Accredited Certification",
    description: "A Yoga Alliance–accredited 200-hour teacher training intensive. Covers asana technique, anatomy, teaching methodology, Yoga philosophy, pranayama, and practicum. Conducted over 4 weeks residential or 3 months online.",
    duration: "200 hours",
    participants: "8–20",
    price: 34999,
    badge: "Certification",
    benefits: ["Yoga Alliance 200hr cert", "Teaching methodology", "Business of yoga", "Lifetime alumni network"],
    tradition: "Yoga Alliance RYS-200 accredited",
  },
  {
    id: "meditation-masterclass",
    category: "training",
    categoryColor: "#FCA5A5",
    categoryBg: "#200A0A",
    icon: <Moon className="w-5 h-5" />,
    title: "Meditation Masterclass Series",
    subtitle: "6-Week Progressive Programme",
    description: "A structured six-week journey through Dharana (concentration), Dhyana (meditation), and Samadhi (absorption). Techniques span Vipassana, Trataka, Ajapa Japa, and Nada meditation — live online with recordings.",
    duration: "6 weeks",
    participants: "Up to 30",
    price: 3499,
    benefits: ["Consistent daily practice", "Multiple techniques", "Peer community", "Lifetime replays"],
    tradition: "Swami Vivekananda Mission",
  },
  {
    id: "pranayama-intensive",
    category: "training",
    categoryColor: "#FCA5A5",
    categoryBg: "#200A0A",
    icon: <Wind className="w-5 h-5" />,
    title: "Pranayama Intensive",
    subtitle: "Mastery of the Vital Breath",
    description: "A focused 4-week course covering 12 classical pranayamas: Nadi Shodhana, Kapalabhati, Bhastrika, Ujjayi, Sitali, Bhramari, Surya Bhedana, and advanced retentions. Includes Shatkarma (cleansing techniques).",
    duration: "4 weeks",
    participants: "Up to 15",
    price: 2499,
    benefits: ["Lung capacity expansion", "CO₂ tolerance", "Nervous regulation", "Spiritual vitality"],
    tradition: "Hatha Yoga Pradipika · classical texts",
  },

  // ── RETREATS & DETOX ──────────────────────────────────────────────
  {
    id: "weekend-retreat",
    category: "retreat",
    categoryColor: "#93C5FD",
    categoryBg: "#060F1F",
    icon: <Shield className="w-5 h-5" />,
    title: "Weekend Yogic Immersion",
    subtitle: "2-Night Ashram Retreat",
    description: "A two-night residential retreat at an empanelled ashram partner near Rishikesh or Puri. Includes sattvic meals, morning Ganga aarti, two daily yoga sessions, evening satsang, and nature walks.",
    duration: "2 nights / 3 days",
    participants: "6–18",
    price: 6999,
    badge: "Residential",
    benefits: ["Digital detox", "Sattvic diet reset", "Aarti & satsang", "Nature healing"],
    tradition: "Parmarth Niketan partner ashram",
  },
  {
    id: "panchakarma-retreat",
    category: "retreat",
    categoryColor: "#93C5FD",
    categoryBg: "#060F1F",
    icon: <Leaf className="w-5 h-5" />,
    title: "Kerala Panchakarma Retreat",
    subtitle: "14-Night Authentic Detox Journey",
    description: "A curated 14-night stay at a NABH-accredited Kerala Ayurveda centre. Includes daily Panchakarma procedures, personalised Vaidya consultations, yoga, organic meals, and a post-retreat maintenance kit.",
    duration: "14 nights",
    participants: "1–2",
    price: 74999,
    badge: "Premium",
    benefits: ["Deep cellular renewal", "NABH-accredited centre", "All-inclusive", "Post-retreat protocol"],
    tradition: "Kerala Ayurveda · Kairali lineage",
  },
];

// ─── Sub-components ────────────────────────────────────────────────────────────

function ServiceCard({
  service,
  onBook,
}: {
  service: WellnessService;
  onBook: (title: string, price: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="relative flex flex-col rounded-2xl border overflow-hidden transition-all duration-300 hover:shadow-2xl group"
      style={{
        background: service.categoryBg,
        borderColor: service.categoryColor + "30",
      }}
    >
      {/* Badge */}
      {service.badge && (
        <div
          className="absolute top-3 right-3 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest z-10"
          style={{ background: service.categoryColor + "20", color: service.categoryColor, border: `1px solid ${service.categoryColor}40` }}
        >
          {service.badge}
        </div>
      )}

      {/* Header */}
      <div className="p-5 pb-3">
        <div className="flex items-start space-x-3 mb-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
            style={{ background: service.categoryColor + "18", color: service.categoryColor }}
          >
            {service.icon}
          </div>
          <div className="flex-1 min-w-0">
            <span
              className="text-[9px] font-black uppercase tracking-widest block mb-0.5"
              style={{ color: service.categoryColor }}
            >
              {CATEGORIES.find((c) => c.key === service.category)?.label}
            </span>
            <h3 className="text-sm font-bold text-white leading-tight">{service.title}</h3>
            <p className="text-[11px] text-white/45 mt-0.5">{service.subtitle}</p>
          </div>
        </div>

        {/* Meta pills */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          <span className="flex items-center space-x-1 bg-white/5 rounded-full px-2.5 py-1 text-[10px] text-white/50">
            <Clock className="w-3 h-3 shrink-0" />
            <span>{service.duration}</span>
          </span>
          <span className="flex items-center space-x-1 bg-white/5 rounded-full px-2.5 py-1 text-[10px] text-white/50">
            <Users className="w-3 h-3 shrink-0" />
            <span>{service.participants}</span>
          </span>
        </div>

        {/* Description */}
        <p className="text-[11px] text-white/55 leading-relaxed line-clamp-3">
          {service.description}
        </p>

        {/* Expand / collapse */}
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="mt-2 text-[10px] font-semibold transition-colors"
          style={{ color: service.categoryColor }}
        >
          {expanded ? "Show less ↑" : "View benefits ↓"}
        </button>

        {expanded && (
          <div className="mt-3 space-y-1.5 animate-fadeIn">
            <p className="text-[9px] font-mono uppercase tracking-widest text-white/30 mb-2">Key benefits</p>
            {service.benefits.map((b) => (
              <div key={b} className="flex items-center space-x-2">
                <div className="w-1 h-1 rounded-full shrink-0" style={{ background: service.categoryColor }} />
                <span className="text-[11px] text-white/60">{b}</span>
              </div>
            ))}
            <p className="text-[9px] font-mono text-white/25 mt-2 pt-2 border-t border-white/5">
              ✦ {service.tradition}
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-auto px-5 py-4 border-t border-white/8 flex items-center justify-between">
        <div>
          <span className="text-[10px] text-white/35 font-mono">Starting from</span>
          <p className="text-base font-black text-white">
            ₹{service.price.toLocaleString("en-IN")}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onBook(service.title, service.price)}
          className="flex items-center space-x-1.5 px-4 py-2 rounded-xl text-[11px] font-bold uppercase tracking-wide transition-all hover:opacity-90 active:scale-95 cursor-pointer"
          style={{
            background: service.categoryColor,
            color: "#021816",
          }}
        >
          <span>Book Now</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

interface HolisticWellnessProps {
  onBookService?: (serviceName: string, price: number) => void;
}

export default function HolisticWellness({ onBookService }: HolisticWellnessProps) {
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const filtered = activeCategory === "all"
    ? SERVICES
    : SERVICES.filter((s) => s.category === activeCategory);

  const handleBook = (title: string, price: number) => {
    if (onBookService) {
      onBookService(title, price);
    }
  };

  return (
    <section className="bg-[#021816] text-white pt-16 pb-20 relative overflow-hidden">

      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-40 left-1/4 w-96 h-96 rounded-full opacity-[0.04]" style={{ background: "#5EEAD4", filter: "blur(100px)" }} />
        <div className="absolute bottom-20 right-1/4 w-80 h-80 rounded-full opacity-[0.05]" style={{ background: "#C4B5FD", filter: "blur(120px)" }} />
        <div className="absolute top-20 right-10 w-64 h-64 rounded-full opacity-[0.03]" style={{ background: "#FFB347", filter: "blur(90px)" }} />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

        {/* ── Section header ─────────────────────────────────────────── */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center space-x-2 bg-[#5EEAD4]/10 border border-[#5EEAD4]/20 rounded-full px-4 py-1.5 mb-5">
            <span className="text-base">🌿</span>
            <span className="text-[10px] font-mono font-bold text-[#5EEAD4] uppercase tracking-widest">Holistic Wellness & Yogic Sciences</span>
          </div>

          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-white mb-4 leading-tight">
            Heal the Body.<br className="sm:hidden" />
            <span className="text-[#5EEAD4]"> Awaken the Soul.</span>
          </h2>

          <p className="text-sm text-white/55 max-w-2xl mx-auto leading-relaxed">
            A curated sanctuary of India's most ancient wellness sciences — Yoga, Ayurveda, Pranic healing, and Vedic therapy — made accessible to every devotee, wherever they are.
          </p>

          {/* Stats strip */}
          <div className="flex flex-wrap justify-center gap-6 mt-8">
            {[
              { value: "5,000+", label: "Years of Tradition", color: "#FFB347" },
              { value: "12+", label: "Healing Modalities",   color: "#5EEAD4" },
              { value: "AYUSH", label: "Certified Practitioners", color: "#86EFAC" },
              { value: "Online", label: "& Residential Sessions", color: "#C4B5FD" },
            ].map(({ value, label, color }) => (
              <div key={label} className="text-center">
                <p className="text-xl font-black" style={{ color }}>{value}</p>
                <p className="text-[10px] text-white/35 font-mono uppercase tracking-wide mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Category filter tabs ────────────────────────────────────── */}
        <div className="flex flex-wrap justify-center gap-2 mb-10">
          {CATEGORIES.map(({ key, label, emoji, color }) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveCategory(key)}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-full text-xs font-semibold border transition-all cursor-pointer"
              style={
                activeCategory === key
                  ? { background: color + "18", borderColor: color + "50", color }
                  : { background: "transparent", borderColor: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.40)" }
              }
            >
              <span>{emoji}</span>
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* ── Service grid ───────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((service) => (
            <ServiceCard key={service.id} service={service} onBook={handleBook} />
          ))}
        </div>

        {/* ── Trust footer ───────────────────────────────────────────── */}
        <div className="mt-14 bg-[#051F1A] border border-white/8 rounded-3xl p-6 sm:p-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
            {[
              {
                icon: "🏛️",
                title: "AYUSH & Yoga Alliance",
                desc: "All practitioners hold valid AYUSH, RYT-200/500, or equivalent certifications recognised by the Government of India.",
                color: "#FFB347",
              },
              {
                icon: "🌐",
                title: "Online & Residential",
                desc: "Sessions available live via secure video, or at our empanelled partner ashrams in Rishikesh, Puri, Palakkad, and Bengaluru.",
                color: "#5EEAD4",
              },
              {
                icon: "🔒",
                title: "Safe, Sacred & Confidential",
                desc: "Your health intake forms, dosha assessment data, and session notes are stored securely and never shared with third parties.",
                color: "#C4B5FD",
              },
            ].map(({ icon, title, desc, color }) => (
              <div key={title} className="space-y-2">
                <div className="text-2xl mb-2">{icon}</div>
                <h4 className="text-sm font-bold" style={{ color }}>{title}</h4>
                <p className="text-[11px] text-white/45 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-6 border-t border-white/8 text-center">
            <p className="text-[11px] text-white/30 font-mono">
              ✦ Sri Dwar Holistic Wellness is a curated referral and booking platform. All therapies are delivered by independent, certified practitioners. We do not offer medical advice.
            </p>
          </div>
        </div>

      </div>
    </section>
  );
}
