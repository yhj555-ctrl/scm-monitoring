import RiskBadge from "@/components/RiskBadge";
import { fetchMaterialPrices } from "@/lib/data";

export const revalidate = 300;

export default async function MaterialsPage() {
  const materials = await fetchMaterialPrices();

  return (
    <>
      <h1>원자재 가격 모니터링</h1>
      <p className="page-subtitle">
        LME · KOMIS 등 시세 데이터 기반 원부자재 가격 추적 대시보드
      </p>

      <div className="panel">
        <div className="panel-header">전체 원자재 시세</div>
        <table>
          <thead>
            <tr>
              <th>품목</th>
              <th>현재가</th>
              <th>변동률</th>
              <th>출처</th>
              <th>갱신 시각</th>
              <th>리스크</th>
            </tr>
          </thead>
          <tbody>
            {materials.map((m) => (
              <tr key={m.id}>
                <td>{m.materialName}</td>
                <td>
                  {m.currentPrice.toLocaleString()} {m.unit}
                </td>
                <td className={m.changeRate >= 0 ? "change-up" : "change-down"}>
                  {m.changeRate >= 0 ? "+" : ""}
                  {m.changeRate}%
                </td>
                <td>{m.source}</td>
                <td>{m.updatedAt}</td>
                <td>
                  <RiskBadge risk={m.risk} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
