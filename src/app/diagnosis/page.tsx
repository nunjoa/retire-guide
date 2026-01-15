"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Card from "@/components/Card";
import Button from "@/components/Button";
import { QUESTIONS } from "@/lib/questions";

type Answers = Record<string, string>;

export default function DiagnosisPage() {
  const router = useRouter();

  const [userEmail, setUserEmail] = useState("");
  const [userId, setUserId] = useState<string | null>(null);

  const [answers, setAnswers] = useState<Answers>({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // 기본값 자동 세팅(첫 로딩)
  useEffect(() => {
    const initial: Answers = {};
    for (const q of QUESTIONS) initial[q.id] = q.options[0];
    setAnswers(initial);
  }, []);

  // 로그인 체크
  useEffect(() => {
    async function init() {
      const { data } = await supabase.auth.getUser();

      if (!data.user) {
        router.push("/login");
        return;
      }

      setUserEmail(data.user.email ?? "");
      setUserId(data.user.id);
    }

    init();
  }, [router]);

  const completedCount = useMemo(() => {
    return QUESTIONS.filter((q) => answers[q.id]).length;
  }, [answers]);

  function update(id: string, value: string) {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  }

  async function handleSubmit() {
    if (!userId) return;

    setLoading(true);
    setMessage(null);

    try {
      const { error } = await supabase.from("assessments").insert({
        user_id: userId,
        answers,
      });

      if (error) throw error;

      setMessage("저장 완료! 이제 결과를 만들어볼게요 🙂");

      // 일단 Day3는 결과페이지로 이동 (Day4에 AI 생성 연결)
      router.push("/result");
    } catch (err: any) {
      setMessage(err?.message ?? "저장 중 문제가 발생했어요.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">은퇴 준비 진단 (10문항)</h1>
      <p className="text-gray-600">
        로그인: <span className="font-medium">{userEmail}</span>
      </p>

      <Card title={`진행률: ${completedCount}/${QUESTIONS.length}`}>
        <div className="space-y-4">
          {QUESTIONS.map((q, idx) => (
            <div key={q.id} className="space-y-2">
              <div className="text-sm font-medium text-gray-900">
                {idx + 1}. {q.label}
              </div>

              <select
                className="w-full rounded-2xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-200"
                value={answers[q.id] ?? ""}
                onChange={(e) => update(q.id, e.target.value)}
              >
                {q.options.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </Card>

      {message && (
        <div className="rounded-2xl border border-amber-100 bg-amber-50 p-3 text-sm text-gray-700">
          {message}
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="inline-flex items-center justify-center rounded-2xl bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-60"
        >
          {loading ? "저장 중..." : "진단 제출하기"}
        </button>

        <Button href="/" variant="ghost">
          홈으로
        </Button>
      </div>
    </div>
  );
}
