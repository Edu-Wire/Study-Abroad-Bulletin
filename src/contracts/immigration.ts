export type VisaUpdate = {
  id: string;
  country: string;
  flag: string;
  visaType: string;
  headline: string;
  date: string;
  urgent?: boolean;
};

export type Deadline = {
  id: string;
  title: string;
  country: string;
  type: "University" | "Scholarship";
  deadline: string;
  daysLeft: number;
};
