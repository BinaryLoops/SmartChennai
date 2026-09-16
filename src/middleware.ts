import createMiddleware from "next-intl/middleware";
import { locales } from "./i18n";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken } from "@/lib/auth";

const intlMiddleware = createMiddleware({
  locales,
  defaultLocale: "en",
  localePrefix: "always",
});

const ROLE_PERMISSIONS: Record<string, string[]> = {
  super_admin: ["*"],
  executive: ["/dashboard/executive", "/dashboard", "/citizen", "/dashboard/assets"],
  traffic_operator: ["/dashboard/traffic", "/dashboard", "/citizen", "/dashboard/assets"],
  emergency_operator: ["/dashboard/emergency", "/dashboard", "/citizen", "/dashboard/assets"],
  water_operator: ["/dashboard/water", "/dashboard", "/citizen", "/dashboard/assets"],
  citizen: ["/citizen", "/dashboard"], // citizens can see the main dashboard (read-only map)
};

export default async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  // 1. API Routes (Bypass next-intl completely to prevent locale redirects)
  if (pathname.startsWith("/api/")) {
    if (pathname.includes("/api/auth/login") || pathname.includes("/api/citizen") || pathname.includes("/api/incidents") || pathname.includes("/api/predict")) {
      return NextResponse.next();
    }
    
    // Check session for protected APIs
    const token = req.cookies.get("iccc_session")?.value;
    const payload = token ? await verifyToken(token) : null;
    
    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Role Authorization
    const role = payload.role;
    const perms = ROLE_PERMISSIONS[role] || [];
    let authorized = perms.includes("*") || perms.some(p => pathname.includes(p));
    
    if (!authorized) {
      return NextResponse.json({ error: "Forbidden: Role not authorized" }, { status: 403 });
    }
    
    return NextResponse.next();
  }

  // 2. Page Routes (Apply next-intl)
  const res = intlMiddleware(req);
  
  if (pathname.match(/\.(png|jpg|jpeg|svg|css|js|ico)$/)) {
    return res;
  }

  const locale = pathname.split("/")[1] || "en";
  const isLoginPage = pathname.endsWith("/login");
  const isDashboard = pathname.includes("/dashboard");
  const isCitizenProtected = pathname.includes("/citizen/track");

  if (!isDashboard && !isCitizenProtected) {
    return res; 
  }

  // 3. Verify Session for Protected Pages
  const token = req.cookies.get("iccc_session")?.value;
  const payload = token ? await verifyToken(token) : null;

  if (!payload) {
    const loginUrl = new URL(`/${locale}/login`, req.url);
    return NextResponse.redirect(loginUrl);
  }

  if (isLoginPage) {
    const dashboardUrl = new URL(`/${locale}/dashboard`, req.url);
    return NextResponse.redirect(dashboardUrl);
  }

  // 4. Role Authorization for Pages
  const role = payload.role;
  const perms = ROLE_PERMISSIONS[role] || [];
  let authorized = perms.includes("*") || perms.some(p => pathname.includes(p));

  if (!authorized) {
    const dashboardUrl = new URL(`/${locale}/dashboard`, req.url);
    return NextResponse.redirect(dashboardUrl);
  }

  return res;
}

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)"],
};
