/* All figures below are illustrative demo data for interface preview only. */

export const images = {
  heroCampus: "/images/hero-campus.jpg",
  newsCanada: "/images/news-canada-hero.jpg",
  newsUk: "/images/news-uk.jpg",
  newsScholarship: "/images/news-scholarship.jpg",
  newsVisa: "/images/news-visa.jpg",
  newsGermany: "/images/news-germany.jpg",
  newsLibrary: "/images/news-library.jpg",
  newsAustralia: "/images/news-australia.jpg",
};

export type NewsCategory =
  | "Universities"
  | "Admissions"
  | "Scholarships"
  | "Visa"
  | "Student Life"
  | "Career";

export type NewsArticle = {
  id: string;
  slug: string;
  category: NewsCategory;
  country: string;
  headline: string;
  summary: string;
  content?: string | null;
  date: string;
  readingTime: string;
  image: string;
  breaking?: boolean;
  /** Set for articles sourced from an external RSS/Atom feed */
  isRss?: boolean;
  /** URL of the original article on the source website */
  sourceUrl?: string;
  /** Human-readable name of the news source */
  sourceName?: string;
};

export type Country = {
  id: string;
  name: string;
  flag: string;
  universities: number;
  averageTuition: string;
  popularIntake: string;
  updates: number;
};

export type University = {
  id: string;
  name: string;
  initials: string;
  country: string;
  city: string;
  ranking: number;
  tuition: string;
  tuitionValue: number;
  courses: string[];
  scholarships: boolean;
  intake: string;
  degree: "Bachelors" | "Masters" | "Both";
  ielts: string;
};

export type Scholarship = {
  id: string;
  name: string;
  organization: string;
  country: string;
  funding: string;
  degree: string;
  deadline: string;
  daysLeft: number;
  eligibility: string;
  type: "Fully Funded" | "Partial" | "Tuition Waiver";
};

export type VisaUpdate = {
  id: string;
  country: string;
  flag: string;
  visaType: string;
  headline: string;
  date: string;
  urgent?: boolean;
};

export type Guide = {
  id: string;
  category: string;
  title: string;
  description: string;
  readingTime: string;
};

export type Deadline = {
  id: string;
  title: string;
  country: string;
  type: "University" | "Scholarship";
  deadline: string;
  daysLeft: number;
};

export const breakingHeadline =
  "Canada announces new updates to study permit processing affecting international students";

export const news: NewsArticle[] = [
  {
    id: "n1",
    slug: "canada-pgwp-rules-2027",
    category: "Visa",
    country: "Canada",
    headline:
      "Canada Announces New Post-Graduation Work Permit Rules for International Students",
    summary:
      "Graduates from eligible programmes will see revised permit lengths tied to field of study, with the changes phased in across the 2027 intake cycle.",
    date: "12 August 2026",
    readingTime: "6 min read",
    image: images.newsCanada,
    breaking: true,
  },
  {
    id: "n2",
    slug: "uk-2027-intake-applications",
    category: "Admissions",
    country: "United Kingdom",
    headline: "UK Universities Open Applications for the 2027 Intake",
    summary:
      "Nineteen Russell Group institutions have published earlier deadlines for international applicants this cycle.",
    date: "12 August 2026",
    readingTime: "4 min read",
    image: images.newsUk,
  },
  {
    id: "n3",
    slug: "top-scholarships-this-month",
    category: "Scholarships",
    country: "Global",
    headline:
      "Top Scholarships International Students Should Apply For This Month",
    summary:
      "Fourteen fully funded awards close before the end of September, covering tuition, stipend and travel.",
    date: "11 August 2026",
    readingTime: "5 min read",
    image: images.newsScholarship,
  },
  {
    id: "n4",
    slug: "germany-student-visa-processing",
    category: "Visa",
    country: "Germany",
    headline: "Germany Updates Student Visa Processing Guidelines",
    summary:
      "Consulates move to a standardised document checklist intended to shorten average decision times.",
    date: "11 August 2026",
    readingTime: "3 min read",
    image: images.newsGermany,
  },
  {
    id: "n5",
    slug: "australia-work-hours-review",
    category: "Student Life",
    country: "Australia",
    headline: "Australia Reviews Term-Time Work Hour Limits for Students",
    summary:
      "A parliamentary review is considering a permanent fortnightly cap after two years of temporary settings.",
    date: "10 August 2026",
    readingTime: "4 min read",
    image: images.newsAustralia,
  },
  {
    id: "n6",
    slug: "us-fall-2027-applications",
    category: "Admissions",
    country: "United States",
    headline: "US Universities Report Record Fall 2027 Application Volumes",
    summary:
      "Early indicators point to strong demand for computing, data science and public health programmes.",
    date: "10 August 2026",
    readingTime: "5 min read",
    image: images.newsLibrary,
  },
  {
    id: "n7",
    slug: "netherlands-english-programmes",
    category: "Universities",
    country: "Netherlands",
    headline: "Dutch Universities Confirm English-Taught Programme Lists",
    summary:
      "Institutions publish confirmed English-taught bachelor offerings ahead of the next application window.",
    date: "9 August 2026",
    readingTime: "3 min read",
    image: images.newsGermany,
  },
  {
    id: "n8",
    slug: "graduate-employment-outcomes",
    category: "Career",
    country: "Global",
    headline: "Graduate Employment Outcomes Improve for STEM International Alumni",
    summary:
      "Demo survey data suggests stronger twelve-month employment rates for engineering and computing graduates.",
    date: "9 August 2026",
    readingTime: "6 min read",
    image: images.newsLibrary,
  },
  {
    id: "n9",
    slug: "ireland-accommodation-support",
    category: "Student Life",
    country: "Ireland",
    headline: "Ireland Expands Purpose-Built Student Accommodation Capacity",
    summary:
      "New beds are planned across Dublin, Cork and Galway before the next academic year begins.",
    date: "8 August 2026",
    readingTime: "3 min read",
    image: images.newsUk,
  },
  {
    id: "n10",
    slug: "toronto-scholarship-expansion",
    category: "Universities",
    country: "Canada",
    headline: "Toronto Institutions Expand Merit Awards for International Entry",
    summary:
      "Additional entrance awards will be applied automatically at the point of admission offer.",
    date: "8 August 2026",
    readingTime: "4 min read",
    image: images.newsCanada,
  },
];

