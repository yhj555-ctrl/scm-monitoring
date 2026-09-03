import RiskBadge from "@/components/RiskBadge";
import { fetchSupplierNews } from "@/lib/data";

// Google 뉴스 RSS 실시간 크롤링 결과를 사용합니다. 30분 캐시 + 매일 09:00(KST) 강제 갱신.
export const revalidate = 1800;

export default async function NewsPage() {
  const news = await fetchSupplierNews();

  return (
    <>
      <h1>공급업체 뉴스 모니터링</h1>
      <p className="page-subtitle">
        Google 뉴스 실시간 크롤링(내부 평가 위험·유의 등급 업체 우선) + 내부 평가 보완 데이터
      </p>

      <div className="panel">
        <div className="panel-header">최근 수집 뉴스</div>
        <table>
          <thead>
            <tr>
              <th>공급업체</th>
              <th>내용</th>
              <th>출처</th>
              <th>게재 시각</th>
              <th>리스크</th>
            </tr>
          </thead>
          <tbody>
            {news.map((n) => (
              <tr key={n.id}>
                <td>{n.supplierName}</td>
                <td>
                  {n.link ? (
                    <a href={n.link} target="_blank" rel="noopener noreferrer" className="panel-link">
                      {n.headline}
                    </a>
                  ) : (
                    n.headline
                  )}
                </td>
                <td>{n.sourceName}</td>
                <td>{n.publishedAt}</td>
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
