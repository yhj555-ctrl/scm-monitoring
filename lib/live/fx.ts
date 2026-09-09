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
 * Frankfurter(유럽중앙은행 기준환율 기반, 무료·키 불필요)에서 USD 기준 환율을 가져옵니다.
 *
 * 2024년부터 기존 도메인 api.frankfurter.app 은 api.frankfurter.dev 로 301 리다이렉트됩니다.
 * (경로도 /latest -> /v1/latest 로 바뀜) 리다이렉트에 의존하지 않도록 새 정식 URL을 직접 호출합니다.
 *
 * 참고: ECB는 유럽 영업일 기준 하루 한 번(대략 CET 16:00) 고시하므로, 주말·공휴일이나
 * 이른 아침에는 `date` 가 전 영업일로 표시되는 것이 정상입니다. 실제 갱신 여부는
 * 페이지의 "마지막 갱신 시각(KST)" 으로 확인하세요. 은행 고시환율이 필요하면
 * 한국수출입은행 Open API(키 발급 필요)로 교체하세요.
 */
export async function fetchLiveExchangeRates(): Promise<{ rates: FxRate[]; asOf: string; live: boolean }> {
  const data = await safeFetchJson<FrankfurterResponse>(
    "https://api.frankfurter.dev/v1/latest?base=USD&symbols=KRW,JPY,EUR,CNY",
    { revalidateSeconds: 86400, timeoutMs: 6000, tags: ["fx-rates"] }
  );

  if (!data || !data.rates || Object.keys(data.rates).length === 0) {
    return { rates: FALLBACK_RATES, asOf: "실시간 조회 실패 - 예시값", live: false };
  }

  const rates: FxRate[] = Object.entries(data.rates).map(([currency, rate]) => ({
    currency,
    currencyName: CURRENCY_NAMES[currency] ?? currency,
    rate,
  }));

  return { rates, asOf: data.date, live: true };
}
