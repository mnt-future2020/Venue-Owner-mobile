import { useState, useRef, useMemo } from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import Svg, { Defs, LinearGradient, Stop, Path, Line, G, Text as SvgText, Circle } from "react-native-svg";
import { PRIMARY_COLOR, FONTS } from "../../constants/theme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// === helpers
function fmtDateLabel(iso) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  } catch {
    return "";
  }
}

function fmtTooltipDate(iso) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-IN", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  } catch {
    return "";
  }
}

function fmtYAxis(v) {
  const n = Math.round(Number(v) || 0);
  if (n >= 1000) return `₹${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}K`;
  return `₹${n}`;
}

function fmtTooltipValue(v) {
  return `₹${Number(v || 0).toLocaleString("en-IN")}`;
}

// Cubic Bezier monotone path (matches Recharts type="monotone")
function buildMonotonePath(points) {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  const path = [`M ${points[0].x} ${points[0].y}`];
  for (let i = 1; i < points.length; i++) {
    const p0 = points[i - 1];
    const p1 = points[i];
    const cpx1 = p0.x + (p1.x - p0.x) * 0.5;
    const cpy1 = p0.y;
    const cpx2 = p1.x - (p1.x - p0.x) * 0.5;
    const cpy2 = p1.y;
    path.push(`C ${cpx1} ${cpy1}, ${cpx2} ${cpy2}, ${p1.x} ${p1.y}`);
  }
  return path.join(" ");
}

function niceTicks(maxValue, targetCount = 5) {
  if (maxValue <= 0) return [0, 1, 2, 3, 4];
  const rough = maxValue / (targetCount - 1);
  const mag = Math.pow(10, Math.floor(Math.log10(rough)));
  const norm = rough / mag;
  let step;
  if (norm < 1.5) step = 1 * mag;
  else if (norm < 3) step = 2 * mag;
  else if (norm < 7) step = 5 * mag;
  else step = 10 * mag;
  const ticks = [];
  for (let v = 0; v <= maxValue + step / 2; v += step) ticks.push(v);
  return ticks;
}

/**
 * Web-parity AreaChart with tap-to-show tooltip.
 * Tap anywhere on chart → vertical dashed cursor + active dot + tooltip card with date + revenue.
 */
