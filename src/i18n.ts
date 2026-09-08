import { notFound } from "next/navigation";
import { getRequestConfig } from "next-intl/server";

// Supported locales for the whole app. Add a new language here + a
// messages/<locale>.json file and it is wired through everywhere.
export const locales = ["en", "ta", "hi"] as const;
export type Locale = (typeof locales)[number];

export const localeLabels: Record<Locale, string> = {
  en: "English",
  ta: "தமிழ்",
  hi: "हिन्दी",
};

export default getRequestConfig(async ({ locale }) => {
  if (!locales.includes(locale as Locale)) notFound();

  return {
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
