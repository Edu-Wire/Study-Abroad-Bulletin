import Link from "next/link";
import { type LucideIcon, ArrowUpRight } from "lucide-react";

export interface StatSubMetric {
  value: string | number;
  label: string;
  color?: string;
}

export interface StatCardProps {
  label: string;
  value: number | string;
  subtext?: string;
  subMetrics?: StatSubMetric[];
  icon: LucideIcon;
  href?: string;
  badgeText?: string;
  badgeColor?: "blue" | "green" | "amber" | "purple" | "rose" | "slate";
}

const colorStyles = {
  blue: {
    iconBg: "bg-blue-50 text-[#1769E0]",
    badgeBg: "bg-blue-50 text-[#1769E0] border-blue-100/80",
  },
  green: {
    iconBg: "bg-emerald-50 text-emerald-600",
    badgeBg: "bg-emerald-50 text-emerald-700 border-emerald-100/80",
  },
  amber: {
    iconBg: "bg-amber-50 text-amber-600",
    badgeBg: "bg-amber-50 text-amber-700 border-amber-100/80",
  },
  purple: {
    iconBg: "bg-purple-50 text-purple-600",
    badgeBg: "bg-purple-50 text-purple-700 border-purple-100/80",
  },
  rose: {
    iconBg: "bg-rose-50 text-rose-600",
    badgeBg: "bg-rose-50 text-rose-700 border-rose-100/80",
  },
  slate: {
    iconBg: "bg-slate-100 text-slate-600",
    badgeBg: "bg-slate-100 text-slate-700 border-slate-200/80",
  },
};

export function StatCard({
  label,
  value,
  subtext,
  subMetrics,
  icon: Icon,
  href,
  badgeText,
  badgeColor = "blue",
}: StatCardProps) {
  const styles = colorStyles[badgeColor] || colorStyles.blue;

  const content = (
    <div className="bg-white border border-slate-200/75 rounded-[26px] p-5 sm:p-6 shadow-[0_4px_16px_rgba(0,0,0,0.02)] hover:border-slate-300 hover:shadow-[0_8px_24px_rgba(0,0,0,0.05)] hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between h-full group min-h-[178px]">
      {/* Upper section: Left (Label + Big Metric), Right (Icon + Status Badge directly under it) */}
      <div className="flex items-start justify-between gap-2.5">
        <div className="min-w-0 flex-1">
          <p className="text-[11.5px] font-bold uppercase tracking-wider text-slate-400 font-mono">
            {label}
          </p>
          <div className="mt-2 text-3xl sm:text-[34px] font-extrabold tracking-tight text-slate-900 font-display leading-none">
            {value}
          </div>
        </div>

        {/* Right column: Icon on top, Status Badge positioned directly under its respective icon */}
        <div className="flex flex-col items-end gap-2 shrink-0">
          <div
            className={`h-11 w-11 rounded-2xl ${styles.iconBg} flex items-center justify-center transition-transform duration-200 group-hover:scale-105 shadow-2xs`}
          >
            <Icon className="h-5 w-5" />
          </div>
          {badgeText && (
            <span
              className={`px-3 py-0.5 rounded-full text-[10.5px] font-bold border ${styles.badgeBg} text-center leading-tight shadow-2xs whitespace-nowrap`}
            >
              {badgeText}
            </span>
          )}
        </div>
      </div>

      {/* Bottom section: Sub-metrics (cleanly wrapping without truncation) */}
      {subMetrics && subMetrics.length > 0 ? (
        <div className="grid grid-cols-3 gap-2 mt-4 pt-3.5 border-t border-slate-100">
          {subMetrics.map((sm, i) => (
            <div key={i} className="min-w-0">
              <p className={`text-xs sm:text-[13px] font-bold ${sm.color || "text-slate-800"} whitespace-nowrap`}>
                {sm.value}
              </p>
              <p className="text-[10.5px] text-slate-500 font-medium leading-snug mt-0.5 whitespace-normal">
                {sm.label}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
          <span className="text-slate-400 text-[11px] font-medium">{subtext}</span>
          {href && (
            <span className="text-[#1769E0] font-semibold text-xs flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform shrink-0">
              <span>View</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </span>
          )}
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1769E0] rounded-[26px]"
      >
        {content}
      </Link>
    );
  }

  return content;
}
