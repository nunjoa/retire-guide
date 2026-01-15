import Card from "@/components/Card";
import Button from "@/components/Button";

export default function DiagnosisIntro() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">진단 시작</h1>
      <p className="text-gray-600">
        내일은 여기에서 “10문항 설문 폼”을 만들고, 답변을 저장한 뒤 AI 로드맵을
        생성할 거예요.
      </p>

      <Card title="진단은 이렇게 진행돼요">
        <ol className="list-decimal pl-5 text-sm text-gray-700 space-y-1">
          <li>현재 상황(은퇴 시점/지출/연금/부채/주거/건강)을 간단히 체크</li>
          <li>AI가 우선순위 TOP3와 12개월 계획을 생성</li>
          <li>이번 달 할 일 3개를 바로 제시</li>
        </ol>
      </Card>

      <div className="flex gap-3">
        <Button href="/result">예시 결과 보기</Button>
        <Button href="/" variant="ghost">
          홈으로
        </Button>
      </div>
    </div>
  );
}
