import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";

const SYSTEM_PROMPT = `당신은 유튜브 채널 "박본질"의 영상 기획자입니다.
주제가 주어지면 최적의 영상 목차를 생성합니다.

## 좋은 목차의 조건
1. "본질 추출" 구조: 현상 → 통념 부수기 → 원론 접근 → 본질 도출 → 방향 제시
2. 각 목차가 "한 문장 질문"으로 변환 가능해야 함
3. 앞 목차의 결론이 다음 목차의 전제가 되는 연쇄 구조
4. 시청자 궁금증 순서: "이게 뭔데?" → "왜?" → "진짜 원인?" → "어떡해?"

## 출력 형식 (반드시 JSON으로)
{
  "titles": ["추천 제목1", "추천 제목2", "추천 제목3"],
  "outline": [
    {"title": "목차 제목", "question": "이 섹션이 답하는 질문", "summary": "2줄 요약", "duration": "3분"},
    ...
  ]
}

## 영상 제목 패턴
- "~의 본질" / "장담하는데~" / "이 영상 하나로 끝냅니다" / "제발~좀 하세요"`;

async function callGPT(apiKey: string, userMessage: string) {
  const openai = new OpenAI({ apiKey });
  const response = await openai.chat.completions.create({
    model: "gpt-5.3",
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userMessage },
    ],
    temperature: 0.7,
  });
  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("빈 응답");
  return JSON.parse(content);
}

async function callClaude(apiKey: string, userMessage: string) {
  const anthropic = new Anthropic({ apiKey });
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    system:
      SYSTEM_PROMPT +
      "\n\n반드시 JSON 형식으로만 응답하세요. 코드블록이나 다른 텍스트 없이 순수 JSON만 출력하세요.",
    messages: [{ role: "user", content: userMessage }],
  });
  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") throw new Error("빈 응답");
  const cleaned = textBlock.text
    .replace(/```json?\n?/g, "")
    .replace(/```/g, "")
    .trim();
  return JSON.parse(cleaned);
}

async function callGemini(apiKey: string, userMessage: string) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ parts: [{ text: userMessage }] }],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.7,
      },
    }),
  });
  const data = await response.json();
  if (data.error) throw new Error(data.error.message);
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("빈 응답");
  return JSON.parse(text);
}

async function callGrok(apiKey: string, userMessage: string) {
  const xai = new OpenAI({ apiKey, baseURL: "https://api.x.ai/v1" });
  const response = await xai.chat.completions.create({
    model: "grok-3",
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userMessage },
    ],
    temperature: 0.7,
  });
  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("빈 응답");
  return JSON.parse(content);
}

const AI_CONFIGS = [
  { name: "GPT", headerKey: "x-openai-api-key", caller: callGPT },
  { name: "Claude", headerKey: "x-anthropic-api-key", caller: callClaude },
  { name: "Gemini", headerKey: "x-google-api-key", caller: callGemini },
  { name: "Grok", headerKey: "x-xai-api-key", caller: callGrok },
] as const;

export async function POST(req: NextRequest) {
  try {
    const { topic, duration } = await req.json();

    const userMessage = `주제: ${topic}\n영상 분량: ${duration}분`;

    const promises = AI_CONFIGS.map(({ name, headerKey, caller }) => {
      const apiKey = req.headers.get(headerKey);
      if (!apiKey) {
        return Promise.resolve({
          ai: name,
          status: "error" as const,
          error: "API 키가 설정되지 않았습니다",
        });
      }
      return caller(apiKey, userMessage)
        .then((data) => ({
          ai: name,
          status: "success" as const,
          data,
        }))
        .catch((err: unknown) => ({
          ai: name,
          status: "error" as const,
          error: err instanceof Error ? err.message : "알 수 없는 오류",
        }));
    });

    const results = await Promise.all(promises);

    return NextResponse.json({ results });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
