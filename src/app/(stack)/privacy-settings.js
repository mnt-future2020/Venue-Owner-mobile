import AppScreen from "../../components/ui/AppScreen";
import PrivacySettingsContent from "../../components/settings/PrivacySettingsContent";

export default function PrivacySettingsScreen() {
  return (
    <AppScreen title="Privacy & Data" showBack contentStyle={{ paddingBottom: 0 }}>
      <PrivacySettingsContent />
    </AppScreen>
  );
}
