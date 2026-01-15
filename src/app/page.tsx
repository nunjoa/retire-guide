import Card from "@/components/Card";
import Button from "@/components/Button";

export default function Home() {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <p className="text-sm text-amber-700 font-medium">
          은퇴 준비, 막막함부터 줄여드립니다
        </p>
        <h1 className="text-3xl font-bold leading-tight">
          진단하면,
          <br />
          AI가 <span className="text-amber-700">나만의 12개월 로드맵</span>을
          만들어줘요.
        </h1>
        <p className="text-gray-600">
          10개의 간단한 질문에 답하면, 이번 달에 무엇부터 해야 하는지부터 12개월
          계획까지 한 번에 정리해드립니다.
        </p>
      </div>

      <div className="flex gap-3">
        <Button href="/diagnosis">진단 시작하기</Button>
        <Button href="/result" variant="ghost">
          예시 결과 보기
        </Button>
      </div>

      <Card title="오늘의 약속 (MVP 원칙)">
        <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
          <li>복잡한 계산 대신, 실행 가능한 준비 순서를 안내합니다.</li>
          <li>
            과한 불안을 줄이고, 오늘 할 수 있는 ‘작은 행동’부터 제안합니다.
          </li>
          <li>매주 배포하며 실제 사용 가능한 형태로 빠르게 개선합니다.</li>
        </ul>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card title="대상">
          <p className="text-sm text-gray-700">
            50~60대 직장인(은퇴 1~5년 전) — “뭘 먼저 해야 할지” 정리가 필요한 분
          </p>
        </Card>
        <Card title="다음 단계(내일)">
          <p className="text-sm text-gray-700">
            Supabase 로그인 + 진단 설문 저장 + 결과 히스토리 기본 구조를
            붙입니다.
          </p>
        </Card>
      </div>
    </div>
  );
}
