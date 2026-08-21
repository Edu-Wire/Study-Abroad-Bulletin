import Link from "next/link";
import { type LucideIcon, ArrowUpRight } from "lucide-react";

interface StatCardProps {
  label: string;
  value: number | string;
  subtext?: string;
  icon: LucideIcon;
  href?: string;
  badgeText?: string;
  badgeColor?: "blue" | "green" | "amber" | "purple" | "rose" | "slate";
}

const colorStyles = {
  blue: {
    iconBg: "bg-blue-500/10 text-[#1769E0] border-blue-500/20",
    badgeBg: "bg-blue-50 text-[#1769E0] border-blue-200/80",
  },
  green: {
    iconBg: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    badgeBg: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
  },
  amber: {
    iconBg: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    badgeBg: "bg-amber-50 text-amber-700 border-amber-200/80",
  },
  purple: {
    iconBg: "bg-purple-500/10 text-purple-600 border-purple-500/20",
    badgeBg: "bg-purple-50 text-purple-700 border-purple-200/80",
  },
  rose: {
    iconBg: "bg-rose-500/10 text-rose-600 border-rose-500/20",
    badgeBg: "bg-rose-50 text-rose-700 border-rose-200/80",
  },
  slate: {
    iconBg: "bg-slate-500/10 text-slate-600 border-slate-500/20",
    badgeBg: "bg-slate-100 text-slate-700 border-slate-200/80",
  },
};

export function StatCard({
  label,
  value,
  subtext,
  icon: Icon,
  href,
  badgeText,
  badgeColor = "blue",
}: StatCardProps) {
  const styles = colorStyles[badgeColor] || colorStyles.blue;

  const content = (
    <div className="bg-white border border-slate-200/80 rounded-xl p-4 sm:p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:border-slate-300 hover:shadow-sm transition-all duration-200 flex flex-col justify-between h-full group">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 truncate">
            {label}
          </p>
          <p className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 font-display">
            {value}
          </p>
        </div>
        <div
          className={`h-10 w-10 sm:h-11 sm:w-11 rounded-xl ${styles.iconBg} border flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105`}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
        <span className="text-slate-500 truncate text-[11px] font-normal">{subtext}</span>
        {badgeText && (
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${styles.badgeBg} shrink-0`}
          >
            {badgeText}
          </span>
        )}
        {href && (
          <span className="text-[#1769E0] font-semibold text-xs flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform shrink-0">
            <span>View</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </span>
        )}
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1769E0] rounded-xl">
        {content}
      </Link>
    );
  }

  return content;
}
