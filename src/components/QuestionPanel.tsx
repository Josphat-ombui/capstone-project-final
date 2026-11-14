import { useMemo } from "react";
import { useDashboard } from "../lib/data";
import { glossary } from "../lib/glossary";
import { buildQuestions, type Question } from "../lib/questions";

/** One question: the answer first, the method and target as tags, and the full detail folded away. */
function QuestionCard({ question }: { question: Question }) {
  const headingId = `question-${question.id}`;
  return (
    <section className="question-card" aria-labelledby={headingId}>
      <header className="question-head">
        <span className="question-number">Q{question.number}</span>
        <h2 id={headingId} className="question-title">
          {question.question}
        </h2>
      </header>

      <p className="question-answer">{question.findings[0]}</p>

      <details className="question-details">
        <summary>Details</summary>
        <div className="question-tags">
          <span className="tag">Target: {question.target}</span>
          <span className="tag">{question.method}</span>
        </div>
        <p className="plain-words">{question.plainWords}</p>
        <dl className="question-grid">
          <div>
            <dt>Why it matters</dt>
            <dd>{question.why}</dd>
          </div>
          <div>
            <dt>How it works</dt>
            <dd>{question.methodPlain}</dd>
          </div>
          <div>
            <dt>What it means</dt>
            <dd>{question.meaning}</dd>
          </div>
        </dl>
        <h3 className="detail-title">All findings</h3>
        <ul className="question-findings">
          {question.findings.map((finding) => (
            <li key={finding}>{finding}</li>
          ))}
        </ul>
        {question.glossaryKeys.length > 0 && (
          <dl className="glossary-list">
            {question.glossaryKeys.map((key) => (
              <div key={key}>
                <dt>{glossary[key]?.term ?? key}</dt>
                <dd>{glossary[key]?.meaning ?? ""}</dd>
              </div>
            ))}
          </dl>
        )}
      </details>
    </section>
  );
}

/** Shows the question panels for the given question IDs. Used under each page header. */
export function QuestionPanel({ ids }: { ids: string[] }) {
  const data = useDashboard();
  const questions = useMemo(() => buildQuestions(data), [data]);
  const shown = questions.filter((question) => ids.includes(question.id));
  return <div className="question-stack">{shown.map((question) => <QuestionCard key={question.id} question={question} />)}</div>;
}
