import { BatchPredictorGuide } from "../components/BatchPredictorGuide";
import { PageHeader } from "../components/PageHeader";
import type { DashboardData } from "../lib/data";

/** Batch predictor: a guided page to score one batch and see the factors behind the result. */
export function PredictorPage({ data }: { data: DashboardData }) {
  return (
    <>
      <PageHeader
        eyebrow="Batch predictor"
        title="Predict the failure chance for one batch"
        description="Pick a starting example, adjust the settings, then read the result. This is a planning and QA aid, not a release decision."
        questions={["predictor"]}
      />
      {data.predictor ? (
        <BatchPredictorGuide spec={data.predictor} />
      ) : (
        <p className="state-error">The predictor is not in the exported data. Run python scripts/export_dashboard_data.py.</p>
      )}
    </>
  );
}
