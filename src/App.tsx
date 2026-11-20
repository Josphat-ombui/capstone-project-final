import { Suspense, lazy, useMemo } from "react";
import { HashRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Layout } from "./components/Layout";
import { DashboardContext, useDashboardData, type DashboardData } from "./lib/data";
import { buildFilterOptions } from "./lib/filters";
import { FilterProvider } from "./components/FilterContext";
import { useTheme } from "./lib/theme";
import { FilterBar } from "./components/FilterBar";
import "./styles/filters.css";

// Each page is its own chunk, so the first screen loads quickly.
const ExecutivePage = lazy(() => import("./pages/ExecutivePage").then((module) => ({ default: module.ExecutivePage })));
const BatchAlertsPage = lazy(() => import("./pages/BatchAlertsPage").then((module) => ({ default: module.BatchAlertsPage })));
const EquipmentPage = lazy(() => import("./pages/EquipmentPage").then((module) => ({ default: module.EquipmentPage })));
const ProcessControlPage = lazy(() => import("./pages/ProcessControlPage").then((module) => ({ default: module.ProcessControlPage })));
const ReceivablesPage = lazy(() => import("./pages/ReceivablesPage").then((module) => ({ default: module.ReceivablesPage })));
const MarginPage = lazy(() => import("./pages/MarginPage").then((module) => ({ default: module.MarginPage })));
const InventoryPage = lazy(() => import("./pages/InventoryPage").then((module) => ({ default: module.InventoryPage })));
const ActionsPage = lazy(() => import("./pages/ActionsPage").then((module) => ({ default: module.ActionsPage })));
const CostPage = lazy(() => import("./pages/CostPage").then((module) => ({ default: module.CostPage })));
const PredictorPage = lazy(() => import("./pages/PredictorPage").then((module) => ({ default: module.PredictorPage })));
const PrintSummaryPage = lazy(() => import("./pages/PrintSummaryPage").then((module) => ({ default: module.PrintSummaryPage })));
const ExplorationPage = lazy(() => import("./pages/ExplorationPage").then((module) => ({ default: module.ExplorationPage })));

/** The filter panel shows on pages whose figures respond to it. Stock uses branches only; the rest are hidden where filters would do nothing. */
function PageFilters() {
  const { pathname } = useLocation();
  if (["/actions", "/exploration", "/print", "/predictor"].includes(pathname)) return null;
  if (pathname === "/inventory") return <FilterBar mode="branch" />;
  return <FilterBar />;
}

/** Shown while the exported data loads. */
function LoadingScreen() {
  return (
    <div className="state-screen" role="status">
      <div className="spinner" aria-hidden="true" />
      <p>Loading the latest pipeline results</p>
    </div>
  );
}

/** Shown if the data file is missing or cannot be read, with the command that fixes it. */
function ErrorScreen({ message }: { message: string }) {
  return (
    <div className="state-screen state-error" role="alert">
      <h1>The dashboard has no data yet</h1>
      <p>{message}</p>
      <pre>{"python scripts/run_pipeline.py\npython scripts/export_dashboard_data.py"}</pre>
    </div>
  );
}

/** Routes the eight pages inside the shared layout. */
function Dashboard({ data, theme, onToggleTheme }: { data: DashboardData; theme: "light" | "dark"; onToggleTheme: () => void }) {
  const options = useMemo(() => buildFilterOptions(data), [data]);
  return (
    <DashboardContext.Provider value={data}>
      <FilterProvider options={options}>
        <HashRouter>
          <Routes>
            <Route path="*" element={
              <Layout mode={data.meta.mode} generatedAt={data.meta.generatedAt} theme={theme} onToggleTheme={onToggleTheme}>
            <PageFilters />
            <Suspense fallback={<div className="state-screen" role="status"><div className="spinner" aria-hidden="true" /><p>Loading page</p></div>}>
              <Routes>
                <Route path="/" element={<ExecutivePage data={data} />} />
                <Route path="/actions" element={<ActionsPage data={data} />} />
                <Route path="/summary" element={<Navigate to="/" replace />} />
                <Route path="/exploration" element={<ExplorationPage data={data} />} />
                <Route path="/print" element={<PrintSummaryPage data={data} />} />
                <Route path="/batch-alerts" element={<BatchAlertsPage data={data} />} />
                <Route path="/predictor" element={<PredictorPage data={data} />} />
                <Route path="/equipment" element={<EquipmentPage data={data} />} />
                <Route path="/process-control" element={<ProcessControlPage data={data} />} />
                <Route path="/receivables" element={<ReceivablesPage data={data} />} />
                <Route path="/margin" element={<MarginPage data={data} />} />
                <Route path="/inventory" element={<InventoryPage data={data} />} />
                <Route path="/costs" element={<CostPage data={data} />} />
              </Routes>
            </Suspense>
          </Layout>
            } />
          </Routes>
        </HashRouter>
      </FilterProvider>
    </DashboardContext.Provider>
  );
}

/** Root component: loads the data once, then shows the dashboard, a loading state or an error. */
export default function App() {
  const state = useDashboardData();
  const [theme, toggleTheme] = useTheme();

  if (state.status === "loading") return <LoadingScreen />;
  if (state.status === "error") return <ErrorScreen message={state.message} />;
  return <Dashboard data={state.data} theme={theme} onToggleTheme={toggleTheme} />;
}
