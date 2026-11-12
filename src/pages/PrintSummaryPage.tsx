import { PageHeader } from "../components/PageHeader";
import { QuestionPanel } from "../components/QuestionPanel";
import type { DashboardData } from "../lib/data";
import { buildQuestions, masterRow } from "../lib/questions";

/**
 * Printable full summary: the master table and every question panel on one page.
 * Print / Save as PDF in the top bar saves all of it. Charts are on their own pages and are not repeated here.
 */
export function PrintSummaryPage({ data }: { data: DashboardData }) {
  const questions = buildQuestions(data);
  const rows = questions.map(masterRow);
  const headers = Object.keys(rows[0] ?? {});
  return (
    <>
      <PageHeader
        eyebrow="Printable summary"
        title="Full summary of all questions"
        description="The master table and every question with its method, target, findings and meaning. Use Print / Save as PDF in the top bar to save all of it."
      />
      <section className="card wide print-master" aria-labelledby="master-table-title">
        <h2 id="master-table-title" className="card-title">Master summary</h2>
        <div className="table-scroll">
          <table className="print-table">
            <thead>
              <tr>
                {headers.map((header) => (
                  <th key={header} scope="col">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={String(row["No."])}>
                  {headers.map((header) => (
                    <td key={header}>{String(row[header])}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <QuestionPanel ids={questions.map((question) => question.id)} />
    </>
  );
}
