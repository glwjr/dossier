export type Tier = "reach" | "match" | "likely";
export type ProgramStatus =
  | "researching"
  | "drafting"
  | "submitted"
  | "interview"
  | "accepted"
  | "waitlisted"
  | "rejected";

export type DocumentKind =
  | "sop"
  | "personal_statement"
  | "cv"
  | "writing_sample"
  | "other";

export type DocumentStatus = "draft" | "in_progress" | "final";

export interface DocumentCreate {
  kind: DocumentKind;
  title: string;
  status: DocumentStatus;
  url?: string | null;
  notes?: string | null;
}

export type DocumentUpdate = Partial<DocumentCreate>;

export type OutreachResponse =
  | "none"
  | "positive"
  | "negative"
  | "meeting_scheduled";

export interface OutreachCreate {
  name: string;
  email?: string | null;
  url?: string | null;
  contacted_on?: string | null;
  response?: OutreachResponse;
  notes?: string | null;
}

export type OutreachUpdate = Partial<OutreachCreate>;

export interface RecommenderCreate {
  name: string;
  email?: string | null;
  institution?: string | null;
  notes?: string | null;
}

export type RecommenderUpdate = Partial<RecommenderCreate>;

export interface ProgramRecommenderCreate {
  recommender_id: number;
  status: "asked" | "confirmed" | "submitted";
  due_date?: string | null;
  notes?: string | null;
}

export type ProgramRecommenderUpdate = Partial<Omit<ProgramRecommenderCreate, "recommender_id">>;

export type DeadlineKind = "application" | "fellowship" | "fee_waiver";

export interface DeadlineCreate {
  kind: DeadlineKind;
  due_date: string;
  done?: boolean;
  notes?: string | null;
}

export type DeadlineUpdate = Partial<DeadlineCreate>;

export type RequirementKind =
  | "sop"
  | "cv"
  | "transcript"
  | "gre"
  | "writing_sample"
  | "fee"
  | "other";

export type RequirementStatus = "todo" | "in_progress" | "done" | "waived";

export interface RequirementCreate {
  label: string;
  kind: RequirementKind;
  status: RequirementStatus;
  due_date?: string | null;
  notes?: string | null;
}

export type RequirementUpdate = Partial<RequirementCreate>;

export interface ProgramCreate {
  school: string;
  department: string;
  degree: string;
  url?: string | null;
  tier: Tier;
  status: ProgramStatus;
  app_fee?: number | null;
  notes?: string | null;
}

export type ProgramUpdate = Partial<ProgramCreate>;

export interface Program {
  id: number;
  user_id: number;
  school: string;
  department: string;
  degree: string;
  url: string | null;
  tier: Tier;
  status: ProgramStatus;
  app_fee: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Requirement {
  id: number;
  program_id: number;
  label: string;
  kind: string;
  status: "todo" | "in_progress" | "done" | "waived";
  due_date: string | null;
  notes: string | null;
}

export interface RequirementWithProgram extends Requirement {
  program: { id: number; school: string; department: string };
}

export interface Deadline {
  id: number;
  program_id: number;
  kind: "application" | "fellowship" | "fee_waiver";
  due_date: string;
  done: boolean;
  notes: string | null;
}

export interface DeadlineWithProgram extends Deadline {
  program: { id: number; school: string; department: string };
}

export interface ProgramAssignmentSummary {
  program_id: number;
  status: "asked" | "confirmed" | "submitted";
  due_date: string | null;
  program: { id: number; school: string; department: string };
}

export interface Recommender {
  id: number;
  user_id: number;
  name: string;
  email: string | null;
  institution: string | null;
  notes: string | null;
  program_assignments: ProgramAssignmentSummary[];
}

export interface ProgramRecommender {
  id: number;
  recommender_id: number;
  program_id: number;
  status: "asked" | "confirmed" | "submitted";
  due_date: string | null;
  notes: string | null;
  recommender: Recommender;
}

export interface OutreachContact {
  id: number;
  program_id: number;
  name: string;
  email: string | null;
  url: string | null;
  contacted_on: string | null;
  response: "none" | "positive" | "negative" | "meeting_scheduled";
  notes: string | null;
}

export interface OutreachContactWithProgram extends OutreachContact {
  program: { id: number; school: string; department: string };
}

export interface Document {
  id: number;
  program_id: number;
  kind: "sop" | "personal_statement" | "cv" | "writing_sample" | "other";
  title: string;
  status: "draft" | "in_progress" | "final";
  url: string | null;
  notes: string | null;
  updated_at: string;
}

export interface DashboardRequirement {
  id: number;
  label: string;
  kind: string;
  status: string;
}

export interface DashboardEntry {
  program: Program;
  completion_pct: number;
  next_deadline: string | null;
  days_remaining: number | null;
  blocking_requirements: DashboardRequirement[];
}