export const countries: Country[] = [
  {
    id: "canada",
    name: "Canada",
    flag: "🇨🇦",
    universities: 224,
    averageTuition: "CAD 28,500 / yr",
    popularIntake: "September",
    updates: 128,
  },
  {
    id: "uk",
    name: "United Kingdom",
    flag: "🇬🇧",
    universities: 168,
    averageTuition: "GBP 21,400 / yr",
    popularIntake: "September",
    updates: 164,
  },
  {
    id: "usa",
    name: "United States",
    flag: "🇺🇸",
    universities: 412,
    averageTuition: "USD 34,900 / yr",
    popularIntake: "Fall",
    updates: 231,
  },
  {
    id: "australia",
    name: "Australia",
    flag: "🇦🇺",
    universities: 96,
    averageTuition: "AUD 32,100 / yr",
    popularIntake: "February",
    updates: 108,
  },
  {
    id: "germany",
    name: "Germany",
    flag: "🇩🇪",
    universities: 142,
    averageTuition: "EUR 1,500 / yr",
    popularIntake: "Winter",
    updates: 84,
  },
  {
    id: "ireland",
    name: "Ireland",
    flag: "🇮🇪",
    universities: 34,
    averageTuition: "EUR 18,600 / yr",
    popularIntake: "September",
    updates: 41,
  },
  {
    id: "netherlands",
    name: "Netherlands",
    flag: "🇳🇱",
    universities: 58,
    averageTuition: "EUR 12,800 / yr",
    popularIntake: "September",
    updates: 46,
  },
  {
    id: "france",
    name: "France",
    flag: "🇫🇷",
    universities: 118,
    averageTuition: "EUR 9,700 / yr",
    popularIntake: "September",
    updates: 39,
  },
  {
    id: "new-zealand",
    name: "New Zealand",
    flag: "🇳🇿",
    universities: 8,
    averageTuition: "NZD 32,000 / yr",
    popularIntake: "February",
    updates: 24,
  },
  {
    id: "eu",
    name: "European Union",
    flag: "🇪🇺",
    universities: 500,
    averageTuition: "EUR 10,000 / yr",
    popularIntake: "September",
    updates: 50,
  },
];

