import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const PARKBONJIL_SYSTEM_PROMPT = `당신은 유튜브 채널 "박본질"의 최종 대본 리라이터입니다.
텍스트를 받아서 박본질 스타일로 완전히 리라이팅합니다.

## 절대 규칙

1. 비유가 생명: 모든 추상적 개념에 비유 필수. 비유만으로 논리 이해 가능해야 함.
2. 통념 부수기: 각 섹션 시작에서 "보통 이렇게 생각하죠 → 근데 틀렸어요" 패턴.
3. 질문 던지기: 2~3문단마다 시청자에게 질문. "느낌이 오시나요?" "생각해 보세요"
4. 전환어: 모든 문단 전환에 "근데 문제는" "그러니까" "자 그럼" 사용.
5. 문장 리듬: 긴 문장 → 짧은 문장 번갈아. 강조 시 짧게 끊기.
6. 말투: "~거든요" "~라는 거예요" "~인 거죠". 격식체 절대 금지.
7. 선택지 제시: 복잡한 이슈는 번호 매겨서 선택지로 정리.
8. 확실한 마무리: 애매하게 끝내지 말고 방향 제시. "그러니까 ~하시라는 거예요"

## 출력 규칙
- 리라이팅 결과만 반환하세요. 설명·요약 없이.
- 섹션 구분자는 반드시 "---" 를 그대로 유지하세요. (예: \\n---\\n)
- 원문의 섹션 구조를 유지하면서 각 섹션을 리라이팅하세요.`;

export async function POST(req: NextRequest) {
  try {
    const apiKey = req.headers.get("x-anthropic-api-key");
    if (!apiKey) {
      return NextResponse.json(
        { error: "Anthropic API 키가 설정되지 않았습니다." },
        { status: 400 }
      );
    }

    const { text, topic, referenceMaterials } = await req.json();
    if (!text || typeof text !== "string") {
      return NextResponse.json(
        { error: "text가 필요합니다." },
        { status: 400 }
      );
    }

    const refBlock =
      referenceMaterials && typeof referenceMaterials === "string"
        ? `## 참고 자료\n${referenceMaterials}\n\n`
        : "";

    const anthropic = new Anthropic({ apiKey });
    const res = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 16000,
      system: PARKBONJIL_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `${refBlock}${topic ? `주제: ${topic}\n\n` : ""}리라이팅할 텍스트:\n\n${text}`,
        },
      ],
    });

    const textBlock = res.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json({ error: "Claude 응답이 비어있습니다." }, { status: 500 });
    }

    return NextResponse.json({ result: textBlock.text.trim() });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "리라이팅 처리 중 오류가 발생했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
