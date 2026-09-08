"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import { locales, localeLabels, type Locale } from "@/i18n";

export function LanguageSwitcher() {
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const router = useRouter();

  function handleChange(next: Locale) {
    const segments = pathname.split("/");
    segments[1] = next; // pathname is always /{locale}/...
    router.push(segments.join("/"));
  }

  return (
    <select
      aria-label="Language"
      value={locale}
      onChange={(e) => handleChange(e.target.value as Locale)}
      className="rounded-lg border border-border bg-base-elevated px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-cyan"
    >
      {locales.map((l) => (
        <option key={l} value={l}>
          {localeLabels[l]}
        </option>
      ))}
    </select>
  );
}
