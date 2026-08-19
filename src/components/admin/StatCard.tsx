import Link from "next/link";
import { type LucideIcon, ArrowUpRight } from "lucide-react";

interface StatCardProps {
  label: string;
  value: number | string;
  subtext?: string;
  icon: LucideIcon;
  href?: string;
  badgeText?: string;
  badgeColor?: "blue" | "green" | "amber" | "purple";
}

const colorStyles = {
  blue: {
    iconBg: "bg-[#1769E0]/10",
    iconText: "text-[#1769E0]",
    badgeBg: "bg-[#1769E0]/10 text-[#1769E0]",
  },
  green: {
    iconBg: "bg-emerald-500/10",
    iconText: "text-emerald-600",
    badgeBg: "bg-emerald-500/10 text-emerald-700",
  },
  amber: {
    iconBg: "bg-amber-500/10",
    iconText: "text-amber-600",
    badgeBg: "bg-amber-500/10 text-amber-700",
  },
  purple: {
    iconBg: "bg-purple-500/10",
    iconText: "text-purple-600",
    badgeBg: "bg-purple-500/10 text-purple-700",
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
    <div className="bg-white border border-[#E4E8EF] rounded-xl p-5 shadow-xs hover:border-[#1769E0]/40 transition-all flex flex-col justify-between h-full group">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs font-semibold text-[#667085] uppercase tracking-wider">
            {label}
          </p>
          <p className="text-2xl sm:text-3xl font-extrabold text-[#111827] tracking-tight">
            {value}
          </p>
        </div>
        <div
          className={`h-11 w-11 rounded-xl ${styles.iconBg} ${styles.iconText} flex items-center justify-center shrink-0 transition-transform group-hover:scale-105`}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-[#F0F2F6] flex items-center justify-between text-xs">
        <span className="text-[#667085] truncate font-normal">{subtext}</span>
        {badgeText && (
          <span
            className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${styles.badgeBg} shrink-0`}
          >
            {badgeText}
          </span>
        )}
        {href && (
          <span className="text-[#1769E0] font-semibold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
            <span>Manage</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </span>
        )}
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block focus:outline-none">
        {content}
      </Link>
    );
  }

  return content;
}
