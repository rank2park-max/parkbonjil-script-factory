import { NextRequest, NextResponse } from "next/server";

/** URL 페이지에서 <title> 태그 추출 */
export async function GET(req: NextRequest) {
  try {
    const url = req.nextUrl.searchParams.get("url");
    if (!url) {
      return NextResponse.json({ error: "url 파라미터가 필요합니다." }, { status: 400 });
    }

    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; ScriptFactory/1.0)",
      },
      signal: AbortSignal.timeout(5000),
    });

    const html = await res.text();
    const match = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    const title = match?.[1]?.trim() || url;

    return NextResponse.json({ title });
  } catch {
    return NextResponse.json({ title: null }, { status: 200 });
  }
}
