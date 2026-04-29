import ModulePage from "../components/ModulePage";
import { backendModules } from "../data/backendModules";

export default function MyPayslipsPage() {
  return <ModulePage {...backendModules.myPayslips} />;
}
