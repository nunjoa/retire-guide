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
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [progress, setProgress] = useState({ done: 0, total: 36 });

  const [aiLoading, setAiLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [plan, setPlan] = useState<Plan>("free");

  const [openTemplateKey, setOpenTemplateKey] = useState<string | null>(null);

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

      // ✅ 체크 상태 불러오기 + 진행률 계산
      async function loadChecks(roadmapId: string) {
        const { data, error } = await supabase
          .from("roadmap_task_checks")
          .select("month, task_index, checked")
          .eq("roadmap_id", roadmapId);

        if (error) return;

        const map: Record<string, boolean> = {};
        let done = 0;

        for (const row of data ?? []) {
          const key = `${row.month}-${row.task_index}`;
          map[key] = !!row.checked;
          if (row.checked) done += 1;
        }

        setChecks(map);
        setProgress({ done, total: 36 });
      }

      if (latest?.id) {
        const { data: rData, error: rErr } = await supabase
          .from("roadmaps")
          .select("id,user_id,assessment_id,roadmap,created_at")
          .eq("assessment_id", latest.id)
          .order("created_at", { ascending: false })
          .limit(1);

        if (!rErr) {
          const row = (rData?.[0] as RoadmapRow) ?? null;
          setRoadmapRow(row);

          // ✅ 여기 추가
          if (row?.id) await loadChecks(row.id);
        }
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

  async function toggleCheck(
    month: number,
    taskIndex: number,
    nextChecked: boolean
  ) {
    if (!roadmapRow?.id || !assessment) return;

    const key = `${month}-${taskIndex}`;

    // 1) UI 먼저 반영(즉각 반응)
    setChecks((prev) => ({ ...prev, [key]: nextChecked }));

    // 2) DB 저장 (upsert)
    const { error } = await supabase.from("roadmap_task_checks").upsert(
      {
        user_id: assessment.user_id,
        roadmap_id: roadmapRow.id,
        month,
        task_index: taskIndex,
        checked: nextChecked,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,roadmap_id,month,task_index" }
    );

    if (error) {
      // 실패하면 롤백
      setChecks((prev) => ({ ...prev, [key]: !nextChecked }));
      setToast("저장에 실패했어요. 다시 시도해 주세요.");
      return;
    }

    // 3) 진행률 재계산(간단 버전)
    setProgress((p) => {
      const delta = nextChecked ? 1 : -1;
      const done = Math.max(0, Math.min(p.total, p.done + delta));
      return { ...p, done };
    });
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

            {/* ✅ 진행률 + 이번 달 미션(1개월차) */}
            <div className="rounded-2xl border border-gray-100 p-3">
              <div className="text-sm font-semibold">진행률</div>
              <div className="text-sm text-gray-700 mt-1">
                완료 {progress.done}/{progress.total} (
                {Math.round((progress.done / progress.total) * 100)}%)
              </div>
              <div className="h-2 w-full rounded-full bg-gray-100 mt-2">
                <div
                  className="h-2 rounded-full bg-gray-900"
                  style={{
                    width: `${(progress.done / progress.total) * 100}%`,
                  }}
                />
              </div>
            </div>

            <div className="rounded-2xl border border-gray-100 p-3">
              <div className="text-sm font-semibold">
                이번 달 미션 TOP 3 (1개월차)
              </div>
              <div className="text-xs text-gray-500 mt-1">
                * 체크하면 저장돼서 다음에 와도 유지돼요.
              </div>

              <div className="mt-3 space-y-2">
                {(
                  roadmapRow.roadmap.months?.find((m: any) => m.month === 1)
                    ?.tasks ?? []
                ).map((t: string, idx: number) => {
                  const key = `1-${idx}`;
                  const checked = !!checks[key];

                  return (
                    <label
                      key={t}
                      className="flex items-start gap-2 rounded-xl border border-gray-100 p-2"
                    >
                      <input
                        type="checkbox"
                        className="mt-1"
                        checked={checked}
                        onChange={(e) => toggleCheck(1, idx, e.target.checked)}
                      />
                      <div className="text-sm text-gray-800">
                        <div
                          className={
                            checked ? "line-through text-gray-400" : ""
                          }
                        >
                          {t}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          방법:{" "}
                          {idx === 0
                            ? "관련 사이트/앱에서 조회 → 캡처 1장 저장"
                            : idx === 1
                            ? "최근 30일 내역 정리 → 표 1장 만들기"
                            : "리스트업 → 우선순위 표시(금리/필요도 기준)"}
                        </div>
                        <div className="text-xs text-gray-500">
                          완료 기준:{" "}
                          {idx === 0
                            ? "캡처 또는 메모가 남아있음"
                            : idx === 1
                            ? "카테고리별 합계가 있음"
                            : "정리표(잔액/금리/상환)가 있음"}
                        </div>
                        <div className="mt-2">
                          <button
                            type="button"
                            onClick={() =>
                              setOpenTemplateKey((prev) =>
                                prev === key ? null : key
                              )
                            }
                            className="text-xs font-medium underline text-gray-700 hover:text-gray-900"
                          >
                            {openTemplateKey === key
                              ? "템플릿 닫기"
                              : "템플릿 보기"}
                          </button>

                          {openTemplateKey === key && (
                            <div className="mt-2 rounded-xl bg-gray-50 p-3">
                              {(() => {
                                const text = t ?? "";

                                const isDebtPlan =
                                  text.includes("우선순위") ||
                                  text.includes("예산") ||
                                  text.includes("재조정") ||
                                  text.includes("상환 계획") ||
                                  text.includes("전략");

                                const isDebtDetail =
                                  text.includes("부채") ||
                                  text.includes("대출") ||
                                  text.includes("상환") ||
                                  text.includes("조건") ||
                                  text.includes("총액");

                                const isSpend =
                                  text.includes("지출") ||
                                  text.includes("생활비") ||
                                  text.includes("소비") ||
                                  text.includes("가계부") ||
                                  text.includes("예산");

                                const isCashflow =
                                  text.includes("연금") ||
                                  text.includes("현금흐름") ||
                                  text.includes("수입") ||
                                  text.includes("퇴직연금") ||
                                  text.includes("국민연금");

                                if (isDebtPlan) return <TemplateDebtPlan />;
                                if (isDebtDetail) return <TemplateDebt />;

                                if (isSpend) return <TemplateSpend />;
                                if (isCashflow) return <TemplateCashflow />;

                                return (
                                  <div className="text-xs text-gray-600">
                                    이 미션에 맞는 템플릿을 아직 준비 중이에요.
                                  </div>
                                );
                              })()}
                            </div>
                          )}
                        </div>
                      </div>
                    </label>
                  );
                })}
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

function Table({
  headers,
  rows,
}: {
  headers: string[];
  rows: (string | number)[][];
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border border-gray-200 rounded-xl overflow-hidden">
        <thead className="bg-gray-50">
          <tr>
            {headers.map((h) => (
              <th
                key={h}
                className="text-left font-semibold text-gray-700 px-3 py-2 border-b"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="odd:bg-white even:bg-gray-50">
              {r.map((c, j) => (
                <td
                  key={j}
                  className="px-3 py-2 border-b text-gray-700 whitespace-nowrap"
                >
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TemplateSpend() {
  return (
    <div className="mt-2 space-y-2">
      <div className="text-xs text-gray-600">
        <span className="font-semibold">완료 기준:</span> 카테고리별 합계 + 총합
        + 절감 후보 3개
      </div>
      <Table
        headers={["카테고리", "월 지출(원)", "고정/변동", "줄일 아이디어(1줄)"]}
        rows={[
          ["식비", "", "변동", ""],
          ["주거/관리비", "", "고정", ""],
          ["교통", "", "변동", ""],
          ["통신/구독", "", "고정", ""],
          ["보험료", "", "고정", ""],
          ["의료/건강", "", "변동", ""],
          ["기타", "", "변동", ""],
          ["총합", "", "", ""],
        ]}
      />
      <div className="text-xs text-gray-500">
        예시: 통신/구독 89,000원(고정) — “구독 2개 해지”
      </div>
    </div>
  );
}

function TemplateDebt() {
  return (
    <div className="mt-2 space-y-2">
      <div className="text-xs text-gray-600">
        <span className="font-semibold">완료 기준:</span> 금리 높은 순 정렬 + 월
        상환액 합계
      </div>
      <Table
        headers={[
          "대출명/기관",
          "잔액(원)",
          "금리(%)",
          "상환방식",
          "월 상환액(원)",
          "만기",
          "우선순위",
          "메모",
        ]}
        rows={[
          ["", "", "", "원리금/원금/만기일시", "", "", "높음/중간/낮음", ""],
          ["", "", "", "원리금/원금/만기일시", "", "", "높음/중간/낮음", ""],
          ["", "", "", "원리금/원금/만기일시", "", "", "높음/중간/낮음", ""],
        ]}
      />
      <div className="text-xs text-gray-500">
        우선순위 팁: 금리↑ + 변동금리 + 만기 임박 = 먼저 정리
      </div>
    </div>
  );
}

function TemplateDebtPlan() {
  return (
    <div className="mt-2 space-y-2">
      <div className="text-xs text-gray-600">
        <span className="font-semibold">완료 기준:</span> (1) 상환 우선순위가
        정해짐 (2) 월 예산에서 ‘상환 여력’이 확보됨 (3) 다음 액션 1개가 결정됨
      </div>

      <Table
        headers={["항목", "현재(원)", "조정 후(원)", "차이(원)", "메모"]}
        rows={[
          ["월 상환액 합계", "", "", "", "모든 부채 월 상환액 합계"],
          ["월 생활비(지출) 합계", "", "", "", "지출표 기반"],
          ["상환 여력(=수입-지출)", "", "", "", "최소 +값 만들기"],
          ["절감 후보 1", "", "", "", "구독/외식/보험 등"],
          ["절감 후보 2", "", "", "", ""],
          ["절감 후보 3", "", "", "", ""],
        ]}
      />

      <div className="text-xs text-gray-600 mt-2">
        <span className="font-semibold">상환 우선순위 표(결정용)</span>
      </div>

      <Table
        headers={[
          "부채/대출명",
          "잔액(원)",
          "금리(%)",
          "고정/변동",
          "월 상환액(원)",
          "우선순위 점수",
          "다음 액션",
        ]}
        rows={[
          ["", "", "", "고정/변동", "", "0~10", "추가상환/대환/금리인하요구"],
          ["", "", "", "고정/변동", "", "0~10", "추가상환/대환/금리인하요구"],
          ["", "", "", "고정/변동", "", "0~10", "추가상환/대환/금리인하요구"],
        ]}
      />

      <div className="text-xs text-gray-500">
        점수 예시: 금리 높음(+4) + 변동(+2) + 만기 임박(+2) + 리볼빙(+2) = 10점
      </div>
    </div>
  );
}

function TemplateCashflow() {
  return (
    <div className="mt-2 space-y-2">
      <div className="text-xs text-gray-600">
        <span className="font-semibold">완료 기준:</span> 은퇴 후 월 수입-지출이
        계산됨
      </div>
      <Table
        headers={["항목", "월 예상 금액(원)", "시작 시점", "메모"]}
        rows={[
          ["국민연금", "", "", ""],
          ["퇴직연금(IRP/DC/DB)", "", "", ""],
          ["개인연금", "", "", ""],
          ["기타소득(파트/임대 등)", "", "", ""],
          ["월 수입 합계", "", "", ""],
          ["목표 생활비(지출)", "", "", ""],
          ["월 차이(수입-지출)", "", "", ""],
        ]}
      />
    </div>
  );
}
