import { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Send, Sparkles, Plus, Trash2, Bot, User, Loader2, MessageSquare,
} from "lucide-react";

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-rastro`;

type Msg = { role: "user" | "assistant"; content: string };
type Conversation = { id: string; title: string; messages: Msg[] };

const SUGGESTIONS = [
  "Qual o estado geral da minha frota hoje?",
  "Quais pneus estão com sulco crítico e precisam de troca?",
  "Gere um resumo executivo dos alertas ativos",
  "Analise o custo por km dos meus pneus e sugira otimizações",
];

async function streamChat({
  messages,
  onDelta,
  onDone,
  onError,
}: {
  messages: Msg[];
  onDelta: (text: string) => void;
  onDone: () => void;
  onError: (msg: string) => void;
}) {
  const resp = await fetch(CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ messages }),
  });

  if (!resp.ok) {
    const data = await resp.json().catch(() => ({}));
    throw new Error(data.error || `Erro ${resp.status}`);
  }

  if (!resp.body) throw new Error("Sem resposta do servidor");

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });

    let idx: number;
    while ((idx = buf.indexOf("\n")) !== -1) {
      let line = buf.slice(0, idx);
      buf = buf.slice(idx + 1);
      if (line.endsWith("\r")) line = line.slice(0, -1);
      if (!line.startsWith("data: ")) continue;
      const json = line.slice(6).trim();
      if (json === "[DONE]") { onDone(); return; }
      try {
        const parsed = JSON.parse(json);
        const content = parsed.choices?.[0]?.delta?.content;
        if (content) onDelta(content);
      } catch {
        buf = line + "\n" + buf;
        break;
      }
    }
  }
  onDone();
}

export default function AssistenteIAPage() {
  const [conversations, setConversations] = useState<Conversation[]>([
    { id: "default", title: "Nova Conversa", messages: [] },
  ]);
  const [activeId, setActiveId] = useState("default");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const active = conversations.find((c) => c.id === activeId) || conversations[0];
  const messages = active.messages;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const updateConv = useCallback(
    (msgs: Msg[], title?: string) => {
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeId
            ? { ...c, messages: msgs, title: title ?? c.title }
            : c
        )
      );
    },
    [activeId]
  );

  const handleSend = useCallback(
    async (text?: string) => {
      const msg = (text || input).trim();
      if (!msg || loading) return;
      setInput("");

      const userMsg: Msg = { role: "user", content: msg };
      const newMsgs = [...messages, userMsg];
      const title =
        active.title === "Nova Conversa" ? msg.slice(0, 40) : active.title;
      updateConv(newMsgs, title);

      setLoading(true);
      let assistantSoFar = "";

      const upsert = (chunk: string) => {
        assistantSoFar += chunk;
        setConversations((prev) =>
          prev.map((c) => {
            if (c.id !== activeId) return c;
            const last = c.messages[c.messages.length - 1];
            if (last?.role === "assistant") {
              return {
                ...c,
                messages: c.messages.map((m, i) =>
                  i === c.messages.length - 1
                    ? { ...m, content: assistantSoFar }
                    : m
                ),
              };
            }
            return {
              ...c,
              messages: [...c.messages, { role: "assistant", content: assistantSoFar }],
            };
          })
        );
      };

      try {
        await streamChat({
          messages: newMsgs,
          onDelta: upsert,
          onDone: () => setLoading(false),
          onError: (e) => {
            toast.error(e);
            setLoading(false);
          },
        });
      } catch (e: any) {
        toast.error(e.message || "Erro ao conectar com a IA");
        upsert(`\n\n⚠️ **Erro:** ${e.message}`);
        setLoading(false);
      }
      inputRef.current?.focus();
    },
    [input, loading, messages, activeId, active.title, updateConv]
  );

  const handleNew = () => {
    const id = `conv-${Date.now()}`;
    setConversations((prev) => [
      ...prev,
      { id, title: "Nova Conversa", messages: [] },
    ]);
    setActiveId(id);
  };

  const handleDelete = (id: string) => {
    if (conversations.length <= 1) return;
    const filtered = conversations.filter((c) => c.id !== id);
    setConversations(filtered);
    if (activeId === id) setActiveId(filtered[0].id);
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4">
      {/* Sidebar */}
      <div className="w-64 shrink-0 hidden lg:flex flex-col gap-2">
        <Button
          variant="outline"
          className="w-full justify-start gap-2"
          onClick={handleNew}
        >
          <Plus className="h-4 w-4" /> Nova Conversa
        </Button>
        <ScrollArea className="flex-1">
          <div className="space-y-1 pr-2">
            {conversations.map((c) => (
              <div
                key={c.id}
                onClick={() => setActiveId(c.id)}
                className={`flex items-center justify-between px-3 py-2 rounded-md cursor-pointer text-sm transition-colors group ${
                  activeId === c.id
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                <span className="truncate flex-1">{c.title}</span>
                {conversations.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(c.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive p-1"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
        <div className="text-[10px] text-muted-foreground/50 text-center pt-2 border-t border-border">
          Rastro Insights • Lovable AI
        </div>
      </div>

      {/* Chat area */}
      <Card className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold truncate">{active.title}</h2>
            <p className="text-[10px] text-muted-foreground">Assistente IA Rastro Insights</p>
          </div>
          <Badge variant="outline" className="text-[10px] gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Online
          </Badge>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 px-4 py-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 py-12">
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg shadow-primary/20">
                <Bot className="h-8 w-8 text-primary-foreground" />
              </div>
              <div className="text-center space-y-1">
                <h3 className="text-lg font-semibold">Rastro Insights AI</h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                  Assistente inteligente para gestão de frotas e pneus. Pergunte qualquer coisa.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 justify-center max-w-lg">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => handleSend(s)}
                    className="px-3 py-1.5 rounded-full border border-border text-xs text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4 max-w-3xl mx-auto">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {msg.role === "assistant" && (
                    <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-1">
                      <Sparkles className="h-3.5 w-3.5 text-primary" />
                    </div>
                  )}
                  <div
                    className={`max-w-[75%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "bg-muted rounded-bl-md"
                    }`}
                  >
                    {msg.role === "assistant" ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:mb-2 [&>ul]:mb-2 [&>ol]:mb-2">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    ) : (
                      msg.content
                    )}
                  </div>
                  {msg.role === "user" && (
                    <div className="h-7 w-7 rounded-lg bg-muted flex items-center justify-center shrink-0 mt-1">
                      <User className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                  )}
                </div>
              ))}
              {loading && messages[messages.length - 1]?.role !== "assistant" && (
                <div className="flex gap-3">
                  <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div className="bg-muted px-4 py-3 rounded-2xl rounded-bl-md">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          )}
        </ScrollArea>

        {/* Input */}
        <div className="p-4 border-t border-border">
          <div className="flex gap-2 items-end max-w-3xl mx-auto">
            <Textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Digite sua mensagem..."
              className="min-h-[44px] max-h-[150px] resize-none text-sm"
              rows={1}
            />
            <Button
              size="icon"
              onClick={() => handleSend()}
              disabled={!input.trim() || loading}
              className="shrink-0 h-[44px] w-[44px]"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground/50 text-center mt-2">
            Shift+Enter para nova linha • Lovable AI
          </p>
        </div>
      </Card>
    </div>
  );
}
