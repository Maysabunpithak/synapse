import { thaiError } from "./thai";
import { Platform } from "react-native";

export type Account = { id: string; name: string; email: string };
export type AuthSession = { user: Account; token: string; expiresAt: number };

export function accountApi(configured: string): string {
  if (configured) return configured.replace(/\/$/, "");
  if (
    Platform.OS === "web" &&
    typeof window !== "undefined" &&
    ["localhost", "127.0.0.1"].includes(window.location.hostname)
  ) {
    return `http://${window.location.hostname}:4000`;
  }
  return "";
}

export async function authRequest<T>(
  base: string,
  path: string,
  body?: Record<string, string>,
  token?: string,
  language: 'th' | 'en' = 'th',
): Promise<T> {
  if (!base)
    throw new Error(
      language === 'en' ? "The service is not configured. Please contact support." : "ยังไม่ได้เชื่อมต่อเซิร์ฟเวอร์ กรุณาตั้งค่าการเชื่อมต่อแล้วเปิดแอปใหม่",
    );
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  let response: Response;
  try {
    response = await fetch(base + "/auth" + path, {
      method: body === undefined ? "GET" : "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: controller.signal,
    });
  } catch {
    throw new Error(
      language === 'en' ? "Unable to connect. Check your connection and try again." : "เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาตรวจสอบเครือข่ายและการเชื่อมต่อระบบบ้าน",
    );
  } finally {
    clearTimeout(timeout);
  }
  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.ok)
    throw new Error(
      language === 'en' ? englishAuthError(data?.error) : thaiError(data?.error, "ดำเนินการกับบัญชีไม่สำเร็จ กรุณาตรวจสอบข้อมูลแล้วลองใหม่"),
    );
  return data as T;
}

function englishAuthError(error: unknown): string {
  const messages: Record<string, string> = {
    'มีคำขอมากเกินไป กรุณาลองใหม่ภายหลัง': 'Too many requests. Please try again later.',
    'ลองเข้าสู่ระบบบ่อยเกินไป กรุณารอ 15 นาที': 'Too many login attempts. Please try again in 15 minutes.',
    'กรุณาเข้าสู่ระบบอีกครั้ง': 'Please log in again.',
    'กรุณากรอกชื่อไม่เกิน 80 ตัวอักษร': 'Enter a name with no more than 80 characters.',
    'กรุณากรอกอีเมลให้ถูกต้อง': 'Enter a valid email address.',
    'รหัสผ่านต้องมี 8–128 ตัวอักษร': 'Use a password with 8–128 characters.',
    'อีเมลนี้มีบัญชีแล้ว กรุณาเข้าสู่ระบบ': 'An account with this email already exists. Please log in.',
    'กรุณากรอกอีเมลและรหัสผ่าน': 'Enter your email and password.',
    'อีเมลหรือรหัสผ่านไม่ถูกต้อง': 'Incorrect email or password.',
  };
  return typeof error === 'string' && messages[error] || 'Unable to complete your request. Please try again.';
}
