import { ApplicationForm } from "./components/ApplicationForm";
import { ApplicationTable } from "./components/ApplicationTable";
import { Dashboard } from "./components/Dashboard";
import { FilterBar } from "./components/FilterBar";
import { useUiStore } from "./store/useUiStore";

export default function App() {
  const formOpen = useUiStore((s) => s.formOpen);
  const openCreateForm = useUiStore((s) => s.openCreateForm);

  return (
    <div className="page">
      <header className="topbar">
        <div>
          <h1 className="wordmark">JobTracker</h1>
          <p className="tagline">Application logbook</p>
        </div>
        <button type="button" className="btn btn--primary" onClick={openCreateForm}>
          Log application
        </button>
      </header>

      <main>
        <Dashboard />
        <FilterBar />
        <ApplicationTable />
      </main>

      {formOpen && <ApplicationForm />}
    </div>
  );
}
