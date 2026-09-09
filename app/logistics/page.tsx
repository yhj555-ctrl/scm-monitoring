import RiskBadge from "@/components/RiskBadge";
import { fetchLogisticsStatus } from "@/lib/data";
import { kstDateTime } from "@/lib/time";

// 매일 08:00(KST) 기준 스냅샷. 하루 캐시 + /api/cron/refresh 로 갱신.
export const revalidate = 86400;

const REGION_ORDER = ["중국", "대만", "미국"] as const;

export default async function LogisticsPage() {
  const shipments = await fetchLogisticsStatus();
  const refreshedAt = kstDateTime(new Date());

  const grouped = REGION_ORDER.map((region) => ({
    region,
    rows: shipments.filter((s) => s.region === region),
  })).filter((g) => g.rows.length > 0);

  return (
    <>
      <h1>물류 리드타임 모니터링</h1>
      <p className="page-subtitle">
        중국 · 대만 · 미국 주요 구간의 리드타임·지연 리스크 (매일 08:00 KST 갱신)
      </p>
      <p className="page-meta">
        마지막 갱신 시각(KST): <strong>{refreshedAt}</strong> · 스냅샷 기준일{" "}
        {shipments[0]?.updatedAt ?? "-"}
      </p>

      {grouped.map((g) => (
        <div className="panel" key={g.region}>
          <div className="panel-header">{g.region} 구간</div>
          <table>
            <thead>
              <tr>
                <th>구간</th>
                <th>운송사</th>
                <th>모드</th>
                <th>현재 리드타임</th>
                <th>평시 대비</th>
                <th>상태</th>
                <th>리스크</th>
              </tr>
            </thead>
            <tbody>
              {g.rows.map((l) => (
                <tr key={l.id}>
                  <td>
                    {l.route}
                    {l.note && <span className="grade-text">{l.note}</span>}
                  </td>
                  <td>{l.carrier}</td>
                  <td>{l.mode}</td>
                  <td>{l.leadTimeDays}일</td>
                  <td className={l.delayDays > 0 ? "change-up" : "change-down"}>
                    {l.delayDays > 0 ? `+${l.delayDays}일` : "정상"}
                  </td>
                  <td>{l.status}</td>
                  <td>
                    <RiskBadge risk={l.risk} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      <div className="panel">
        <div className="panel-footnote">
          현재 화면은 목업 스냅샷입니다. 실제 연동 시 선사·포워더 스케줄 API, Freightos/Drewry
          운임지수, 미국 항만(LA/LB) 대기 데이터, 관세청 통관 정보를 `lib/data.ts` 의
          `fetchLogisticsStatus` 에 연결하세요.
        </div>
      </div>
    </>
  );
}
