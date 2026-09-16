import { unstable_setRequestLocale } from "next-intl/server";
import LandingClient from "./LandingClient";

export default function LandingPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  unstable_setRequestLocale(locale);
  return <LandingClient locale={locale} />;
}