export const universities: University[] = [
  {
    id: "u1",
    name: "University of Toronto",
    initials: "UT",
    country: "Canada",
    city: "Toronto",
    ranking: 21,
    tuition: "CAD 45,900 / yr",
    tuitionValue: 45900,
    courses: ["Computer Science", "Business", "Engineering"],
    scholarships: true,
    intake: "September 2027",
    degree: "Both",
    ielts: "6.5",
  },
  {
    id: "u2",
    name: "University of British Columbia",
    initials: "BC",
    country: "Canada",
    city: "Vancouver",
    ranking: 34,
    tuition: "CAD 42,300 / yr",
    tuitionValue: 42300,
    courses: ["Data Science", "Forestry", "Economics"],
    scholarships: true,
    intake: "September 2027",
    degree: "Both",
    ielts: "6.5",
  },
  {
    id: "u3",
    name: "University of Manchester",
    initials: "MA",
    country: "United Kingdom",
    city: "Manchester",
    ranking: 32,
    tuition: "GBP 26,000 / yr",
    tuitionValue: 26000,
    courses: ["Artificial Intelligence", "Law", "Materials"],
    scholarships: true,
    intake: "September 2027",
    degree: "Masters",
    ielts: "6.5",
  },
  {
    id: "u4",
    name: "University of Birmingham",
    initials: "BI",
    country: "United Kingdom",
    city: "Birmingham",
    ranking: 84,
    tuition: "GBP 24,600 / yr",
    tuitionValue: 24600,
    courses: ["Business Analytics", "Medicine", "Education"],
    scholarships: false,
    intake: "January 2027",
    degree: "Both",
    ielts: "6.0",
  },
  {
    id: "u5",
    name: "University of Melbourne",
    initials: "ME",
    country: "Australia",
    city: "Melbourne",
    ranking: 14,
    tuition: "AUD 48,200 / yr",
    tuitionValue: 48200,
    courses: ["Computing", "Architecture", "Public Health"],
    scholarships: true,
    intake: "February 2027",
    degree: "Both",
    ielts: "6.5",
  },
  {
    id: "u6",
    name: "Technical University of Munich",
    initials: "TU",
    country: "Germany",
    city: "Munich",
    ranking: 28,
    tuition: "EUR 2,000 / yr",
    tuitionValue: 2000,
    courses: ["Mechanical Engineering", "Informatics", "Physics"],
    scholarships: true,
    intake: "Winter 2027",
    degree: "Masters",
    ielts: "6.5",
  },
  {
    id: "u7",
    name: "Trinity College Dublin",
    initials: "TC",
    country: "Ireland",
    city: "Dublin",
    ranking: 87,
    tuition: "EUR 25,400 / yr",
    tuitionValue: 25400,
    courses: ["Computer Science", "Literature", "Pharmacy"],
    scholarships: true,
    intake: "September 2027",
    degree: "Both",
    ielts: "6.5",
  },
  {
    id: "u8",
    name: "University of Amsterdam",
    initials: "AM",
    country: "Netherlands",
    city: "Amsterdam",
    ranking: 53,
    tuition: "EUR 15,300 / yr",
    tuitionValue: 15300,
    courses: ["Business Administration", "Psychology", "Data Science"],
    scholarships: false,
    intake: "September 2027",
    degree: "Bachelors",
    ielts: "6.5",
  },
];

export const scholarships: Scholarship[] = [
  {
    id: "s1",
    name: "Global Futures Master's Scholarship",
    organization: "University of Toronto",
    country: "Canada",
    funding: "Full tuition + CAD 18,000 stipend",
    degree: "Masters",
    deadline: "30 September 2026",
    daysLeft: 49,
    eligibility: "International applicants with a 3.5 GPA equivalent",
    type: "Fully Funded",
  },
  {
    id: "s2",
    name: "Commonwealth Postgraduate Award",
    organization: "UK Government",
    country: "United Kingdom",
    funding: "Full tuition + living allowance",
    degree: "Masters / PhD",
    deadline: "18 September 2026",
    daysLeft: 37,
    eligibility: "Citizens of eligible Commonwealth countries",
    type: "Fully Funded",
  },
  {
    id: "s3",
    name: "DAAD Study Scholarship",
    organization: "DAAD",
    country: "Germany",
    funding: "EUR 992 / month",
    degree: "Masters",
    deadline: "5 October 2026",
    daysLeft: 54,
    eligibility: "Graduates with two years of relevant experience",
    type: "Fully Funded",
  },
  {
    id: "s4",
    name: "Melbourne International Merit Award",
    organization: "University of Melbourne",
    country: "Australia",
    funding: "AUD 12,000 tuition reduction",
    degree: "Bachelors",
    deadline: "25 August 2026",
    daysLeft: 13,
    eligibility: "Automatic consideration on admission",
    type: "Partial",
  },
  {
    id: "s5",
    name: "Holland Excellence Scholarship",
    organization: "Dutch Ministry of Education",
    country: "Netherlands",
    funding: "EUR 5,000 one-off",
    degree: "Bachelors / Masters",
    deadline: "20 August 2026",
    daysLeft: 8,
    eligibility: "Non-EEA students with an offer of admission",
    type: "Partial",
  },
  {
    id: "s6",
    name: "Trinity Global Excellence Award",
    organization: "Trinity College Dublin",
    country: "Ireland",
    funding: "50% tuition waiver",
    degree: "Masters",
    deadline: "16 August 2026",
    daysLeft: 4,
    eligibility: "First-class honours or equivalent",
    type: "Tuition Waiver",
  },
];

