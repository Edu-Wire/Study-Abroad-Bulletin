"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface NavLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  activeClassName?: string;
  exact?: boolean;
}

export function NavLink({
  href,
  className,
  activeClassName,
  exact = false,
  children,
  ...props
}: NavLinkProps) {
  const pathname = usePathname();
  const isActive = exact ? pathname === href : pathname.startsWith(href) && href !== "/";
  const isHome = href === "/" && pathname === "/";

  return (
    <Link
      href={href}
      className={cn(
        "transition-colors",
        className,
        (isActive || isHome) && activeClassName,
      )}
      {...props}
    >
      {children}
    </Link>
  );
}
