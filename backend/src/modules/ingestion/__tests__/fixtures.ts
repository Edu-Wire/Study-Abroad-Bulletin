/**
 * Recorded fixtures for adapter contract tests (Blueprint 16.1).
 *
 * These are trimmed shapes of the real responses - enough structure to prove the
 * mapping, small enough to read in a diff. No test in this suite touches the
 * network.
 */

/** IRCC Newsroom Atom feed [R4]. Feed carries a summary only, never the body. */
export const IRCC_ATOM = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Immigration, Refugees and Citizenship Canada</title>
  <updated>2026-08-28T14:02:00Z</updated>
  <entry>
    <id>https://api.io.canada.ca/io-server/gc/news/en/v2?id=1a2b3c</id>
    <title>Canada updates study permit financial requirement for 2027</title>
    <link rel="alternate" href="/en/immigration-refugees-citizenship/news/2026/08/study-permit-update.html"/>
    <published>2026-08-28T13:00:00Z</published>
    <updated>2026-08-28T13:30:00Z</updated>
    <summary>IRCC today announced changes to the cost-of-living requirement for study permit applicants.</summary>
    <category term="Immigration"/>
  </entry>
  <entry>
    <id>https://api.io.canada.ca/io-server/gc/news/en/v2?id=4d5e6f</id>
    <title>Minister meets provincial counterparts</title>
    <link rel="alternate" href="/en/immigration-refugees-citizenship/news/2026/08/ministerial-meeting.html"/>
    <published>2026-08-27T09:00:00Z</published>
    <summary>A readout of the meeting.</summary>
  </entry>
</feed>`;

/** The IRCC article page the Atom entry links to. Server-rendered, semantic. */
export const IRCC_DETAIL_HTML = `<!DOCTYPE html><html><head>
<link rel="canonical" href="https://www.canada.ca/en/immigration-refugees-citizenship/news/2026/08/study-permit-update.html">
</head><body>
<nav class="site-header">Skip to main content</nav>
<main>
  <h1>Canada updates study permit financial requirement for 2027</h1>
  <p>Immigration, Refugees and Citizenship Canada (IRCC) is updating the cost-of-living
  requirement that study permit applicants must meet. Effective 1 January 2027, a single
  applicant must show CAD 22,895 in available funds, in addition to first-year tuition.</p>
  <p>Applicants must continue to provide a provincial attestation letter (PAL) or territorial
  attestation letter (TAL) from the province or territory where they intend to study.</p>
  <p>International students holding a valid study permit may work up to 24 hours per week
  off campus while classes are in session. Post-Graduation Work Permit (PGWP) eligibility
  requirements are unchanged by this update.</p>
