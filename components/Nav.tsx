import Link from "next/link";

const links = [
  { href: "/", label: "리스크 대시보드" },
  { href: "/materials", label: "원자재 가격" },
  { href: "/news", label: "공급업체 뉴스" },
  { href: "/logistics", label: "물류 리드타임" },
  { href: "/bidding", label: "입찰 계약" },
];

export default function Nav() {
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
    </header>
  );
}
