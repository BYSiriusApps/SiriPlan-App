"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { X, Send, Bot, Minimize2, LifeBuoy } from "lucide-react";
import { useAiAssistant } from "./AiAssistantContext";

interface Message {
  role: "user" | "assistant";
  text: string;
}

export function HelpAssistant() {
  const t = useTranslations("dashboard.aiAssistant");
  const { open, setOpen } = useAiAssistant();
  const [minimized, setMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([{ role: "assistant", text: t("greeting") }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const quickQuestions = [t("quickQ1"), t("quickQ2"), t("quickQ3"), t("quickQ4")];

  useEffect(() => {
    if (open && !minimized) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      inputRef.current?.focus();
    }
  }, [messages, open, minimized]);

  const send = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    setMessages((prev) => [...prev, { role: "user", text: trimmed }]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/dashboard-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed }),
      });
      const data = await res.json();
      setMessages((prev) => [...prev, { role: "assistant", text: data.response ?? t("errorFallback") }]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", text: t("errorFallback") }]);
    } finally {
      setLoading(false);
    }
  }, [loading, t]);

  function handleKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  }

  function handleOpen() {
    setOpen(true);
    setMinimized(false);
  }

  return (
    <>
      {/* Mobilde sabit yuvarlak buton kaldırıldı — "+ Randevu" düğmesiyle çakışıyordu.
          Mobilde asistana soldan açılan menüden erişilir; masaüstünde buton kalır. */}
      {!open && (
        <button
          onClick={handleOpen}
          aria-label={t("openLabel")}
          className="hidden md:flex fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-primary shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 hover:scale-105 transition-all items-center justify-center"
        >
          <LifeBuoy className="w-6 h-6 text-white" />
        </button>
      )}

      {open && (
        <div
          className={`fixed z-40 right-4 md:right-6 transition-all duration-300 shadow-2xl shadow-black/20 rounded-2xl border border-border overflow-hidden flex flex-col bg-background ${
            minimized
              ? "bottom-20 md:bottom-6 w-72 h-14"
              : "bottom-20 md:bottom-6 w-[calc(100vw-2rem)] sm:w-[360px] h-[70vh] max-h-[520px]"
          }`}
        >
          <div className="flex items-center justify-between px-4 py-3 bg-primary text-white shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold leading-none">{t("title")}</p>
                <p className="text-[10px] text-white/70 mt-0.5 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                  {t("status")}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setMinimized((m) => !m)}
                className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
                aria-label={t("minimizeLabel")}
              >
                <Minimize2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
                aria-label={t("closeLabel")}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {!minimized && (
            <>
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-0">
                {messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    {msg.role === "assistant" && (
                      <div className="w-6 h-6 rounded-full bg-primary/15 flex items-center justify-center mr-2 shrink-0 mt-0.5">
                        <Bot className="w-3 h-3 text-primary" />
                      </div>
                    )}
                    <div
                      className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-line ${
                        msg.role === "user"
                          ? "bg-primary text-white rounded-br-sm"
                          : "bg-muted text-foreground rounded-bl-sm"
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))}

                {loading && (
                  <div className="flex justify-start">
                    <div className="w-6 h-6 rounded-full bg-primary/15 flex items-center justify-center mr-2 shrink-0 mt-0.5">
                      <Bot className="w-3 h-3 text-primary" />
                    </div>
                    <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-3">
                      <span className="flex gap-1 items-center">
                        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: "300ms" }} />
                      </span>
                    </div>
                  </div>
                )}

                <div ref={bottomRef} />
              </div>

              {messages.length === 1 && (
                <div className="px-4 pb-2 flex flex-wrap gap-1.5 shrink-0">
                  {quickQuestions.map((q) => (
                    <button
                      key={q}
                      onClick={() => send(q)}
                      className="text-[11px] px-2.5 py-1 rounded-full border border-primary/30 text-primary hover:bg-primary/10 transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}

              <div className="px-3 pb-3 pt-2 border-t border-border shrink-0">
                <div className="flex items-center gap-2 bg-muted rounded-xl px-3 py-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKey}
                    placeholder={t("placeholder")}
                    disabled={loading}
                    className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60 min-w-0"
                  />
                  <button
                    onClick={() => send(input)}
                    disabled={loading || !input.trim()}
                    aria-label={t("sendLabel")}
                    className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center shrink-0 disabled:opacity-40 hover:bg-primary/90 transition-colors"
                  >
                    <Send className="w-3.5 h-3.5 text-white" />
                  </button>
                </div>
                <p className="text-[10px] text-muted-foreground/50 text-center mt-1.5">{t("footer")}</p>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
