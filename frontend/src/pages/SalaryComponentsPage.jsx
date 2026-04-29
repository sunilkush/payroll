import ModulePage from "../components/ModulePage";
import { backendModules } from "../data/backendModules";

export default function SalaryComponentsPage() {
  return <ModulePage {...backendModules.salaryComponents} />;
}
