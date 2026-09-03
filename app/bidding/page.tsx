import { fetchBiddingStatus } from "@/lib/data";

export const revalidate = 300;

export default async function BiddingPage() {
  const bids = await fetchBiddingStatus();

  return (
    <>
      <h1>입찰 계약 모니터링</h1>
      <p className="page-subtitle">진행 중인 입찰 건과 낙찰·계약 현황 추적</p>

      <div className="panel">
        <div className="panel-header">진행 현황</div>
        <table>
          <thead>
            <tr>
              <th>프로젝트</th>
              <th>공급업체</th>
              <th>단계</th>
              <th>예상 금액</th>
              <th>경쟁사 수</th>
              <th>갱신일</th>
            </tr>
          </thead>
          <tbody>
            {bids.map((b) => (
              <tr key={b.id}>
                <td>{b.projectName}</td>
                <td>{b.supplierName}</td>
                <td>{b.stage}</td>
                <td>{b.amount.toLocaleString()}원</td>
                <td>{b.competitorCount}개사</td>
                <td>{b.updatedAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
