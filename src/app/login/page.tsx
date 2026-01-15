"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Card from "@/components/Card";
import Button from "@/components/Button";

export default function LoginPage() {
  const router = useRouter();

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMessage("회원가입 요청 완료! 이메일 인증이 필요할 수 있어요.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        setMessage("로그인 성공! 🎉");
        router.push("/diagnosis");
      }
    } catch (err: any) {
      setMessage(err?.message ?? "문제가 발생했어요.");
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    setLoading(true);
    setMessage(null);
    const { error } = await supabase.auth.signOut();
    if (error) setMessage(error.message);
    else setMessage("로그아웃 되었어요.");
    setLoading(false);
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">로그인</h1>
      <p className="text-gray-600">
        내 진단 기록을 저장하려면 로그인이 필요해요.
      </p>

      <Card title={mode === "signup" ? "회원가입" : "로그인"}>
        <form onSubmit={handleSubmit} className="space-y-3">
          <label className="block text-sm">
            <div className="mb-1 text-gray-700">이메일</div>
            <input
              className="w-full rounded-2xl border border-gray-200 px-3 py-2 outline-none focus:ring-2 focus:ring-amber-200"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              type="email"
              required
            />
          </label>

          <label className="block text-sm">
            <div className="mb-1 text-gray-700">비밀번호</div>
            <input
              className="w-full rounded-2xl border border-gray-200 px-3 py-2 outline-none focus:ring-2 focus:ring-amber-200"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="최소 6자 이상"
              type="password"
              required
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-gray-900 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-60"
          >
            {loading ? "처리 중..." : mode === "signup" ? "회원가입" : "로그인"}
          </button>

          <div className="flex items-center justify-between text-sm">
            <button
              type="button"
              className="underline underline-offset-4 text-gray-700 hover:text-gray-900"
              onClick={() => {
                setMode(mode === "signup" ? "login" : "signup");
                setMessage(null);
              }}
            >
              {mode === "signup"
                ? "이미 계정이 있어요(로그인)"
                : "계정이 없어요(회원가입)"}
            </button>

            <button
              type="button"
              className="underline underline-offset-4 text-gray-700 hover:text-gray-900"
              onClick={handleLogout}
              disabled={loading}
            >
              로그아웃
            </button>
          </div>

          {message && (
            <p className="text-sm text-gray-700 rounded-2xl bg-amber-50 border border-amber-100 p-3">
              {message}
            </p>
          )}
        </form>
      </Card>

      <div className="flex gap-3">
        <Button href="/" variant="ghost">
          홈으로
        </Button>
        <Button href="/diagnosis">진단 화면 보기</Button>
      </div>
    </div>
  );
}
