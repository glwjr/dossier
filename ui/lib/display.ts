// Formats a YYYY-MM-DD string as "Dec 1, 2025". Returns "" for falsy input.
export function formatDate(date: string | null | undefined): string {
  if (!date) return "";
  // Parse as local date to avoid UTC-offset day shift
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export const PROGRAM_TIER_LABEL: Record<string, string> = {
  reach: "Reach",
  match: "Match",
  likely: "Likely",
};

export const PROGRAM_TIER_VARIANT: Record<
  string,
  "default" | "secondary" | "outline"
> = {
  reach: "default",
  match: "secondary",
  likely: "outline",
};

export const PROGRAM_STATUS_LABEL: Record<string, string> = {
  researching: "Researching",
  drafting: "Drafting",
  submitted: "Submitted",
  interview: "Interview",
  decision: "Decision",
};

export const REQUIREMENT_KIND_LABEL: Record<string, string> = {
  sop: "SOP",
  cv: "CV",
  transcript: "Transcript",
  gre: "GRE",
  writing_sample: "Writing sample",
  fee: "Fee",
  other: "Other",
};

export const REQUIREMENT_STATUS_LABEL: Record<string, string> = {
  todo: "Todo",
  in_progress: "In progress",
  done: "Done",
  waived: "Waived",
};

export const DEADLINE_KIND_LABEL: Record<string, string> = {
  application: "Application",
  fellowship: "Fellowship",
  fee_waiver: "Fee waiver",
};

export const REC_STATUS_LABEL: Record<string, string> = {
  asked: "Asked",
  confirmed: "Confirmed",
  submitted: "Submitted",
};

export const DOCUMENT_KIND_LABEL: Record<string, string> = {
  sop: "SOP",
  personal_statement: "Personal statement",
  cv: "CV",
  writing_sample: "Writing sample",
  other: "Other",
};

export const DOCUMENT_STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  in_progress: "In progress",
  final: "Final",
};

export const OUTREACH_RESPONSE_LABEL: Record<string, string> = {
  none: "None",
  positive: "Positive",
  negative: "Negative",
  meeting_scheduled: "Meeting scheduled",
};
