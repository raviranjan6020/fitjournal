"use client";

import { useState, useRef, useEffect } from "react";
import { Sparkles, Send, ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";

interface Message { role: "user" | "coach"; text: string }

const SUGGESTIONS = [
  "Why is my squat stalled?",
  "Am I eating enough protein?",
  "Is my bulk going too fast?",
  "Why am I not losing weight?",
  "How's my training volume?",
  "What should I focus on this week?",
];

export function CoachChat() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input,    setInput]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function send(question?: string) {
    const q = (question ?? input).trim();
    if (!q || loading) return;

    setInput("");
    setError(null);
    setMessages(prev => [...prev, { role: "user", text: q }]);
    setLoading(true);

    try {
      const res = await fetch("/api/coach/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Request failed");
      }

      const data = await res.json();
      setMessages(prev => [...prev, { role: "coach", text: data.answer }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setMessages(prev => [...prev, { role: "coach", text: "Sorry, I couldn't process that. Try again." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-dvh bg-background flex flex-col">
      {/* Header */}
      <header className="bg-surface px-5 py-4 border-b border-border shrink-0">
        <div className="max-w-md mx-auto flex items-center gap-3">
          <button onClick={() => router.back()} className="size-9 -ml-1 grid place-items-center text-muted-foreground">
            <ChevronLeft className="size-5" />
          </button>
          <div>
            <h1 className="text-base font-semibold">Ask Your Coach</h1>
            <p className="text-xs text-muted-foreground">AI insights from your data</p>
          </div>
        </div>
      </header>

      {/* Chat area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="max-w-md mx-auto px-5 py-5 space-y-4">
          {/* Suggestion chips (shown when no messages) */}
          {messages.length === 0 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground text-center pt-8">
                Ask anything about your fitness progress. Coach uses your real analytics data.
              </p>
              <div className="flex flex-wrap gap-2 justify-center pt-4">
                {SUGGESTIONS.map(s => (
                  <button key={s} onClick={() => send(s)}
                    className="text-xs font-medium px-3 py-2 rounded-full bg-surface ring-1 ring-border text-foreground hover:ring-primary/50 active:bg-accent transition">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          {messages.map((m, i) =>
            m.role === "user" ? (
              <div key={i} className="flex justify-end">
                <p className="max-w-[80%] bg-primary text-primary-foreground px-4 py-2.5 rounded-2xl rounded-br-md text-sm">
                  {m.text}
                </p>
              </div>
            ) : (
              <div key={i} className="flex gap-3">
                <div className="size-8 shrink-0 rounded-full bg-surface border border-border grid place-items-center">
                  <Sparkles className="size-4 text-primary" />
                </div>
                <div className="bg-surface ring-1 ring-border px-4 py-3 rounded-2xl rounded-tl-md text-sm leading-relaxed max-w-[85%]">
                  {m.text}
                </div>
              </div>
            )
          )}

          {/* Loading indicator */}
          {loading && (
            <div className="flex gap-3">
              <div className="size-8 shrink-0 rounded-full bg-surface border border-border grid place-items-center">
                <Sparkles className="size-4 text-primary animate-pulse" />
              </div>
              <div className="bg-surface ring-1 ring-border px-4 py-3 rounded-2xl rounded-tl-md">
                <div className="flex gap-1.5">
                  <span className="size-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="size-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="size-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}

          {error && <p className="text-xs text-danger text-center">{error}</p>}
        </div>
      </div>

      {/* Input bar — fixed at bottom, above safe area */}
      <div className="shrink-0 bg-background/95 backdrop-blur-sm border-t border-border px-5 py-3" style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}>
        <form onSubmit={e => { e.preventDefault(); send(); }}
          className="max-w-md mx-auto flex gap-2 items-center">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ask anything about your fitness..."
            disabled={loading}
            className="flex-1 min-w-0 bg-surface ring-1 ring-border rounded-full px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary outline-none disabled:opacity-60"
          />
          <button type="submit" disabled={!input.trim() || loading}
            aria-label="Send"
            className="size-11 shrink-0 bg-primary text-primary-foreground rounded-full grid place-items-center disabled:opacity-40 active:scale-90 transition-transform">
            <Send className="size-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
