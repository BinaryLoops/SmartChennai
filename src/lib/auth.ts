import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";
import { Role } from "@prisma/client";

const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || "smart-chennai-iccc-demo-secret-key-12345"
);

export type SessionPayload = {
  id: string;
  email: string;
  role: Role;
  name: string;
};

export async function signToken(payload: SessionPayload) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(SECRET_KEY);
}

export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);
    return payload as SessionPayload;
  } catch (err) {
    return null;
  }
}

export function getSessionToken() {
  return cookies().get("iccc_session")?.value;
}

export async function getSession(): Promise<SessionPayload | null> {
  const token = getSessionToken();
  if (!token) return null;
  return await verifyToken(token);
}

export async function setSession(payload: SessionPayload) {
  const token = await signToken(payload);
  cookies().set("iccc_session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24, // 24 hours
  });
}

export function clearSession() {
  cookies().delete("iccc_session");
}
