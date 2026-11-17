import { getCurrentUser } from "@/lib/auth";
import { providerStatus } from "@/lib/ai/providers";
import { SettingsView } from "@/components/SettingsView";
import { redirect } from "next/navigation";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return <SettingsView name={user.name} email={user.email} providers={providerStatus()} />;
}
