import MetricCard from "@/components/MetricCard";
import SupplierTable from "@/components/SupplierTable";
import BarChart from "@/components/charts/BarChart";
import DonutChart from "@/components/charts/DonutChart";
import { suppliers, riskCounts } from "@/lib/suppliers";
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

  return (
    <>
      <h1>업체평가 리스크 관리</h1>
      <p className="page-subtitle">
        AI 평가기준 스코어링 결과 기반 주요 공급업체 {suppliers.length}개 리스크 관리
      </p>
      <p className="page-meta">
        마지막 갱신 시각(KST): <strong>{kstDateTime(new Date())}</strong> · {dartLine}
      </p>

      <div className="metric-grid">
        <MetricCard label="관리 대상 공급업체" value={`${suppliers.length}개`} />
        <MetricCard
          label="고위험(위험/과락/오류) 업체"
          value={`${counts["상"]}개`}
          tone={counts["상"] > 0 ? "danger" : "default"}
        />
        <MetricCard label="유의 등급 업체" value={`${counts["중"]}개`} />
        <MetricCard label="평균 종합점수" value={avgScore.toFixed(1)} />
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
