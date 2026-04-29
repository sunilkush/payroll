import ModulePage from "../components/ModulePage";
import { backendModules } from "../data/backendModules";

export default function SubscriptionBillingPage() {
  return <ModulePage {...backendModules.billing} />;
}
