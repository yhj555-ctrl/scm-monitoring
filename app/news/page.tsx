import BarChart from "@/components/charts/BarChart";
import DonutChart from "@/components/charts/DonutChart";
import NewsTable from "@/components/NewsTable";
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
