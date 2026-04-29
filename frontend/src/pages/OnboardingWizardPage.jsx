import ModulePage from "../components/ModulePage";
import { backendModules } from "../data/backendModules";

export default function OnboardingWizardPage() {
  return <ModulePage {...backendModules.onboarding} />;
}
