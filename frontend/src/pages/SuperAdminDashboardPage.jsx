import ModulePage from "../components/ModulePage";
import { backendModules } from "../data/backendModules";

export default function SuperAdminDashboardPage() {
  return <ModulePage {...backendModules.superAdmin} />;
}
