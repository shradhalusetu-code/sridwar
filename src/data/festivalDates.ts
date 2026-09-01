// ─── Festival Calendar (for the homepage "coming up" banner) ─────────────
// ✅ STANDARDIZED (2026-09-01): follows the Varanasi / Kashi Vishwanath
// panchang specifically, per instruction — every date below was verified
// against drikpanchang.com's own Varanasi-specific calendar
// (geoname-id=1253405, the standard location-aware panchang reference used
// by temples and priests professionally), cross-checked against 2+
// additional independent sources that agreed. This is the one calendar
// convention this file follows from here on — do not mix in dates from a
// different regional panchang (e.g. Amanta-tradition South Indian dates
// can differ by a lunar month from Varanasi's Purnimanta convention for
// some festivals) without re-verifying against the same Varanasi source.
//
// Two entries below were specifically corrected after research surfaced
// real disagreement between other (non-Varanasi-specific) sources —
// resolved by checking drikpanchang's Varanasi page directly:
//   - Ganesh Chaturthi: some sources said Aug 16, others Sep 14 — the
//     Varanasi panchang confirms Sep 14, matching Wikipedia and
//     Siddhivinayak Temple's own published dates.
//   - Diwali: one source said Oct 20 (almost certainly confusing it with
//     Dussehra) — the Varanasi panchang confirms Nov 8, matching 4+ other
//     independent Panchang-computation sources.
//
// 👉 BEFORE ADDING MORE DATES: verify against drikpanchang.com's Varanasi
// page (?geoname-id=1253405) specifically, or a priest/pandit's direct
// confirmation — not a generic SEO blog, several of which disagreed with
// each other and with the Varanasi panchang during this research.

export interface FestivalDate {
  name: string;
  date: string; // "YYYY-MM-DD", IST
  note: string; // shown in the banner — keep to one short line
}

// Verified against the Varanasi-specific panchang as of 2026-09-01.
// Re-verify before reusing this file for a future year — do not assume
// these dates repeat on the same calendar date annually (most Hindu
// festivals are lunisolar, not fixed-date).
export const FESTIVAL_DATES_2026: FestivalDate[] = [
  { name: "Maha Shivratri", date: "2026-02-15", note: "The great night of Lord Shiva — fasting and night-long worship" },
  { name: "Holi", date: "2026-03-04", note: "The festival of colours" },
  { name: "Hanuman Jayanti", date: "2026-04-02", note: "The birth of Lord Hanuman" },
  { name: "Akshaya Tritiya", date: "2026-04-19", note: "An auspicious day for new beginnings" },
  { name: "Guru Purnima", date: "2026-07-29", note: "A day to honour teachers and spiritual guides" },
  { name: "Raksha Bandhan", date: "2026-08-28", note: "The bond between brothers and sisters" },
  { name: "Ganesh Chaturthi", date: "2026-09-14", note: "The birth of Lord Ganesha" },
  { name: "Diwali", date: "2026-11-08", note: "The festival of lights — Lakshmi Puja" },
  // Dev Deepavali is especially significant in Varanasi itself — the
  // ghats are lit with over a million lamps, 15 days after Diwali.
  { name: "Dev Deepavali", date: "2026-11-24", note: "The Diwali of the Gods, celebrated on the Ganga ghats of Kashi" },
];

