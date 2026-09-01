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
