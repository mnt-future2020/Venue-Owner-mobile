import AppScreen from "../../components/ui/AppScreen";
import { RefundPolicyContent } from "../../components/details/LegalContent";

export default function RefundPolicyScreen() {
  return (
    <AppScreen title="Refund Policy" showBack contentStyle={{ paddingBottom: 0 }}>
      <RefundPolicyContent />
    </AppScreen>
  );
}
