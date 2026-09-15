"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const links = [
  { href: "/", label: "리스크 대시보드" },
  { href: "/suppliers", label: "업체평가 리스크관리" },
  { href: "/materials", label: "원자재·환율" },
  { href: "/news", label: "공급업체 뉴스" },
  { href: "/logistics", label: "물류 리드타임" },
  { href: "/competitors", label: "경쟁사 동향" },
];

export interface NavInfo {
  todayLabel: string; // "9월 15일(화)"
  weatherIcon: string;
  weatherDescription: string;
  weatherTempC: number | null;
  usdKrw: number | null;
  asOfTime: string; // "08:00"
}

export default function Nav({ info }: { info: NavInfo }) {
  const pathname = usePathname();
  const router = useRouter();

  // 로그인 화면에서는 상단 네비게이션을 숨깁니다.
  if (pathname === "/login") return null;

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <header className="nav">
      <div className="nav-title">구매팀 SCM 모니터링</div>
      <nav className="nav-links">
        {links.map((link) => (
          <Link key={link.href} href={link.href} className="nav-link">
            {link.label}
          </Link>
        ))}
      </nav>
      <div className="nav-info">
        <div className="nav-info-line">
          <span>{info.todayLabel}</span>
          <span className="dot">
            {info.weatherIcon} 서울 {info.weatherDescription}
            {info.weatherTempC !== null ? ` ${info.weatherTempC}°C` : ""}
          </span>
        </div>
        <div className="nav-info-line">
          <span>
            USD{" "}
            {info.usdKrw !== null
              ? `${info.usdKrw.toLocaleString("ko-KR", { maximumFractionDigits: 2 })}원`
              : "-"}
          </span>
          <span className="dot">{info.asOfTime} 기준</span>
        </div>
      </div>
      <button type="button" className="nav-logout" onClick={handleLogout}>
        로그아웃
      </button>
    </header>
  );
}
