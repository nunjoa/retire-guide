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

function pickTop3(answers: Record<string, string>) {
  // 아주 단순한 룰 기반(오늘은 AI 대신 “결과 느낌”을 주는 목적)
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

  // 부족하면 기본 항목으로 채움
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
  const spend = answers["monthly_spend"];
  const debt = answers["debt"];
  const priority = answers["priority"];

  if (pension === "모른다") tasks.push("국민연금 예상연금액 조회 + 캡처 저장");
  tasks.push("최근 30일 지출을 5개 카테고리로 분류(식비/주거/교통/통신/기타)");

  if (debt !== "없음")
    tasks.push("대출 목록 정리(금리/잔액/상환방식) → 우선순위 표시");

  // 우선순위에 따른 1개 추가
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
  const [error, setError] = useState<string | null>(null);

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

      // 🔥 내 최신 진단 1개 가져오기
      const { data, error: qErr } = await supabase
        .from("assessments")
        .select("id,user_id,answers,created_at")
        .order("created_at", { ascending: false })
        .limit(1);

      if (qErr) {
        setError(qErr.message);
        setLoading(false);
        return;
      }

      setAssessment((data?.[0] as AssessmentRow) ?? null);
      setLoading(false);
    }

    load();
  }, [router]);

  const top3 = useMemo(() => {
    if (!assessment?.answers) return [];
    return pickTop3(assessment.answers);
  }, [assessment]);

  const tasks = useMemo(() => {
    if (!assessment?.answers) return [];
    return monthTasks(assessment.answers);
  }, [assessment]);

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
          <p className="text-sm text-gray-500 mt-2">
            (보통 RLS/테이블/로그인 상태 문제일 수 있어요)
          </p>
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

      <Card title="요약">
        <p className="text-sm text-gray-700">{summary}</p>
        <p className="text-xs text-gray-500 mt-2">
          저장 시간: {new Date(assessment.created_at).toLocaleString()}
        </p>
      </Card>

      <Card title="우선순위 TOP 3">
        <ol className="list-decimal pl-5 text-sm text-gray-700 space-y-1">
          {top3.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ol>
      </Card>

      <Card title="이번 달 할 일 3개">
        <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
          {tasks.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </Card>

      <Card title="내가 제출한 답변(확인용)">
        <div className="text-sm text-gray-700 space-y-1">
          {Object.entries(assessment.answers).map(([k, v]) => (
            <div key={k} className="flex gap-2">
              <span className="text-gray-500 w-40 shrink-0">{k}</span>
              <span className="font-medium">{v}</span>
            </div>
          ))}
        </div>
      </Card>

      <div className="flex gap-3">
        <Button href="/diagnosis">진단 다시하기</Button>
        <Button href="/" variant="ghost">
          홈으로
        </Button>
      </div>

      <p className="text-xs text-gray-500">
        * 오늘은 룰 기반(임시) 결과예요. Day4에서 AI가 “12개월 로드맵”을
        생성하도록 업그레이드할게요.
      </p>
    </div>
  );
}
