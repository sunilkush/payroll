import ModulePage from "../components/ModulePage";
import { backendModules } from "../data/backendModules";

export default function SalaryStructureBuilderPage() {
  return <ModulePage {...backendModules.salaryStructure} />;
}
