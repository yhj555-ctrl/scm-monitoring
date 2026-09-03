import MetricCard from "@/components/MetricCard";
import SupplierTable from "@/components/SupplierTable";
import { suppliers, riskCounts } from "@/lib/suppliers";

export default function SuppliersPage() {
  const counts = riskCounts();
  const avgScore =
    suppliers.reduce((sum, s) => sum + (s.totalScore ?? 0), 0) / suppliers.length;

  return (
    <>
      <h1>업체평가 리스크 관리</h1>
      <p className="page-subtitle">
        AI 평가기준 스코어링 결과 기반 주요 공급업체 {suppliers.length}개 리스크 관리
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

      <SupplierTable />
    </>
  );
}
