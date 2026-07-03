/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, Fragment } from "react";
import { ArrowLeft, BookOpen } from "lucide-react";
import {
  FOUNDER_STORIES,
  FOUNDER_STORY_LANGUAGE_LABELS,
  FOUNDER_STORY_PAGE_TITLE,
  StoryLang,
} from "../data/founderStoryContent";

interface FounderStoryProps {
  onBack?: () => void;
  defaultLanguage?: StoryLang;
}

const LANGS: StoryLang[] = ["en", "hi", "or"];

/**
 * Renders a paragraph's text, converting **bold** markers (preserved verbatim
 * from the founders' original documents) into <strong> emphasis. This is a
 * display-only transform — the underlying story text is never altered.
 */
function renderParagraph(text: string, key: string | number) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g).filter((p) => p !== "");
  return (
    <p key={key} className="text-white/85 leading-relaxed font-sans text-[15px] sm:text-base mb-4">
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <strong key={i} className="text-[#FFB347] font-bold">
              {part.slice(2, -2)}
            </strong>
          );
        }
        return <Fragment key={i}>{part}</Fragment>;
      })}
    </p>
  );
}

export default function FounderStory({ onBack, defaultLanguage = "en" }: FounderStoryProps) {
  const initialLang: StoryLang = LANGS.includes(defaultLanguage) ? defaultLanguage : "en";
  const [lang, setLang] = useState<StoryLang>(initialLang);

  const sections = FOUNDER_STORIES[lang];
  const isDevanagariOrOdia = lang !== "en";

  return (
    <section
      id="founder-story-page"
      className="py-12 bg-[#021816] text-white text-left"
      style={{ paddingTop: `calc(env(safe-area-inset-top, 0px) + 80px)` }}
    >
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {onBack && (
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-xs font-bold text-white/60 hover:text-white mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Our Divine Mission
          </button>
        )}

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center space-x-2 bg-[#5EEAD4]/10 border border-[#5EEAD4]/30 px-3.5 py-1.5 rounded-full text-[#5EEAD4] text-xs font-semibold uppercase tracking-wider mb-4">
            <BookOpen className="w-3.5 h-3.5" />
            <span>In the Founders&apos; Own Words</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-serif font-black text-white tracking-tight">
            {FOUNDER_STORY_PAGE_TITLE[lang]}
          </h1>
          <p className="text-white/60 text-sm mt-3 font-sans max-w-xl mx-auto">
            Kunu &amp; Harmohan Rana share, unedited and in their own words, how Sri Dwar was
            envisioned — and the struggle behind it.
          </p>
        </div>

        {/* Language switcher */}
        <div className="flex justify-center gap-2 mb-10" role="tablist" aria-label="Choose language">
          {LANGS.map((l) => (
            <button
              key={l}
              role="tab"
              aria-selected={lang === l}
              onClick={() => setLang(l)}
              className={`px-4 py-2 rounded-full text-sm font-sans font-bold transition-all border ${
                lang === l
                  ? "bg-[#FFB347] text-[#021816] border-[#FFB347]"
                  : "bg-white/5 text-white/70 border-white/10 hover:bg-white/10 hover:text-white"
              }`}
            >
              {FOUNDER_STORY_LANGUAGE_LABELS[l]}
            </button>
          ))}
        </div>

        {/* Section jump nav — only meaningful when there is more than one section */}
        {sections.length > 1 && (
          <div className="flex flex-wrap justify-center gap-2 mb-10">
            {sections.map((sec) => (
              <a
                key={sec.id}
                href={`#story-${lang}-${sec.id}`}
                onClick={(e) => {
                  // Scroll to the section manually instead of letting the
                  // browser perform its default fragment navigation. A native
                  // hash jump creates a new same-document history entry,
                  // which fires a `popstate` event; the app's global
                  // back-button trap (see App.tsx) treats any `popstate`
                  // while on an internal page as a "go back" signal and was
                  // sending devotees to the homepage instead of scrolling
                  // them to the section. Scrolling via scrollIntoView avoids
                  // touching browser history entirely, so the jump nav no
                  // longer triggers that handler.
                  e.preventDefault();
                  document
                    .getElementById(`story-${lang}-${sec.id}`)
                    ?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                className="text-[11px] sm:text-xs font-mono uppercase tracking-wider text-[#5EEAD4]/90 bg-[#5EEAD4]/10 border border-[#5EEAD4]/20 rounded-full px-3 py-1.5 hover:bg-[#5EEAD4]/20 transition-colors"
              >
                {sec.title}
              </a>
            ))}
          </div>
        )}

        {/* Story content */}
        <div className={`space-y-14 ${isDevanagariOrOdia ? "font-sans" : ""}`} lang={lang}>
          {sections.map((sec) => (
            <article
              key={sec.id}
              id={`story-${lang}-${sec.id}`}
              className="relative rounded-[2rem] border border-white/10 bg-gradient-to-br from-[#092320] via-[#092320] to-[#021816] p-6 sm:p-10 shadow-2xl overflow-hidden scroll-mt-24"
            >
              <span
                aria-hidden="true"
                className="pointer-events-none select-none absolute -right-6 -top-10 text-[10rem] sm:text-[12rem] font-serif text-white/[0.03] leading-none"
              >
                ॐ
              </span>
              <div className="relative">
                <h2 className="text-2xl sm:text-3xl font-serif font-black text-white tracking-tight mb-6">
                  {sec.title}
                </h2>
                {sec.paragraphs.map((p, i) => renderParagraph(p, i))}
              </div>
            </article>
          ))}
        </div>

        {onBack && (
          <div className="flex justify-center mt-12">
            <button
              onClick={onBack}
              className="inline-flex items-center gap-2 bg-[#FFB347] hover:bg-[#F27D26] active:scale-[0.98] transition-all text-[#021816] font-sans font-bold text-sm px-6 py-3 rounded-full shadow-lg"
            >
              <ArrowLeft className="w-4 h-4" strokeWidth={2.5} />
              Back to Our Divine Mission
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
