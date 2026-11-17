import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AuthForm } from "@/components/AuthForm";
import { Landing } from "@/components/Landing";

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/chat");
  return (
    <Landing>
      <AuthForm />
    </Landing>
  );
}
