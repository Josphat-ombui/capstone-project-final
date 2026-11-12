import type { ReactNode } from "react";
import { QuestionPanel } from "./QuestionPanel";

interface PageHeaderProps {
  eyebrow: string;
  title: string;
  description: string;
  aside?: ReactNode;
  /** IDs of the questions this page answers. Their panels are shown under the header. */
  questions?: string[];
}

/** The title block at the top of each page, followed by the panels for the questions the page answers. */
export function PageHeader({ eyebrow, title, description, aside, questions }: PageHeaderProps) {
  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h1 className="page-title">{title}</h1>
          <p className="page-description">{description}</p>
        </div>
        {aside && <div className="page-aside">{aside}</div>}
      </header>
      {questions && questions.length > 0 && <QuestionPanel ids={questions} />}
    </>
  );
}
