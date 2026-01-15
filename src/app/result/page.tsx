"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Card from "@/components/Card";
import Button from "@/components/Button";

type AssessmentRow = {
  id: string;
  user_id: string;
  answers: Record<string, string>;
  created_at: string;
};

type RoadmapRow = {
  id: string;
  user_id: string;
  assessment_id: string;
  roadmap: any;
  created_at: string;
};

type Plan = "free" | "pro";

function pickTop3(answers: Record<string, string>) {
  const items: string[] = [];

  const pension = answers["pension_ready"];
  const debt = answers["debt"];
  const spend = answers["monthly_spend"];
  const health = answers["health"];
  const job = answers["job_plan"];

  if (pension === "모른다")
    items.push("국민연금/퇴직연금 예상 수령액 조회하기");
  if (debt?.includes("부담"))
    items.push("부채(대출) 상환 우선순위/금리 점검하기");
  if (spend === "400 이상")
    items.push("월 지출 상한선 설정 + 고정비 다이어트 시작");
  if (health === "부족")
    items.push("보험/건강 보장 공백 점검(실손/중대질병/치매)");
  if (job === "없음")
    items.push("은퇴 후 소득원(파트/자격/프로젝트) 옵션 3개 리스트업");

  const fallback = [
    "현금흐름(수입/지출) 표 만들기",
    "은퇴 시점/목표 생활비를 수치로 정리하기",
    "연금·보험·부채·자산 문서 한 폴더에 모으기",
  ];

  const merged = [...items, ...fallback];
  return Array.from(new Set(merged)).slice(0, 3);
}

function monthTasks(answers: Record<string, string>) {
  const tasks: string[] = [];

  const pension = answers["pension_ready"];
  const debt = answers["debt"];
  const priority = answers["priority"];

  if (pension === "모른다") tasks.push("국민연금 예상연금액 조회 + 캡처 저장");
  tasks.push("최근 30일 지출을 5개 카테고리로 분류(식비/주거/교통/통신/기타)");
  if (debt !== "없음")
    tasks.push("대출 목록 정리(금리/잔액/상환방식) → 우선순위 표시");

  if (priority === "보험/건강")
    tasks.push("보험 증권/내역 모아서 ‘중복/공백’ 체크");
  else if (priority === "부채 정리")
    tasks.push("상환 계획 초안(월 상환 가능액) 1장 만들기");
  else if (priority === "지출 관리")
    tasks.push("고정비 3개만 줄이는 액션(통신/구독/보험료) 설정");
  else if (priority === "은퇴 후 일")
    tasks.push("가능한 일/재능/경험 10개 적고 상위 3개 선택");
  else tasks.push("연금/퇴직금/자산 현황을 한 장 요약으로 정리");

  return Array.from(new Set(tasks)).slice(0, 3);
}

