/**
 * 아이디/비밀번호 로그인용 세션 유틸.
 *
 * 별도 DB 없이, 서버가 아는 비밀키(AUTH_SECRET)로 HMAC 서명한 세션 토큰을
 * httpOnly 쿠키에 담아 로그인 상태를 유지합니다. 미들웨어(Edge)와 API 라우트(Node)
 * 양쪽에서 쓰이므로 Web Crypto(crypto.subtle)만 사용합니다.
 *
 * 계정 정보는 환경변수로 덮어쓸 수 있고, 없으면 기본값을 씁니다.
 *   - AUTH_USERNAME (기본: procurement)
 *   - AUTH_PASSWORD (기본: rnaoxla2026!)
 *   - AUTH_SECRET   (기본: 개발용 문자열 — 운영에서는 반드시 Vercel 환경변수로 설정)
 */

export const AUTH_USERNAME = process.env.AUTH_USERNAME ?? "procurement";
export const AUTH_PASSWORD = process.env.AUTH_PASSWORD ?? "rnaoxla2026!";
const AUTH_SECRET =
  process.env.AUTH_SECRET ?? "scm-monitoring-dev-secret-please-override-in-vercel";

export const SESSION_COOKIE = "scm_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 12; // 12시간

const encoder = new TextEncoder();

function toBase64Url(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let bin = "";
  for (let i = 0; i < arr.length; i++) bin += String.fromCharCode(arr[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(s: string): string {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  return atob(b64);
}

async function getKey(): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(AUTH_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
}

export async function createSessionToken(username: string): Promise<string> {
  const expiresAt = Date.now() + SESSION_TTL_SECONDS * 1000;
  const payload = `${username}|${expiresAt}`;
  const key = await getKey();
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return `${toBase64Url(encoder.encode(payload))}.${toBase64Url(sig)}`;
}

export async function verifySessionToken(
  token: string | undefined | null
): Promise<boolean> {
  if (!token) return false;
  const [payloadB64, sigB64] = token.split(".");
  if (!payloadB64 || !sigB64) return false;

  let payload: string;
  try {
    payload = fromBase64Url(payloadB64);
  } catch {
    return false;
  }

  const key = await getKey();
  const expectedSig = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  if (toBase64Url(expectedSig) !== sigB64) return false;

  const expiresAt = Number(payload.split("|")[1]);
  if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) return false;

  return true;
}
