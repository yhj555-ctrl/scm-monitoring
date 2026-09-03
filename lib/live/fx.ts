import { safeFetchJson } from "./fetchUtils";

export interface FxRate {
  currency: string;
  currencyName: string;
  rate: number; // 1 USD 당 해당 통화
}

interface FrankfurterResponse {
  amount: number;
  base: string;
  date: string;
  rates: Record<string, number>;
}

const CURRENCY_NAMES: Record<string, string> = {
  KRW: "원화",
  JPY: "엔화",
  EUR: "유로",
  CNY: "위안화",
  GBP: "파운드",
};

const FALLBACK_RATES: FxRate[] = [
  { currency: "KRW", currencyName: "원화", rate: 1390 },
  { currency: "JPY", currencyName: "엔화", rate: 149.5 },
  { currency: "EUR", currencyName: "유로", rate: 0.92 },
  { currency: "CNY", currencyName: "위안화", rate: 7.1 },
];

/**
 * Frankfurter.app(유럽중앙은행 기준환율 기반, 무료·키 불필요)에서 USD 기준 환율을 가져옵니다.
 * 실시간 은행 고시환율이 필요하면 한국수출입은행 Open API(키 발급 필요)로 교체하세요.
 */
export async function fetchLiveExchangeRates(): Promise<{ rates: FxRate[]; asOf: string; live: boolean }> {
  const data = await safeFetchJson<FrankfurterResponse>(
    "https://api.frankfurter.app/latest?from=USD&to=KRW,JPY,EUR,CNY",
    { revalidateSeconds: 1800, timeoutMs: 6000, tags: ["fx-rates"] }
  );

  if (!data) {
    return { rates: FALLBACK_RATES, asOf: "실시간 조회 실패 - 예시값", live: false };
  }

  const rates: FxRate[] = Object.entries(data.rates).map(([currency, rate]) => ({
    currency,
    currencyName: CURRENCY_NAMES[currency] ?? currency,
    rate,
  }));

  return { rates, asOf: data.date, live: true };
}
