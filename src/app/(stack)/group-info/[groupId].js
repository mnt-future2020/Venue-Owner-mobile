import { useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import GroupInfoPanel from "../../../components/group/GroupInfoPanel";

export default function GroupInfoScreen() {
  const { groupId } = useLocalSearchParams();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F8FAFC" }} edges={["left", "right", "bottom"]}>
      <GroupInfoPanel groupId={groupId} />
    </SafeAreaView>
  );
}
