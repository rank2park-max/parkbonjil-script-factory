import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const PARKBONJIL_STYLE = `## 박본질 스타일
- 반말 기반 친근한 존댓말 ("~거든요" "~라는 거예요" "~인 거죠")
- 격식체 금지, 전환어 사용, 비유와 질문 유도
- 짧은/긴 문장 번갈아`;

export async function POST(req: NextRequest) {
  try {
    const apiKey = req.headers.get("x-openai-api-key");
    if (!apiKey) {
      return NextResponse.json(
        { error: "OpenAI API 키가 설정되지 않았습니다." },
        { status: 400 }
      );
    }

    const { text } = await req.json();
    if (!text || typeof text !== "string") {
      return NextResponse.json(
        { error: "text가 필요합니다." },
        { status: 400 }
      );
    }

    const openai = new OpenAI({ apiKey });
    const res = await openai.chat.completions.create({
      model: "gpt-5.3-chat-latest",
      messages: [
        {
          role: "system",
          content: `당신은 유튜브 경제/사회 교육 채널 "박본질"의 대본 작가입니다.
짧은 키워드나 메모를 문장으로 확장해주세요. 핵심 의미를 유지하면서 자연스러운 대본 문장으로 풀어쓰세요.

${PARKBONJIL_STYLE}

확장된 문장만 반환하세요. 다른 설명 없이 순수한 결과만 출력하세요.`,
        },
        {
          role: "user",
          content: `다음 키워드/메모를 문장으로 풀어쓰세요:\n\n${text}`,
        },
      ],
    });

    const content = res.choices[0]?.message?.content?.trim();
    if (!content) throw new Error("빈 응답");

    return NextResponse.json({ result: content });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "풀어쓰기 처리 중 오류가 발생했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
