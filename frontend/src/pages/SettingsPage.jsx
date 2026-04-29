import ModulePage from "../components/ModulePage";
import { backendModules } from "../data/backendModules";

export default function SettingsPage() {
  return <ModulePage {...backendModules.settings} />;
}
