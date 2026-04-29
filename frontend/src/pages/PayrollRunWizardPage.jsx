import ModulePage from "../components/ModulePage";
import { backendModules } from "../data/backendModules";

export default function PayrollRunWizardPage() {
  return <ModulePage {...backendModules.payrollRuns} />;
}
