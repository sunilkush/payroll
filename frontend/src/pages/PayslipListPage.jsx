import ModulePage from "../components/ModulePage";
import { backendModules } from "../data/backendModules";

export default function PayslipListPage() {
  return <ModulePage {...backendModules.payslips} />;
}
