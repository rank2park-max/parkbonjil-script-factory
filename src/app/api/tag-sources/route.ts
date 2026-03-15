import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export async function POST(req: NextRequest) {
  try {
    const apiKey = req.headers.get("x-anthropic-api-key");
    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "Anthropic API 키가 설정되지 않았습니다. 설정 페이지에서 입력해주세요.",
        },
        { status: 400 }
      );
    }

    const { script } = await req.json();
    if (!script || typeof script !== "string") {
      return NextResponse.json(
        { error: "대본이 필요합니다." },
        { status: 400 }
      );
    }

    const anthropic = new Anthropic({ apiKey });

    const systemPrompt = `## ⛔ 최우선 규칙 (절대 위반 금지)
절대로 대본 원문을 수정하지 마라. 단 한 글자도 바꾸지 마라. 원문을 그대로 유지하고, 단락 사이에 소스 태그만 삽입하라. 원문의 문장을 요약하거나 다시 쓰는 것은 금지다. 원문 텍스트가 100% 동일하게 유지되어야 한다.

당신은 유튜브 영상 편집자의 어시스턴트입니다.
완성된 유튜브 대본을 받아서, 단락별로 필요한 영상 소스를 태깅하는 작업을 합니다.

## 태깅 규칙

### 형식
각 단락 뒤에 괄호로 소스를 지정합니다:
(이미지 or 동영상 / 실제사진 or 인포그래픽 or 타이포그래픽 or 일러스트 / 구체적인 장면 설명)

### 소스 유형 선택 기준
- 이미지: 정적인 장면, 개념 설명, 감정 표현
- 동영상: 움직임이 필요한 장면, 분위기 전환, 강조하고 싶은 순간

### 스타일 선택 기준
- 실제사진: 현실적인 장면, 뉴스, 도시 풍경, 실제 상황 묘사
- 인포그래픽: 데이터, 수치, 비교, 통계를 시각적으로 표현할 때
- 타이포그래픽: 핵심 문구를 강조할 때, 임팩트 있는 한 줄
- 일러스트: 비유적 표현, 감정, 추상적 개념을 시각화할 때

### 단락 나누기 기준
- 3~5초 분량으로 하나의 소스가 들어간다고 생각. 최대한 짧게 나눠라. 1~2문장이 하나의 단락이 되는 게 이상적이다. 긴 문단을 하나의 소스로 처리하지 마라.
- 한 줄이 하나의 단락이 될 수도 있고, 여러 줄이 하나의 단락이 될 수도 있음
- 문맥을 판단해서 "여기까지는 하나의 소스로 설명 가능하다"고 생각되는 단위로 나눠라
- 새로운 개념이나 장면 전환이 있으면 새 단락으로 나눠라
- 웬만하면 2줄 이상이 하나의 태그에 묶이지 않도록 해라. 짧게짧게 나눠서 영상이 지루하지 않게 만들어야 한다.

### 장면 설명 규칙
- 구체적으로 써라. "경제 관련 이미지" 같은 추상적 설명 금지
- 실제로 검색하거나 만들 수 있을 정도로 구체적이어야 함
- 감정과 분위기도 포함 (허름한, 활기찬, 불안한, 희망적인 등)
- 한국 상황에 맞는 장면으로 (서울 도심, 한국 직장인 등)

### 예시

지금 대한민국은
정말 위험한 상황입니다.
(동영상 / 실제사진 / 허름하고 때묻은 대한민국 국기가 디스토피아에서 펄럭거리고 있음)

대한민국 망해간다는 소리는 다들 한번씩은 들어보셨겠지만
(이미지 / 실제사진 / 디스토피아가 된 대한민국의 일상 배경)

이 얘기가 와닿는 분들은 거의 없으실 겁니다
(이미지 / 일러스트 / 갸우뚱하는 사람 일러스트)

겉보기에는
아무 일도 없거든요.
건물이 무너진 것도 아니고,
(이미지 / 실제사진 / 무너지고있는 건물 사진)

폭탄이 터진 것도 아니고,
(이미지 / 실제사진 / 도심에 폭탄이 터지고 있는 사진)

오늘도 지하철은 다니고
사람들은 출근합니다.
(이미지 / 실제사진 / 일상적인 사람들의 지하철 정류장에서 지하철을 기다리고 있는 모습)

그래서 대부분 이렇게 생각합니다.
"설마 진짜 망하겠어?"
"아직 멀었지."
(이미지 / 일러스트 / 안일하게 웃고있는 사람들)

## 주의사항
- 대본 내용은 절대 수정하지 마라. 원본 그대로 유지
- 소스 태그만 단락 사이에 삽입하라
- 모든 단락에 빠짐없이 태그를 달아라
- 연속으로 같은 스타일(예: 실제사진만 10개)이 나오지 않도록 적절히 섞어라`;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 8192,
      system: systemPrompt,
      messages: [{ role: "user", content: script }],
    });

    const textBlock = response.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json(
        { error: "Claude 응답이 비어있습니다." },
        { status: 500 }
      );
    }

    return NextResponse.json({ taggedScript: textBlock.text });
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "알 수 없는 오류가 발생했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
