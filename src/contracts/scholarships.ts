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
