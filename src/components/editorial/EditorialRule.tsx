/**
 * EditorialRule — thin horizontal separator line
 * The primary visual separator for the newspaper editorial system
 */
export function EditorialRule({ className }: { className?: string }) {
  return (
    <hr
      aria-hidden
      className={`editorial-rule ${className ?? ""}`}
    />
  );
}

/**
 * SectionRule — thick black top rule above major section headings
 */
export function SectionRule({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`section-rule ${className ?? ""}`}
    />
  );
}
