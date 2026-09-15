import SupplierTable from "@/components/SupplierTable";
import ClickableMetricCard from "@/components/ClickableMetricCard";
import type { MetricListItem } from "@/components/ClickableMetricCard";
import SummaryPanel from "@/components/SummaryPanel";
import BarChart from "@/components/charts/BarChart";
import DonutChart from "@/components/charts/DonutChart";
import { suppliers, riskCounts, gradeToRisk } from "@/lib/suppliers";
import type { SupplierGrade } from "@/lib/suppliers";
import { fetchSupplierDisclosures } from "@/lib/data";
import { kstDateTime } from "@/lib/time";
import { RISK_COLOR, GRADE_COLOR, GRADE_SHORT_LABEL } from "@/lib/chart-colors";

// DART 공시 현황은 하루 캐시 + 매일 08:00(KST) 자동 갱신.
export const revalidate = 86400;

const GRADE_ORDER: SupplierGrade[] = [
  "최우수 (Excellent)",
  "우수 (Good)",
  "보통 (Normal)",
  "유의 (Caution)",
  "위험 (Risk)",
  "위험 (Risk) - 과락",
  "점수 오류",
];

export default async function SuppliersPage() {
  const counts = riskCounts();
  const avgScore =
    suppliers.reduce((sum, s) => sum + (s.totalScore ?? 0), 0) / suppliers.length;

  const disclosures = await fetchSupplierDisclosures();
  const dartLine =
    !disclosures.configured
      ? "DART 연동 미설정 (DART_API_KEY 환경변수 필요)"
      : !disclosures.ok
        ? `DART 조회 실패: ${disclosures.error}`
        : `DART 공시 확인 ${disclosures.checkedAt} · 매칭 ${disclosures.matchedCount}개사 · 최근 신규 ${disclosures.recentCount}개사`;

  const gradeBarData = GRADE_ORDER.map((g) => ({
    label: GRADE_SHORT_LABEL[g],
    value: suppliers.filter((s) => s.grade === g).length,
    color: GRADE_COLOR[g],
  })).filter((d) => d.value > 0);

  const tierDonutData = (["상", "중", "하"] as const).map((tier) => ({
    label: `리스크 ${tier}`,
    value: counts[tier],
    color: RISK_COLOR[tier],
  }));

  const scored = suppliers.filter((s) => s.totalScore !== null);
  const lowest =
    scored.length > 0
      ? scored.reduce((a, b) => ((b.totalScore ?? Infinity) < (a.totalScore ?? Infinity) ? b : a))
      : null;

  function toItem(s: (typeof suppliers)[number]): MetricListItem {
    const tier = gradeToRisk(s.grade);
    return {
      id: s.id,
      primary: s.name,
      secondary: `${s.category ?? "-"} · 담당 ${s.manager ?? "-"} · 종합점수 ${s.totalScore ?? "-"}`,
      tag: s.grade,
      tagTone: tier === "상" ? "danger" : tier === "중" ? "warn" : "good",
    };
  }

  const allSupplierItems: MetricListItem[] = [...suppliers]
    .sort((a, b) => (a.totalScore ?? 999) - (b.totalScore ?? 999))
    .map(toItem);
  const highRiskSupplierItems: MetricListItem[] = suppliers
    .filter((s) => gradeToRisk(s.grade) === "상")
    .map(toItem);
  const cautionSupplierItems: MetricListItem[] = suppliers
    .filter((s) => gradeToRisk(s.grade) === "중")
    .map(toItem);
  const scoreRankedItems: MetricListItem[] = [...scored]
    .sort((a, b) => (b.totalScore ?? 0) - (a.totalScore ?? 0))
    .map(toItem);

  const summaryLines = [
    `총 ${suppliers.length}개 공급업체 중 고위험(위험/과락/오류) ${counts["상"]}개 · 유의 등급 ${counts["중"]}개.`,
    `평균 종합점수 ${avgScore.toFixed(1)}점.`,
    lowest
      ? `종합점수 최저 업체: ${lowest.name} (${lowest.totalScore}점, ${lowest.grade}).`
      : "종합점수가 산출된 업체가 없습니다.",
    dartLine,
  ];

  return (
    <>
      <h1>업체평가 리스크 관리</h1>
      <p className="page-subtitle">
        AI 평가기준 스코어링 결과 기반 주요 공급업체 {suppliers.length}개 리스크 관리
      </p>
      <p className="page-meta">
        마지막 갱신 시각(KST): <strong>{kstDateTime(new Date())}</strong> · {dartLine}
      </p>

      <SummaryPanel lines={summaryLines} />

      <div className="metric-grid">
        <ClickableMetricCard
          label="관리 대상 공급업체"
          value={`${suppliers.length}개`}
          modalTitle="관리 대상 공급업체 목록"
          modalSubtitle="종합점수 낮은순(고위험 우선) 정렬"
          items={allSupplierItems}
        />
        <ClickableMetricCard
          label="고위험(위험/과락/오류) 업체"
          value={`${counts["상"]}개`}
          tone={counts["상"] > 0 ? "danger" : "default"}
          modalTitle="고위험(위험/과락/오류) 업체 목록"
          items={highRiskSupplierItems}
        />
        <ClickableMetricCard
          label="유의 등급 업체"
          value={`${counts["중"]}개`}
          modalTitle="유의 등급 업체 목록"
          items={cautionSupplierItems}
        />
        <ClickableMetricCard
          label="평균 종합점수"
          value={avgScore.toFixed(1)}
          modalTitle="종합점수 랭킹"
          modalSubtitle={`점수 산출 업체 ${scored.length}개 · 높은순 정렬`}
          items={scoreRankedItems}
        />
      </div>

      <div className="panel">
        <div className="panel-header">평가 등급 시각화</div>
        <div className="chart-panel-body chart-row">
          <div>
            <div className="chart-subtitle">최종등급별 업체 수</div>
            <BarChart data={gradeBarData} />
          </div>
          <div>
            <div className="chart-subtitle">리스크 등급(상/중/하) 비율</div>
            <DonutChart data={tierDonutData} centerLabel="전체" centerValue={`${suppliers.length}개`} />
          </div>
        </div>
      </div>

      <SupplierTable disclosures={disclosures} />
    </>
  );
}
