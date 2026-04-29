import ModulePage from "../components/ModulePage";
import { backendModules } from "../data/backendModules";

export default function ReimbursementPage() {
  return <ModulePage {...backendModules.reimbursements} />;
}
