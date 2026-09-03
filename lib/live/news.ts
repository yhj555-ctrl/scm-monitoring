import { suppliers, gradeToRisk, RiskTier } from "@/lib/suppliers";
import { safeFetchText } from "./fetchUtils";

export interface LiveNewsItem {
  id: string;
  supplierName: string;
  title: string;
  link: string;
  source: string;
  publishedAt: string;
  risk: RiskTier;
}

// 크롤링 대상은 내부 평가상 "유의/위험" 등급 업체로 한정합니다.
// 99개 전체를 매 요청마다 크롤링하면 응답이 너무 느려지고, 뉴스 소스에도 과도한 부하를 줍니다.
// 우선순위: 위험 등급 먼저, 그 다음 유의 등급, 최대 18개 업체까지.
const PRIORITY_SUPPLIERS = [...suppliers]
  .filter((s) => gradeToRisk(s.grade) !== "하")
  .sort((a, b) => (a.totalScore ?? 999) - (b.totalScore ?? 999))
  .slice(0, 18);

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

/**
 * Google 뉴스 RSS(공개, 무료, API 키 불필요)를 파싱합니다.
 * https://news.google.com/rss/search?q=검색어&hl=ko&gl=KR&ceid=KR:ko
 * 실서비스 안정성을 더 높이려면 빅카인즈/네이버 뉴스 검색 API(키 발급 필요)로 교체하세요.
 */
async function fetchGoogleNewsRss(
  query: string,
  limit: number
): Promise<{ title: string; link: string; source: string; pubDate: string }[]> {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(
    query
  )}&hl=ko&gl=KR&ceid=KR:ko`;
  const xml = await safeFetchText(url, {
    revalidateSeconds: 1800,
    timeoutMs: 6000,
    tags: ["supplier-news"],
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
    return [{ title, link, source, pubDate: pubDate ?? "" }];
  });
}

/**
 * 우선순위 공급업체 각각에 대해 최신 뉴스를 실시간으로 조회합니다.
 * 소스 장애 시 해당 업체만 건너뛰고(빈 배열), 페이지 전체가 깨지지 않도록 합니다.
 */
export async function fetchLiveSupplierNews(): Promise<LiveNewsItem[]> {
  const results = await Promise.all(
    PRIORITY_SUPPLIERS.map(async (s) => {
      const articles = await fetchGoogleNewsRss(`"${s.name}"`, 2);
      return articles.map((a, idx) => ({
        id: `live-${s.id}-${idx}`,
        supplierName: s.name,
        title: a.title,
        link: a.link,
        source: a.source,
        publishedAt: a.pubDate,
        risk: gradeToRisk(s.grade),
      }));
    })
  );

  return results.flat().sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1));
}
