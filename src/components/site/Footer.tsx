"use client";

import Link from "next/link";
import Image from "next/image";

function FacebookIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function TwitterIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function LinkedinIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.25V10.9H6.46M7.86 6.74a1.62 1.62 0 1 0 0 3.24 1.62 1.62 0 0 0 0-3.24z" />
    </svg>
  );
}

function InstagramIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

const columns = [
  {
    title: "Explore",
    links: [
      { label: "Universities", href: "/universities" },
      { label: "Countries", href: "/countries" },
      { label: "Scholarships", href: "/scholarships" },
      { label: "Directory", href: "/consultants" },
    ],
  },
  {
    title: "Intelligence & Tools",
    links: [
      { label: "Latest News", href: "/news" },
      { label: "Visa Updates", href: "/visa" },
      { label: "Immigration Tracker", href: "/immigration-tracker" },
      { label: "Guides", href: "/guides" },
    ],
  },
  {
    title: "Services & Partners",
    links: [
      { label: "Agency Directory", href: "/consultants" },
      { label: "Post-Study Work", href: "/visa" },
      { label: "Student Guides", href: "/guides" },
      { label: "Partner Placements", href: "/consultants" },
    ],
  },
  {
    title: "Publication",
    links: [
      { label: "About Us", href: "/about" },
      { label: "Editorial Standards", href: "/editorial-standards" },
      { label: "Contact & Tips", href: "/contact" },
      { label: "Corporate Directory", href: "/consultants" },
    ],
  },
];

const socials = [
  { label: "LinkedIn", Icon: LinkedinIcon },
  { label: "X", Icon: TwitterIcon },
  { label: "Facebook", Icon: FacebookIcon },
  { label: "Instagram", Icon: InstagramIcon },
];

export function Footer() {
  return (
    <footer className="bg-navy text-navy-foreground">
      {/* Newsletter block */}
      <div className="border-b border-white/10">
        <div className="shell py-10 lg:py-14">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:items-center lg:gap-16">
            <div>
              <p className="eyebrow text-primary mb-3">
                The Weekly Study Abroad Briefing
              </p>
              <h2 className="font-display text-2xl font-extrabold text-navy-foreground leading-tight sm:text-3xl lg:text-4xl tracking-tight">
                Stay ahead of every deadline and opportunity.
              </h2>
              <p className="mt-4 text-sm text-navy-foreground/65 max-w-lg leading-relaxed">
                Universities, scholarships, visa changes and opportunities worth knowing about —
                delivered every week to international students worldwide.
              </p>
            </div>
            <form
              className="flex flex-col gap-3"
              onSubmit={(e) => e.preventDefault()}
            >
              <input
                type="email"
                required
                placeholder="Your email address"
                aria-label="Email address"
                className="h-12 w-full border border-white/20 bg-white/5 px-4 text-sm text-navy-foreground placeholder:text-navy-foreground/40 outline-none transition-colors focus:border-primary focus:bg-white/10"
              />
              <button
                type="submit"
                className="h-12 w-full bg-primary px-6 eyebrow text-primary-foreground transition-opacity hover:opacity-90"
              >
                Subscribe →
              </button>
              <p className="text-xs text-navy-foreground/40">
                No spam. Unsubscribe any time.
              </p>
            </form>
          </div>
        </div>
      </div>

      {/* Main footer content */}
      <div className="shell py-10 lg:py-16">
        {/* Masthead */}
        <div className="mb-8 border-b border-white/10 pb-8">
          <Link href="/" className="inline-block transition-transform hover:scale-[1.01] active:scale-[0.99]">
            <Image
              src="/logo/footer-logo-v3.png"
              alt="Abroad Bulletin — Dream • Plan • Achieve"
              width={578}
              height={125}
              className="h-12 sm:h-16 md:h-20 w-auto object-contain object-left"
            />
          </Link>
          <p className="mt-4 max-w-sm text-sm text-navy-foreground/55 leading-relaxed">
            Independent editorial coverage of universities, scholarships, visa policy
            and admissions for international students. All figures shown are illustrative
            demo data.
          </p>
        </div>

        {/* Columns — 2 on mobile, 4 on sm+ */}
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-4 sm:gap-8">
          {columns.map((column) => (
            <nav key={column.title}>
              <h3 className="eyebrow text-navy-foreground/50 mb-4">
                {column.title}
              </h3>
              <ul className="space-y-2.5">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-navy-foreground/75 hover:text-primary transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-10 grid gap-4 border-t border-white/10 pt-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <p className="eyebrow text-navy-foreground/40 text-[0.625rem] sm:text-[0.6875rem] leading-relaxed">
            © 2026 Study Abroad Intelligence. Demo content for interface preview. All rights reserved.
          </p>
          <div className="flex items-center gap-2">
            {socials.map(({ label, Icon }) => (
              <a
                key={label}
                href="#"
                aria-label={label}
                className="grid size-8 place-items-center border border-white/10 text-navy-foreground/50 transition-colors hover:border-primary hover:text-primary shrink-0"
              >
                <Icon className="size-3.5" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
