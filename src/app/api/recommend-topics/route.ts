import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";

const SYSTEM_PROMPT = `당신은 유튜브 경제/사회 교육 채널 "박본질"의 기획자입니다.

## 채널 소개
박본질은 경제, 투자, 사회 현상을 "본질"이라는 프레임으로 해체해서 20~30대에게 쉽게 설명하는 채널입니다.

## 기존 인기 영상 주제 (참고)
- 고소득의 본질 (사람 모으기)
- 투자의 본질 (주식/코인/부동산 비교분석)
- 저출산의 본질
- 정치의 본질
- 의대정원 확대의 본질
- 세대갈등의 본질
- 인간관계의 본질
- 저축의 본질
- 한국 경제 위기

## 주제 선정 기준
- 20~30대가 돈, 투자, 취업, 부동산, 경제적 자유와 관련해서 궁금해하는 주제
- 사회적으로 논쟁이 있거나 통념을 부술 수 있는 경제/사회 주제
- "~의 본질" 형태로 제목을 만들 수 있는 주제
- 절대 마케팅, AI 기술, 메타버스 같은 IT/테크 주제는 제외
- 반드시 경제, 투자, 부동산, 사회 현상, 돈, 직업, 자본주의 관련 주제만

## 카테고리
1. 트렌드 주제 (5개): 최근 1~2주 내 화제가 된 경제/사회/부동산/투자 이슈
2. 설명형 주제 (5개): 많은 사람들이 잘못 알고 있거나 제대로 이해 못하는 경제/투자/사회 개념

## 출력 형식 (반드시 JSON)
{
  "trending": [
    {"title": "주제 제목", "reason": "왜 지금 이 주제가 좋은지 한 줄 설명"},
    ...
  ],
  "explainer": [
    {"title": "주제 제목", "reason": "왜 이 주제가 좋은지 한 줄 설명"},
    ...
  ]
}`;

const USER_MESSAGE =
  "오늘 기준으로 박본질 채널에 적합한 영상 주제 10개를 추천해주세요. 반드시 JSON 형식으로만 응답하세요.";

function parseJSON(raw: string) {
  const cleaned = raw
    .replace(/```json?\n?/g, "")
    .replace(/```/g, "")
    .trim();
  return JSON.parse(cleaned);
}

async function callGPT(apiKey: string) {
  const openai = new OpenAI({ apiKey });
  const res = await openai.chat.completions.create({
    model: "gpt-5.3",
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: USER_MESSAGE },
    ],
    temperature: 0.7,
  });
  const content = res.choices[0]?.message?.content;
  if (!content) throw new Error("빈 응답");
  return JSON.parse(content);
}

async function callClaude(apiKey: string) {
  const anthropic = new Anthropic({ apiKey });
  const res = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    system:
      SYSTEM_PROMPT +
      "\n\n반드시 JSON 형식으로만 응답하세요. 코드블록이나 다른 텍스트 없이 순수 JSON만 출력하세요.",
    messages: [{ role: "user", content: USER_MESSAGE }],
  });
  const textBlock = res.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") throw new Error("빈 응답");
  return parseJSON(textBlock.text);
}

async function callGemini(apiKey: string) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ parts: [{ text: USER_MESSAGE }] }],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.7,
      },
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("빈 응답");
  return JSON.parse(text);
}

async function callGrok(apiKey: string) {
  const xai = new OpenAI({ apiKey, baseURL: "https://api.x.ai/v1" });
  const res = await xai.chat.completions.create({
    model: "grok-3",
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: USER_MESSAGE },
    ],
    temperature: 0.7,
  });
  const content = res.choices[0]?.message?.content;
  if (!content) throw new Error("빈 응답");
  return JSON.parse(content);
}

async function callPerplexity(apiKey: string) {
  const res = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "sonar-pro",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: USER_MESSAGE },
      ],
      temperature: 0.7,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || "Perplexity API 오류");
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("빈 응답");
  return parseJSON(content);
}

const AI_CONFIGS = [
  { name: "GPT", headerKey: "x-openai-api-key", caller: callGPT },
  { name: "Claude", headerKey: "x-anthropic-api-key", caller: callClaude },
  { name: "Gemini", headerKey: "x-google-api-key", caller: callGemini },
  { name: "Grok", headerKey: "x-xai-api-key", caller: callGrok },
  { name: "Perplexity", headerKey: "x-perplexity-api-key", caller: callPerplexity },
] as const;

export async function POST(req: NextRequest) {
  try {
    const promises = AI_CONFIGS.map(({ name, headerKey, caller }) => {
      const apiKey = req.headers.get(headerKey);
      if (!apiKey) {
        return Promise.resolve({
          ai: name,
          status: "error" as const,
          error: "API 키가 설정되지 않았습니다",
        });
      }
      return caller(apiKey)
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
