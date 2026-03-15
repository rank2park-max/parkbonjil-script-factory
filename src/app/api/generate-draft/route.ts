import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export async function POST(req: NextRequest) {
  try {
    const apiKey = req.headers.get("x-openai-api-key");
    if (!apiKey) {
      return NextResponse.json(
        { error: "OpenAI API 키가 설정되지 않았습니다. 설정 페이지에서 입력해주세요." },
        { status: 400 }
      );
    }

    const { topic, duration, outline, currentOutline, previousDrafts, referenceMaterials, baseDraft, refine } =
      await req.json();

    const openai = new OpenAI({ apiKey });

    const systemPrompt = `당신은 유튜브 경제/사회 교육 채널 "박본질"의 대본 작가입니다.
목차 하나가 주어지면, 그 목차에 해당하는 대본 초안 3개를 각각 다른 접근 방식으로 작성합니다.

## 박본질 스타일 핵심 규칙

### 말투
- 반말 기반의 친근한 존댓말 ("~거든요" "~라는 거예요" "~인 거죠")
- 격식체 절대 금지 ("~하십시오" "~입니다만" 사용 금지)
- 영어 전문용어 금지. 반드시 한국어로 바꿔서 쉽게 설명
- "그러니까" "근데 문제는" "근데 여기서" 같은 전환어로 논리를 연결

### 설명 방식: "본질 추출법"
1단계) 통념 제시 — 사람들이 보통 이렇게 생각한다
2단계) 통념 부수기 — 근데 그건 이래서 틀렸다
3단계) 원론적 접근 — 가장 근본적인 원리부터 다시 생각해보자
4단계) 비유로 설명 — 일상적 비유로 치환해서 직관적으로 이해시킨다
5단계) 현실 적용 — 비유에서 다시 현실로 돌아와서 결론을 낸다

### 비유 작성 규칙
- 시청자가 일상에서 경험해본 것 (게임, 음식, 도구, 학교, 운동 등)
- 비유 하나를 잡으면 그 섹션 내에서 일관되게 확장
- 비유만으로도 논리를 이해할 수 있을 정도로 정확해야 함

### 시청자 참여 유도
- 2~3문단마다 질문을 던져서 시청자가 스스로 생각하게 유도
- "느낌이 오시나요?" "생각해 보세요" "왜 그런 걸까요?"

### 문장 리듬
- 짧은 문장과 긴 문장을 번갈아 사용
- 강조 포인트에서는 의도적으로 짧게 끊기

### 시그니처 표현
- "장담하는데" "자 잘 들으세요" "아셔야 돼요"
- "근데 문제는" "그러니까" "자 그럼"
- "~라는 거예요" "~인 거죠" "~거든요"

## 임무
현재 목차의 대본 초안 3개를 생성하라.
1. 비유 중심: 강력한 비유 하나로 전체 논리를 전개
2. 논리 전개 중심: 통념 부수기 → 원론 → 데이터 → 결론
3. 질문-답변 중심: 시청자에게 질문을 연속으로 던지며 답을 좁혀감

각 초안 앞에 핵심 비유/논리/질문을 한 줄로 요약하고,
끝에 다음 목차로 넘어가는 연결 문장을 넣어라.

영상 분량은 총 ${duration}분이며, 각 목차의 분량을 적절히 배분해주세요.

반드시 아래 JSON 형식으로만 응답해주세요:
{
  "drafts": [
    { "style": "비유 중심", "content": "대본 내용" },
    { "style": "논리 전개", "content": "대본 내용" },
    { "style": "질문-답변", "content": "대본 내용" }
  ]
}`;

    const refBlock = referenceMaterials
      ? `## 참고 자료\n${referenceMaterials}\n\n`
      : "";

    const baseInfo = `${refBlock}주제: ${topic}
영상 분량: ${duration}분

전체 목차:
${outline.map((item: string, i: number) => `${i + 1}. ${item}`).join("\n")}

현재 작성할 목차: ${currentOutline}

${previousDrafts ? `이전까지 확정된 대본:\n${previousDrafts}` : "첫 번째 목차입니다."}`;

    const isRefine = refine && baseDraft;
    let userMessage: string;

    if (isRefine) {
      userMessage = `${baseInfo}

아래 초안을 더 자연스럽고 매끄럽게 다듬어줘. 박본질 스타일을 유지하면서 내용은 그대로 가되, 표현만 더 좋게 만들어서 1개만 돌려줘.

[초안]
${baseDraft}`;
    } else {
      userMessage = baseDraft
        ? `${baseInfo}

아래 초안을 기반으로 3가지 스타일(비유 중심/논리 전개/질문-답변)로 각각 발전시켜서 새 초안 3개를 만들어줘.

[기존 초안]
${baseDraft}`
        : baseInfo;
    }

    const refineSystemAddon = isRefine
      ? `\n\n지금은 다듬기 모드입니다. 사용자 초안 1개를 받아서 표현만 개선한 1개를 돌려줘.\n반드시 아래 JSON 형식으로만 응답해주세요:\n{ "content": "다듬어진 초안 내용" }`
      : "";

    const response = await openai.chat.completions.create({
      model: "gpt-5.4",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt + refineSystemAddon },
        { role: "user", content: userMessage },
      ],
      temperature: 0.8,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json(
        { error: "GPT 응답이 비어있습니다." },
        { status: 500 }
      );
    }

    const parsed = JSON.parse(content);
    if (isRefine && parsed.content) {
      return NextResponse.json({ content: parsed.content });
    }
    return NextResponse.json(parsed);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
