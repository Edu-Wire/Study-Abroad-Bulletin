"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { logout as apiLogout } from "@/lib/api/auth";
import { useStudentProfile } from "@/context/StudentProfileContext";

interface LogoutButtonProps {
  className?: string;
  variant?: "default" | "outline" | "text";
  showIcon?: boolean;
  onClick?: () => void;
}

export function LogoutButton({
  className = "",
  variant = "outline",
  showIcon = true,
  onClick,
}: LogoutButtonProps) {
  const router = useRouter();
  const { refreshProfile } = useStudentProfile();

  const handleLogout = async () => {
    if (onClick) {
      onClick();
    }
    // The server revokes the session and clears the HttpOnly cookie.
    try {
      await apiLogout();
      await refreshProfile();
    } catch {
      // apiLogout already degrades gracefully; never trap the user here.
    }
    router.push("/auth/login");
    router.refresh();
  };

  const baseStyles =
    "inline-flex items-center justify-center gap-2 rounded-md text-xs font-semibold transition-colors cursor-pointer";

  const variantStyles = {
    default: "bg-destructive text-destructive-foreground hover:opacity-90 px-3.5 py-2",
    outline:
      "border border-border bg-background px-3 py-2 text-foreground hover:border-destructive hover:text-destructive hover:bg-destructive/5",
    text: "text-muted-foreground hover:text-destructive p-0",
  };

  return (
    <button
      type="button"
      onClick={handleLogout}
      className={`${baseStyles} ${variantStyles[variant]} ${className}`}
      title="Sign out of your account"
    >
      {showIcon && <LogOut className="size-4 shrink-0" />}
      <span>Sign out</span>
    </button>
  );
}