export default function RevenueTrendChart({ dailyRevenue = [] }) {
  const data = Array.isArray(dailyRevenue) ? dailyRevenue : [];
  const [activeIdx, setActiveIdx] = useState(null);

  // --- Geometry (constants, fine before hooks)
  const cardWidth = SCREEN_WIDTH - 40; // ScrollView padding 20 each side
  const cardInnerPad = 16;
  const chartW = cardWidth - cardInnerPad * 2;
  const chartH = 220;
  const yAxisW = 42;
  const xAxisH = 22;
  const padTop = 6;
  const padRight = 4;
  const plotW = chartW - yAxisW - padRight;
  const plotH = chartH - padTop - xAxisH;

  // --- Y scale (safe even with empty data)
  const rawMax = data.length
    ? Math.max(...data.map((d) => Number(d.revenue) || 0))
    : 0;
  const yMax = rawMax > 0 ? rawMax : 1;
  const ticks = niceTicks(yMax * 1.05, 5);
  const yScaleMax = Math.max(yMax, ticks[ticks.length - 1] || yMax);

  const xFor = (i) =>
    yAxisW + (plotW * i) / Math.max(data.length - 1, 1);
  const yFor = (v) => padTop + plotH * (1 - v / yScaleMax);

  // useMemo runs unconditionally (must be before any early-return)
  const points = useMemo(
    () =>
      data.map((d, i) => ({
        x: xFor(i),
        y: yFor(Number(d.revenue) || 0),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, plotW, plotH, yScaleMax]
  );

  // --- Empty state — now safe (all hooks already ran)
  if (data.length === 0) {
    return (
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Revenue Trend</Text>
        </View>
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No revenue data for this period</Text>
        </View>
      </View>
    );
  }

  const linePath = buildMonotonePath(points);
  const baselineY = padTop + plotH;
  const areaPath =
    points.length > 1
      ? `${linePath} L ${points[points.length - 1].x} ${baselineY} L ${points[0].x} ${baselineY} Z`
      : "";

  // --- X label visibility (first / middle / last for ≤5, every Nth otherwise)
  const total = data.length;
  const showLabel = (i) => {
    if (total <= 5) return true;
    const skip = Math.ceil(total / 5);
    return i % skip === 0 || i === total - 1;
  };

  // --- Touch handler: map x → nearest data point
  const handleTouch = (evt) => {
    const touchX = evt.nativeEvent.locationX;
    // Map to plot space
    if (touchX < yAxisW || touchX > yAxisW + plotW) {
      setActiveIdx(null);
      return;
    }
    const ratio = (touchX - yAxisW) / plotW;
    const idx = Math.round(ratio * (data.length - 1));
    const clamped = Math.max(0, Math.min(data.length - 1, idx));
    setActiveIdx(clamped);
  };

  const clearActive = () => {
    // Optional: keep visible after release. Hide instead to match web hover.
    // setActiveIdx(null);
  };

  // --- Tooltip position
  const activePoint = activeIdx != null ? points[activeIdx] : null;
  const activeData = activeIdx != null ? data[activeIdx] : null;
  const TOOLTIP_W = 130;
  const TOOLTIP_H = 50;
  let tooltipLeft = 0;
  let tooltipTop = 0;
  if (activePoint) {
    tooltipLeft = activePoint.x - TOOLTIP_W / 2;
    // Clamp inside chart
    if (tooltipLeft < 4) tooltipLeft = 4;
    if (tooltipLeft + TOOLTIP_W > chartW - 4) tooltipLeft = chartW - TOOLTIP_W - 4;
    tooltipTop = activePoint.y - TOOLTIP_H - 12;
    if (tooltipTop < 4) tooltipTop = activePoint.y + 14;
  }

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Revenue Trend</Text>
        <Text style={styles.range}>Last {data.length} days</Text>
      </View>

      <View
        style={{ width: chartW, height: chartH }}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={handleTouch}
        onResponderMove={handleTouch}
        onResponderRelease={clearActive}
        onResponderTerminate={clearActive}
      >
        <Svg width={chartW} height={chartH}>
          <Defs>
            <LinearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={PRIMARY_COLOR} stopOpacity={0.3} />
              <Stop offset="95%" stopColor={PRIMARY_COLOR} stopOpacity={0.02} />
            </LinearGradient>
          </Defs>

          {/* Horizontal dashed grid lines + Y labels */}
          {ticks.map((t, i) => {
            const y = yFor(t);
            return (
              <G key={`tick-${i}`}>
                <Line
                  x1={yAxisW}
                  x2={yAxisW + plotW}
                  y1={y}
                  y2={y}
                  stroke="rgba(229, 231, 235, 0.9)"
                  strokeWidth={1}
                  strokeDasharray="3 3"
                />
                <SvgText
                  x={yAxisW - 6}
                  y={y + 4}
                  fontSize={10}
                  fill="#9CA3AF"
                  textAnchor="end"
                  fontFamily={FONTS.bodyMedium}
                >
                  {fmtYAxis(t)}
                </SvgText>
              </G>
            );
          })}

          {/* Area fill */}
          {areaPath ? <Path d={areaPath} fill="url(#rev)" /> : null}

          {/* Line */}
          {linePath ? (
            <Path
              d={linePath}
              stroke={PRIMARY_COLOR}
              strokeWidth={2.5}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : null}

          {/* Active vertical cursor + dot */}
          {activePoint ? (
            <>
              <Line
                x1={activePoint.x}
                x2={activePoint.x}
                y1={padTop}
                y2={baselineY}
                stroke={PRIMARY_COLOR}
                strokeWidth={1}
                strokeDasharray="4 4"
              />
              <Circle
                cx={activePoint.x}
                cy={activePoint.y}
                r={5}
                fill={PRIMARY_COLOR}
                stroke="#FFFFFF"
                strokeWidth={2}
              />
            </>
          ) : null}

          {/* X labels */}
          {data.map((d, i) =>
            showLabel(i) ? (
              <SvgText
                key={`x-${i}`}
                x={xFor(i)}
                y={padTop + plotH + 16}
                fontSize={10}
                fill="#9CA3AF"
                textAnchor="middle"
                fontFamily={FONTS.bodyMedium}
              >
                {fmtDateLabel(d.date)}
              </SvgText>
            ) : null
          )}
        </Svg>

        {/* Tooltip card */}
        {activeData ? (
          <View
            pointerEvents="none"
            style={[
              styles.tooltip,
              {
                left: tooltipLeft,
                top: tooltipTop,
                width: TOOLTIP_W,
              },
            ]}
          >
            <Text style={styles.tooltipDate}>{fmtTooltipDate(activeData.date)}</Text>
            <Text style={styles.tooltipValue}>
              Revenue: <Text style={styles.tooltipValueBold}>{fmtTooltipValue(activeData.revenue)}</Text>
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(229, 231, 235, 0.7)",
    overflow: "hidden",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  title: {
    fontSize: 14,
    fontFamily: FONTS.displayBold,
    fontWeight: "900",
    color: "#111827",
  },
  range: {
    fontSize: 11,
    fontFamily: FONTS.bodyMedium,
    color: "#9CA3AF",
    fontWeight: "500",
  },
  empty: {
    height: 220,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: { fontSize: 12, color: "#9CA3AF", fontWeight: "600" },

  tooltip: {
    position: "absolute",
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: "rgba(229, 231, 235, 0.9)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 6,
  },
  tooltipDate: {
    fontSize: 11,
    fontFamily: FONTS.bodyBold,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 2,
  },
  tooltipValue: {
    fontSize: 11,
    fontFamily: FONTS.bodyMedium,
    color: "#6B7280",
  },
  tooltipValueBold: {
    fontFamily: FONTS.bodyExtraBold,
    fontWeight: "900",
    color: PRIMARY_COLOR,
  },
});
