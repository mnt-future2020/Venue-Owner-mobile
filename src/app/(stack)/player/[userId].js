import { useState } from "react";
import AppScreen from "../../../components/ui/AppScreen";
import PlayerCardScreenContent from "../../../components/details/PlayerCardScreenContent.js";

export default function PlayerCardScreen() {
  const [playerName, setPlayerName] = useState("");

  return (
    <AppScreen title={playerName || "Player Profile"} contentStyle={{ paddingBottom: 0 }}>
      <PlayerCardScreenContent onNameLoaded={setPlayerName} />
    </AppScreen>
  );
}
