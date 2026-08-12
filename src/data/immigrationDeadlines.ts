export interface ImmigrationDeadline {
  id: string;
  slug: string;
  title: string;
  country: string;
  countryCode: string;
  deadline: string; // ISO date string e.g. "2026-09-15"
  deadlineType: "Visa" | "Immigration" | "Application" | "Registration" | "Policy" | "Scholarship";
  status: "Upcoming" | "Closing Soon" | "Passed" | "Updated";
  importance: "Critical" | "High" | "Medium";
  description: string;
  source: string;
  lastUpdated: string;
  relatedArticle?: {
    title: string;
    href: string;
  };
  applicationUrl?: string;
  tags: string[];
  content?: string;
}

export const immigrationDeadlines: ImmigrationDeadline[] = [
  {
    id: "ca-pal-fall-2026",
    slug: "canada-provincial-attestation-letter-fall-2026",
    title: "Provincial Attestation Letter (PAL) Requirement for Fall 2026 Intake",
    country: "Canada",
    countryCode: "CA",
    deadline: "2026-09-01",
    deadlineType: "Visa",
    status: "Closing Soon",
    importance: "Critical",
    description:
      "All undergraduate and college international applicants to Canada must submit a valid Provincial Attestation Letter (PAL) from their host province before submitting study permit applications.",
    source: "IRCC Editorial Advisory",
    lastUpdated: "2026-08-05",
    relatedArticle: {
      title: "Canada Caps Student Visa Allocations Across Provinces",
      href: "/news/canada-caps-student-visas",
    },
    applicationUrl: "https://www.canada.ca/en/immigration-refugees-citizenship.html",
    tags: ["Canada", "Study Permit", "PAL", "Visa Cap"],
    content:
      "Canada's Immigration, Refugees and Citizenship Canada (IRCC) requires all international undergraduate students to obtain a Provincial Attestation Letter (PAL) prior to lodging study permit applications. The deadline for Fall 2026 enrolment processing is approaching rapidly. Students are advised to secure unconditional university acceptance and request their PAL through institutional portals as early as possible.",
  },
  {
    id: "uk-student-financial-thresholds-2026",
    slug: "uk-student-visa-maintenance-funds-update",
    title: "Updated UK Student Visa Maintenance & Proof of Funds Requirement",
    country: "United Kingdom",
    countryCode: "GB",
    deadline: "2026-10-15",
    deadlineType: "Policy",
    status: "Upcoming",
    importance: "High",
    description:
      "UK Visas and Immigration (UKVI) updated financial requirement thresholds for international students studying inside and outside London come into full enforcement.",
    source: "UKVI Official Gazette",
    lastUpdated: "2026-08-01",
    relatedArticle: {
      title: "UK Maintenance Requirement Thresholds Adjusted for 2026 Intake",
      href: "/news/uk-visa-policy-update",
    },
    applicationUrl: "https://www.gov.uk/student-visa",
    tags: ["UK", "Maintenance Funds", "UKVI", "Student Visa"],
    content:
      "The Home Office has released updated monthly maintenance capacity requirements for Student Visa (T4) applicants. Students entering UK universities for the Autumn 2026 intake must demonstrate financial holding for at least 9 months in advance. Financial statements must meet strict 28-day continuous holding rules.",
  },
  {
    id: "au-financial-proof-deadline-2026",
    slug: "australia-student-visa-500-financial-capacity-deadline",
    title: "Australia Subclass 500 Financial Capacity Index Adjustment",
    country: "Australia",
    countryCode: "AU",
    deadline: "2026-08-30",
    deadlineType: "Visa",
    status: "Closing Soon",
    importance: "Critical",
    description:
      "Department of Home Affairs increases minimum financial evidence requirements for Subclass 500 student visa processing for semester 2 & 1 applications.",
    source: "Department of Home Affairs",
    lastUpdated: "2026-08-08",
    relatedArticle: {
      title: "Australia Tightens Student Visa Financial Safeguards",
      href: "/news/australia-post-study-work",
    },
    applicationUrl: "https://immi.homeaffairs.gov.au",
    tags: ["Australia", "Subclass 500", "Financial Evidence", "Department of Home Affairs"],
    content:
      "Australia's Department of Home Affairs requires higher living cost evidence for international applicants. Students submitting applications for upcoming academic sessions must show evidence of funds covering tuition fees, travel, and AUD 29,710 per year living costs.",
  },
  {
    id: "de-blocked-account-threshold-2026",
    slug: "germany-blocked-account-amount-increase-2026",
    title: "Germany Blocked Account (Sperrkonto) Annual Amount Increase",
    country: "Germany",
    countryCode: "DE",
    deadline: "2026-09-30",
    deadlineType: "Immigration",
    status: "Upcoming",
    importance: "High",
    description:
      "The Federal Foreign Office increases the required minimum deposit in the German blocked bank account for national student visa (Visum zur Ausbildung) applications.",
    source: "Federal Foreign Office (Auswärtiges Amt)",
    lastUpdated: "2026-07-28",
    relatedArticle: {
      title: "Germany Student Visa Blocked Account Minimum Raised for Winter Semester",
      href: "/news/germany-tuition-fees",
    },
    applicationUrl: "https://www.auswaertiges-amt.de",
    tags: ["Germany", "Blocked Account", "Sperrkonto", "National Visa"],
    content:
      "To obtain a student visa for Germany, applicants must open a Sperrkonto (Blocked Bank Account) deposited with the statutory minimum monthly allowance (€992/month). Ensure your financial provider updates the total deposit value to reflect the mandatory €11,904 annual requirement.",
  },
  {
    id: "us-sevis-fee-window-2026",
    slug: "us-sevis-i901-fee-processing-window",
    title: "US F-1 Visa SEVIS I-901 Fee Payment and Interview Registration Window",
    country: "United States",
    countryCode: "US",
    deadline: "2026-11-01",
    deadlineType: "Registration",
    status: "Upcoming",
    importance: "High",
    description:
      "US Department of State advises international students applying for Spring 2027 term to complete SEVIS fee clearance prior to interview scheduling.",
    source: "US Bureau of Consular Affairs",
    lastUpdated: "2026-08-02",
    tags: ["USA", "F-1 Visa", "SEVIS", "I-20"],
    content:
      "International students holding Form I-20 issued by US SEVP-certified institutions must complete payment of the SEVIS I-901 fee at least 3 business days prior to their visa appointment at US embassies or consulates worldwide.",
  },
  {
    id: "ie-stamp-2-registration-renewals-2026",
    slug: "ireland-stamp-2-student-permission-registration-window",
    title: "Ireland Stamp 2 Student Permission Online Registration Window",
    country: "Ireland",
    countryCode: "IE",
    deadline: "2026-08-20",
    deadlineType: "Registration",
    status: "Closing Soon",
    importance: "Medium",
    description:
      "ISD Dublin online appointment and nationwide renewal window for autumn international registrations open for third-level students.",
    source: "Immigration Service Delivery (ISD)",
    lastUpdated: "2026-08-10",
    tags: ["Ireland", "Stamp 2", "IRP Card", "ISD"],
    content:
      "Students attending Irish universities for autumn degree programmes must book or renew their Irish Residence Permit (IRP) card via the ISD portal. Proof of health insurance and university enrolment letter are mandatory for appointment validation.",
  },
  {
    id: "nl-residence-permit-proof-2026",
    slug: "netherlands-ind-student-residence-permit-deadline",
    title: "Netherlands IND Student Residence Permit Sponsor Notification Deadline",
    country: "Netherlands",
    countryCode: "NL",
    deadline: "2026-07-31",
    deadlineType: "Policy",
    status: "Updated",
    importance: "Medium",
    description:
      "Dutch Immigration and Naturalisation Service (IND) updated guidelines on university sponsorship and study progress monitoring requirements.",
    source: "IND Netherlands",
    lastUpdated: "2026-08-03",
    tags: ["Netherlands", "IND", "Residence Permit", "Study Progress"],
    content:
      "Dutch higher education institutions hosting non-EU students must report credit progress monitoring to the IND under the Code of Conduct. Students must maintain a minimum of 50% required credits annually to retain study residence permits.",
  },
  {
    id: "fr-campus-france-cef-deadline-2026",
    slug: "france-campus-france-cef-application-deadline",
    title: "Campus France CEF Procedure Registration Window for Spring Session",
    country: "France",
    countryCode: "FR",
    deadline: "2026-11-15",
    deadlineType: "Application",
    status: "Upcoming",
    importance: "Medium",
    description:
      "Students from 67 countries in the 'Études en France' procedure must complete mandatory orientation and file verification for early 2027 entry.",
    source: "Campus France",
    lastUpdated: "2026-07-20",
    tags: ["France", "Campus France", "Études en France", "VLS-TS"],
    content:
      "The 'Études en France' portal handles admission applications and visa processing for international students targeting French public universities and grandes écoles. Early file submission is recommended to avoid visa backlog in winter.",
  },
];
