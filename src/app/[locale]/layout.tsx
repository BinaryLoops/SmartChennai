import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, unstable_setRequestLocale } from "next-intl/server";
import { locales, type Locale } from "@/i18n";
import "../globals.css";
import { Global3DBackground } from "@/components/ui/Global3DBackground";
import { MapProvider } from "@/components/map/MapContext";

export const metadata: Metadata = {
  title: "Smart Chennai — AI-Powered ICCC",
  description:
    "AI-powered integrated command and control system prototype for Chennai's Smart City Mission.",
};

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode;
  params: { locale: Locale };
}) {
  unstable_setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <html lang={locale} className="dark">
      <body className="bg-base text-text-primary antialiased">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <MapProvider>
            <Global3DBackground />
            <div className="relative z-10 h-full w-full">{children}</div>
          </MapProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
