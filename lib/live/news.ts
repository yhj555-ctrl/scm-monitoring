import { suppliers, gradeToRisk, RiskTier } from "@/lib/suppliers";
import { safeFetchText } from "./fetchUtils";

export interface LiveNewsItem {
  id: string;
  supplierName: string;
  title: string;
  link: string;
  source: string;
  publishedAt: string; // ISO 문자열 ("" = 파싱 불가)
  publishedTs: number; // 정렬용 epoch ms (0 = 알 수 없음)
  risk: RiskTier;
}

export interface CommodityNewsItem {
  id: string;
  topic: string; // "구리", "환율" 등
  title: string;
  link: string;
  source: string;
  publishedAt: string;
  publishedTs: number;
}

export type CompetitorCompany = "KT" | "LG유플러스" | "SK텔레콤";

export interface CompetitorNewsItem {
  id: string;
  company: CompetitorCompany;
  title: string;
  link: string;
  source: string;
  publishedAt: string;
  publishedTs: number;
}

// 크롤링 대상은 내부 평가상 "유의/위험" 등급 업체로 한정합니다.
// 99개 전체를 매 요청마다 크롤링하면 응답이 너무 느려지고, 뉴스 소스에도 과도한 부하를 줍니다.
// 우선순위: 위험 등급 먼저, 그 다음 유의 등급, 최대 18개 업체까지.
const PRIORITY_SUPPLIERS = [...suppliers]
  .filter((s) => gradeToRisk(s.grade) !== "하")
  .sort((a, b) => (a.totalScore ?? 999) - (b.totalScore ?? 999))
  .slice(0, 18);

// 원자재·환율 페이지 하단에 노출할 뉴스 주제 (한국어 검색어).
const COMMODITY_TOPICS: { topic: string; query: string }[] = [
  { topic: "구리·비철", query: "구리 시세 OR 전기동 OR LME" },
  { topic: "알루미늄", query: "알루미늄 가격 OR 알루미늄 시황" },
  { topic: "니켈", query: "니켈 가격 OR 니켈 시세" },
  { topic: "유가", query: "국제유가 OR WTI OR 브렌트유" },
  { topic: "환율", query: "원달러 환율 OR 원엔 환율 OR 위안화 환율" },
  { topic: "석유화학", query: "폴리프로필렌 OR 나프타 OR 석유화학 시황" },
];

// 경쟁사 동향 페이지의 통신사별 검색어 (장비·서비스 구매, 공급업체·협력사·조달 관련).
const COMPETITOR_TOPICS: { company: CompetitorCompany; query: string }[] = [
  {
    company: "KT",
    query: "KT 장비 구매 OR KT 공급업체 OR KT 협력사 OR KT 조달 OR KT 구매",
  },
  {
    company: "LG유플러스",
    query:
      "LG유플러스 장비 구매 OR LG유플러스 공급업체 OR LG유플러스 협력사 OR LG유플러스 조달",
  },
  {
    company: "SK텔레콤",
    query:
      "SK텔레콤 장비 구매 OR SK텔레콤 공급업체 OR SK텔레콤 협력사 OR SK텔레콤 조달",
  },
];

const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

/** 괄호 안 내용·공백 제거 + 소문자화. 업체명이 기사 제목에 실제로 포함됐는지 비교할 때 사용. */
function normalizeForMatch(s: string): string {
  return s
    .replace(/\([^)]*\)/g, "")
    .replace(/\s+/g, "")
    .toLowerCase();
}

/**
 * Google 뉴스 검색이 느슨하게 매칭한 오탐(관련 없는 기사)을 걸러내기 위해,
 * 업체명이 기사 제목에 실제로 포함되는지 한 번 더 확인합니다.
 */
function titleMentionsSupplier(title: string, supplierName: string): boolean {
  const normName = normalizeForMatch(supplierName);
  if (!normName) return false;
  return normalizeForMatch(title).includes(normName);
}

