import AppScreen from "../../components/ui/AppScreen";
import { PrivacyPolicyContent } from "../../components/details/LegalContent";

export default function PrivacyPolicyScreen() {
  return (
    <AppScreen title="Privacy Policy" showBack contentStyle={{ paddingBottom: 0 }}>
      <PrivacyPolicyContent />
    </AppScreen>
  );
}
