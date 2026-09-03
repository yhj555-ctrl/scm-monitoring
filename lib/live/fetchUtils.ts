/**
 * 외부 실시간 데이터 소스 호출 공용 유틸.
 * 모든 실시간 fetch는 이 헬퍼를 통해서만 호출합니다:
 *  - 타임아웃을 걸어 응답이 느린 소스가 페이지 전체를 물고 늘어지지 않게 합니다.
 *  - revalidateSeconds/tags는 Next.js Data Cache에 그대로 전달되어,
 *    /api/cron/refresh 에서 revalidateTag()로 특정 태그만 즉시 갱신할 수 있습니다.
 *  - 실패 시 null을 반환하므로, 호출부는 항상 폴백(fallback) 데이터를 준비해야 합니다.
 */

interface FetchOptions extends RequestInit {
  revalidateSeconds?: number;
  timeoutMs?: number;
  tags?: string[];
}

export async function safeFetchText(url: string, opts: FetchOptions = {}): Promise<string | null> {
  const { revalidateSeconds = 1800, timeoutMs = 6000, tags, ...rest } = opts;
  try {
    const res = await fetch(url, {
      ...rest,
      next: { revalidate: revalidateSeconds, tags },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

export async function safeFetchJson<T>(url: string, opts: FetchOptions = {}): Promise<T | null> {
  const { revalidateSeconds = 1800, timeoutMs = 6000, tags, ...rest } = opts;
  try {
    const res = await fetch(url, {
      ...rest,
      next: { revalidate: revalidateSeconds, tags },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}
