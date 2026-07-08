/**
 * SetuYatraChallenge.tsx — Sri Dwar
 * Embedded "Setu Yatra Challenge" info — How It Works + Terms & Conditions.
 *
 * Rendered as an in-page modal (no navigation, no new route) so it can be
 * dropped at the bottom of any registration form. Drop <SetuYatraFooterLinks />
 * into a form and it manages its own open/close + tab state.
 *
 * @license SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import { Trophy, X, BookOpen, FileText, MapPin, MessageCircle, Mail } from "lucide-react";

type Tab = "guide" | "terms";

// ─── Small reusable pieces ────────────────────────────────────────────────────
function H3({ children }: { children: React.ReactNode }) {
  return <h3 className="text-sm font-bold text-[#FFB347] uppercase tracking-wider font-mono mt-6 mb-2">{children}</h3>;
}
function P({ children }: { children: React.ReactNode }) {
  return <p className="text-[13px] text-white/65 leading-relaxed mb-2">{children}</p>;
}
function UL({ children }: { children: React.ReactNode }) {
  return <ul className="space-y-1.5 mb-2">{children}</ul>;
}
function LI({ children }: { children: React.ReactNode }) {
  return (
    <li className="text-[13px] text-white/65 leading-relaxed flex gap-2">
      <span className="text-[#5EEAD4] mt-0.5">•</span><span>{children}</span>
    </li>
  );
}
function OL({ children }: { children: React.ReactNode }) {
  return <ol className="space-y-1.5 mb-2 list-decimal list-inside marker:text-[#FFB347] marker:font-bold">{children}</ol>;
}

// ─── Tab 1 — Campaign Guide ("How It Works") ─────────────────────────────────
function GuideContent() {
  return (
    <div>
      <P>
        <strong className="text-white/85">Setu Yatra Challenge</strong> — add real, checkable entries to
        Sri Dwar's directory, get a personal acknowledgement for every valid one, and climb the contributor
        leaderboard. Top contributors win a fully-covered 1-week Yatra — the single top-ranked contributor
        wins the Grand Prize: a fully-covered All India Yatra.
      </P>
      <P>This page covers the <em>how</em>. Full eligibility and prize rules are in the Terms &amp; Conditions tab.</P>

      <H3>How the Challenge Works</H3>
      <OL>
        <li className="text-[13px] text-white/65 leading-relaxed pl-1">You add real, checkable entries — temples, puja mandals, puja committees, priests, dharmic experts, or yourself — to the Sri Dwar directory.</li>
        <li className="text-[13px] text-white/65 leading-relaxed pl-1">Every valid entry receives a personal acknowledgement from the Sri Dwar team.</li>
        <li className="text-[13px] text-white/65 leading-relaxed pl-1">At the end of the offer period, contributors are ranked by the number of valid entries they have submitted.</li>
        <li className="text-[13px] text-white/65 leading-relaxed pl-1">Top contributors win a fully-covered 1-week Yatra. The single top-ranked contributor wins the Grand Prize — a fully-covered All India Yatra.</li>
      </OL>

      <H3>What You Can Add</H3>
      <div className="overflow-x-auto -mx-1 mb-2">
        <table className="w-full text-[12px] border-collapse">
          <tbody>
            {[
              ["🛕", "Temple", "Any temple, mandir, or shrine — large or small, well-known or local"],
              ["🤲", "Puja Mandal", "A group that organises community puja, bhajan, or festival celebrations"],
              ["🪔", "Puja Committee", "A committee that runs seasonal events, Sevas, or temple management locally"],
              ["📿", "Priest / Dharmic Expert", "Pandits, Purohits, Acharyas, Gurus, Sants, Sadhus, or Vedic astrologers you personally know"],
              ["🕉", "Yourself", "Your own devotee profile and Dharmic ID on Sri Dwar"],
            ].map(row => (
              <tr key={row[1]} className="border-b border-white/8 last:border-0">
                <td className="py-2 pr-2 align-top w-8">{row[0]}</td>
                <td className="py-2 pr-3 align-top font-semibold text-white/80 whitespace-nowrap">{row[1]}</td>
                <td className="py-2 align-top text-white/55">{row[2]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <H3>Step-by-Step: How to Submit an Entry</H3>

      <p className="text-xs font-bold text-[#5EEAD4] mt-3 mb-1">A. Add a Temple, Puja Mandal, or Puja Committee</p>
      <OL>
        <li className="text-[13px] text-white/65 leading-relaxed pl-1">Open the <strong className="text-white/80">Register Your Temple or Puja Committee</strong> section.</li>
        <li className="text-[13px] text-white/65 leading-relaxed pl-1">Fill in the temple/committee name, city, state, presiding deity, and address as accurately as possible.</li>
        <li className="text-[13px] text-white/65 leading-relaxed pl-1">Add the contact person's name and phone number — a real, reachable contact (priest, committee head, or trustee, wherever possible).</li>
        <li className="text-[13px] text-white/65 leading-relaxed pl-1">
          In the <strong className="text-white/80">Additional Notes</strong> field, write:{" "}
          <code className="text-[11px] bg-white/8 border border-white/10 rounded px-1.5 py-0.5 text-[#FFB347]">Setu Yatra Challenge — Suggested by [Your Full Name], [Your WhatsApp Number]</code>{" "}
          — this is how your contribution gets credited to you.
        </li>
        <li className="text-[13px] text-white/65 leading-relaxed pl-1">Submit. You'll see a confirmation on screen once it goes through.</li>
      </OL>

      <p className="text-xs font-bold text-[#5EEAD4] mt-3 mb-1">B. Add a Priest or Dharmic Expert</p>
      <OL>
        <li className="text-[13px] text-white/65 leading-relaxed pl-1">Open the <strong className="text-white/80">Register a Dharmic Expert</strong> section.</li>
        <li className="text-[13px] text-white/65 leading-relaxed pl-1">Select the correct category (Pandit, Acharya, Astrologer, etc.) and fill in their name, city, experience, and services offered.</li>
        <li className="text-[13px] text-white/65 leading-relaxed pl-1">
          In the <strong className="text-white/80">Short Bio</strong> field, add:{" "}
          <code className="text-[11px] bg-white/8 border border-white/10 rounded px-1.5 py-0.5 text-[#FFB347]">Setu Yatra Challenge — Suggested by [Your Full Name], [Your WhatsApp Number]</code>.
        </li>
        <li className="text-[13px] text-white/65 leading-relaxed pl-1">Submit with their consent — only add dharmic experts who are real, reachable, and willing to be listed.</li>
      </OL>

      <p className="text-xs font-bold text-[#5EEAD4] mt-3 mb-1">C. Add Yourself as a Devotee</p>
      <OL>
        <li className="text-[13px] text-white/65 leading-relaxed pl-1">Open <strong className="text-white/80">Your Sacred Profile</strong>.</li>
        <li className="text-[13px] text-white/65 leading-relaxed pl-1">Complete your devotee profile to receive your Sri Dwar Dharmic ID.</li>
        <li className="text-[13px] text-white/65 leading-relaxed pl-1">This entry is automatically credited to you — no referral note needed.</li>
      </OL>

      <p className="text-xs font-bold text-[#5EEAD4] mt-3 mb-1">D. Confirm Your Entry (Recommended)</p>
      <P>After submitting, send a short WhatsApp message confirming what you added:</P>
      <div className="bg-white/5 border border-white/10 rounded-xl px-3.5 py-3 mb-2 space-y-1.5">
        <p className="text-[12px] text-[#5EEAD4] font-mono flex items-center gap-1.5"><MessageCircle className="w-3 h-3" /> WhatsApp: +91 97776 45062</p>
        <p className="text-[12px] text-white/55 italic leading-relaxed">
          "Setu Yatra Challenge entry — I added [Temple/Priest/My Profile] for [Name/City]. My name: [Your Name], [Your Phone Number]."
        </p>
      </div>
      <P>This extra step is the single best way to make sure your entry is correctly counted toward your contributor ranking — please don't skip it.</P>

      <H3>What Counts as a "Valid Entry"</H3>
      <UL>
        <LI><strong className="text-white/80">Real and verifiable</strong> — the temple, mandal, committee, or person genuinely exists</LI>
        <LI><strong className="text-white/80">Complete</strong> — name, city/location, and a working contact number are filled in correctly</LI>
        <LI><strong className="text-white/80">Non-duplicate</strong> — not already listed on Sri Dwar (our team checks for duplicates before counting it)</LI>
        <LI><strong className="text-white/80">Accurate</strong> — spelling, location, and contact details are correct to the best of your knowledge</LI>
        <LI><strong className="text-white/80">Consensual</strong> (for priests/experts) — the person you're adding is aware of and agrees to being listed</LI>
      </UL>
      <P>Entries that are incomplete, fake, duplicate, or cannot be confirmed by our team will <strong className="text-white/80">not</strong> count toward the contributor ranking, even if the form submission itself goes through successfully.</P>

      <H3>Acknowledgement Message</H3>
      <P>Our team manually verifies each submission and sends an acknowledgement via WhatsApp or Email, typically within 24–48 hours, recording your contribution toward your contributor ranking with a Reference ID — and reminding you that top contributors win a fully-covered Yatra, with the Grand Prize being an All India Yatra for our top contributor.</P>

      <H3>How Winners Are Chosen</H3>
      <UL>
        <LI>Contributors are ranked by their total number of <strong className="text-white/80">valid, confirmed</strong> entries during the offer period.</LI>
        <LI>Our team reviews submissions on an ongoing basis to confirm validity and avoid duplicates or fraudulent entries.</LI>
        <LI>The top-ranked contributors will be contacted directly via the phone number/email used during submission.</LI>
        <LI>Full rules, minimum entry requirements, and prize details are set out in the Terms &amp; Conditions tab — please read this before participating.</LI>
      </UL>

      <H3>A Few Tips</H3>
      <UL>
        <LI>Start with temples, mandals, and priests you already personally know and trust — these are the easiest to verify quickly.</LI>
        <LI>Double-check spelling of names and locations before submitting; incomplete entries can't be counted.</LI>
        <LI>Always get the consent of any priest or dharmic expert before listing their contact details.</LI>
        <LI>Add yourself first — it takes two minutes and is an automatic valid entry.</LI>
      </UL>
    </div>
  );
}

// ─── Tab 2 — Terms & Conditions ──────────────────────────────────────────────
function TermsContent() {
  return (
    <div>
      <div className="bg-[#FFB347]/8 border border-[#FFB347]/25 rounded-xl px-3.5 py-3 mb-4">
        <p className="text-[12px] text-[#FFB347]/90 leading-relaxed">
          ⚠️ These are the governing rules for the Setu Yatra Challenge offer. Please read in full before participating.
        </p>
      </div>

      <H3>1. Overview</H3>
      <P>
        The "Setu Yatra Challenge" ("the Offer") is a promotional initiative by <strong className="text-white/80">Shradhalu Private Limited</strong>,
        operating the platform <strong className="text-white/80">Sri Dwar</strong> (sridwar.com) ("Sri Dwar", "we", "us", "our"), encouraging users
        to contribute accurate listings of temples, puja mandals, puja committees, priests, and dharmic experts to the Sri Dwar directory, and to
        register themselves as devotees.
      </P>

      <H3>2. Eligibility</H3>
      <UL>
        <LI>Open to individuals aged 18 years and above, residing in India or abroad.</LI>
        <LI>Employees, directors, and immediate family members of Shradhalu Private Limited are not eligible to win prizes, but may still contribute entries.</LI>
        <LI>Participation is free. No purchase or payment is necessary to participate in or win this Offer. Any contribution made through Sri Dwar's platform during registration is entirely voluntary and has no bearing on eligibility or ranking.</LI>
      </UL>

      <H3>3. Offer Period</H3>
      <P>The Offer is open for a period announced on sridwar.com ("Offer Period"). Sri Dwar reserves the right to extend, shorten, or modify the Offer Period at its sole discretion, with notice published on sridwar.com.</P>

      <H3>4. How to Participate</H3>
      <P>Participants may submit entries for: (a) temples, puja mandals, and puja committees, via the temple/committee registration flow; (b) priests, pandits, and dharmic experts, via the dharmic expert registration flow; and/or (c) themselves, via the devotee registration flow.</P>
      <P>Detailed submission steps are provided in the "How It Works" tab. Participants must follow the stated method of identifying themselves as the contributor (e.g. the "Suggested by" note and/or WhatsApp confirmation) for an entry to be correctly credited toward their ranking.</P>

      <H3>5. Entry Validity &amp; Verification</H3>
      <UL>
        <LI>All submitted entries are subject to manual review and verification by the Sri Dwar team.</LI>
        <LI>An entry will only count toward a participant's contributor ranking if it is accurate, complete, non-duplicate, and (where applicable) submitted with the knowledge and consent of the person being listed.</LI>
        <LI>Sri Dwar reserves the right, at its sole discretion, to reject, disqualify, or decline to count any entry it reasonably believes to be fake, duplicate, incomplete, misleading, or submitted in bad faith.</LI>
        <LI>Submitting an entry does not guarantee it will count toward the contributor ranking; only entries confirmed as valid will be counted.</LI>
      </UL>

      <H3>6. Selection of Winners</H3>
      <UL>
        <LI>Winners are determined based on the total number of valid, confirmed entries submitted by each participant during the Offer Period — a skill- and contribution-based ranking, not a lottery, raffle, or game of chance.</LI>
        <LI>A minimum number of valid entries is required to be considered a "top contributor" — see the published offer terms on sridwar.com for the current minimum.</LI>
        <LI>In the event of a tie, Sri Dwar may consider the quality, completeness, and verification date of entries to determine final ranking, at its sole discretion.</LI>
        <LI>Sri Dwar's decision on the final ranking and selection of winners is final and binding.</LI>
        <LI>Winners will be notified directly via the phone number or email address used during their registration/submission, within the notification window stated on sridwar.com.</LI>
      </UL>

      <H3>7. Prizes</H3>
      <div className="overflow-x-auto -mx-1 mb-2">
        <table className="w-full text-[12px] border-collapse">
          <tbody>
            {[
              ["Yatra Package 1", "Chhota Char Dham Yatra — Kedarnath, Gangotri, Yamunotri & Badrinath"],
              ["Yatra Package 2", "Maa Vaishno Devi Yatra — Katra"],
              ["Yatra Package 3", "Kashi Vishwanath Yatra — Varanasi"],
              ["Yatra Package 4", "Haridwar & Rishikesh Yatra"],
              ["Yatra Package 5", "Somnath & Dwarkadhish Yatra"],
              ["Yatra Package 6", "Vrindavan Yatra"],
              ["Grand Prize", "Fully-covered All India Yatra, awarded to the single top-ranked contributor"],
            ].map(row => (
              <tr key={row[0]} className="border-b border-white/8 last:border-0">
                <td className="py-2 pr-3 align-top font-semibold text-[#FFB347] whitespace-nowrap">{row[0]}</td>
                <td className="py-2 align-top text-white/60">{row[1]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <UL>
        <LI>Each Yatra Package is for 1 (one) week / 6 nights, 7 days, for the winning participant.</LI>
        <LI>The top overall contributor, who wins the Grand Prize, may choose to personally avail the All India Yatra, or nominate one family member, friend, or close-circle individual to avail it on their behalf. The nominee's identity must be confirmed in writing to Sri Dwar before travel is booked.</LI>
        <LI>Other winners (Yatra Packages 1–6) may select their preferred package from the list above, subject to availability; allocation will be on a first-confirmed basis among winners where multiple winners prefer the same package.</LI>
        <LI>Prizes are non-transferable (except as explicitly permitted for the Grand Prize above), non-exchangeable for cash, and cannot be substituted for an alternative destination beyond the listed options, except at Sri Dwar's sole discretion.</LI>
      </UL>

      <H3>8. What's Included / Excluded</H3>
      <P>Unless otherwise communicated in writing, the fully-covered Yatra typically includes: onward and return travel (train/flight, as applicable), accommodation, meals, local transport during the Yatra, and arranged temple darshan/Seva during the trip, for the winner (and one nominee, for the Grand Prize only).</P>
      <P>It typically excludes: personal shopping and incidental expenses, travel/medical insurance, items of a personal nature, and any additional services not explicitly listed as included by Sri Dwar's travel partner at the time of booking. Exact inclusions/exclusions and travel dates will be confirmed directly with each winner before travel.</P>

      <H3>9. Disqualification</H3>
      <P>Sri Dwar reserves the right to disqualify any participant who:</P>
      <UL>
        <LI>Submits fake, fraudulent, duplicate, or knowingly inaccurate entries;</LI>
        <LI>Lists a person (priest/dharmic expert) without their knowledge or consent;</LI>
        <LI>Attempts to manipulate the ranking through any unfair or dishonest means; or</LI>
        <LI>Violates Sri Dwar's general Terms of Use or applicable law.</LI>
      </UL>

      <H3>10. Not a Lottery; No Cash Alternative</H3>
      <P>This Offer is a skill- and merit-based contribution challenge. No participant is required to make any payment to participate or to be eligible for a prize. Winners are determined solely on the basis of valid, confirmed contributions, not by chance, draw, or random selection. No cash alternative is available in place of any prize.</P>

      <H3>11. Organizer's Rights</H3>
      <P>Sri Dwar reserves the right, at its sole discretion and without prior notice, to modify, suspend, extend, or terminate the Offer at any time; change the prize structure, number of winners, or prize inclusions due to circumstances such as travel partner availability, force majeure, or operational reasons; and verify, audit, or request supporting information for any submitted entry.</P>

      <H3>12. Limitation of Liability</H3>
      <P>Sri Dwar and Shradhalu Private Limited shall not be liable for any indirect, incidental, or consequential loss arising from participation in this Offer, including delays, cancellations, or changes to travel arrangements due to circumstances beyond reasonable control (including weather, government restrictions, or third-party service providers). Spiritual outcomes of any Yatra, puja, or Seva remain a matter of personal faith, and no guarantees are made in this regard.</P>

      <H3>13. Grievance &amp; Contact</H3>
      <P>For any queries, disputes, or grievances relating to this Offer, please contact:</P>
      <div className="bg-white/5 border border-white/10 rounded-xl px-3.5 py-3 mb-2 space-y-1.5">
        <p className="text-[12px] text-white/70 font-mono flex items-center gap-1.5"><Mail className="w-3 h-3 text-[#5EEAD4]" /> puja@sridwar.com</p>
        <p className="text-[12px] text-white/70 font-mono flex items-center gap-1.5"><MessageCircle className="w-3 h-3 text-[#5EEAD4]" /> +91 97776 45062</p>
      </div>
      <P>We aim to acknowledge grievances within 24 hours and resolve them within 15 working days, consistent with Sri Dwar's standard grievance redressal policy.</P>

      <H3>14. Governing Law &amp; Jurisdiction</H3>
      <P>This Offer and these Terms shall be governed by the laws of India. Any disputes arising from this Offer shall be subject to the exclusive jurisdiction of the courts in Bhubaneswar, Odisha, India.</P>

      <H3>15. General</H3>
      <UL>
        <LI>By participating, you confirm that the information submitted is accurate to the best of your knowledge and that you have obtained any necessary consent from individuals you list.</LI>
        <LI>These Terms are in addition to, and not in place of, Sri Dwar's general Terms of Use and Privacy Policy, both available on sridwar.com.</LI>
        <LI>Sri Dwar's decision on all matters relating to this Offer is final and binding.</LI>
      </UL>

      <div className="border-t border-white/10 mt-5 pt-4 flex items-start gap-2">
        <MapPin className="w-3.5 h-3.5 text-white/30 shrink-0 mt-0.5" />
        <p className="text-[11px] text-white/30 font-mono leading-relaxed">
          Shradhalu Private Limited · Sobra, Maa Biraja Khetra, Jajpur, Odisha 755019, India
        </p>
      </div>
    </div>
  );
}

// ─── The embedded modal (overlay) ────────────────────────────────────────────
function SetuYatraModal({ initialTab, onClose }: { initialTab: Tab; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>(initialTab);

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm px-0 sm:px-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Setu Yatra Challenge"
    >
      <div
        onClick={e => e.stopPropagation()}
        className="bg-[#051F1A] border border-white/10 rounded-t-3xl sm:rounded-3xl w-full sm:max-w-2xl max-h-[88vh] sm:max-h-[80vh] flex flex-col overflow-hidden shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-5 sm:px-6 pt-5 pb-3 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#FFB347]/12 border border-[#FFB347]/25 flex items-center justify-center shrink-0">
              <Trophy className="w-4.5 h-4.5 text-[#FFB347]" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-serif font-black text-white leading-tight truncate">Setu Yatra Challenge</p>
              <p className="text-[10px] text-white/40 font-mono">An Initiative by Sridwar Technology</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition-colors cursor-pointer shrink-0"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 px-5 sm:px-6 pt-3 shrink-0">
          <button
            onClick={() => setTab("guide")}
            className={`flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-full border transition-all cursor-pointer ${
              tab === "guide"
                ? "bg-[#FFB347]/15 border-[#FFB347]/40 text-[#FFB347]"
                : "bg-white/4 border-white/10 text-white/50 hover:border-white/20"
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" /> How It Works
          </button>
          <button
            onClick={() => setTab("terms")}
            className={`flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-full border transition-all cursor-pointer ${
              tab === "terms"
                ? "bg-[#5EEAD4]/15 border-[#5EEAD4]/40 text-[#5EEAD4]"
                : "bg-white/4 border-white/10 text-white/50 hover:border-white/20"
            }`}
          >
            <FileText className="w-3.5 h-3.5" /> Terms &amp; Conditions
          </button>
        </div>

        {/* Scrollable body */}
        <div className="px-5 sm:px-6 py-4 overflow-y-auto grow">
          {tab === "guide" ? <GuideContent /> : <TermsContent />}
        </div>

        {/* Footer */}
        <div className="px-5 sm:px-6 py-3 border-t border-white/10 shrink-0">
          <button
            onClick={onClose}
            className="w-full bg-white/5 hover:bg-white/10 border border-white/15 text-white/70 text-xs font-semibold py-2.5 rounded-xl transition-all cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * SetuYatraFooterLinks — drop this at the bottom of any registration form.
 * Renders a single compact line with two inline links; tapping either opens
 * the embedded modal above on the relevant tab. Nothing here ever navigates
 * the user away from the current page.
 */
export function SetuYatraFooterLinks() {
  const [openTab, setOpenTab] = useState<Tab | null>(null);

  return (
    <>
      <div className="flex items-center justify-center gap-1.5 flex-wrap pt-1">
        <Trophy className="w-3 h-3 text-[#FFB347]/70" />
        <span className="text-[11px] text-white/40">Part of the Setu Yatra Challenge —</span>
        <button
          type="button"
          onClick={() => setOpenTab("guide")}
          className="text-[11px] font-semibold text-[#FFB347] hover:text-[#FFC97A] underline underline-offset-2 cursor-pointer"
        >
          How It Works
        </button>
        <span className="text-[11px] text-white/30">·</span>
        <button
          type="button"
          onClick={() => setOpenTab("terms")}
          className="text-[11px] font-semibold text-[#5EEAD4] hover:text-[#9DECD8] underline underline-offset-2 cursor-pointer"
        >
          Terms &amp; Conditions
        </button>
      </div>

      {openTab && <SetuYatraModal initialTab={openTab} onClose={() => setOpenTab(null)} />}
    </>
  );
}

export default SetuYatraFooterLinks;
