export interface Consultant {
  id: string;
  name: string;
  slug: string;
  logo: string;
  description: string;
  country: string;
  countryCode: string;
  cities: string[];
  services: string[];
  destinations: string[];
  website: string;
  email: string;
  phone: string;
  verified: boolean;
  featured: boolean;
  rating: number;
  reviewCount: number;
  established: string;
  address: string;
  categories: string[];
  sponsored: boolean;
  lastUpdated: string;
  aboutHtml?: string;
}

export const consultants: Consultant[] = [
  {
    id: "global-pathways-education",
    name: "Global Pathways Education Advisory",
    slug: "global-pathways-education",
    logo: "🌐",
    description:
      "Specialist study-abroad agency providing university admissions guidance, SOP/LOR editing, and visa counseling for Canada, UK, and Australia.",
    country: "United Kingdom",
    countryCode: "GB",
    cities: ["London", "Manchester", "Birmingham"],
    services: ["University Admissions", "Visa Assistance", "SOP & LOR Editing", "Scholarship Guidance"],
    destinations: ["United Kingdom", "Canada", "Australia", "Ireland"],
    website: "https://example.com/global-pathways",
    email: "advisors@globalpathways-edu.example",
    phone: "+44 20 7946 0192",
    verified: true,
    featured: true,
    rating: 4.9,
    reviewCount: 142,
    established: "2012",
    address: "74 Oxford Street, London W1D 1BS, UK",
    categories: ["Study Abroad Consultants", "Visa Assistance", "Application Support"],
    sponsored: true,
    lastUpdated: "2026-08-01",
    aboutHtml:
      "Global Pathways Education Advisory has assisted over 8,500 students in securing admissions to leading Russell Group universities and Canadian institutions. Our team of certified counselors provides end-to-end guidance from profile assessment to pre-departure briefing.",
  },
  {
    id: "maple-leaf-education-consultants",
    name: "Maple Leaf Canada Education Partners",
    slug: "maple-leaf-education-consultants",
    logo: "🍁",
    description:
      "Dedicated Canadian higher education consultancy offering direct institutional admissions, study permit guidance, and PGWP planning.",
    country: "Canada",
    countryCode: "CA",
    cities: ["Toronto", "Vancouver", "Montreal"],
    services: ["University Admissions", "Visa Assistance", "Accommodation", "Career Guidance"],
    destinations: ["Canada"],
    website: "https://example.com/maple-leaf-edu",
    email: "info@mapleleafedu.example",
    phone: "+1 416 555 0184",
    verified: true,
    featured: true,
    rating: 4.8,
    reviewCount: 98,
    established: "2015",
    address: "200 Bay Street, Suite 1400, Toronto, ON M5J 2J2, Canada",
    categories: ["Study Abroad Consultants", "Visa Assistance", "Accommodation"],
    sponsored: false,
    lastUpdated: "2026-07-25",
    aboutHtml:
      "Maple Leaf Education Partners focuses exclusively on Canadian higher education. We maintain direct partnerships with top Canadian universities and colleges across Ontario, British Columbia, and Alberta.",
  },
  {
    id: "euro-study-solutions",
    name: "Euro Study Solutions Germany & EU",
    slug: "euro-study-solutions",
    logo: "🇪🇺",
    description:
      "Premier European study consultancy specializing in tuition-free German public university applications, English-taught programs, and blocked account setup.",
    country: "Germany",
    countryCode: "DE",
    cities: ["Berlin", "Munich", "Frankfurt"],
    services: ["University Admissions", "Test Preparation", "Visa Assistance", "Language Courses"],
    destinations: ["Germany", "Netherlands", "France", "Ireland"],
    website: "https://example.com/euro-study",
    email: "contact@eurostudysolutions.example",
    phone: "+49 30 1234 5678",
    verified: true,
    featured: false,
    rating: 4.7,
    reviewCount: 76,
    established: "2017",
    address: "Friedrichstraße 120, 10117 Berlin, Germany",
    categories: ["Study Abroad Consultants", "Test Preparation", "Visa Assistance"],
    sponsored: false,
    lastUpdated: "2026-08-04",
    aboutHtml:
      "Euro Study Solutions helps international students navigate uni-assist admissions, APS certificate processing, blocked bank account verification, and German national visa applications.",
  },
  {
    id: "pacific-admissions-network",
    name: "Pacific Education & Visa Network",
    slug: "pacific-admissions-network",
    logo: "🌏",
    description:
      "Australia and New Zealand higher education specialists helping international students with Subclass 500 visas, GTE assessments, and university enrollments.",
    country: "Australia",
    countryCode: "AU",
    cities: ["Sydney", "Melbourne", "Brisbane"],
    services: ["University Admissions", "Visa Assistance", "Career Guidance", "Accommodation"],
    destinations: ["Australia", "New Zealand"],
    website: "https://example.com/pacific-edu",
    email: "enquiry@pacificedunet.example",
    phone: "+61 2 9264 8811",
    verified: true,
    featured: true,
    rating: 4.9,
    reviewCount: 110,
    established: "2014",
    address: "Level 12, 45 Clarence Street, Sydney NSW 2000, Australia",
    categories: ["Study Abroad Consultants", "Visa Assistance", "Career Guidance"],
    sponsored: true,
    lastUpdated: "2026-08-08",
    aboutHtml:
      "Pacific Education & Visa Network provides comprehensive student visa filing and university admission counselling across Group of Eight (Go8) and innovative research universities in Australia.",
  },
  {
    id: "ivy-bridge-advisors",
    name: "Ivy Bridge US Admissions & Test Prep",
    slug: "ivy-bridge-advisors",
    logo: "🏛️",
    description:
      "US undergraduate & graduate admissions counseling, SAT/GRE coaching, F-1 visa interview prep, and financial aid application guidance.",
    country: "United States",
    countryCode: "US",
    cities: ["New York", "Boston", "Chicago"],
    services: ["University Admissions", "Test Preparation", "SOP & LOR Editing", "Scholarship Guidance"],
    destinations: ["United States", "Canada"],
    website: "https://example.com/ivy-bridge",
    email: "admissions@ivybridge.example",
    phone: "+1 212 555 0199",
    verified: true,
    featured: false,
    rating: 4.8,
    reviewCount: 84,
    established: "2010",
    address: "500 Fifth Avenue, New York, NY 10110, USA",
    categories: ["Study Abroad Consultants", "Test Preparation", "Application Support"],
    sponsored: false,
    lastUpdated: "2026-07-29",
    aboutHtml:
      "Ivy Bridge Advisors assists high-achieving applicants targeting competitive US universities and Liberal Arts Colleges, guiding Common App essay prep, CSS Profile filing, and F-1 visa interview readiness.",
  },
  {
    id: "celtic-education-direct",
    name: "Celtic Education Ireland & UK",
    slug: "celtic-education-direct",
    logo: "☘️",
    description:
      "Higher education consultancy for Ireland and the UK, assisting students with Stamp 2 visas, Third Level Graduate Scheme (2-year work permit), and Dublin housing.",
    country: "Ireland",
    countryCode: "IE",
    cities: ["Dublin", "Cork", "Galway"],
    services: ["University Admissions", "Visa Assistance", "Accommodation"],
    destinations: ["Ireland", "United Kingdom"],
    website: "https://example.com/celtic-edu",
    email: "info@celticedu.example",
    phone: "+353 1 496 0000",
    verified: false,
    featured: false,
    rating: 4.6,
    reviewCount: 45,
    established: "2019",
    address: "15 Dawson Street, Dublin 2, Ireland",
    categories: ["Study Abroad Consultants", "Visa Assistance"],
    sponsored: false,
    lastUpdated: "2026-08-02",
    aboutHtml:
      "Celtic Education Direct provides personalized counseling for Irish university applications including Trinity College Dublin, UCD, UCC, and University of Galway.",
  },
];
