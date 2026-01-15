import Card from "@/components/Card";
import Button from "@/components/Button";

const sample = {
  summary:
    "은퇴까지 3년. 연금 수령 예상과 월지출 구조를 먼저 ‘확인’하는 단계가 가장 중요합니다.",
  top3: [
    "국민연금/퇴직연금 예상 수령액 확인",
    "은퇴 후 월 생활비 목표(현재 지출 기준) 정리",
    "보험(실손/암/치매 등) 중복·공백 점검",
  ],
  month1: [
    "국민연금 조회",
    "최근 30일 지출을 5개 카테고리로 정리",
    "보험 증권/내역 모으기",
  ],
  traps: [
    "연금 공백을 모른 채 은퇴",
    "자녀 지원으로 현금흐름 악화",
    "보험 중복 가입/공백 방치",
  ],
};

export default function ResultSample() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">예시 결과</h1>
      <p className="text-gray-600">
        오늘은 디자인/구조만 먼저 잡고, 내일부터 실제 진단 답변 기반으로 AI가
        생성하도록 만들어요.
      </p>

      <Card title="요약">
        <p className="text-sm text-gray-700">{sample.summary}</p>
      </Card>

      <Card title="우선순위 TOP 3">
        <ol className="list-decimal pl-5 text-sm text-gray-700 space-y-1">
          {sample.top3.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ol>
      </Card>

      <Card title="이번 달 할 일 3개">
        <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
          {sample.month1.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </Card>

      <Card title="주의할 함정 3개">
        <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
          {sample.traps.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </Card>

      <div className="flex gap-3">
        <Button href="/diagnosis">진단 시작</Button>
        <Button href="/" variant="ghost">
          홈으로
        </Button>
      </div>
    </div>
  );
}
