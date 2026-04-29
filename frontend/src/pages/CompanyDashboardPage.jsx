import ModulePage from "../components/ModulePage";
import { backendModules } from "../data/backendModules";

export default function CompanyDashboardPage() {
  return <ModulePage {...backendModules.dashboard} />;
}
