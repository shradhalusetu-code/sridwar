/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import { Send, Sparkles, X, RefreshCw } from "lucide-react";

interface AIAssistantProps {
  currentLanguage: string;
}

export default function AIAssistant({ currentLanguage }: AIAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Array<{ role: "user" | "model"; text: string }>>([
    { role: "model", text: "Hari Om! 🙏 Welcome to Sri Dwar. I am your 'Dharmic Margadarshak' AI assistant. Ask me questions about the Upanishads, Bhagavad Gita, daily temple Pujas, Gotra calculation advice, or the foundational vision of Kunu Rana!" }
  ]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const suggestionPills = [
    "Who is the founder of Sri Dwar?",
    "Explain Kashi Viswanatha Jyotirlinga",
    "What are the benefits of Gau Seva?",
    "Help me choose a Puja for health"
  ];

  const handleSendMessage = async (userText: string) => {
    if (!userText.trim() || isLoading) return;

    const updatedMessages = [...messages, { role: "user" as const, text: userText }];
    setMessages(updatedMessages);
    setInputText("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userText,
          history: messages
        })
      });

      // ✅ Fix: Check if server responded OK before trying to read it
      // On GitHub Pages, /api/assistant returns 404 — this catches it cleanly
      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const data = await response.json();
      setMessages((prev) => [...prev, { role: "model" as const, text: data.text || "May the divine light guide your thoughts always." }]);
    } catch (err) {
      // ✅ Fix: Silently handle — show friendly offline message instead of crashing
      setMessages((prev) => [
        ...prev,
        {
          role: "model" as const,
          text: "Hari Om! 🙏 Our AI Guide is currently in offline mode. For spiritual guidance, please visit us again shortly. May Lord Jagannath bless your path."
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Sparkly circular button at bottom right corner */}
      <button
        id="ai-floating-trigger"
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-40 bg-[#092320]/95 backdrop-blur border border-white/20 text-[#5EEAD4] p-4 rounded-full shadow-2xl hover:bg-neutral-900 focus:outline-none transition-transform hover:scale-110 flex items-center justify-center cursor-pointer group"
        title="Consult AI Margadarshak Guide"
      >
        <Sparkles className="w-5 h-5 text-[#FFB347] animate-pulse group-hover:rotate-12 transition-transform" />
        <span className="hidden group-hover:inline-block ml-1.5 text-xs font-mono font-bold uppercase tracking-wider pr-1">Consult AI Guide</span>
      </button>

      {/* Floating chat card overlay */}
      {isOpen && (
        <div
          id="ai-chat-card-overlay"
          className="fixed bottom-24 right-6 z-40 w-92 max-w-[calc(100vw-32px)] bg-[#092320]/95 backdrop-blur-xl rounded-3xl border border-white/20 shadow-2xl flex flex-col justify-between overflow-hidden animate-slideUp text-left text-xs text-white"
        >
          {/* Chat Header */}
          <div className="bg-[#021816]/95 text-white p-4 pb-3 flex items-center justify-between border-b border-white/10">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-[#FFB347] fill-[#FFB347] animate-spin duration-3000" />
              <div>
                <h4 className="font-serif text-sm font-bold tracking-tight">Margadarshak AI</h4>
                <div className="flex items-center space-x-1 text-[9px] text-[#5EEAD4] opacity-90 font-mono uppercase font-bold">
                  <span className="w-1.5 h-1.5 bg-[#5EEAD4] rounded-full animate-ping" />
                  <span>Sri Dwar Spiritual Guide</span>
                </div>
              </div>
            </div>
            <button
              id="close-ai-chat"
              onClick={() => setIsOpen(false)}
              className="text-white hover:text-[#FFB347] p-1 bg-white/10 rounded-full"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Conversation Area */}
          <div className="p-4 flex-grow max-h-[300px] overflow-y-auto space-y-3 bg-[#021816]/90" id="ai-messages-scroller">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} animate-fadeIn`}
              >
                <div
                  className={`p-3 rounded-2xl max-w-[85%] leading-relaxed ${
                    msg.role === "user"
                      ? "bg-[#FFB347] text-[#021816] rounded-tr-none font-sans font-bold text-right"
                      : "bg-[#092320]/90 text-white border border-white/10 rounded-tl-none font-sans text-left"
                  }`}
                >
                  <p className="whitespace-pre-line">{msg.text}</p>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white/5 border border-white/10 p-3 rounded-2xl rounded-tl-none text-white/50 font-mono text-[10px] space-x-1 flex items-center">
                  <RefreshCw className="w-3 h-3 animate-spin text-[#5EEAD4]" />
                  <span>Chanting mantras for cosmic replies...</span>
                </div>
              </div>
            )}
          </div>

          {/* Suggestions Tray */}
          <div className="px-4 py-2 border-t border-white/5 bg-[#092320]">
            <span className="block text-[9px] text-white/40 font-mono uppercase mb-1">Quick suggestions:</span>
            <div className="flex flex-wrap gap-1.5">
              {suggestionPills.map((pill, idx) => (
                <button
                  key={idx}
                  id={`ai-suggestion-pill-${idx}`}
                  onClick={() => handleSendMessage(pill)}
                  className="bg-white/5 hover:bg-[#5EEAD4]/10 hover:text-[#5EEAD4] text-[10px] text-white/80 px-2.5 py-1 rounded-full border border-white/10 text-left transition-all font-medium"
                >
                  {pill}
                </button>
              ))}
            </div>
          </div>

          {/* Chat Form Footer */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage(inputText);
            }}
            className="flex items-center space-x-2 p-3 bg-[#021816] border-t border-white/10"
          >
            <input
              id="ai-input-box"
              type="text"
              placeholder="Ask Margadarshak anything..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="flex-grow text-xs px-3 py-2 rounded-xl border border-white/10 bg-[#092320] text-white focus:outline-none focus:border-[#5EEAD4] placeholder-white/30 text-left"
            />
            <button
              id="send-ai-message"
              type="submit"
              className="bg-[#FFB347] hover:bg-[#F27D26] text-[#021816] p-2 rounded-xl transition-all shadow"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
