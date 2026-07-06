import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Bot, Send, Square, Trash2, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { getAiUsage, streamChatMessage, type AiHistoryMessage } from "@/api/ai";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const INITIAL_MESSAGE: Message = {
  role: "assistant",
  content:
    "Hi! I'm your AI scouting assistant. Ask me about players, positions, stats, or scouting reports.",
};

const SESSION_KEY = "ai_chat_history";

function AssistantMessage({ content }: { content: string }) {
  return (
    <div className="text-sm break-words prose prose-sm dark:prose-invert max-w-none prose-p:my-1.5 prose-p:leading-relaxed prose-headings:my-2 prose-ul:my-1.5 prose-ol:my-1.5 prose-li:my-0.5 prose-table:my-2 prose-th:px-3 prose-th:py-1.5 prose-th:text-left prose-td:px-3 prose-td:py-1.5 prose-tr:border-border prose-thead:border-border">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          table: (props) => (
            <div className="overflow-x-auto">
              <table {...props} />
            </div>
          ),
          a: (props) => <a {...props} target="_blank" rel="noopener noreferrer" />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

function loadMessages(): Message[] {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Message[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // fall through to default
  }
  return [INITIAL_MESSAGE];
}

export default function AIAssistantPage() {
  const [messages, setMessages] = useState<Message[]>(loadMessages);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [pendingContent, setPendingContent] = useState("");
  const [dailyRemaining, setDailyRemaining] = useState<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const qc = useQueryClient();

  const { data: usage } = useQuery({
    queryKey: ["ai-usage"],
    queryFn: getAiUsage,
    staleTime: 0,
  });

  useEffect(() => {
    if (usage) setDailyRemaining(usage.remaining);
  }, [usage]);

  useEffect(() => {
    if (messages.length > 1) {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(messages));
    }
  }, [messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, pendingContent]);

  const handleStop = () => {
    abortRef.current?.abort();
  };

  const handleClear = () => {
    if (loading) handleStop();
    setMessages([INITIAL_MESSAGE]);
    setPendingContent("");
    sessionStorage.removeItem(SESSION_KEY);
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const updatedMessages: Message[] = [...messages, { role: "user", content: text }];
    setMessages(updatedMessages);
    setInput("");
    setLoading(true);
    setPendingContent("");

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const history: AiHistoryMessage[] = updatedMessages
      .slice(1, -1)
      .slice(-10)
      .map((m) => ({ role: m.role, content: m.content.slice(0, 500) }));

    let fullContent = "";

    try {
      for await (const event of streamChatMessage(text, history, controller.signal)) {
        if ("chunk" in event) {
          fullContent += event.chunk;
          setPendingContent(fullContent);
        } else if ("done" in event) {
          setMessages((prev) => [...prev, { role: "assistant", content: fullContent }]);
          setPendingContent("");
          setDailyRemaining(event.remaining);
          qc.invalidateQueries({ queryKey: ["ai-usage"] });
        } else if ("error" in event) {
          if (event.error === "rate_limit") {
            toast.error("AI service is busy. Please try again in a moment.");
          } else if (event.error === "timeout") {
            toast.error("Request timed out. Please try again.");
          } else {
            toast.error("AI service error. Please try again.");
          }
          if (fullContent) {
            setMessages((prev) => [...prev, { role: "assistant", content: fullContent }]);
          }
          setPendingContent("");
        }
      }
    } catch (err: unknown) {
      const e = err as { name?: string; status?: number; detail?: string };
      if (e.name === "AbortError") {
        if (fullContent) {
          setMessages((prev) => [...prev, { role: "assistant", content: fullContent }]);
        }
        setPendingContent("");
      } else if (e.status === 429) {
        if ((e.detail ?? "").toLowerCase().includes("daily")) {
          toast.error("Daily limit reached. Try again tomorrow.");
        } else {
          toast.error("Sending too fast. Please wait a moment.");
        }
      } else if (e.status === 503) {
        toast.error("AI assistant is currently unavailable.");
      } else {
        toast.error("Failed to get a response. Please try again.");
      }
      setPendingContent("");
    } finally {
      if (abortRef.current === controller) {
        setLoading(false);
        abortRef.current = null;
      }
    }
  };

  const dailyLimit = usage?.daily_limit ?? null;
  const dailyUsed = dailyLimit !== null && dailyRemaining !== null ? dailyLimit - dailyRemaining : null;
  const atLimit = dailyRemaining === 0;

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold flex items-center gap-2">
            <Bot className="w-7 h-7 text-secondary" /> AI Assistant
          </h1>
          <p className="text-muted-foreground mt-1">Ask questions about players and scouting</p>
        </div>
        <div className="flex items-center gap-2 shrink-0 mt-1">
          {dailyUsed !== null && dailyLimit !== null && (
            <Badge
              variant="outline"
              className={atLimit ? "border-destructive text-destructive" : "text-muted-foreground"}
            >
              {dailyUsed}/{dailyLimit} today
            </Badge>
          )}
          {messages.length > 1 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-destructive h-8 px-2"
              onClick={handleClear}
              title="Clear conversation"
            >
              <Trash2 className="w-4 h-4 mr-1" /> Clear
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pr-2">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className="max-w-[80%]">
              <div className="flex items-start gap-2">
                {msg.role === "assistant" && (
                  <div className="w-8 h-8 rounded-lg bg-secondary/20 flex items-center justify-center shrink-0 mt-1">
                    <Bot className="w-4 h-4 text-secondary" />
                  </div>
                )}
                <div
                  className={`rounded-xl px-4 py-3 ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-card border border-border"
                  }`}
                >
                  {msg.role === "assistant" ? (
                    <AssistantMessage content={msg.content} />
                  ) : (
                    <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                  )}
                </div>
                {msg.role === "user" && (
                  <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center shrink-0 mt-1">
                    <User className="w-4 h-4 text-primary" />
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {pendingContent && (
          <div className="flex justify-start">
            <div className="max-w-[80%]">
              <div className="flex items-start gap-2">
                <div className="w-8 h-8 rounded-lg bg-secondary/20 flex items-center justify-center shrink-0 mt-1">
                  <Bot className="w-4 h-4 text-secondary" />
                </div>
                <div className="rounded-xl px-4 py-3 bg-card border border-border">
                  <AssistantMessage content={pendingContent} />
                </div>
              </div>
            </div>
          </div>
        )}

        {loading && !pendingContent && (
          <div className="flex justify-start">
            <div className="max-w-[80%]">
              <div className="flex items-start gap-2">
                <div className="w-8 h-8 rounded-lg bg-secondary/20 flex items-center justify-center shrink-0 mt-1">
                  <Bot className="w-4 h-4 text-secondary" />
                </div>
                <div className="rounded-xl px-4 py-3 bg-card border border-border">
                  <Spinner size="sm" />
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <div className="mt-4 space-y-1.5">
        <div className="flex gap-2">
          <Input
            placeholder="Ask about players, stats, or scouting reports..."
            className="h-12 bg-muted/50"
            value={input}
            disabled={loading || atLimit}
            maxLength={2000}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !loading && !atLimit) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          {loading ? (
            <Button
              variant="outline"
              size="icon"
              className="h-12 w-12 shrink-0"
              onClick={handleStop}
              title="Stop generating"
            >
              <Square className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              variant="hero"
              size="icon"
              className="h-12 w-12 shrink-0"
              onClick={handleSend}
              disabled={!input.trim() || atLimit}
            >
              <Send className="w-5 h-5" />
            </Button>
          )}
        </div>
        <div className="flex justify-end">
          <span
            className={`text-xs ${
              input.length >= 2000
                ? "text-destructive"
                : input.length > 1800
                ? "text-amber-500"
                : "text-muted-foreground"
            }`}
          >
            {input.length}/2000
          </span>
        </div>
      </div>
    </div>
  );
}
