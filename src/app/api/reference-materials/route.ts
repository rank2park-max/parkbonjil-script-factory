import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseClient } from "@/lib/supabase";

export interface ReferenceMaterial {
  id: string;
  title: string;
  content: string;
  char_count: number;
  created_at: string;
}

function getSupabaseFromRequest(req: NextRequest | null) {
  const url =
    req?.headers.get("x-supabase-url") ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    null;
  const key =
    req?.headers.get("x-supabase-anon-key") ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    null;
  if (url && key) {
    return createClient(url, key, {
      global: {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          Accept: "application/json; charset=utf-8",
        },
      },
    });
  }
  return getSupabaseClient();
}

export async function GET(req: NextRequest) {
  const supabase = getSupabaseFromRequest(req);
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase가 설정되지 않았습니다. 설정에서 URL과 Anon Key를 저장했는지 확인하세요." },
      { status: 400 }
    );
  }

  try {
    const { data, error } = await supabase
      .from("reference_materials")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json(data || [], {
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "알 수 없는 오류";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const supabase = getSupabaseFromRequest(req);
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase가 설정되지 않았습니다. 설정 페이지에서 URL과 Anon Key를 저장하거나, .env.local에 환경변수를 설정하세요." },
      { status: 400 }
    );
  }

  try {
    const contentType = req.headers.get("content-type") || "";
    let title: string;
    let content: string;

    if (contentType.includes("application/json")) {
      const body = await req.json();
      title = (body.title || "").trim();
      content = (body.content || "").trim();
      if (!title || !content) {
        return NextResponse.json(
          { error: "제목과 내용이 필요합니다." },
          { status: 400 }
        );
      }
    } else if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      if (!file) {
        return NextResponse.json(
          { error: "파일이 없습니다." },
          { status: 400 }
        );
      }

      title = file.name;
      const ext = (file.name.split(".").pop() || "").toLowerCase();
      const buffer = Buffer.from(await file.arrayBuffer());

      if (ext === "txt" || ext === "md") {
        content = buffer.toString("utf-8");
      } else if (ext === "pdf") {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const pdfParse = require("pdf-parse") as (buf: Buffer) => Promise<{ text: string }>;
        const result = await pdfParse(buffer);
        content = result.text || "";
      } else if (ext === "docx") {
        const mammoth = await import("mammoth");
        const result = await mammoth.extractRawText({ buffer });
        content = result.value || "";
      } else {
        return NextResponse.json(
          { error: ".txt, .md, .pdf, .docx만 지원합니다." },
          { status: 400 }
        );
      }

      if (!content.trim()) {
        return NextResponse.json(
          { error: "파일에서 텍스트를 추출할 수 없습니다." },
          { status: 400 }
        );
      }
    } else {
      return NextResponse.json(
        { error: "application/json 또는 multipart/form-data를 사용하세요." },
        { status: 400 }
      );
    }

    const charCount = content.length;

    const { data, error } = await supabase
      .from("reference_materials")
      .insert({ title, content, char_count: charCount })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data, {
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "알 수 없는 오류";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const supabase = getSupabaseFromRequest(req);
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase가 설정되지 않았습니다. 설정 페이지에서 URL과 Anon Key를 저장하거나, .env.local에 환경변수를 설정하세요." },
      { status: 400 }
    );
  }

  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id가 필요합니다." }, { status: 400 });
  }

  try {
    const { error } = await supabase
      .from("reference_materials")
      .delete()
      .eq("id", id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "알 수 없는 오류";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
