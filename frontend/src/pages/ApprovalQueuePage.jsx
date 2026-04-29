import ModulePage from "../components/ModulePage";
import { backendModules } from "../data/backendModules";

export default function ApprovalQueuePage() {
  return <ModulePage {...backendModules.approvals} />;
}
