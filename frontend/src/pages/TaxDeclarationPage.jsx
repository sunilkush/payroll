import ModulePage from "../components/ModulePage";
import { backendModules } from "../data/backendModules";

export default function TaxDeclarationPage() {
  return <ModulePage {...backendModules.taxDeclarations} />;
}