export default function ResultPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [assessment, setAssessment] = useState<AssessmentRow | null>(null);

  const [roadmapRow, setRoadmapRow] = useState<RoadmapRow | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [plan, setPlan] = useState<Plan>("free");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);

      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr) {
        setError(userErr.message);
        setLoading(false);
        return;
      }

      if (!userData.user) {
        router.push("/login");
        return;
      }

      setEmail(userData.user.email ?? "");

      // ✅ 내 플랜 조회 (없으면 free로 생성)
      const { data: pData, error: pErr } = await supabase
        .from("profiles")
        .select("plan")
        .maybeSingle();

      if (pErr) {
        // profiles 테이블이 없거나 RLS 문제면 일단 free 처리
        setPlan("free");
      } else {
        if (!pData) {
          // 최초 사용자면 profiles 생성
          await supabase
            .from("profiles")
            .insert({ user_id: userData.user.id, plan: "free" });
          setPlan("free");
        } else {
          setPlan((pData.plan as Plan) ?? "free");
        }
      }

      // 최신 진단 1개
      const { data: aData, error: aErr } = await supabase
        .from("assessments")
        .select("id,user_id,answers,created_at")
        .order("created_at", { ascending: false })
        .limit(1);

      if (aErr) {
        setError(aErr.message);
        setLoading(false);
        return;
      }

      const latest = (aData?.[0] as AssessmentRow) ?? null;
      setAssessment(latest);

      // 이미 만들어진 로드맵이 있으면 가져오기
      if (latest?.id) {
        const { data: rData, error: rErr } = await supabase
          .from("roadmaps")
          .select("id,user_id,assessment_id,roadmap,created_at")
          .eq("assessment_id", latest.id)
          .order("created_at", { ascending: false })
          .limit(1);

        if (!rErr) setRoadmapRow((rData?.[0] as RoadmapRow) ?? null);
      }

      setLoading(false);
    }

    load();
  }, [router]);

  const top3 = useMemo(
    () => (assessment?.answers ? pickTop3(assessment.answers) : []),
    [assessment]
  );
  const tasks = useMemo(
    () => (assessment?.answers ? monthTasks(assessment.answers) : []),
    [assessment]
  );

  const summary = useMemo(() => {
    if (!assessment?.answers) return "";
    const a = assessment.answers;
    const retire = a["retire_year"] ?? "미입력";
    const spend = a["monthly_spend"] ?? "미입력";
    const pension = a["pension_ready"] ?? "미입력";
    const debt = a["debt"] ?? "미입력";
    const priority = a["priority"] ?? "미입력";
    return `은퇴 시점: ${retire} · 월지출: ${spend} · 연금 파악: ${pension} · 부채: ${debt} · 우선순위: ${priority}`;
  }, [assessment]);

  async function generateAiRoadmap(mode: "create" | "regenerate") {
    if (!assessment) return;

    // ✅ 이미 로드맵이 있는데 create(생성) 누르면 막기
    if (mode === "create" && roadmapRow) {
      setToast("이미 로드맵이 생성되어 있어요 🙂");
      return;
    }

    // ✅ 재생성은 pro 전용
    if (mode === "regenerate" && plan !== "pro") {
      setToast("재생성 기능은 유료(Pro) 전용이에요 🙂");
      return;
    }

    setAiLoading(true);
    setToast(null);
    setError(null);

    try {
      const resp = await fetch("/api/roadmap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: assessment.answers }),
      });

      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error ?? "AI 생성 실패");

      const roadmap = data.roadmap;

      // ✅ 저장: 재생성은 새 Row로 계속 저장(히스토리 남김)
      const { data: saved, error: saveErr } = await supabase
        .from("roadmaps")
        .insert({
          user_id: assessment.user_id,
          assessment_id: assessment.id,
          roadmap,
        })
        .select("id,user_id,assessment_id,roadmap,created_at")
        .single();

      if (saveErr) throw saveErr;

      setRoadmapRow(saved as RoadmapRow);
      setToast(
        mode === "regenerate"
          ? "로드맵을 새로 만들었어요! 🔄"
          : "AI 로드맵 생성 완료! 🎉"
      );
    } catch (e: any) {
      setError(e?.message ?? "오류가 발생했어요.");
    } finally {
      setAiLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">내 진단 결과</h1>
        <p className="text-gray-600">결과를 불러오는 중이에요…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">내 진단 결과</h1>
        <Card title="문제가 생겼어요">
          <p className="text-sm text-gray-700">{error}</p>
        </Card>
        <div className="flex gap-3">
          <Button href="/diagnosis">진단 다시하기</Button>
          <Button href="/" variant="ghost">
            홈으로
          </Button>
        </div>
      </div>
    );
  }

  if (!assessment) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">내 진단 결과</h1>
        <Card title="아직 저장된 진단이 없어요">
          <p className="text-sm text-gray-700">
            먼저 진단을 제출하면 여기에서 결과를 보여줄게요.
          </p>
        </Card>
        <div className="flex gap-3">
          <Button href="/diagnosis">진단 하러가기</Button>
          <Button href="/" variant="ghost">
            홈으로
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">내 진단 결과</h1>
      <p className="text-gray-600">
        로그인: <span className="font-medium">{email}</span>
      </p>

      {toast && (
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-3 text-sm text-gray-700">
          {toast}
        </div>
      )}

      <Card title="요약">
        <p className="text-sm text-gray-700">{summary}</p>
        <p className="text-xs text-gray-500 mt-2">
          저장 시간: {new Date(assessment.created_at).toLocaleString()}
        </p>
      </Card>

      <div className="flex gap-3">
        {/* ✅ 기본 생성 버튼: 로드맵 있으면 비활성화 */}
        <button
          onClick={() => generateAiRoadmap("create")}
          disabled={aiLoading || !!roadmapRow}
          className="inline-flex items-center justify-center rounded-2xl bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-60"
        >
          {aiLoading
            ? "AI 생성 중..."
            : roadmapRow
            ? "이미 생성됨 ✅"
            : "AI 12개월 로드맵 생성"}
        </button>

        {/* ✅ 재생성: pro 전용 */}
        <button
          onClick={() => generateAiRoadmap("regenerate")}
          disabled={aiLoading || plan !== "pro"}
          className="inline-flex items-center justify-center rounded-2xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50 disabled:opacity-60"
        >
          {plan === "pro" ? "다시 만들기(유료)" : "다시 만들기 🔒 (유료)"}
        </button>

        <Button href="/diagnosis" variant="ghost">
          진단 다시하기
        </Button>
      </div>

      <p className="text-xs text-gray-500">
        현재 플랜: <span className="font-medium">{plan}</span>
      </p>

      {roadmapRow?.roadmap ? (
        <Card title="AI 12개월 로드맵">
          <div className="space-y-3">
            <div>
              <div className="text-lg font-bold">
                {roadmapRow.roadmap.title}
              </div>
              <div className="text-sm text-gray-700 mt-1">
                {roadmapRow.roadmap.summary}
              </div>
            </div>

            <div>
              <div className="text-sm font-semibold">우선순위 TOP5</div>
              <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1 mt-1">
                {(roadmapRow.roadmap.top_priorities ?? []).map((p: string) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </div>

            <div className="space-y-2">
              {(roadmapRow.roadmap.months ?? []).map((m: any) => (
                <div
                  key={m.month}
                  className="rounded-2xl border border-gray-100 p-3"
                >
                  <div className="text-sm font-semibold">
                    {m.month}개월차 · {m.goal}
                  </div>
                  <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1 mt-1">
                    {(m.tasks ?? []).map((t: string) => (
                      <li key={t}>{t}</li>
                    ))}
                  </ul>
                  <div className="text-xs text-gray-500 mt-2">
                    주의: {m.caution}
                  </div>
                </div>
              ))}
            </div>

            <p className="text-xs text-gray-500">
              생성 시간: {new Date(roadmapRow.created_at).toLocaleString()}
            </p>
          </div>
        </Card>
      ) : (
        <>
          <Card title="(임시) 우선순위 TOP 3">
            <ol className="list-decimal pl-5 text-sm text-gray-700 space-y-1">
              {top3.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ol>
          </Card>

          <Card title="(임시) 이번 달 할 일 3개">
            <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
              {tasks.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </Card>

          <p className="text-xs text-gray-500">
            * AI 로드맵을 생성하면 위 임시 결과 대신 AI 로드맵이 표시돼요.
          </p>
        </>
      )}

      <div className="flex gap-3">
        <Button href="/" variant="ghost">
          홈으로
        </Button>
      </div>
    </div>
  );
}
