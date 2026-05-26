import { useRouter } from "expo-router";
import AppScreen from "../../components/ui/AppScreen";
import { TermsContent } from "../../components/details/LegalContent";
import { safePush } from "../../services/navigationGuard";

export default function TermsScreen() {
  const router = useRouter();
  return (
    <AppScreen title="Terms of Service" showBack contentStyle={{ paddingBottom: 0 }}>
      <TermsContent onNavigateRefund={() => safePush(router, "/(stack)/refund-policy")} />
    </AppScreen>
  );
}
