import ModulePage from "../components/ModulePage";
import { backendModules } from "../data/backendModules";

export default function EmployeeManagementPage() {
  return <ModulePage {...backendModules.employees} />;
}