export const visaUpdates: VisaUpdate[] = [
  {
    id: "v1",
    country: "Canada",
    flag: "🇨🇦",
    visaType: "Study Permit",
    headline:
      "Study permit financial requirement revised for the 2027 application year",
    date: "12 August 2026",
    urgent: true,
  },
  {
    id: "v2",
    country: "United Kingdom",
    flag: "🇬🇧",
    visaType: "Graduate Route",
    headline: "Graduate Route duration confirmed for taught master's graduates",
    date: "11 August 2026",
  },
  {
    id: "v3",
    country: "Australia",
    flag: "🇦🇺",
    visaType: "Subclass 500",
    headline: "Genuine Student requirement guidance updated for applicants",
    date: "10 August 2026",
  },
  {
    id: "v4",
    country: "Germany",
    flag: "🇩🇪",
    visaType: "National Visa D",
    headline: "Blocked account minimum balance adjusted for the coming year",
    date: "9 August 2026",
    urgent: true,
  },
];

export const guides: Guide[] = [
  {
    id: "g1",
    category: "SOP",
    title: "Complete Guide to Writing a Strong SOP",
    description:
      "Structure, tone and evidence: how admissions committees actually read a statement of purpose.",
    readingTime: "12 min read",
  },
  {
    id: "g2",
    category: "Applications",
    title: "How to Choose the Right University",
    description:
      "A practical framework covering ranking, cost, course fit, city and post-study outcomes.",
    readingTime: "9 min read",
  },
  {
    id: "g3",
    category: "Applications",
    title: "Study Abroad Application Timeline",
    description:
      "An eighteen-month plan from shortlisting to visa interview, with checkpoints each term.",
    readingTime: "8 min read",
  },
  {
    id: "g4",
    category: "Visa",
    title: "How International Student Visas Work",
    description:
      "Documents, financial proof and interviews explained across the eight most popular destinations.",
    readingTime: "11 min read",
  },
  {
    id: "g5",
    category: "IELTS",
    title: "IELTS Band 7 Preparation Plan",
    description:
      "A six-week study routine with practice targets for each of the four test sections.",
    readingTime: "10 min read",
  },
  {
    id: "g6",
    category: "LOR",
    title: "Requesting a Letter of Recommendation",
    description:
      "Who to ask, when to ask and what to send them so the letter is specific and credible.",
    readingTime: "6 min read",
  },
  {
    id: "g7",
    category: "Accommodation",
    title: "Finding Student Accommodation Abroad",
    description:
      "On-campus, private halls and shared housing compared, with typical costs and contract traps.",
    readingTime: "7 min read",
  },
  {
    id: "g8",
    category: "Jobs & Careers",
    title: "Working While You Study",
    description:
      "Work rights, tax basics and how part-time roles fit around a full academic timetable.",
    readingTime: "8 min read",
  },
];

export const popularGuides = [
  "IELTS Guide",
  "SOP Guide",
  "LOR Guide",
  "Student Visa Guide",
  "Scholarship Guide",
];

export const trending = [
  "Canada changes student rules",
  "Top UK scholarships",
  "US Fall 2027 applications",
  "Germany student visa update",
  "Best universities for Computer Science",
];

export const deadlines: Deadline[] = [
  {
    id: "d1",
    title: "Trinity Global Excellence Award",
    country: "Ireland",
    type: "Scholarship",
    deadline: "16 August 2026",
    daysLeft: 4,
  },
  {
    id: "d2",
    title: "Holland Excellence Scholarship",
    country: "Netherlands",
    type: "Scholarship",
    deadline: "20 August 2026",
    daysLeft: 8,
  },
  {
    id: "d3",
    title: "University of Melbourne — Semester 1 entry",
    country: "Australia",
    type: "University",
    deadline: "31 August 2026",
    daysLeft: 19,
  },
  {
    id: "d4",
    title: "Commonwealth Postgraduate Award",
    country: "United Kingdom",
    type: "Scholarship",
    deadline: "18 September 2026",
    daysLeft: 37,
  },
  {
    id: "d5",
    title: "University of Toronto — Autumn intake",
    country: "Canada",
    type: "University",
    deadline: "30 September 2026",
    daysLeft: 49,
  },
];

export const newsCategories = [
  "All",
  "Universities",
  "Admissions",
  "Scholarships",
  "Visa",
  "Student Life",
  "Career",
] as const;

export type NewsCategoryFilter = (typeof newsCategories)[number];
