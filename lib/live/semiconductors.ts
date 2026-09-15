import { safeFetchJson } from "./fetchUtils";
import type { LiveMaterialPrice } from "./metals";

/**
 * 메모리(DDR)·주요 칩셋 관련 지표.
 *
 * DRAM/NAND 현물가(DRAMeXchange, TrendForce, Omdia 등)는 무료 공개 API가 없어
 * 직접 연동할 수 없습니다. 대신 관련 대표 종목의 실시간 주가를 "메모리/파운드리 관련주"로
 * 함께 보여줘서 최소한의 방향성 지표로 삼습니다 — 실제 칩 현물가와는 다른 수치이니
 * 표에서 명확히 "주가"로 구분 표기합니다.
 */

interface YahooChartResponse {
  chart: {
    result: {
      meta: {
        regularMarketPrice: number;
        chartPreviousClose: number;
        currency: string;
        regularMarketTime?: number;
      };
    }[];
    error: unknown;
  };
}

const STOCK_TICKERS: { id: string; symbol: string; materialName: string; unit: string }[] = [
  { id: "chip-samsung", symbol: "005930.KS", materialName: "삼성전자 (메모리 관련주)", unit: "원" },
  { id: "chip-skhynix", symbol: "000660.KS", materialName: "SK하이닉스 (메모리 관련주)", unit: "원" },
  { id: "chip-micron", symbol: "MU", materialName: "Micron (메모리 관련주)", unit: "USD" },
  { id: "chip-tsmc", symbol: "TSM", materialName: "TSMC (파운드리 관련주)", unit: "USD" },
];

// DRAM/NAND 현물가는 TrendForce·DRAMeXchange·Omdia 등 유료 구독 소스가 대부분이라
// 무료 공개 API로는 직접 연동할 수 없는 항목입니다. 자리만 마련해뒀습니다.
const NO_FREE_SOURCE: LiveMaterialPrice[] = [
  {
    id: "chip-ddr4",
    materialName: "DDR4 현물가",
    unit: "USD",
    currentPrice: 0,
    changeRate: 0,
    source: "미연동",
    live: false,
    note: "무료 공개 API 없음 - DRAMeXchange/TrendForce 등 유료 소스 연동 필요",
  },
  {
    id: "chip-ddr5",
    materialName: "DDR5 현물가",
    unit: "USD",
    currentPrice: 0,
    changeRate: 0,
    source: "미연동",
    live: false,
    note: "무료 공개 API 없음 - DRAMeXchange/TrendForce 등 유료 소스 연동 필요",
  },
  {
    id: "chip-nand",
    materialName: "NAND 현물가",
    unit: "USD",
    currentPrice: 0,
    changeRate: 0,
    source: "미연동",
    live: false,
    note: "무료 공개 API 없음 - DRAMeXchange/TrendForce 등 유료 소스 연동 필요",
  },
];

/**
 * 삼성전자·SK하이닉스·Micron·TSMC 주가를 Yahoo Finance 비공식 차트 엔드포인트에서 가져옵니다.
 * (lib/live/metals.ts 와 동일한 방식) DRAM 현물가 자체가 아니라 "관련주" 대리 지표입니다.
 */
export async function fetchLiveSemiconductorPrices(): Promise<LiveMaterialPrice[]> {
  const live = await Promise.all(
    STOCK_TICKERS.map(async (t) => {
      const data = await safeFetchJson<YahooChartResponse>(
        `https://query1.finance.yahoo.com/v8/finance/chart/${t.symbol}?interval=1d&range=5d`,
        {
          revalidateSeconds: 86400,
          timeoutMs: 6000,
          tags: ["semiconductor-prices"],
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
        source: "Yahoo Finance (주가)",
        live: true,
        marketTime: meta.regularMarketTime,
      } as LiveMaterialPrice;
    })
  );

  const succeeded = live.filter((v): v is LiveMaterialPrice => v !== null);
  const failedTickers = STOCK_TICKERS.filter((t) => !succeeded.some((s) => s.id === t.id));
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
