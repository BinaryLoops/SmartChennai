import createMiddleware from "next-intl/middleware";
import { locales } from "./i18n";

export default createMiddleware({
  locales,
  defaultLocale: "en",
  localePrefix: "always",
});

export const config = {
  // Skip API routes, static files, and Next internals.
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
