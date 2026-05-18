import { Image } from "expo-image";

const LOGO = require("../../assets/lobbi-player.png");

export default function Logo({ size = 28 }) {
  const width = Math.round(size * 3.2);
  const height = size;

  return (
    <Image
      source={LOGO}
      style={{ width, height }}
      contentFit="contain"
    />
  );
}
