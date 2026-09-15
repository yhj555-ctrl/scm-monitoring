import BarChart from "@/components/charts/BarChart";
import { fetchCompetitorNews } from "@/lib/data";
import type { CompetitorCompany } from "@/lib/data";
import { kstDateTime } from "@/lib/time";
import { COMPETITOR_COLOR } from "@/lib/chart-colors";

// Google 뉴스 RSS 실시간 크롤링 결과(게재시각 최신순). 하루 캐시 + 매일 08:00(KST) 강제 갱신.
export const revalidate = 86400;

const COMPANIES: { key: CompetitorCompany; label: string }[] = [
  { key: "KT", label: "KT" },
  { key: "LG유플러스", label: "LG유플러스" },
  { key: "SK텔레콤", label: "SK텔레콤" },
];

export default async function CompetitorsPage() {
  const news = await fetchCompetitorNews();
  const refreshedAt = kstDateTime(new Date());

  const countBarData = COMPANIES.map((c) => ({
    label: c.label,
    value: news.filter((n) => n.company === c.key).length,
    color: COMPETITOR_COLOR[c.key],
  }));

  return (
    <>
      <h1>경쟁사 동향</h1>
      <p className="page-subtitle">
        KT · LG유플러스 · SK텔레콤 장비·서비스 구매 및 공급업체 관련 뉴스 실시간 크롤링
      </p>
      <p className="page-meta">
        마지막 갱신 시각(KST): <strong>{refreshedAt}</strong> · 매일 08:00(KST) 자동 갱신
      </p>

      <div className="panel">
        <div className="panel-header">통신사별 수집 건수</div>
        <div className="chart-panel-body">
          <BarChart data={countBarData} />
        </div>
      </div>

      {COMPANIES.map((c) => {
        const items = news.filter((n) => n.company === c.key);
        return (
          <div className="panel" key={c.key}>
            <div className="panel-header">
              <span className="region-dot" style={{ background: COMPETITOR_COLOR[c.key] }} />
              {c.label} 동향 ({items.length}건)
            </div>
            {items.length === 0 ? (
              <div className="panel-footnote">
                현재 수집된 뉴스가 없습니다. 다음 갱신(매일 08:00 KST) 때 다시 시도합니다.
              </div>
            ) : (
              <ul className="news-list">
                {items.map((n) => (
                  <li key={n.id}>
                    <a
                      href={n.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="news-headline"
                    >
                      {n.title}
                    </a>
                    <div className="news-meta">
                      <span>{n.source}</span>
                      <span className="dot">
                        {n.publishedAt ? kstDateTime(new Date(n.publishedAt)) : "게재시각 미상"}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </>
  );
}
