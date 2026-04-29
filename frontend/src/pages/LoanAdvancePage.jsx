import ModulePage from "../components/ModulePage";
import { backendModules } from "../data/backendModules";

export default function LoanAdvancePage() {
  return <ModulePage {...backendModules.loans} />;
}
