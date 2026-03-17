import { NextRequest, NextResponse } from "next/server";

const SYSTEM_PROMPT =
  "한국어로 답변해줘. 유튜브 대본 리서치에 도움이 되는 정보를 정리해서 알려줘.";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const apiKey =
      req.headers.get("x-perplexity-api-key") ||
      (typeof body.apiKey === "string" ? body.apiKey : null);

    if (!apiKey) {
      return NextResponse.json(
        { error: "Perplexity API 키가 필요합니다." },
        { status: 401 }
      );
    }

    const query = typeof body.query === "string" ? body.query.trim() : "";

    if (!query) {
      return NextResponse.json(
        { error: "query가 필요합니다." },
        { status: 400 }
      );
    }

    const res = await fetch("https://api.perplexity.ai/v1/sonar", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "sonar",
        max_tokens: 4096,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: query },
        ],
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      const errMsg =
        data?.error?.message || data?.message || `API 오류 (${res.status})`;
      return NextResponse.json({ error: errMsg }, { status: res.status });
    }

    const content =
      data?.choices?.[0]?.message?.content ?? data?.choices?.[0]?.text ?? "";

    return NextResponse.json({
      content: content || "결과가 없습니다.",
      raw: data,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "리서치 요청 중 오류가 발생했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
