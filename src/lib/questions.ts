export const QUESTIONS = [
  {
    id: "retire_year",
    label: "은퇴 예정 시점은 언제인가요?",
    type: "select",
    options: ["1년 이내", "1~3년", "3~5년", "5년 이상"],
  },
  {
    id: "age_group",
    label: "연령대는 어떻게 되세요?",
    type: "select",
    options: ["50~54", "55~59", "60~64", "65+"],
  },
  {
    id: "monthly_spend",
    label: "현재 월 평균 지출은 어느 정도인가요?",
    type: "select",
    options: ["200만원 미만", "200~300", "300~400", "400 이상"],
  },
  {
    id: "pension_ready",
    label: "국민연금/퇴직연금 예상 수령액을 알고 있나요?",
    type: "select",
    options: ["정확히 안다", "대략 안다", "모른다"],
  },
  {
    id: "debt",
    label: "현재 부채(대출)가 있나요?",
    type: "select",
    options: ["없음", "있음(감당 가능)", "있음(부담 큼)"],
  },
  {
    id: "house",
    label: "주거 형태는?",
    type: "select",
    options: ["자가", "전세", "월세", "기타"],
  },
  {
    id: "health",
    label: "건강/보험 준비는?",
    type: "select",
    options: ["충분", "보통", "부족"],
  },
  {
    id: "job_plan",
    label: "은퇴 후 수입 계획이 있나요?",
    type: "select",
    options: ["없음", "부분적으로 있음", "구체적으로 있음"],
  },
  {
    id: "family_support",
    label: "자녀/가족 지원 부담이 있나요?",
    type: "select",
    options: ["없음", "가끔", "지속적으로 큼"],
  },
  {
    id: "priority",
    label: "가장 먼저 해결하고 싶은 분야는?",
    type: "select",
    options: [
      "연금/현금흐름",
      "지출 관리",
      "부채 정리",
      "보험/건강",
      "은퇴 후 일",
    ],
  },
] as const;
