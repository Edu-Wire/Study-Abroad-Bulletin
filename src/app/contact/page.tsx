"use client";

import type { Metadata } from "next";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { MobileBottomNav } from "@/components/site/MobileBottomNav";

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-background pb-16 lg:pb-0">
      <Header />
      <main>
        <section className="border-b border-border bg-surface">
          <div className="shell py-10 lg:py-14">
            <p className="meta text-primary">Get in touch</p>
            <h1 className="mt-3 font-display text-3xl font-extrabold text-foreground sm:text-4xl">
              Contact Us
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground">
              Have a question, partnership inquiry or editorial tip? We'd love to hear from you.
            </p>
          </div>
        </section>

        <section className="shell py-12 lg:py-16">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <form
              className="space-y-6"
              onSubmit={(e) => e.preventDefault()}
            >
              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <label htmlFor="contact-name" className="meta mb-2 block text-foreground">
                    Full name
                  </label>
                  <input
                    id="contact-name"
                    type="text"
                    required
                    placeholder="Your name"
                    className="h-11 w-full rounded-md border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-primary"
                  />
                </div>
                <div>
                  <label htmlFor="contact-email" className="meta mb-2 block text-foreground">
                    Email address
                  </label>
                  <input
                    id="contact-email"
                    type="email"
                    required
                    placeholder="you@email.com"
                    className="h-11 w-full rounded-md border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="contact-subject" className="meta mb-2 block text-foreground">
                  Subject
                </label>
                <select
                  id="contact-subject"
                  className="h-11 w-full rounded-md border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-primary"
                >
                  <option>General inquiry</option>
                  <option>Editorial tip</option>
                  <option>Partnership</option>
                  <option>Advertising</option>
                  <option>Technical issue</option>
                </select>
              </div>

              <div>
                <label htmlFor="contact-message" className="meta mb-2 block text-foreground">
                  Message
                </label>
                <textarea
                  id="contact-message"
                  required
                  rows={6}
                  placeholder="Your message…"
                  className="w-full resize-none rounded-md border border-border bg-background px-3 py-3 text-sm outline-none transition-colors focus:border-primary"
                />
              </div>

              <button
                type="submit"
                className="h-11 rounded-md bg-primary px-6 text-sm font-semibold text-primary-foreground transition-colors hover:bg-navy"
              >
                Send message
              </button>
            </form>

            <aside className="space-y-6">
              <div className="rounded-md border border-border bg-surface p-5">
                <h3 className="font-display text-base font-bold text-foreground">Editorial</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  For news tips, corrections or editorial inquiries.
                </p>
                <p className="mt-2 text-sm font-semibold text-foreground">
                  editorial@studyabroadintelligence.com
                </p>
              </div>
              <div className="rounded-md border border-border bg-surface p-5">
                <h3 className="font-display text-base font-bold text-foreground">Partnerships</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  For advertising, sponsorship and university listing inquiries.
                </p>
                <p className="mt-2 text-sm font-semibold text-foreground">
                  partners@studyabroadintelligence.com
                </p>
              </div>
            </aside>
          </div>
        </section>
      </main>
      <Footer />
      <MobileBottomNav />
    </div>
  );
}
