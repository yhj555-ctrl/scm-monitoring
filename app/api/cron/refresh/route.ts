import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";

/**
 * Vercel Cron이 매일 09:00(KST) 무렵 호출하는 엔드포인트.
 * vercel.json의 crons는 UTC 기준이라 "0 0 * * *"(UTC 00:00 = KST 09:00)로 등록되어 있습니다.
 * (Hobby 플랜은 정시가 아니라 해당 UTC 1시간 내 임의 시각에 실행됩니다.)
 *
 * Vercel은 CRON_SECRET 환경변수를 프로젝트에 자동으로 설정해 주고,
 * 크론 요청에 Authorization: Bearer <CRON_SECRET> 헤더를 함께 보냅니다.
 * 아래에서 이 값을 검증해, 외부에서 이 URL을 직접 호출해 데이터를 강제로 갱신시키는 것을 막습니다.
 */
export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  revalidateTag("supplier-news");
  revalidateTag("fx-rates");
  revalidateTag("metal-prices");

  return NextResponse.json({
    ok: true,
    revalidated: ["supplier-news", "fx-rates", "metal-prices"],
    revalidatedAt: new Date().toISOString(),
  });
}