function decodeXmlEntities(s: string): string {
  return s
    .replace(/<!\[CDATA\[/g, "")
    .replace(/\]\]>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function extractTag(block: string, tag: string): string | null {
  const match = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
  return match ? decodeXmlEntities(match[1]) : null;
}

/** RSS pubDate(RFC822) -> { iso, ts }. 파싱 실패 시 { "", 0 }. */
function parsePubDate(pubDate: string): { iso: string; ts: number } {
  const ts = Date.parse(pubDate);
  if (Number.isNaN(ts)) return { iso: "", ts: 0 };
  return { iso: new Date(ts).toISOString(), ts };
}

/**
 * Google 뉴스 RSS(공개, 무료, API 키 불필요)를 파싱합니다.
 * https://news.google.com/rss/search?q=검색어&hl=ko&gl=KR&ceid=KR:ko
 * 실서비스 안정성을 더 높이려면 빅카인즈/네이버 뉴스 검색 API(키 발급 필요)로 교체하세요.
 */
async function fetchGoogleNewsRss(
  query: string,
  limit: number,
  cacheTag: string
): Promise<{ title: string; link: string; source: string; iso: string; ts: number }[]> {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(
    query
  )}&hl=ko&gl=KR&ceid=KR:ko`;
  const xml = await safeFetchText(url, {
    revalidateSeconds: 86400, // 하루 캐시 + 매일 08:00(KST) 크론에서 강제 갱신
    timeoutMs: 6000,
    tags: [cacheTag],
    headers: { "User-Agent": "Mozilla/5.0 (compatible; SCM-Monitoring-Bot/1.0)" },
  });
  if (!xml) return [];

  const items = xml.match(/<item>[\s\S]*?<\/item>/g) ?? [];
  return items.slice(0, limit).flatMap((block) => {
    const title = extractTag(block, "title");
    const link = extractTag(block, "link");
    const pubDate = extractTag(block, "pubDate");
    const source = extractTag(block, "source") ?? "Google 뉴스";
    if (!title || !link) return [];
    const { iso, ts } = parsePubDate(pubDate ?? "");
    return [{ title, link, source, iso, ts }];
  });
}

/**
 * 우선순위 공급업체 각각에 대해 최신 뉴스를 실시간으로 조회합니다.
 * 소스 장애 시 해당 업체만 건너뛰고(빈 배열), 페이지 전체가 깨지지 않도록 합니다.
 *
 * 검색 결과는 두 단계로 걸러냅니다:
 *  1. 업체명이 기사 제목에 실제로 포함되는지 재검증 (검색엔진의 느슨한 매칭으로 인한 오탐 방지)
 *  2. 게재일이 1년 이내인 기사만 유지 — 매일 새로 조회하는 구조라 1년이 지난 기사는
 *     다음 갱신부터 자동으로 결과에서 빠집니다(별도 저장소가 없어 "삭제"할 데이터 자체가 없습니다).
 *
 * 결과는 게재 시각 최신순으로 정렬합니다.
 */
export async function fetchLiveSupplierNews(): Promise<LiveNewsItem[]> {
  const now = Date.now();
  const results = await Promise.all(
    PRIORITY_SUPPLIERS.map(async (s) => {
      const articles = await fetchGoogleNewsRss(`"${s.name}"`, 2, "supplier-news");
      return articles
        .filter((a) => titleMentionsSupplier(a.title, s.name))
        .filter((a) => a.ts > 0 && now - a.ts <= ONE_YEAR_MS)
        .map((a, idx) => ({
          id: `live-${s.id}-${idx}`,
          supplierName: s.name,
          title: a.title,
          link: a.link,
          source: a.source,
          publishedAt: a.iso,
          publishedTs: a.ts,
          risk: gradeToRisk(s.grade),
        }));
    })
  );

  return results.flat().sort((a, b) => b.publishedTs - a.publishedTs);
}

/**
 * 원자재·환율 관련 최신 뉴스. 주제별로 2건씩 모아 게재 시각 최신순으로 정렬합니다.
 */
export async function fetchLiveCommodityNews(): Promise<CommodityNewsItem[]> {
  const results = await Promise.all(
    COMMODITY_TOPICS.map(async ({ topic, query }) => {
      const articles = await fetchGoogleNewsRss(query, 2, "commodity-news");
      return articles.map((a, idx) => ({
        id: `commodity-${topic}-${idx}`,
        topic,
        title: a.title,
        link: a.link,
        source: a.source,
        publishedAt: a.iso,
        publishedTs: a.ts,
      }));
    })
  );

  return results.flat().sort((a, b) => b.publishedTs - a.publishedTs);
}

/**
 * 경쟁사(KT/LG유플러스/SK텔레콤) 장비·서비스 구매, 공급업체 관련 최신 뉴스.
 * 통신사별로 최대 8건씩 모아 게재 시각 최신순으로 정렬합니다.
 */
export async function fetchLiveCompetitorNews(): Promise<CompetitorNewsItem[]> {
  const results = await Promise.all(
    COMPETITOR_TOPICS.map(async ({ company, query }) => {
      const articles = await fetchGoogleNewsRss(query, 8, "competitor-news");
      return articles.map((a, idx) => ({
        id: `competitor-${company}-${idx}`,
        company,
        title: a.title,
        link: a.link,
        source: a.source,
        publishedAt: a.iso,
        publishedTs: a.ts,
      }));
    })
  );

  return results.flat().sort((a, b) => b.publishedTs - a.publishedTs);
}
