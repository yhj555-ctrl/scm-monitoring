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
      <head>
        {/* Pretendard 웹폰트 (한글 가독성). 로드 실패 시 시스템 폰트로 폴백. */}
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body>
        <Nav />
        <main className="main">{children}</main>
      </body>
    </html>
  );
}
