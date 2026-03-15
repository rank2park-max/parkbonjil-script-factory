import { NextRequest, NextResponse } from "next/server";

const SYSTEM_PROMPT = `당신은 유튜브 경제/사회 교육 채널 "박본질"의 기획자입니다.
박본질은 복잡한 사회 현상을 "본질"이라는 프레임으로 해체해서 쉽게 설명하는 채널입니다.

## 임무
최신 트렌드와 채널 특성에 맞는 영상 주제 10개를 추천하세요.

## 카테고리
1. 트렌드 주제 (5개): 최근 1~2주 이내 화제가 된 경제/사회/정치 이슈 중 "본질"을 파헤치면 조회수가 나올 만한 주제
2. 설명형 주제 (5개): 많은 사람들이 궁금해하지만 제대로 이해하지 못하는 경제/사회 개념을 쉽게 설명하는 주제

## 주제 선정 기준
- 20~30대가 관심 가질 만한 주제
- "~의 본질" 형태로 제목을 만들 수 있는 주제
- 논쟁이 있거나 통념을 부술 수 있는 주제 우선
- 너무 전문적이지 않고 일반인이 접근 가능한 주제

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

export async function POST(req: NextRequest) {
  try {
    const apiKey = req.headers.get("x-perplexity-api-key");
    if (!apiKey) {
      return NextResponse.json(
        { error: "Perplexity API 키가 설정되지 않았습니다. 설정 페이지에서 입력해주세요." },
        { status: 400 }
      );
    }

    const response = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "sonar-pro",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content:
              "오늘 기준으로 박본질 채널에 적합한 영상 주제 10개를 추천해주세요. 반드시 JSON 형식으로만 응답하세요.",
          },
        ],
        temperature: 0.7,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || "Perplexity API 호출에 실패했습니다.");
    }

    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("Perplexity 응답이 비어있습니다.");
    }

    const cleaned = content
      .replace(/```json?\n?/g, "")
      .replace(/```/g, "")
      .trim();
    const parsed = JSON.parse(cleaned);

    return NextResponse.json(parsed);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
