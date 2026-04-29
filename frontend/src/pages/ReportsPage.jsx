import ModulePage from "../components/ModulePage";
import { backendModules } from "../data/backendModules";

export default function ReportsPage() {
  return <ModulePage {...backendModules.reports} />;
}
