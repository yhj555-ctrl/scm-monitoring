import { suppliers } from "@/lib/suppliers";
import { safeFetchJson } from "./fetchUtils";
import { kstParts } from "@/lib/time";

/**
 * 전자공시시스템(DART) OpenAPI 연동.
 *
 * 환경변수 DART_API_KEY(무료 발급: https://opendart.fss.or.kr) 가 설정된 경우에만 동작합니다.
 *
 * 방식: DART `list.json` 으로 "최근 N일 전체 공시"를 최신순으로 페이지 조회한 뒤,
 * 99개 공급업체명과 매칭되는 공시만 추립니다. (업체별 corp_code 조회 없이 1회성 목록만 사용)
 * 매일 08:00(KST) /api/cron/refresh 가 `dart-disclosures` 태그를 무효화합니다.
 *
 * 한계: 대다수 공급업체는 비상장·비외감이라 DART 공시 의무가 없어 매칭이 안 될 수 있습니다.
 *       회사명이 DART 등록명과 다르면(예: 법인격 표기 차이) 매칭이 누락될 수 있습니다.
 */

const WINDOW_DAYS = 7; // 모달에 보여줄 조회 구간
const RECENT_DAYS = 2; // "신규" 판정 구간 (어제~오늘, 크론이 매일 아침 실행되므로)
const MAX_PAGES = 12; // 100건 x 12 = 최근 1,200건. 하루~이틀치 신규 공시 판정에는 충분

export interface DartFiling {
  reportName: string;
  receiptNo: string;
  filerName: string;
  receiptDate: string; // "YYYY-MM-DD"
  corpName: string;
  url: string; // 개별 공시 문서 뷰어
}

export interface DartSupplierDisclosure {
  supplierId: string;
  supplierName: string;
  filings: DartFiling[]; // 최신순
  latestDate: string | null; // "YYYY-MM-DD"
  hasRecent: boolean; // RECENT_DAYS 이내 신규 공시 존재
  searchUrl: string; // DART 회사별 공시검색
}

export type DartResult =
  | { configured: false }
  | {
      configured: true;
      ok: true;
      checkedAt: string; // KST "YYYY.MM.DD HH:mm"
      windowDays: number;
      bySupplierId: Record<string, DartSupplierDisclosure>;
      matchedCount: number;
      recentCount: number;
      truncated: boolean;
    }
  | { configured: true; ok: false; error: string };

interface DartListRow {
  corp_code: string;
  corp_name: string;
  stock_code: string;
  report_nm: string;
  rcept_no: string;
  flr_nm: string;
  rcept_dt: string; // "YYYYMMDD"
}

interface DartListResponse {
  status: string;
  message: string;
  page_no?: number;
  page_count?: number;
  total_count?: number;
  total_page?: number;
  list?: DartListRow[];
}

function ymd(d: Date): string {
  const p = kstParts(d);
  return `${p.year}${p.month}${p.day}`;
}

function dashed(yyyymmdd: string): string {
  if (yyyymmdd.length !== 8) return yyyymmdd;
  return `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}`;
}

/** 회사명 정규화: 공백/괄호내용/법인격 표기 제거 */
function normName(s: string): string {
  return s
    .replace(/\([^)]*\)/g, "")
    .replace(/[（）()]/g, "")
    .replace(/주식회사|㈜|\(주\)/g, "")
    .replace(/\s+/g, "")
    .toLowerCase();
}

function nameMatches(supplierName: string, dartName: string): boolean {
  const a = normName(supplierName);
  const b = normName(dartName);
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.length >= 3 && b.length >= 3 && (a.includes(b) || b.includes(a))) return true;
  return false;
}

/**
 * DART 최근 공시 조회. `fetch` 자체가 Next 데이터 캐시(하루 + `dart-disclosures` 태그)를
 * 가지므로 별도 unstable_cache 없이 매 요청 시 캐시된 응답으로 재구성합니다.
 */
export async function fetchDartDisclosures(): Promise<DartResult> {
  const KEY = process.env.DART_API_KEY;
  if (!KEY) return { configured: false };

  const now = new Date();
  const bgn = new Date(now.getTime() - WINDOW_DAYS * 86400000);
  const bgnDe = ymd(bgn);
  const endDe = ymd(now);
  const recentThreshold = ymd(new Date(now.getTime() - (RECENT_DAYS - 1) * 86400000));

  const rows: DartListRow[] = [];
  let truncated = false;

  for (let page = 1; page <= MAX_PAGES; page++) {
    const url =
      `https://opendart.fss.or.kr/api/list.json?crtfc_key=${KEY}` +
      `&bgn_de=${bgnDe}&end_de=${endDe}&page_no=${page}&page_count=100&sort=date&sort_mth=desc`;
    const data = await safeFetchJson<DartListResponse>(url, {
      revalidateSeconds: 86400,
      timeoutMs: 7000,
      tags: ["dart-disclosures"],
    });

    if (!data) {
      if (page === 1) return { configured: true, ok: false, error: "DART 응답 없음 (네트워크/타임아웃)" };
      truncated = true;
      break;
    }
    if (data.status !== "000") {
      if (data.status === "013") break; // 조회된 데이터 없음
      if (page === 1) {
        return { configured: true, ok: false, error: `DART 오류 ${data.status}: ${data.message}` };
      }
      truncated = true;
      break;
    }

    rows.push(...(data.list ?? []));
    const totalPage = data.total_page ?? 1;
    if (page >= totalPage) break;
    if (page >= MAX_PAGES) {
      truncated = totalPage > MAX_PAGES;
      break;
    }
  }

  const bySupplierId: Record<string, DartSupplierDisclosure> = {};
  let recentCount = 0;

  for (const s of suppliers) {
    const matched = rows.filter((r) => nameMatches(s.name, r.corp_name));
    const searchUrl = `https://dart.fss.or.kr/dsab007/main.do?textCrpNm=${encodeURIComponent(s.name)}`;
    if (matched.length === 0) {
      bySupplierId[s.id] = {
        supplierId: s.id,
        supplierName: s.name,
        filings: [],
        latestDate: null,
        hasRecent: false,
        searchUrl,
      };
      continue;
    }
    const filings: DartFiling[] = matched
      .map((r) => ({
        reportName: r.report_nm,
        receiptNo: r.rcept_no,
        filerName: r.flr_nm,
        receiptDate: dashed(r.rcept_dt),
        corpName: r.corp_name,
        url: `https://dart.fss.or.kr/dsaf001/main.do?rcpNo=${r.rcept_no}`,
      }))
      .sort((a, b) => (a.receiptDate < b.receiptDate ? 1 : -1));

    const hasRecent = matched.some((r) => r.rcept_dt >= recentThreshold);
    if (hasRecent) recentCount += 1;

    bySupplierId[s.id] = {
      supplierId: s.id,
      supplierName: s.name,
      filings,
      latestDate: filings[0]?.receiptDate ?? null,
      hasRecent,
      searchUrl,
    };
  }

  const matchedCount = Object.values(bySupplierId).filter((d) => d.filings.length > 0).length;
  const p = kstParts(now);

  return {
    configured: true,
    ok: true,
    checkedAt: `${p.year}.${p.month}.${p.day} ${p.hour}:${p.minute}`,
    windowDays: WINDOW_DAYS,
    bySupplierId,
    matchedCount,
    recentCount,
    truncated,
  };
}
