import RiskBadge from "@/components/RiskBadge";
import { fetchSupplierNews } from "@/lib/data";

export const revalidate = 300;

export default async function NewsPage() {
  const news = await fetchSupplierNews();

  return (
    <>
      <h1>공급업체 뉴스 모니터링</h1>
      <p className="page-subtitle">
        재무·법적분쟁·ESG·경영권 이슈 등 공급업체 관련 언론·공시 실시간 추적
      </p>

      <div className="panel">
        <div className="panel-header">최근 수집 뉴스</div>
        <table>
          <thead>
            <tr>
              <th>공급업체</th>
              <th>헤드라인</th>
              <th>분류</th>
              <th>출처</th>
              <th>게재 시각</th>
              <th>리스크</th>
            </tr>
          </thead>
          <tbody>
            {news.map((n) => (
              <tr key={n.id}>
                <td>{n.supplierName}</td>
                <td>{n.headline}</td>
                <td>{n.category}</td>
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
