import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Rect, Text as SvgText } from "react-native-svg";

const PADDING_LEFT = 8;
const PADDING_RIGHT = 8;
const PADDING_TOP = 24;
const PADDING_BOTTOM = 20;

export default function SimpleBarChart({
  data = [],
  height = 180,
  barColor = "#059669",
}) {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];
    return data.map((item) => ({
      label: item.label || "",
      value: Number(item.value) || 0,
    }));
  }, [data]);

  const maxValue = useMemo(
    () => Math.max(...chartData.map((d) => d.value), 1),
    [chartData]
  );

  if (chartData.length === 0) {
    return null;
  }

  const chartWidth = 320;
  const usableWidth = chartWidth - PADDING_LEFT - PADDING_RIGHT;
  const usableHeight = height - PADDING_TOP - PADDING_BOTTOM;
  const barWidth = Math.max(
    Math.min(usableWidth / chartData.length - 8, 36),
    12
  );

  return (
    <View style={styles.container}>
      <Svg width="100%" height={height} viewBox={`0 0 ${chartWidth} ${height}`}>
        {chartData.map((item, index) => {
          const barHeight = (item.value / maxValue) * usableHeight;
          const x =
            PADDING_LEFT +
            (usableWidth / chartData.length) * index +
            (usableWidth / chartData.length - barWidth) / 2;
          const y = PADDING_TOP + (usableHeight - barHeight);

          return (
            <View key={`${item.label}-${index}`}>
              {/* Value on top */}
              <SvgText
                x={x + barWidth / 2}
                y={y - 6}
                fontSize={10}
                fontWeight="700"
                fill="#334155"
                textAnchor="middle"
              >
                {item.value}
              </SvgText>

              {/* Bar */}
              <Rect
                x={x}
                y={y}
                width={barWidth}
                height={Math.max(barHeight, 2)}
                rx={4}
                ry={4}
                fill={barColor}
              />

              {/* Label at bottom */}
              <SvgText
                x={x + barWidth / 2}
                y={height - 4}
                fontSize={10}
                fontWeight="600"
                fill="#64748B"
                textAnchor="middle"
              >
                {item.label}
              </SvgText>
            </View>
          );
        })}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    overflow: "hidden",
  },
});
