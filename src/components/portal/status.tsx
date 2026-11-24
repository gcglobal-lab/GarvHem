import { Badge, type BadgeTone } from "@/components/ui/badge";
import type { LeadStatusName } from "@/lib/validators/leads";
import { LEAD_STATUS_LABEL } from "@/lib/validators/leads";
import type { TaskPriorityName, TaskStatusName } from "@/lib/validators/tasks";
import type { BoardEntry } from "@/server/attendance";
import type { DayStatus } from "@/server/attendance-math";

export const DAY_STATUS: Record<DayStatus, { label: string; short: string; tone: BadgeTone; cell: string }> =
  {
    PRESENT: { label: "Present", short: "P", tone: "success", cell: "bg-success-soft text-success" },
    HALF_DAY: { label: "Half day", short: "½", tone: "warning", cell: "bg-warning-soft text-warning" },
    ABSENT: { label: "Absent", short: "A", tone: "danger", cell: "bg-danger-soft text-danger" },
    ON_LEAVE: { label: "On leave", short: "L", tone: "accent", cell: "bg-accent-soft text-accent" },
    HOLIDAY: { label: "Holiday", short: "H", tone: "neutral", cell: "bg-surface-2 text-foreground" },
    WEEKEND: { label: "Weekend", short: "·", tone: "neutral", cell: "bg-surface-2/60 text-muted" },
  };

export const DayStatusBadge = ({ status }: { status: DayStatus | null }) =>
  status ? (
    <Badge tone={DAY_STATUS[status].tone}>{DAY_STATUS[status].label}</Badge>
  ) : (
    <span className="text-muted">-</span>
  );

export const BOARD_STATUS: Record<BoardEntry["status"], { label: string; tone: BadgeTone }> = {
  WORKING: { label: "Working", tone: "success" },
  ON_LUNCH: { label: "On lunch", tone: "warning" },
  NOT_IN: { label: "Not in", tone: "danger" },
  OUT: { label: "Punched out", tone: "neutral" },
  ON_LEAVE: { label: "On leave", tone: "accent" },
  OFF: { label: "Day off", tone: "neutral" },
};

type LeaveStatusName = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
const LEAVE: Record<LeaveStatusName, { label: string; tone: BadgeTone }> = {
  PENDING: { label: "Pending", tone: "warning" },
  APPROVED: { label: "Approved", tone: "success" },
  REJECTED: { label: "Rejected", tone: "danger" },
  CANCELLED: { label: "Cancelled", tone: "neutral" },
};
export const LeaveStatusBadge = ({ status }: { status: LeaveStatusName }) => (
  <Badge tone={LEAVE[status].tone}>{LEAVE[status].label}</Badge>
);

export const TASK_STATUS: Record<TaskStatusName, { label: string; tone: BadgeTone }> = {
  TODO: { label: "To do", tone: "neutral" },
  IN_PROGRESS: { label: "In progress", tone: "accent" },
  IN_REVIEW: { label: "In review", tone: "warning" },
  DONE: { label: "Done", tone: "success" },
};
export const TaskStatusBadge = ({ status }: { status: TaskStatusName }) => (
  <Badge tone={TASK_STATUS[status].tone}>{TASK_STATUS[status].label}</Badge>
);

export const TASK_PRIORITY: Record<TaskPriorityName, { label: string; tone: BadgeTone }> = {
  LOW: { label: "Low", tone: "neutral" },
  MEDIUM: { label: "Medium", tone: "accent" },
  HIGH: { label: "High", tone: "warning" },
  URGENT: { label: "Urgent", tone: "danger" },
};
export const PriorityBadge = ({ priority }: { priority: TaskPriorityName }) => (
  <Badge tone={TASK_PRIORITY[priority].tone}>{TASK_PRIORITY[priority].label}</Badge>
);

const LEAD_TONE: Record<LeadStatusName, BadgeTone> = {
  NEW: "brand",
  CONTACTED: "accent",
  QUALIFIED: "warning",
  PROPOSAL_SENT: "accent",
  WON: "success",
  LOST: "neutral",
};
export const LeadStatusBadge = ({ status }: { status: LeadStatusName }) => (
  <Badge tone={LEAD_TONE[status]}>{LEAD_STATUS_LABEL[status]}</Badge>
);
