"use client";

import { FormEvent, useState } from "react";

import { useAuth } from "@/hooks/use-auth";

export function AuthPanel() {
  const { signIn, signUp, configError } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      if (mode === "signin") {
        await signIn(email, password);
      } else {
        await signUp(email, password);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Authentication failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="app-canvas min-h-screen px-6 py-10 text-[#201d1d]">
      <section className="mx-auto max-w-[960px]">
        <header className="border-b border-[rgba(15,0,0,0.12)] pb-4">
          <p className="text-sm leading-7 text-[#646262]">[auth]</p>
          <h1 className="text-[32px] font-bold leading-[1.5] sm:text-[38px]">
            AI Kubernetes Agent
          </h1>
        </header>

        <section className="terminal-panel mt-10 px-4 py-5 page-enter sm:px-6">
          <p className="text-sm leading-7 text-[#9a9898]">[session]</p>
          <div className="terminal-row mt-2 p-3 text-sm leading-6 sm:text-base">
            [ ] authenticate --provider email --workspace k8n
          </div>
        </section>

        <form onSubmit={handleSubmit} className="mt-16 max-w-[520px] page-enter">
          <div className="flex items-center justify-between border-b border-[rgba(15,0,0,0.12)] pb-3">
            <h2 className="text-base font-bold leading-6">
              {mode === "signin" ? "Login" : "Create account"}
            </h2>
            <span className="text-sm leading-7 text-[#646262]">
              {mode === "signin" ? "[existing]" : "[new]"}
            </span>
          </div>
          <div className="pt-4">
            <label className="block text-sm leading-7 text-[#646262]" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-1 h-10 w-full rounded border border-[rgba(15,0,0,0.12)] bg-[#f8f7f7] px-3 text-base leading-6 outline-none focus:border-[#201d1d] focus:bg-[#fdfcfc]"
              required
            />
          </div>

          <div className="mt-4">
            <label className="block text-sm leading-7 text-[#646262]" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-1 h-10 w-full rounded border border-[rgba(15,0,0,0.12)] bg-[#f8f7f7] px-3 text-base leading-6 outline-none focus:border-[#201d1d] focus:bg-[#fdfcfc]"
              required
            />
          </div>

          {configError ? <p className="mt-4 text-sm leading-6 text-[#ff3b30]">[-] {configError}</p> : null}
          {error ? <p className="mt-4 text-sm leading-6 text-[#ff3b30]">[-] {error}</p> : null}

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={isSubmitting || Boolean(configError)}
              className="button-primary"
            >
              {isSubmitting ? "Working..." : mode === "signin" ? "Login" : "Sign up"}
            </button>
            <button
              type="button"
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
              className="button-secondary"
            >
              {mode === "signin" ? "Create account" : "Use login"}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
