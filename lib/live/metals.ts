import { safeFetchJson } from "./fetchUtils";

export interface LiveMaterialPrice {
  id: string;
  materialName: string;
  unit: string;
  currentPrice: number;
  changeRate: number;
  source: string;
  live: boolean;
  note?: string;
}

interface YahooChartResponse {
  chart: {
    result: {
      meta: {
        regularMarketPrice: number;
        chartPreviousClose: number;
        currency: string;
      };
    }[];
    error: unknown;
  };
}

const TICKERS: { id: string; symbol: string; materialName: string; unit: string }[] = [
  { id: "m-copper", symbol: "HG=F", materialName: "구리 (Copper)", unit: "USD/lb" },
  { id: "m-aluminum", symbol: "ALI=F", materialName: "알루미늄", unit: "USD/lb" },
  { id: "m-gold", symbol: "GC=F", materialName: "금 (설비/부품 원가 지표)", unit: "USD/oz" },
  { id: "m-oil", symbol: "CL=F", materialName: "WTI 원유 (물류·유가 지표)", unit: "USD/배럴" },
];

// 무료·키 없이 구할 수 있는 안정적인 공개 API가 없는 품목입니다.
// KOMIS(한국자원정보서비스) 등에서 API 키를 발급받아 이 자리를 채우세요.
const NO_FREE_SOURCE: LiveMaterialPrice[] = [
  {
    id: "m-nickel",
    materialName: "니켈",
    unit: "USD/톤",
    currentPrice: 0,
    changeRate: 0,
    source: "미연동",
    live: false,
    note: "무료 공개 API 없음 - LME 또는 KOMIS API 키 연동 필요",
  },
  {
    id: "m-pp",
    materialName: "폴리프로필렌(PP)",
    unit: "KRW/kg",
    currentPrice: 0,
    changeRate: 0,
    source: "미연동",
    live: false,
    note: "무료 공개 API 없음 - 석유화학 업종 시황 API 연동 필요",
  },
];

/**
 * Yahoo Finance 비공식 차트 엔드포인트에서 선물 시세를 가져옵니다.
 * 공식 API가 아니라서 요청 빈도가 높거나 서버가 클라우드(Vercel 등) IP에서 호출할 경우
 * 간헐적으로 차단/오류가 날 수 있습니다. 안정적인 운영을 원하면 twelvedata, metals-api 등
 * 키 기반 유료/무료 티어 API로 교체하세요.
 */
export async function fetchLiveMetalPrices(): Promise<LiveMaterialPrice[]> {
  const live = await Promise.all(
    TICKERS.map(async (t) => {
      const data = await safeFetchJson<YahooChartResponse>(
        `https://query1.finance.yahoo.com/v8/finance/chart/${t.symbol}?interval=1d&range=5d`,
        {
          revalidateSeconds: 1800,
          timeoutMs: 6000,
          tags: ["metal-prices"],
          headers: { "User-Agent": "Mozilla/5.0 (compatible; SCM-Monitoring-Bot/1.0)" },
        }
      );
      const meta = data?.chart?.result?.[0]?.meta;
      if (!meta) return null;
      const changeRate =
        ((meta.regularMarketPrice - meta.chartPreviousClose) / meta.chartPreviousClose) * 100;
      return {
        id: t.id,
        materialName: t.materialName,
        unit: t.unit,
        currentPrice: meta.regularMarketPrice,
        changeRate: Math.round(changeRate * 100) / 100,
        source: "Yahoo Finance",
        live: true,
      } as LiveMaterialPrice;
    })
  );

  const succeeded = live.filter((v): v is LiveMaterialPrice => v !== null);
  const failedTickers = TICKERS.filter((t) => !succeeded.some((s) => s.id === t.id));
  const failedFallback: LiveMaterialPrice[] = failedTickers.map((t) => ({
    id: t.id,
    materialName: t.materialName,
    unit: t.unit,
    currentPrice: 0,
    changeRate: 0,
    source: "조회 실패",
    live: false,
    note: "실시간 소스 응답 없음 - 다음 새로고침에서 재시도",
  }));

  return [...succeeded, ...failedFallback, ...NO_FREE_SOURCE];
}
