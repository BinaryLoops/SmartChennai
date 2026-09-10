import createMiddleware from "next-intl/middleware";
import { locales } from "./i18n";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const intlMiddleware = createMiddleware({
  locales,
  defaultLocale: "en",
  localePrefix: "always",
});

export default function middleware(req: NextRequest) {
  // First run i18n
  const res = intlMiddleware(req);

  // Then check role for executive paths
  const pathname = req.nextUrl.pathname;
  if (pathname.includes("/dashboard/executive")) {
    const role = req.cookies.get("user_role")?.value || "citizen";
    if (role !== "dm" && role !== "commissioner") {
      // Redirect unauthorized users to regular dashboard
      const dashboardUrl = new URL(
        `/${req.nextUrl.pathname.split("/")[1]}/dashboard`, // Preserve locale
        req.url
      );
      return NextResponse.redirect(dashboardUrl);
    }
  }

  if (pathname.includes("/dashboard/admin") || pathname.includes("/api/admin")) {
    const role = req.cookies.get("user_role")?.value || "citizen";
    if (role !== "super_admin") {
      if (pathname.includes("/api/admin")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      const dashboardUrl = new URL(
        `/${req.nextUrl.pathname.split("/")[1]}/dashboard`,
        req.url
      );
      return NextResponse.redirect(dashboardUrl);
    }
  }

  return res;
}

export const config = {
  // Skip API routes, static files, and Next internals.
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