</main>
<footer class="site-footer">Date modified: 2026-08-28</footer>
</body></html>`;

/** GOV.UK Search API [R1]. Discovery only; the body comes from the Content API. */
export const GOVUK_SEARCH = {
  total: 2,
  results: [
    {
      title: "Student visa: financial evidence requirements",
      link: "/student-visa",
      description: "How much money you need to show for a Student visa application.",
      public_timestamp: "2026-08-25T09:30:00Z",
      content_id: "b7d4c2a1-0000-4f11-9c33-aaaabbbbcccc",
      content_store_document_type: "guide",
      organisations: [{ title: "UK Visas and Immigration" }],
      part_of_taxonomy_tree: ["Visas and immigration", "Student visas"],
    },
    {
      title: "Statement of changes to the Immigration Rules: HC 1234",
      link: "/government/publications/statement-of-changes-hc-1234",
      description: "Changes to Appendix Student and Appendix Graduate.",
      public_timestamp: "2026-08-20T11:00:00Z",
      content_id: "cc11dd22-0000-4f11-9c33-ddddeeeeffff",
      content_store_document_type: "statement_of_changes",
    },
  ],
};

/** GOV.UK Content API [R2]. A guide, so the body arrives as `details.parts`. */
export const GOVUK_CONTENT = {
  title: "Student visa",
  base_path: "/student-visa",
  content_id: "b7d4c2a1-0000-4f11-9c33-aaaabbbbcccc",
  document_type: "guide",
  first_published_at: "2020-10-05T00:00:00Z",
  public_updated_at: "2026-08-25T09:30:00Z",
  description: "How much money you need to show for a Student visa application.",
  details: {
    parts: [
      {
        title: "Overview",
        slug: "overview",
        body: "<p>You can apply for a Student visa to study in the UK if you are 16 or over, have been offered a place on a course by a licensed student sponsor, and can speak, read, write and understand English.</p>",
      },
      {
        title: "Money you need",
        slug: "money",
        body: "<p>You must show you have enough money to pay for your course and support yourself. From 2 September 2026 you need £1,483 per month for courses in London, for up to 9 months, and £1,136 per month elsewhere. Your Confirmation of Acceptance for Studies (CAS) must state the course fees.</p>",
      },
    ],
    attachments: [
      { url: "https://assets.publishing.service.gov.uk/media/hc-1234.pdf", title: "HC 1234", content_type: "application/pdf" },
    ],
  },
  links: { taxons: [{ title: "Student visas" }, { title: "Visas and immigration" }] },
};

/**
 * EU Press Corner search [R18]. This is the Blueprint 18.1 scenario: an
 * institutional speech whose native policy areas are Competition/Energy/Budget.
 */
export const PRESS_CORNER_SEARCH = {
  total: 1,
  items: [
    {
      reference: "SPEECH/26/1765",
      title: "Speech by President von der Leyen at the European Business Summit",
      documentType: "Speech",
      policyAreas: ["Competition", "Energy", "Budget", "Single market", "Trade"],
      eventDate: "2026-08-27",
      publishDate: "2026-08-27",
      place: "Brussels",
      commissioner: "Ursula von der Leyen",
      summary: "Remarks on competitiveness, the single market and the energy transition.",
    },
  ],
};

/** The Press Corner document endpoint: `htmlContent` is the authoritative body. */
export const PRESS_CORNER_DOCUMENT = {
  reference: "SPEECH/26/1765",
  title: "Speech by President von der Leyen at the European Business Summit",
  documentType: "Speech",
  policyAreas: ["Competition", "Energy", "Budget", "Single market", "Trade"],
  eventDate: "2026-08-27",
  publishDate: "2026-08-27",
  place: "Brussels",
  language: "en",
  htmlContent:
    "<p>Ladies and gentlemen, thank you for the invitation. Europe's competitiveness rests on three pillars: a deep single market, affordable and clean energy, and a budget that invests in the future.</p>" +
    "<p>On energy prices, we have brought wholesale costs down for a second consecutive year. On the single market, the barriers that remain are largely regulatory rather than tariff-based, and we intend to address them in the next Commission work programme.</p>" +
    "<p>Labour mobility across the Union remains an area where we can do more, particularly on the recognition of professional qualifications between Member States.</p>" +
    "<p>Finally, on trade, our agenda for the coming year focuses on diversification and on the enforcement of existing agreements.</p>",
};

/** Immigration NZ News Centre listing [R14]. */
export const INZ_LISTING_HTML = `<!DOCTYPE html><html><body>
<nav>News centre</nav>
<main>
  <ul class="news-list">
    <li class="news-item">
      <span class="topic">Study</span>
      <a href="/about-us/news-centre/improvements-to-the-pathway-student-visa/">Improvements to the Pathway Student Visa</a>
      <time datetime="2026-08-26">26 August 2026</time>
    </li>
    <li class="news-item">
      <span class="topic">Study to work</span>
      <a href="/about-us/news-centre/post-study-work-visa-changes-2026/">Post Study Work Visa changes take effect in October</a>
      <time datetime="2026-08-19">19 August 2026</time>
    </li>
    <li class="news-item">
      <a href="/about-us/contact-us/">Contact us</a>
    </li>
  </ul>
</main>
</body></html>`;

export const INZ_DETAIL_HTML = `<!DOCTYPE html><html><body><main>
<h1>Improvements to the Pathway Student Visa</h1>
<p>From 1 October 2026, the Pathway Student Visa will allow international students to study
with up to three approved education providers on a single visa, for a maximum of five years.</p>
<p>Students on a Pathway Student Visa may work up to 20 hours per week during the academic year.
Applicants must show NZD 20,000 per year in available funds, or evidence of a scholarship.</p>
</main></body></html>`;

/** A watched rule page [R9] - Subclass 500. Facts, not prose, are what matter. */
export const SUBCLASS_500_HTML = `<!DOCTYPE html><html><body>
<div class="cookie-banner">We use cookies on this site.</div>
<main>
<h1>Student visa (subclass 500)</h1>
<p>This visa lets you stay in Australia to study full-time in a recognised education institution.</p>
<p>The visa application charge is AUD 2,000 from 1 July 2026.</p>
<p>You must have an Overseas Student Health Cover policy and a Confirmation of Enrolment (CoE)
for each course you intend to study.</p>
<p>Processing time is 29 days for 75 per cent of applications and 4 months for 90 per cent of applications.</p>
<p>You can work unlimited hours during course breaks and up to 48 hours per fortnight when your course is in session.</p>
<p>Applicants must demonstrate English language proficiency, for example an IELTS score of 6.0 or equivalent.</p>
</main>
</body></html>`;
