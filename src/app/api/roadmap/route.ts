import OpenAI from "openai";
import { NextResponse } from "next/server";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type Payload = {
  answers: Record<string, string>;
};

export async function POST(req: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY가 설정되지 않았어요(.env.local 확인)" },
        { status: 500 }
      );
    }

    const body = (await req.json()) as Payload;

    if (!body?.answers) {
      return NextResponse.json(
        { error: "answers가 비어있어요" },
        { status: 400 }
      );
    }

    const prompt = `
너는 50~60대 직장인을 위한 은퇴 준비 코치야.
사용자의 진단 답변을 바탕으로 "12개월 실행 로드맵"을 만들어줘.

요구사항:
- 반드시 JSON만 출력
- 한국어로 작성
- 12개월(1~12월) 각각에: 목표, 해야할 일 3개(체크리스트), 주의사항 1개
- 마지막에 전체 우선순위 TOP5 (짧은 문장)

출력 JSON 스키마:
{
  "title": "string",
  "summary": "string",
  "top_priorities": ["string", "... 최대 5개"],
  "months": [
    {
      "month": 1,
      "goal": "string",
      "tasks": ["string", "string", "string"],
      "caution": "string"
    }
    ... month 12까지
  ]
}

사용자 답변:
${JSON.stringify(body.answers, null, 2)}
`;

    const resp = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: prompt,
      text: { format: { type: "json_object" } },
    });

    const text = resp.output_text;

    let roadmap: any;
    try {
      roadmap = JSON.parse(text);
    } catch {
      return NextResponse.json(
        { error: "AI가 JSON이 아닌 값을 반환했어요", raw: text },
        { status: 502 }
      );
    }

    return NextResponse.json({ roadmap });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "서버 오류" },
      { status: 500 }
    );
  }
}
