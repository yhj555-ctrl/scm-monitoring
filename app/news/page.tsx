import BarChart from "@/components/charts/BarChart";
import DonutChart from "@/components/charts/DonutChart";
import NewsTable from "@/components/NewsTable";
import SummaryPanel from "@/components/SummaryPanel";
import { fetchSupplierNews } from "@/lib/data";
import type { RiskLevel } from "@/lib/data";
import { kstDateTime } from "@/lib/time";
import { RISK_COLOR } from "@/lib/chart-colors";

// Google 뉴스 RSS 실시간 크롤링 결과(게재시각 최신순, 최근 1년 이내). 하루 캐시 + 매일 08:00(KST) 강제 갱신.
export const revalidate = 86400;

export default async function NewsPage() {
  const news = await fetchSupplierNews();
  const refreshedAt = kstDateTime(new Date());

  const riskCountMap: Record<RiskLevel, number> = { 상: 0, 중: 0, 하: 0 };
  news.forEach((n) => {
    riskCountMap[n.risk] += 1;
  });
  const riskChartData = (["상", "중", "하"] as const).map((tier) => ({
    label: `리스크 ${tier}`,
    value: riskCountMap[tier],
    color: RISK_COLOR[tier],
  }));

  const supplierCountMap = new Map<string, number>();
  news.forEach((n) => {
    supplierCountMap.set(n.supplierName, (supplierCountMap.get(n.supplierName) ?? 0) + 1);
  });
  const topSupplier = Array.from(supplierCountMap.entries()).sort((a, b) => b[1] - a[1])[0];
  const latest = [...news]
    .filter((n) => n.publishedTs > 0)
    .sort((a, b) => b.publishedTs - a.publishedTs)[0];

  const summaryLines = [
    `최근 1년 이내 공급업체 관련 뉴스 총 ${news.length}건 수집 (리스크 [상] ${riskCountMap["상"]}건 · [중] ${riskCountMap["중"]}건).`,
    topSupplier
      ? `언급 빈도가 가장 높은 업체: ${topSupplier[0]} (${topSupplier[1]}건).`
      : "수집된 업체 언급 뉴스가 없습니다.",
    latest
      ? `가장 최근 기사: ${latest.supplierName} · ${latest.headline} (${kstDateTime(new Date(latest.publishedTs))}).`
      : "최근 기사가 없습니다.",
    `모든 기사는 업체명-제목 일치 재검증 및 1년 이내 게재분만 표시됩니다.`,
  ];

  return (
    <>
      <h1>공급업체 뉴스 모니터링</h1>
      <p className="page-subtitle">
        Google 뉴스 실시간 크롤링(내부 평가 위험·유의 등급 업체 우선) · 업체명 제목 포함 재검증 ·
        최근 1년 이내 기사만 표시
      </p>
      <p className="page-meta">
        마지막 갱신 시각(KST): <strong>{refreshedAt}</strong> · 매일 08:00(KST) 자동 갱신
      </p>

      <SummaryPanel lines={summaryLines} />

      <div className="panel">
        <div className="panel-header">수집 뉴스 리스크 시각화 ({news.length}건)</div>
        <div className="chart-panel-body chart-row">
          <div>
            <div className="chart-subtitle">리스크 등급별 뉴스 건수</div>
            <BarChart data={riskChartData} />
          </div>
          <div>
            <div className="chart-subtitle">리스크 등급 비율</div>
            <DonutChart data={riskChartData} centerLabel="전체" centerValue={`${news.length}건`} />
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">수집 뉴스 (열 클릭 시 정렬)</div>
        <NewsTable news={news} />
      </div>
    </>
  );
}
