export interface ApplyJobData {
  userId: string;
  applicationRunId: string;
  jobListingId: string;
  externalUrl: string;
  profile: SerializedProfile;
}

export interface SerializedProfile {
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  contactLinkedIn: string | null;
  contactWebsite: string | null;
  contactLocation: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  country: string | null;
  workdayPassword: string | null;
  resumeFilePath: string | null;
  otherText: string | null;
  education: Array<{
    school: string;
    degree: string | null;
    fieldOfStudy: string | null;
    startDate: string | null;
    endDate: string | null;
    gpa: string | null;
  }>;
  workHistory: Array<{
    company: string;
    title: string | null;
    startDate: string | null;
    endDate: string | null;
    bullets: string[];
  }>;
  skills: Array<{ name: string }>;
  qaEntries: Array<{ question: string; answer: string }>;
}

export interface InteractiveElement {
  tag: string;
  type: string | null;
  name: string | null;
  id: string | null;
  placeholder: string | null;
  ariaLabel: string | null;
  labelText: string | null;
  value: string | null;
  selector: string;
  isCaptcha: boolean;
  options?: Array<{ value: string; text: string }>;
}

export interface AgentAction {
  action: "click" | "fill" | "select" | "upload_file" | "submit" | "wait" | "done" | "needs_review";
  selector: string | null;
  value: string | null;
  ms: number | null;
  description: string | null;
  reason: string | null;
}

export interface StepLog {
  step: number;
  action: AgentAction;
  result: "success" | "error";
  error?: string;
  timestamp: string;
}
