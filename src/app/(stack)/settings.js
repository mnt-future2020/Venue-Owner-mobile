import AppScreen from "../../components/ui/AppScreen";
import { SettingsContent } from "../../components/details/SimpleSettingsContent";

export default function SettingsScreen() {
  return (
    <AppScreen title="Settings" contentStyle={{ paddingBottom: 0 }}>
      <SettingsContent />
    </AppScreen>
  );
}
