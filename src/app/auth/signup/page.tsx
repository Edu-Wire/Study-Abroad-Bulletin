"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Header } from "@/components/site/Header";
import { signup as apiSignup } from "@/lib/api/auth";

export default function SignupPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
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
      const res = await apiSignup(formData);
      if (res.success && res.token) {
        if (typeof window !== "undefined") {
          if (res.user) {
            localStorage.setItem("authUser", JSON.stringify(res.user));
          }
        }
        router.push("/auth/welcome");
      }
    } catch (err: any) {
      setError(err?.message || "Registration failed. Please try again.");
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
            Create your account
          </h1>
          <p className="mt-1 text-center text-xs sm:text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/auth/login" className="font-semibold text-primary hover:text-navy transition-colors">
              Sign in
            </Link>
          </p>

          {error && (
            <div className="mt-4 rounded-md bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive text-center font-medium">
              {error}
            </div>
          )}

          <form className="mt-5 space-y-3.5" onSubmit={handleSubmit}>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="signup-first" className="meta mb-1 block text-foreground">First name</label>
                <input
                  id="signup-first"
                  name="firstName"
                  type="text"
                  required
                  value={formData.firstName}
                  onChange={handleChange}
                  placeholder="First"
                  className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label htmlFor="signup-last" className="meta mb-1 block text-foreground">Last name</label>
                <input
                  id="signup-last"
                  name="lastName"
                  type="text"
                  required
                  value={formData.lastName}
                  onChange={handleChange}
                  placeholder="Last"
                  className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
            <div>
              <label htmlFor="signup-email" className="meta mb-1 block text-foreground">Email</label>
              <input
                id="signup-email"
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
              <label htmlFor="signup-password" className="meta mb-1 block text-foreground">Password</label>
              <input
                id="signup-password"
                name="password"
                type="password"
                required
                autoComplete="new-password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Create a password"
                className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="h-10.5 w-full rounded-md bg-primary text-sm font-semibold text-primary-foreground transition-colors hover:bg-navy cursor-pointer disabled:opacity-50"
            >
              {loading ? "Creating account..." : "Create account"}
            </button>
            <p className="text-center text-xs text-muted-foreground pt-1">
              By creating an account, you agree to our{" "}
              <Link href="/terms" className="underline hover:text-primary transition-colors">Terms</Link>{" "}
              and{" "}
              <Link href="/privacy" className="underline hover:text-primary transition-colors">Privacy Policy</Link>.
            </p>
          </form>
        </div>
      </main>
    </div>
  );
}
