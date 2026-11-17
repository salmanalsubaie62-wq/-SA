"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "./Icon";
import { ErrorText } from "./ui";
import { api } from "@/lib/client/api";

export function AuthForm() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api(mode === "login" ? "/api/auth/login" : "/api/auth/register", {
        body: mode === "login" ? { email, password } : { name, email, password },
      });
      router.replace("/chat");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="lp-form">
      <p className="lp-form-kicker">Sign in or open an account</p>
      <div>
        <div>
          <div className="tabs" role="tablist" style={{ display: "flex", width: "100%", marginBottom: 18 }}>
            <button role="tab" aria-selected={mode === "login"} style={{ flex: 1 }} onClick={() => setMode("login")}>
              Sign in
            </button>
            <button role="tab" aria-selected={mode === "register"} style={{ flex: 1 }} onClick={() => setMode("register")}>
              Create account
            </button>
          </div>
          <form className="auth-form" onSubmit={submit}>
            {mode === "register" && (
              <label className="field">
                Name
                <input value={name} onChange={(e) => setName(e.target.value)} required autoComplete="name" maxLength={80} />
              </label>
            )}
            <label className="field">
              Email
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
            </label>
            <label className="field">
              Password
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={mode === "register" ? 8 : 1}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
              />
            </label>
            <ErrorText message={error} />
            <button className="btn btn-primary" disabled={busy} type="submit" style={{ width: "100%", minHeight: 44 }}>
              {busy ? "…" : mode === "login" ? "Sign in" : "Create account"}
            </button>
            <p className="login-note" style={{ textAlign: "center", margin: 0 }}>
              {mode === "login"
                ? "The first account created on this server becomes the administrator."
                : "Your data stays on this server. Memory is off until you enable it."}
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
