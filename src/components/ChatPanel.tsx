"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Send, Loader2, Copy, FileInput } from "lucide-react";
import { getApiKey } from "@/lib/workspace-store";
import {
  loadChatMessages,
  insertChatMessage,
  type ChatMessageRow,
} from "@/lib/supabase-store";

const SYSTEM_PROMPT_TEMPLATE = `너는 유튜브 대본 작성을 도와주는 AI 어시스턴트야. 아래는 현재 작성 중인 대본이야:

{SCRIPT}

사용자의 질문에 대본 맥락을 고려해서 답변해줘.`;

const MODEL_CONFIG = [
  {
    id: "gpt-5.3-chat-latest",
    label: "GPT-5.3",
    provider: "openai" as const,
  },
  {
    id: "claude-sonnet-4-6-20250415",
    label: "Claude Sonnet 4.6",
    provider: "anthropic" as const,
  },
  {
    id: "gemini-3.1-pro-preview",
    label: "Gemini 3.1 Pro",
    provider: "google" as const,
  },
  {
    id: "grok-4.20-beta",
    label: "Grok 4.20",
    provider: "xai" as const,
  },
  {
    id: "sonar",
    label: "Perplexity Sonar",
    provider: "perplexity" as const,
  },
] as const;

const QUICK_ACTIONS = [
  {
    id: "intro",
    label: "도입부 작성",
    prompt:
      "현재 대본의 도입부(훅)를 3가지 버전으로 작성해줘. 시청자의 관심을 끄는 강력한 훅이어야 해.",
  },
  {
    id: "feedback",
    label: "구성 피드백",
    prompt: "현재 대본의 전체 구성을 분석하고, 개선할 점을 알려줘.",
  },
  {
    id: "polish",
    label: "문장 다듬기",
    prompt: "현재 대본의 문장을 더 자연스럽고 말하기 편한 구어체로 다듬어줘.",
  },
  {
    id: "cta",
    label: "CTA 작성",
    prompt:
      "이 영상에 맞는 구독/좋아요 유도 멘트와 다음 영상 예고 멘트를 작성해줘.",
  },
] as const;

export interface ChatPanelProps {
  scriptId: string;
  scriptContent: string;
  onInsertToEditor: (text: string) => void;
  isRightCollapsed: boolean;
  onToggleCollapsed: () => void;
  /** 플로팅 액션 "AI 질문하기" 등에서 전달하는 즉시 전송할 메시지 */
  pendingPrompt?: string | null;
  onClearPendingPrompt?: () => void;
}

