"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Header } from "@/components/site/Header";
import { login as apiLogin } from "../../../../backend/auth";

export default function LoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    if (error) setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await apiLogin(formData);
      if (res.success) {
        if (typeof window !== "undefined") {
          localStorage.setItem("authToken", res.token);
          localStorage.setItem("authUser", JSON.stringify(res.user));
        }
        router.push("/dashboard");
      }
    } catch (err: any) {
      setError(err?.message || "Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <Header />
      <main className="flex flex-1 items-center justify-center px-4 py-4 sm:py-6">
        <div className="w-full max-w-md rounded-xl border border-border bg-card p-5 sm:p-7 shadow-xs">
          <div className="flex justify-center">
            <Image
              src="/logo/ab-logo.png"
              alt="Abroad Bulletin Logo"
              width={120}
              height={120}
              priority
              className="h-12 sm:h-14 w-auto object-contain"
            />
          </div>
          <h1 className="mt-3 text-center font-display text-xl sm:text-2xl font-extrabold text-foreground">
            Sign in to your account
          </h1>
          <p className="mt-1 text-center text-xs sm:text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link href="/auth/signup" className="font-semibold text-primary hover:text-navy transition-colors">
              Get started
            </Link>
          </p>

          {error && (
            <div className="mt-4 rounded-md bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive text-center font-medium">
              {error}
            </div>
          )}

          <form className="mt-5 space-y-3.5" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="login-email" className="meta mb-1 block text-foreground">
                Email
              </label>
              <input
                id="login-email"
                name="email"
                type="email"
                required
                autoComplete="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="you@email.com"
                className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="login-password" className="meta block text-foreground">
                  Password
                </label>
                <Link
                  href="/auth/forgot"
                  className="text-xs text-primary hover:text-navy font-medium transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <input
                id="login-password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="h-10.5 w-full rounded-md bg-primary text-sm font-semibold text-primary-foreground transition-colors hover:bg-navy cursor-pointer mt-1 disabled:opacity-50"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
