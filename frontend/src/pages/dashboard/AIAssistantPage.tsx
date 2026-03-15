import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bot, Send, User } from "lucide-react";
import { useState } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
  players?: { name: string; pos: string; age: number; club: string; rating: number }[];
}

const initialMessages: Message[] = [
  { role: "assistant", content: "Hi! I'm your AI scouting assistant. Ask me about players, positions, or scouting insights." },
];

export default function AIAssistantPage() {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");

  const handleSend = () => {
    if (!input.trim()) return;
    const userMsg: Message = { role: "user", content: input };
    const aiMsg: Message = {
      role: "assistant",
      content: "Here are the top U21 midfielders I found:",
      players: [
        { name: "Florian Wirtz", pos: "AM", age: 20, club: "B. Leverkusen", rating: 90 },
        { name: "Gavi", pos: "CM", age: 21, club: "FC Barcelona", rating: 87 },
        { name: "Jamal Musiala", pos: "AM", age: 22, club: "Bayern Munich", rating: 89 },
      ],
    };
    setMessages([...messages, userMsg, aiMsg]);
    setInput("");
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="mb-4">
        <h1 className="text-2xl md:text-3xl font-display font-bold flex items-center gap-2">
          <Bot className="w-7 h-7 text-secondary" /> AI Assistant
        </h1>
        <p className="text-muted-foreground mt-1">Ask questions about players and scouting</p>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pr-2">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[80%] ${msg.role === "user" ? "" : ""}`}>
              <div className="flex items-start gap-2">
                {msg.role === "assistant" && (
                  <div className="w-8 h-8 rounded-lg bg-secondary/20 flex items-center justify-center shrink-0 mt-1">
                    <Bot className="w-4 h-4 text-secondary" />
                  </div>
                )}
                <div className={`rounded-xl px-4 py-3 ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-card border border-border"
                }`}>
                  <p className="text-sm">{msg.content}</p>
                  {msg.players && (
                    <div className="mt-3 space-y-2">
                      {msg.players.map((p) => (
                        <div key={p.name} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 gap-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center font-display font-bold text-primary text-sm">
                              {p.rating}
                            </div>
                            <div>
                              <div className="font-medium text-sm text-foreground">{p.name}</div>
                              <div className="text-xs text-muted-foreground">{p.club}</div>
                            </div>
                          </div>
                          <Badge variant="outline" className="text-xs">{p.pos}</Badge>
                        </div>
                      ))}
                    </div>
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
      </div>

      <div className="mt-4 flex gap-2">
        <Input
          placeholder="Ask about players, e.g. 'Top U21 midfielders in Germany'"
          className="h-12 bg-muted/50"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
        />
        <Button variant="hero" size="icon" className="h-12 w-12 shrink-0" onClick={handleSend}>
          <Send className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
}
