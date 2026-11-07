import { CONDITIONS, REPORT_STATUS, SUB_STATUS, USER_STATUS } from "@/lib/labels";

const Pill = ({ cfg, testId }) => (
  <span data-testid={testId} className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${cfg?.cls || "bg-slate-100 text-slate-700"}`}>
    <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
    {cfg?.label || "—"}
  </span>
);

export const ConditionBadge = ({ value, testId = "condition-badge" }) => <Pill cfg={CONDITIONS[value]} testId={testId} />;
export const ReportBadge = ({ value, testId = "report-status-badge" }) => <Pill cfg={REPORT_STATUS[value]} testId={testId} />;
export const SubBadge = ({ value, testId = "subscription-badge" }) => <Pill cfg={SUB_STATUS[value]} testId={testId} />;
export const UserBadge = ({ value, testId = "user-status-badge" }) => <Pill cfg={USER_STATUS[value]} testId={testId} />;
