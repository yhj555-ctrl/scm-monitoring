import type { RiskLevel } from "@/lib/data";

export default function RiskBadge({ risk }: { risk: RiskLevel }) {
  const cls =
    risk === "상" ? "badge badge-high" : risk === "중" ? "badge badge-mid" : "badge badge-low";
  return <span className={cls}>리스크 {risk}</span>;
}
