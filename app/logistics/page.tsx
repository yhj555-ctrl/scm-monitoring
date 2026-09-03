import RiskBadge from "@/components/RiskBadge";
import { fetchLogisticsStatus } from "@/lib/data";

export const revalidate = 300;

export default async function LogisticsPage() {
  const shipments = await fetchLogisticsStatus();

  return (
    <>
      <h1>물류 리드타임 모니터링</h1>
      <p className="page-subtitle">주요 선적 구간의 지연·통관 리스크 실시간 추적</p>

      <div className="panel">
        <div className="panel-header">구간별 현황</div>
        <table>
          <thead>
            <tr>
              <th>구간</th>
              <th>선사</th>
              <th>상태</th>
              <th>지연일</th>
              <th>갱신 시각</th>
              <th>리스크</th>
            </tr>
          </thead>
          <tbody>
            {shipments.map((l) => (
              <tr key={l.id}>
                <td>{l.route}</td>
                <td>{l.carrier}</td>
                <td>{l.status}</td>
                <td>{l.delayDays > 0 ? `${l.delayDays}일` : "-"}</td>
                <td>{l.updatedAt}</td>
                <td>
                  <RiskBadge risk={l.risk} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
