import { safeFetchJson } from "./fetchUtils";

/**
 * 서울 현재 날씨 (Open-Meteo, 무료·키 불필요).
 * 상단 네비게이션의 "오늘 날짜·날씨" 표기에 사용됩니다.
 * 하루(86400초) 캐시 + 매일 08:00(KST) /api/cron/refresh 가 `weather` 태그를 무효화합니다.
 */

export interface SeoulWeather {
  tempC: number | null;
  description: string;
  icon: string;
  live: boolean;
}

interface OpenMeteoResponse {
  current?: {
    time: string;
    temperature_2m: number;
    weather_code: number;
  };
}

// WMO Weather interpretation codes (Open-Meteo 문서 기준)
const WEATHER_CODE_MAP: Record<number, { description: string; icon: string }> = {
  0: { description: "맑음", icon: "☀️" },
  1: { description: "대체로 맑음", icon: "🌤️" },
  2: { description: "구름 조금", icon: "⛅" },
  3: { description: "흐림", icon: "☁️" },
  45: { description: "안개", icon: "🌫️" },
  48: { description: "짙은 안개", icon: "🌫️" },
  51: { description: "약한 이슬비", icon: "🌦️" },
  53: { description: "이슬비", icon: "🌦️" },
  55: { description: "강한 이슬비", icon: "🌧️" },
  56: { description: "언 이슬비", icon: "🌧️" },
  57: { description: "강한 언 이슬비", icon: "🌧️" },
  61: { description: "약한 비", icon: "🌧️" },
  63: { description: "비", icon: "🌧️" },
  65: { description: "강한 비", icon: "🌧️" },
  66: { description: "언 비", icon: "🌧️" },
  67: { description: "강한 언 비", icon: "🌧️" },
  71: { description: "약한 눈", icon: "🌨️" },
  73: { description: "눈", icon: "🌨️" },
  75: { description: "강한 눈", icon: "❄️" },
  77: { description: "싸락눈", icon: "❄️" },
  80: { description: "약한 소나기", icon: "🌦️" },
  81: { description: "소나기", icon: "🌧️" },
  82: { description: "강한 소나기", icon: "⛈️" },
  85: { description: "약한 눈 소나기", icon: "🌨️" },
  86: { description: "강한 눈 소나기", icon: "🌨️" },
  95: { description: "뇌우", icon: "⛈️" },
  96: { description: "우박 동반 뇌우", icon: "⛈️" },
  99: { description: "강한 우박 동반 뇌우", icon: "⛈️" },
};

const FALLBACK: SeoulWeather = {
  tempC: null,
  description: "조회 실패",
  icon: "⛅",
  live: false,
};

export async function fetchSeoulWeather(): Promise<SeoulWeather> {
  const data = await safeFetchJson<OpenMeteoResponse>(
    "https://api.open-meteo.com/v1/forecast?latitude=37.5665&longitude=126.978&current=temperature_2m,weather_code&timezone=Asia%2FSeoul",
    { revalidateSeconds: 86400, timeoutMs: 6000, tags: ["weather"] }
  );

  const current = data?.current;
  if (!current) return FALLBACK;

  const info = WEATHER_CODE_MAP[current.weather_code] ?? { description: "-", icon: "⛅" };
  return {
    tempC: Math.round(current.temperature_2m),
    description: info.description,
    icon: info.icon,
    live: true,
  };
}
