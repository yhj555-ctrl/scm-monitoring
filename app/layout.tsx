import type { Metadata } from "next";
import Nav from "@/components/Nav";
import type { NavInfo } from "@/components/Nav";
import { fetchExchangeRates, fetchSeoulWeather } from "@/lib/data";
import { kstDateShort, kstTime } from "@/lib/time";
import "./globals.css";

export const metadata: Metadata = {
  title: "구매팀 SCM 모니터링",
  description: "공급업체·원자재·환율·물류 리스크 모니터링 대시보드",
};

// 상단 네비게이션의 날짜/날씨/환율은 하루 캐시 + 매일 08:00(KST) 자동 갱신 (앱 전체와 동일한 주기).
export const revalidate = 86400;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [fx, weather] = await Promise.all([fetchExchangeRates(), fetchSeoulWeather()]);
  const usd = fx.rates.find((r) => r.currency === "KRW");

  const navInfo: NavInfo = {
    todayLabel: kstDateShort(new Date()),
    weatherIcon: weather.icon,
    weatherDescription: weather.description,
    weatherTempC: weather.tempC,
    usdKrw: usd ? usd.rate : null,
    asOfTime: kstTime(new Date()),
  };

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
        <Nav info={navInfo} />
        <main className="main">{children}</main>
      </body>
    </html>
  );
}
