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

    const { topic, duration, outline, referenceMaterials, baseDraft, refine } =
      await req.json();

    const openai = new OpenAI({ apiKey });

    const systemPrompt = `당신은 유튜브 채널 "박본질"의 대본 작가입니다.
주제와 목차가 주어지면 5가지 스타일의 도입부를 생성합니다.

## 도입부 규칙
- 절대 "안녕하세요"로 시작 금지
- 첫 문장에서 통념 부수기 or 강렬한 상황 제시
- 500~800자 (1분30초~2분30초 분량)
- 끝에 본론 연결 브릿지 문장 필수
- 각 도입부는 충분히 길고 구체적으로 써라. 짧게 요약하지 말고, 시청자가 빠져들 수 있도록 상세하게 전개하라.

## 말투
- 반말 기반 친근한 존댓말 ("~거든요" "~라는 거예요" "~인 거죠")
- 격식체 절대 금지
- "장담하는데" "자 잘 들으세요" 등 시그니처 표현 사용

## 5가지 스타일
1. 충격형: 통념을 정면으로 부수는 강렬한 첫 문장
2. 스토리형: 일상적 에피소드로 시작
3. 데이터형: 숫자/통계로 시작
4. 질문형: 시청자에게 직접 질문
5. 비유형: 강렬한 비유 하나로 시작

5개 도입부는 서로 겹치는 표현이 없어야 한다.
도입부에서 결론을 미리 말하지 말고 궁금증을 유발하라.

반드시 아래 JSON 형식으로만 응답해주세요:
{
  "drafts": [
    { "style": "충격형", "content": "도입부 내용" },
    { "style": "스토리형", "content": "도입부 내용" },
    { "style": "데이터형", "content": "도입부 내용" },
    { "style": "질문형", "content": "도입부 내용" },
    { "style": "비유형", "content": "도입부 내용" }
  ]
}`;

    const refBlock = referenceMaterials
      ? `## 참고 자료\n${referenceMaterials}\n\n`
      : "";

    const baseInfo = `주제: ${topic}
영상 분량: ${duration}분

전체 목차:
${outline.map((item: string, i: number) => `${i + 1}. ${item}`).join("\n")}`;

    const isRefine = refine && baseDraft;

    let systemContent: string;
    let userMessage: string;

    if (isRefine) {
      systemContent = `아래 도입부를 더 자연스럽고 매끄럽게 다듬어줘. 박본질 스타일을 유지하면서 내용은 그대로 가되, 표현만 더 좋게 만들어서 1개만 돌려줘.

반드시 아래 JSON 형식으로만 응답해주세요: { "content": "다듬어진 도입부 내용" }`;
      userMessage = baseDraft;
    } else {
      systemContent = systemPrompt;
      userMessage = baseDraft
        ? `${refBlock}${baseInfo}

아래 도입부를 기반으로 더 발전시켜서 5개 버전을 다시 만들어줘. 각 버전은 서로 다른 스타일(충격형/스토리형/데이터형/질문형/비유형)로 작성하고, 5개는 서로 겹치는 표현이 없어야 한다.

[기존 도입부]
${baseDraft}`
        : `${refBlock}${baseInfo}`;
    }

    const response = await openai.chat.completions.create({
      model: "gpt-5.3",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemContent },
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
