import type { Metadata } from "next";
import Nav from "@/components/Nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "구매팀 SCM 모니터링",
  description: "공급업체·원자재·환율·물류 리스크 모니터링 대시보드",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <Nav />
        <main className="main">{children}</main>
      </body>
    </html>
  );
}
