"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Card from "@/components/Card";
import Button from "@/components/Button";

export default function DiagnosisPage() {
  const router = useRouter();
  const [email, setEmail] = useState<string>("");

  useEffect(() => {
    async function init() {
      const { data } = await supabase.auth.getUser();

      if (!data.user) {
        router.push("/login");
        return;
      }

      setEmail(data.user.email ?? "");
    }

    init();
  }, [router]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">진단 시작</h1>
      <p className="text-gray-600">
        로그인한 사용자만 진단을 진행할 수 있어요.
      </p>

      <Card title="내 계정">
        <p className="text-sm text-gray-700">로그인: {email}</p>
      </Card>

      <Card title="다음 단계">
        <p className="text-sm text-gray-700">
          내일은 여기서 실제 10문항 설문 폼을 만들고, 제출하면 Supabase DB에
          저장할 거예요.
        </p>
      </Card>

      <div className="flex gap-3">
        <Button href="/result">예시 결과</Button>
        <Button href="/" variant="ghost">
          홈으로
        </Button>
      </div>
    </div>
  );
}
