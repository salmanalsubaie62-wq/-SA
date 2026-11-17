import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { I18nProvider } from "@/lib/client/i18n";
import { AppShell } from "@/components/AppShell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const hidden = (db().prepare("SELECT key FROM feature_flags WHERE enabled = 0").all() as Array<{ key: string }>).map((r) => r.key);
  return (
    <I18nProvider initial={user.language}>
      <AppShell user={{ id: user.id, name: user.name, email: user.email, role: user.role }} hiddenFeatures={hidden}>
        {children}
      </AppShell>
    </I18nProvider>
  );
}
