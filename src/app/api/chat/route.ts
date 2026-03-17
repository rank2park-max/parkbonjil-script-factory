import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";

const SYSTEM_PROMPT_TEMPLATE = `너는 유튜브 대본 작성을 도와주는 AI 어시스턴트야. 아래는 현재 작성 중인 대본이야:

{script}

사용자의 질문에 대본 맥락을 고려해서 답변해줘.`;

const MODELS = {
  "gpt-5.3-chat-latest": "openai",
  "claude-sonnet-4-6-20250415": "anthropic",
  "gemini-3.1-pro-preview": "google",
  "grok-4.20-beta": "xai",
  sonar: "perplexity",
} as const;

type ModelId = keyof typeof MODELS;

function getSystemPrompt(scriptContent: string): string {
  const script = (scriptContent || "").trim() || "(아직 대본이 없습니다.)";
  return SYSTEM_PROMPT_TEMPLATE.replace("{script}", script);
}

function createStreamReader(
  stream: AsyncIterable<{ content?: string }>,
  encoder: TextEncoder
): ReadableStream<Uint8Array> {
  return new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          const text = chunk?.content ?? "";
          if (text) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ chunk: text })}\n\n`)
            );
          }
        }
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`)
        );
      } catch (e) {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ error: String(e) })}\n\n`
          )
        );
      } finally {
        controller.close();
      }
    },
  });
}

async function* streamOpenAI(
  openai: OpenAI,
  model: string,
  systemPrompt: string,
  messages: { role: string; content: string }[]
): AsyncGenerator<{ content: string }> {
  const stream = await openai.chat.completions.create({
    model,
    stream: true,
    messages: [
      { role: "system", content: systemPrompt },
      ...messages.map((m) => ({
        role: m.role as "user" | "assistant" | "system",
        content: m.content,
      })),
    ],
  });

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content;
    if (delta) yield { content: delta };
  }
}

async function* streamAnthropic(
  anthropic: Anthropic,
  model: string,
  systemPrompt: string,
  messages: { role: string; content: string }[]
): AsyncGenerator<{ content: string }> {
  const stream = await anthropic.messages.stream({
    model,
    max_tokens: 4096,
    system: systemPrompt,
    messages: messages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
  });

  for await (const event of stream) {
    if (
      event.type === "content_block_delta" &&
      event.delta?.type === "text_delta"
    ) {
      const text = event.delta.text;
      if (text) yield { content: text };
    }
  }
}

async function* streamGemini(
  apiKey: string,
  model: string,
  systemPrompt: string,
  messages: { role: string; content: string }[]
): AsyncGenerator<{ content: string }> {
  const lastUser = messages.filter((m) => m.role === "user").pop();
  const userContent = lastUser?.content ?? "";

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?key=${apiKey}&alt=sse`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{ parts: [{ text: userContent }] }],
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Gemini API 오류 (${res.status})`);
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error("스트림을 읽을 수 없습니다.");

  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split("\n\n");
      buffer = events.pop() ?? "";
      for (const event of events) {
        const line = event.replace(/^data:\s*/, "").trim();
        if (!line || line === "[DONE]") continue;
        try {
          const parsed = JSON.parse(line);
          const text =
            parsed?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
          if (text) yield { content: text };
        } catch {
          /* skip */
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

async function* streamXAI(
  apiKey: string,
  model: string,
  systemPrompt: string,
  messages: { role: string; content: string }[]
): AsyncGenerator<{ content: string }> {
  const openai = new OpenAI({
    apiKey,
    baseURL: "https://api.x.ai/v1",
  });
  yield* streamOpenAI(openai, model, systemPrompt, messages);
}

async function* streamPerplexity(
  apiKey: string,
  model: string,
  systemPrompt: string,
  messages: { role: string; content: string }[]
): AsyncGenerator<{ content: string }> {
  const lastUser = messages.filter((m) => m.role === "user").pop();
  const userContent = lastUser?.content ?? "";

  const res = await fetch("https://api.perplexity.ai/v1/sonar", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "sonar",
      max_tokens: 4096,
      stream: true,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Perplexity API 오류 (${res.status})`);
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error("스트림을 읽을 수 없습니다.");

  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const json = line.slice(6);
          if (json === "[DONE]") continue;
          try {
            const parsed = JSON.parse(json);
            const text =
              parsed?.choices?.[0]?.delta?.content ??
              parsed?.choices?.[0]?.message?.content ??
              "";
            if (text) yield { content: text };
          } catch {
            /* skip */
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const messages = Array.isArray(body.messages) ? body.messages : [];
    const model = typeof body.model === "string" ? body.model : "";
    const scriptContent =
      typeof body.scriptContent === "string" ? body.scriptContent : "";

    if (messages.length === 0) {
      return NextResponse.json(
        { error: "messages 배열이 필요합니다." },
        { status: 400 }
      );
    }

    const provider = MODELS[model as ModelId];
    if (!provider) {
      return NextResponse.json(
        { error: `지원하지 않는 모델입니다: ${model}` },
        { status: 400 }
      );
    }

    const apiKeys = {
      openai: req.headers.get("x-openai-api-key") || "",
      anthropic: req.headers.get("x-anthropic-api-key") || "",
      google: req.headers.get("x-google-api-key") || "",
      xai: req.headers.get("x-xai-api-key") || "",
      perplexity: req.headers.get("x-perplexity-api-key") || "",
    };

    const key = apiKeys[provider];
    if (!key) {
      return NextResponse.json(
        {
          error: `${provider} API 키가 설정되지 않았습니다. 설정 페이지에서 입력해주세요.`,
        },
        { status: 401 }
      );
    }

    const systemPrompt = getSystemPrompt(scriptContent);
    const encoder = new TextEncoder();
    let stream: AsyncGenerator<{ content: string }>;

    switch (provider) {
      case "openai": {
        const openai = new OpenAI({ apiKey: key });
        stream = streamOpenAI(
          openai,
          model,
          systemPrompt,
          messages
        );
        break;
      }
      case "anthropic": {
        const anthropic = new Anthropic({ apiKey: key });
        stream = streamAnthropic(
          anthropic,
          model,
          systemPrompt,
          messages
        );
        break;
      }
      case "google":
        stream = streamGemini(key, model, systemPrompt, messages);
        break;
      case "xai":
        stream = streamXAI(key, model, systemPrompt, messages);
        break;
      case "perplexity":
        stream = streamPerplexity(key, model, systemPrompt, messages);
        break;
      default:
        return NextResponse.json(
          { error: "지원하지 않는 모델입니다." },
          { status: 400 }
        );
    }

    const readable = createStreamReader(stream, encoder);
    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "채팅 처리 중 오류가 발생했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