export function ChatPanel({
  scriptId,
  scriptContent,
  onInsertToEditor,
  isRightCollapsed,
  onToggleCollapsed,
  pendingPrompt,
  onClearPendingPrompt,
}: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessageRow[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [selectedModel, setSelectedModel] = useState<string>(MODEL_CONFIG[0].id);
  const [loading, setLoading] = useState(true);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const loadMessages = useCallback(async () => {
    if (!scriptId) return;
    const data = await loadChatMessages(scriptId);
    setMessages(data);
    setLoading(false);
  }, [scriptId]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    if (pendingPrompt?.trim() && !sending) {
      sendMessage(pendingPrompt);
      onClearPendingPrompt?.();
    }
  }, [pendingPrompt]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  const getApiKeyForModel = useCallback((modelId: string) => {
    const config = MODEL_CONFIG.find((m) => m.id === modelId);
    if (!config) return null;
    return getApiKey(config.provider);
  }, []);

  const isModelAvailable = useCallback((modelId: string) => !!getApiKeyForModel(modelId), [getApiKeyForModel]);

  const sendMessage = useCallback(
    async (userContent: string) => {
      const trimmed = userContent.trim();
      if (!trimmed || sending) return;

      const apiKey = getApiKeyForModel(selectedModel);
      if (!apiKey) {
        return;
      }

      const userMsg: ChatMessageRow = {
        id: crypto.randomUUID(),
        script_id: scriptId,
        role: "user",
        content: trimmed,
        model: selectedModel,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setSending(true);
      setStreamingContent("");

      try {
        await insertChatMessage(scriptId, "user", trimmed, selectedModel);

        const historyWithUser = [...messages, userMsg];
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-openai-api-key": getApiKey("openai") || "",
            "x-anthropic-api-key": getApiKey("anthropic") || "",
            "x-google-api-key": getApiKey("google") || "",
            "x-xai-api-key": getApiKey("xai") || "",
            "x-perplexity-api-key": getApiKey("perplexity") || "",
          },
          body: JSON.stringify({
            messages: historyWithUser.map((m) => ({
              role: m.role,
              content: m.content,
            })),
            model: selectedModel,
            scriptContent: scriptContent,
          }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || "API 오류");
        }

        const reader = res.body?.getReader();
        const decoder = new TextDecoder();
        let fullContent = "";

        if (reader) {
          let buf = "";
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buf += decoder.decode(value, { stream: true });
            const lines = buf.split("\n");
            buf = lines.pop() ?? "";
            for (const line of lines) {
              if (line.startsWith("data: ")) {
                const raw = line.slice(6).trim();
                if (!raw || raw === "[DONE]") continue;
                try {
                  const json = JSON.parse(raw);
                  if (json.error) throw new Error(json.error);
                  const text = json.chunk || json.content || json.delta?.content || "";
                  if (text) {
                    fullContent += text;
                    setStreamingContent(fullContent);
                  }
                } catch (e) {
                  if (e instanceof Error && e.message !== "JSON") { /* error from API */ }
                }
              }
            }
          }
        } else {
          const data = await res.json();
          fullContent = data.content || "";
          setStreamingContent(fullContent);
        }

        const finalContent = fullContent || streamingContent;
        const assistantMsg: ChatMessageRow = {
          id: crypto.randomUUID(),
          script_id: scriptId,
          role: "assistant",
          content: finalContent,
          model: selectedModel,
          created_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, assistantMsg]);
        await insertChatMessage(scriptId, "assistant", finalContent, selectedModel);
      } catch (err) {
        const errMsg: ChatMessageRow = {
          id: crypto.randomUUID(),
          script_id: scriptId,
          role: "assistant",
          content: err instanceof Error ? err.message : "오류가 발생했습니다.",
          model: selectedModel,
          created_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, errMsg]);
      } finally {
        setSending(false);
        setStreamingContent("");
      }
    },
    [
      scriptId,
      selectedModel,
      sending,
      messages,
      scriptContent,
      streamingContent,
    ]
  );

  const handleQuickAction = useCallback(
    (prompt: string) => {
      sendMessage(prompt);
    },
    [sendMessage]
  );

  const handleCopy = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
  }, []);

  const hasAnyKey = MODEL_CONFIG.some((m) => getApiKey(m.provider));

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto p-3 space-y-3" ref={scrollContainerRef}>
        {loading && (
          <p className="text-xs text-zinc-500">채팅 기록 로딩 중...</p>
        )}
        {!loading && messages.length === 0 && !sending && (
          <p className="text-xs text-zinc-500">
            {hasAnyKey
              ? "메시지를 입력하거나 빠른 액션을 사용해보세요."
              : "설정에서 API 키를 입력해주세요."}
          </p>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={`rounded-lg p-3 text-sm ${
              m.role === "user"
                ? "bg-indigo-500/20 text-indigo-200 ml-4"
                : "bg-zinc-800/80 text-zinc-200 mr-4"
            }`}
          >
            <div className="whitespace-pre-wrap">{m.content}</div>
            {m.role === "assistant" && (
              <div className="flex gap-1.5 mt-2">
                <button
                  onClick={() => onInsertToEditor(m.content)}
                  className="p-1.5 text-xs bg-zinc-700 hover:bg-zinc-600 rounded text-zinc-300 flex items-center gap-1"
                >
                  <FileInput className="w-3 h-3" />
                  에디터에 삽입
                </button>
                <button
                  onClick={() => handleCopy(m.content)}
                  className="p-1.5 text-xs bg-zinc-700 hover:bg-zinc-600 rounded text-zinc-300 flex items-center gap-1"
                >
                  <Copy className="w-3 h-3" />
                  복사
                </button>
              </div>
            )}
          </div>
        ))}
        {sending && streamingContent && (
          <div className="rounded-lg p-3 text-sm bg-zinc-800/80 text-zinc-200 mr-4">
            <div className="whitespace-pre-wrap">{streamingContent}</div>
            <span className="animate-pulse">▋</span>
          </div>
        )}
        {sending && !streamingContent && (
          <div className="flex items-center gap-2 text-zinc-500 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            답변 생성 중...
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      <div className="p-3 border-t border-zinc-800 space-y-2">
        <div className="flex flex-wrap gap-1.5">
          {QUICK_ACTIONS.map((a) => (
            <button
              key={a.id}
              onClick={() => handleQuickAction(a.prompt)}
              disabled={sending || !hasAnyKey}
              className="px-2 py-1 text-xs bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded text-zinc-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {a.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2 items-center">
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="flex-1 min-w-0 px-2 py-1.5 text-xs bg-zinc-800 border border-zinc-700 rounded text-zinc-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          >
            {MODEL_CONFIG.map((m) => (
              <option
                key={m.id}
                value={m.id}
                disabled={!isModelAvailable(m.id)}
              >
                {isModelAvailable(m.id) ? m.label : `${m.label} (API 키 없음)`}
              </option>
            ))}
          </select>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage(input);
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="메시지를 입력하세요..."
            disabled={sending || !hasAnyKey}
            className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-200 placeholder-zinc-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || sending || !hasAnyKey}
            className="p-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-700 disabled:text-zinc-500 rounded-lg transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
