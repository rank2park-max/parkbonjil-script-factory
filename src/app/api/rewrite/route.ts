import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export async function POST(req: NextRequest) {
  try {
    const apiKey = req.headers.get("x-anthropic-api-key");
    if (!apiKey) {
      return NextResponse.json(
        { error: "Anthropic API 키가 설정되지 않았습니다. 설정 페이지에서 입력해주세요." },
        { status: 400 }
      );
    }

    const { topic, duration, outline, currentOutline, selectedDraft, previousDrafts } =
      await req.json();

    const anthropic = new Anthropic({ apiKey });

    const systemPrompt = `당신은 유튜브 채널 "박본질"의 최종 대본 리라이터입니다.
GPT가 작성한 초안을 받아서 박본질 스타일로 완전히 리라이팅합니다.

## 절대 규칙

1. 비유가 생명: 모든 추상적 개념에 비유 필수. 비유만으로 논리 이해 가능해야 함.
2. 통념 부수기: 각 섹션 시작에서 "보통 이렇게 생각하죠 → 근데 틀렸어요" 패턴.
3. 질문 던지기: 2~3문단마다 시청자에게 질문. "느낌이 오시나요?" "생각해 보세요"
4. 전환어: 모든 문단 전환에 "근데 문제는" "그러니까" "자 그럼" 사용.
5. 문장 리듬: 긴 문장 → 짧은 문장 번갈아. 강조 시 짧게 끊기.
6. 말투: "~거든요" "~라는 거예요" "~인 거죠". 격식체 절대 금지.
7. 선택지 제시: 복잡한 이슈는 번호 매겨서 선택지로 정리.
8. 확실한 마무리: 애매하게 끝내지 말고 방향 제시. "그러니까 ~하시라는 거예요"

## 리라이팅 체크리스트 (출력 전 자체 검증)
- 모든 추상적 개념에 비유가 있는가?
- 비유가 일상적이고 정확한가?
- 통념 부수기가 포함되어 있는가?
- 2~3문단마다 질문이 있는가?
- 모든 문단 전환에 전환어가 있는가?
- 짧은/긴 문장이 번갈아 나오는가?
- 격식체가 하나도 없는가?
- 확실한 방향이 제시되어 있는가?
- 소리내어 읽었을 때 자연스러운가?

리라이팅 결과와 함께 변경 사항 요약을 출력하라.`;

    const userMessage = `주제: ${topic}
영상 분량: ${duration}분

전체 목차:
${outline.map((item: string, i: number) => `${i + 1}. ${item}`).join("\n")}

현재 목차: ${currentOutline}

리라이팅할 초안:
${selectedDraft}

${previousDrafts ? `이전까지 확정된 대본:\n${previousDrafts}` : ""}`;

    const response = await anthropic.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    });

    const textBlock = response.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json(
        { error: "Claude 응답이 비어있습니다." },
        { status: 500 }
      );
    }

    return NextResponse.json({ rewrittenDraft: textBlock.text });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
