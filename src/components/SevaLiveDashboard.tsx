/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Heart, Utensils, Flame, Calendar, Users, Clock3, CheckCircle2, Send } from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────
// NOTE for future integration: every value below is a clean, realistic
// static placeholder — not real-time data. Swap DASHBOARD_STATS,
// UPCOMING_SLOTS and RECENT_SEVAS for a live API response once a backend
// endpoint exists; the shapes are kept simple on purpose so that swap is a
// drop-in change with no changes needed to the JSX below.
// ─────────────────────────────────────────────────────────────────────────

const DASHBOARD_STATS = [
  { label: "Today's Gau Seva", value: "37", icon: Heart },
  { label: "Today's Annadan", value: "64", icon: Utensils },
  { label: "Today's Diya Seva", value: "52", icon: Flame },
  { label: "Today's Puja Bookings", value: "29", icon: Calendar },
  { label: "Total Devotees Served", value: "12,400+", icon: Users },
];

type CertificateStatus = "Pending" | "In Progress" | "Completed" | "Certificate Sent";

const STATUS_STYLES: Record<CertificateStatus, string> = {
  Pending: "text-white/50 bg-white/5 border-white/15",
  "In Progress": "text-[#FFB347] bg-[#FFB347]/10 border-[#FFB347]/25",
  Completed: "text-[#5EEAD4] bg-[#5EEAD4]/10 border-[#5EEAD4]/25",
  "Certificate Sent": "text-emerald-300 bg-emerald-400/10 border-emerald-400/25",
};

const UPCOMING_SLOTS: { seva: string; when: string }[] = [
  { seva: "Gau Seva — Feed 5 cows", when: "Today, 5:00 PM" },
  { seva: "Annadan — Feed 11 people", when: "Today, 7:00 PM" },
  { seva: "Deep Daan — 11 diyas", when: "Tomorrow, 6:30 AM" },
  { seva: "Dhoop & Camphor Seva", when: "Tomorrow, 7:00 PM" },
];

const RECENT_SEVAS: { seva: string; devotee: string; status: CertificateStatus }[] = [
  { seva: "Gau Seva — Feed 2 cows", devotee: "Devotee — Bhubaneswar", status: "Certificate Sent" },
  { seva: "Annadan — Feed 3 people, three meals", devotee: "Devotee — Cuttack", status: "Completed" },
  { seva: "Flower Seva — Garland seva", devotee: "Devotee — Puri", status: "In Progress" },
  { seva: "Temple Maintenance — Daily support", devotee: "Devotee — Bhubaneswar", status: "Pending" },
];

interface SevaLiveDashboardProps {
  /** Sevas the current visitor has just offered this session (e.g. after
   *  clicking "Offer Gau Seva"). Shown at the top of "Recent Seva
   *  Completed" so a devotee's own seva is reflected here right away. */
  extraRecentSevas?: { seva: string; devotee: string; status: CertificateStatus }[];
}

export default function SevaLiveDashboard({ extraRecentSevas = [] }: SevaLiveDashboardProps) {
  // Cap both lists to the most recent/nearest 4 entries so the dashboard
  // stays compact and never grows unbounded as more sevas are offered or
  // more slots are added.
  const recentSevas = [...extraRecentSevas, ...RECENT_SEVAS].slice(0, 4);
  const upcomingSlots = UPCOMING_SLOTS.slice(0, 4);
  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-serif text-xl font-bold text-white">Live Devotional Dashboard</h3>
        <span className="text-[9px] font-mono text-white/40 uppercase tracking-wide bg-white/5 border border-white/10 px-2.5 py-1 rounded-full">
          Illustrative — live sync coming soon
        </span>
      </div>

      {/* Stat tiles — every value here is an ESTIMATED figure, not a
          precise real-time count, so each tile is labeled "Est." and the
          note below makes clear these numbers can change through the day. */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-2">
        {DASHBOARD_STATS.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-[#092320] border border-white/10 rounded-2xl p-4 text-left">
              <div className="flex items-center justify-between mb-2">
                <div className="p-1.5 rounded-lg bg-white/5 border border-white/10 inline-flex">
                  <Icon className="w-3.5 h-3.5 text-[#FFB347]" />
                </div>
                <span className="text-[8px] font-mono font-bold text-white/40 uppercase tracking-wide bg-white/5 border border-white/10 px-1.5 py-0.5 rounded-full">Est.</span>
              </div>
              <span className="block text-lg font-serif font-black text-white">~{stat.value}</span>
              <span className="block text-[9px] text-white/50 mt-0.5 leading-snug">{stat.label}</span>
            </div>
          );
        })}
      </div>
      <p className="text-[10px] text-white/40 mb-4 leading-relaxed">
        These are estimated figures and may change as the day progresses.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Upcoming seva slots */}
        <div className="bg-[#092320] border border-white/10 rounded-2xl p-4">
          <div className="flex items-center space-x-2 mb-3">
            <Clock3 className="w-3.5 h-3.5 text-[#5EEAD4]" />
            <span className="text-xs font-bold text-white/80">Upcoming Seva Slots</span>
          </div>
          <ul className="space-y-2">
            {upcomingSlots.map((slot, i) => (
              <li key={i} className="flex items-center justify-between text-[11px] text-white/70 bg-white/5 rounded-xl px-3 py-2">
                <span>{slot.seva}</span>
                <span className="text-white/40 font-mono text-[10px] shrink-0 ml-2">{slot.when}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Recently completed seva + certificate status */}
        <div className="bg-[#092320] border border-white/10 rounded-2xl p-4">
          <div className="flex items-center space-x-2 mb-3">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#FFB347]" />
            <span className="text-xs font-bold text-white/80">Recent Seva Completed</span>
          </div>
          <ul className="space-y-2">
            {recentSevas.map((item, i) => (
              <li key={i} className="flex items-center justify-between text-[11px] text-white/70 bg-white/5 rounded-xl px-3 py-2 gap-2">
                <div className="min-w-0">
                  <span className="block truncate">{item.seva}</span>
                  <span className="block text-[9px] text-white/40">{item.devotee}</span>
                </div>
                <span className={`text-[9px] font-bold px-2 py-1 rounded-full border shrink-0 ${STATUS_STYLES[item.status]}`}>
                  {item.status}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="flex items-start space-x-2 text-[10px] text-white/45 bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 mt-4">
        <Send className="w-3.5 h-3.5 text-[#5EEAD4] flex-shrink-0 mt-0.5" />
        <span>Certificate status moves from Pending → In Progress → Completed → Certificate Sent as your seva is performed and documented.</span>
      </div>
    </div>
  );
}
