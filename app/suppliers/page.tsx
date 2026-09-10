import MetricCard from "@/components/MetricCard";
import SupplierTable from "@/components/SupplierTable";
import { suppliers, riskCounts } from "@/lib/suppliers";
import { fetchSupplierDisclosures } from "@/lib/data";
import { kstDateTime } from "@/lib/time";

// DART 공시 현황은 하루 캐시 + 매일 08:00(KST) 자동 갱신.
export const revalidate = 86400;

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

      <SupplierTable disclosures={disclosures} />
    </>
  );
}
