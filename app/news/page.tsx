import RiskBadge from "@/components/RiskBadge";
import { fetchSupplierNews } from "@/lib/data";
import { kstDateTime } from "@/lib/time";

// Google 뉴스 RSS 실시간 크롤링 결과(게재시각 최신순). 하루 캐시 + 매일 08:00(KST) 강제 갱신.
export const revalidate = 86400;

export default async function NewsPage() {
  const news = await fetchSupplierNews();
  const refreshedAt = kstDateTime(new Date());

  return (
    <>
      <h1>공급업체 뉴스 모니터링</h1>
      <p className="page-subtitle">
        Google 뉴스 실시간 크롤링(내부 평가 위험·유의 등급 업체 우선) · 게재시각 최신순
      </p>
      <p className="page-meta">
        마지막 갱신 시각(KST): <strong>{refreshedAt}</strong> · 매일 08:00(KST) 자동 갱신
      </p>

      <div className="panel">
        <div className="panel-header">수집 뉴스 (최신순)</div>
        <table>
          <thead>
            <tr>
              <th>게재 시각(KST)</th>
              <th>공급업체</th>
              <th>내용</th>
              <th>출처</th>
              <th>리스크</th>
            </tr>
          </thead>
          <tbody>
            {news.map((n) => (
              <tr key={n.id}>
                <td>
                  {n.publishedAt && n.publishedAt !== "-"
                    ? kstDateTime(new Date(n.publishedAt))
                    : "-"}
                </td>
                <td>{n.supplierName}</td>
                <td>
                  {n.link ? (
                    <a
                      href={n.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="panel-link"
                    >
                      {n.headline}
                    </a>
                  ) : (
                    n.headline
                  )}
                </td>
                <td>{n.sourceName}</td>
                <td>
                  <RiskBadge risk={n.risk} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
