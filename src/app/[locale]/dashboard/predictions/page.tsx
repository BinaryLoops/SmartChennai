import { getTranslations } from "next-intl/server";
import PredictionDashboard from "@/components/dashboard/PredictionDashboard";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export async function generateMetadata({ params: { locale } }: { params: { locale: string } }) {
  const t = await getTranslations({ locale, namespace: "nav" });
  return { title: `Predictions | ${t("title")}` };
}

export default async function PredictionsPage() {
  const session = await getSession();
  if (!session || session.role === "citizen") {
    redirect("/login");
  }
  return <PredictionDashboard />;
}
