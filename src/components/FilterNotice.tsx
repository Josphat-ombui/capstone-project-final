import type { ReactNode } from "react";
import { Info } from "lucide-react";

/** A one-line note on a page saying which filters apply there, and which do not. */
export function FilterNotice({ children }: { children: ReactNode }) {
  return (
    <p className="filter-notice" role="note">
      <Info size={15} aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}
