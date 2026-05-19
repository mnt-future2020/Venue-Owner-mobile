import { useState, useMemo, useRef, useEffect } from "react";
import { View, Text, StyleSheet, Dimensions, ScrollView } from "react-native";
import Svg, { Line, G, Rect, Text as SvgText } from "react-native-svg";
import { FONTS } from "../../constants/theme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Web-parity: amber (expenses) / emerald (income) / violet (net) — same hex
const COLOR_EXPENSES = "#F59E0B";
const COLOR_INCOME = "#10B981";
const COLOR_NET = "#7C3AED";

const fmtY = (v) => `₹${(v / 1000).toFixed(0)}k`;
const fmtTooltipValue = (v) => `₹${Number(v || 0).toLocaleString("en-IN")}`;

// Min width per month group (3 bars + spacing) — drives horizontal scroll trigger
const MIN_SLOT_WIDTH = 70;

function niceTicks(maxValue, targetCount = 5) {
  if (maxValue <= 0) return [0, 1000, 2000, 3000, 4000];
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
 * 6-Month Trend grouped bar chart (web parity with VenueFinancePage Recharts).
 * - Y-axis sticky on the left (fixed column)
 * - Bars + X labels horizontally scrollable when content wider than card
 * - Tap a month → tooltip with all three values.
 */
export default function MonthlyTrendChart({ monthlyTrend = [] }) {
  const data = Array.isArray(monthlyTrend) ? monthlyTrend : [];
  const [activeIdx, setActiveIdx] = useState(null);
  const scrollRef = useRef(null);

  // Snap to the right edge (latest month) when data length changes / on mount.
  // Web UX: most recent month is what owners care about most.
  useEffect(() => {
    if (!scrollRef.current) return;
    // Wait one frame for content to layout, then jump to end without animation
    const handle = requestAnimationFrame(() => {
      scrollRef.current?.scrollToEnd?.({ animated: false });
    });
    return () => cancelAnimationFrame(handle);
  }, [data.length]);

  // --- Geometry
  const cardWidth = SCREEN_WIDTH - 40; // ScrollView padding 20 each side
  const cardInnerPad = 16;
  const totalCardW = cardWidth - cardInnerPad * 2;
  const yAxisW = 42; // fixed left column for Y labels
  const chartH = 240;
  const xAxisH = 26;
  const padTop = 10;
  const padRight = 8;
  const plotH = chartH - padTop - xAxisH;

  // Compute slot width — use min if needed to keep bars readable
  const availableForBars = totalCardW - yAxisW;
  const naturalSlotW = data.length ? availableForBars / data.length : 0;
  const slotW = Math.max(MIN_SLOT_WIDTH, naturalSlotW);
  const plotW = slotW * Math.max(data.length, 1);
  const isScrollable = plotW + padRight > availableForBars;

  const groupGap = 8;
  const barW = Math.max(8, (slotW - groupGap * 2) / 3 - 2);

  // --- Y scale
  const rawMax = data.length
    ? Math.max(
        ...data.map((d) =>
          Math.max(Number(d.income) || 0, Number(d.expenses) || 0, Number(d.net) || 0),
        ),
      )
    : 0;
  const yMax = rawMax > 0 ? rawMax * 1.1 : 1;
  const ticks = niceTicks(yMax, 5);
  const yScaleMax = Math.max(yMax, ticks[ticks.length - 1] || yMax);
  const yFor = (v) => padTop + plotH * (1 - v / yScaleMax);

  // --- Tooltip data
  const tooltipData = useMemo(() => {
    if (activeIdx == null || !data[activeIdx]) return null;
    return data[activeIdx];
  }, [activeIdx, data]);

  if (data.length === 0) {
    return (
      <View style={styles.card}>
        <Text style={styles.title}>6-Month Trend</Text>
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No trend data available</Text>
        </View>
      </View>
    );
  }

  // --- Touch handler: map x → nearest month slot (locationX is relative to bars area)
  const handleTouch = (evt) => {
    const touchX = evt.nativeEvent.locationX;
    if (touchX < 0 || touchX > plotW) {
      setActiveIdx(null);
      return;
    }
    const idx = Math.floor(touchX / slotW);
    const clamped = Math.max(0, Math.min(data.length - 1, idx));
    setActiveIdx(clamped);
  };

  // --- Tooltip position (relative to bars area, NOT card-wide)
  const TOOLTIP_W = 160;
  const TOOLTIP_H = 92;
  let tooltipLeft = 0;
  let tooltipTop = padTop + 4;
  if (tooltipData != null && activeIdx != null) {
    const slotCenterX = slotW * activeIdx + slotW / 2;
    tooltipLeft = slotCenterX - TOOLTIP_W / 2;
    if (tooltipLeft < 4) tooltipLeft = 4;
    if (tooltipLeft + TOOLTIP_W > plotW - 4) tooltipLeft = plotW - TOOLTIP_W - 4;
  }

  // --- Render the SCROLLED inner chart (bars + X labels + grid lines)
  const innerChart = (
    <View
      style={{ width: plotW, height: chartH }}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderGrant={handleTouch}
      onResponderMove={handleTouch}
    >
      <Svg width={plotW} height={chartH}>
        {/* Horizontal grid lines (no Y labels — those are in fixed column) */}
        {ticks.map((t, i) => {
          const y = yFor(t);
          return (
            <Line
              key={`g-${i}`}
              x1={0}
              x2={plotW}
              y1={y}
              y2={y}
              stroke="rgba(229, 231, 235, 0.9)"
              strokeWidth={1}
              strokeDasharray="3 3"
            />
          );
        })}

        {/* Bars per month */}
        {data.map((d, i) => {
          const slotStart = slotW * i;
          const groupCenter = slotStart + slotW / 2;
          const totalGroupW = barW * 3 + 4;
          const firstBarX = groupCenter - totalGroupW / 2;
          const expensesV = Math.max(0, Number(d.expenses) || 0);
          const incomeV = Math.max(0, Number(d.income) || 0);
          const netV = Math.max(0, Number(d.net) || 0);
          const baselineY = padTop + plotH;
          const expensesY = yFor(expensesV);
          const incomeY = yFor(incomeV);
          const netY = yFor(netV);

          return (
            <G key={`bar-${i}`}>
              {/* Expenses (amber) */}
              <Rect
                x={firstBarX}
                y={expensesY}
                width={barW}
                height={Math.max(0, baselineY - expensesY)}
                rx={4}
                fill={COLOR_EXPENSES}
                opacity={activeIdx != null && activeIdx !== i ? 0.55 : 1}
              />
              {/* Income (emerald) */}
              <Rect
                x={firstBarX + barW + 2}
                y={incomeY}
                width={barW}
                height={Math.max(0, baselineY - incomeY)}
                rx={4}
                fill={COLOR_INCOME}
                opacity={activeIdx != null && activeIdx !== i ? 0.55 : 1}
              />
              {/* Net (violet) */}
              <Rect
                x={firstBarX + (barW + 2) * 2}
                y={netY}
                width={barW}
                height={Math.max(0, baselineY - netY)}
                rx={4}
                fill={COLOR_NET}
                opacity={activeIdx != null && activeIdx !== i ? 0.55 : 1}
              />

              {/* X label (month) */}
              <SvgText
                x={groupCenter}
                y={baselineY + 16}
                fontSize={10}
                fill="#9CA3AF"
                textAnchor="middle"
                fontFamily={FONTS.bodyMedium}
              >
                {String(d.month || "")}
              </SvgText>
            </G>
          );
        })}
      </Svg>

      {/* Tooltip card — positioned inside scrolled area so it travels with bars */}
      {tooltipData ? (
        <View
          pointerEvents="none"
          style={[
            styles.tooltip,
            { left: tooltipLeft, top: tooltipTop, width: TOOLTIP_W, minHeight: TOOLTIP_H },
          ]}
        >
          <Text style={styles.tooltipDate}>{tooltipData.month}</Text>
          <View style={styles.tooltipRow}>
            <View style={[styles.tooltipDot, { backgroundColor: COLOR_INCOME }]} />
            <Text style={styles.tooltipLabel}>Income</Text>
            <Text style={styles.tooltipValue}>{fmtTooltipValue(tooltipData.income)}</Text>
          </View>
          <View style={styles.tooltipRow}>
            <View style={[styles.tooltipDot, { backgroundColor: COLOR_EXPENSES }]} />
            <Text style={styles.tooltipLabel}>Expenses</Text>
            <Text style={styles.tooltipValue}>{fmtTooltipValue(tooltipData.expenses)}</Text>
          </View>
          <View style={styles.tooltipRow}>
            <View style={[styles.tooltipDot, { backgroundColor: COLOR_NET }]} />
            <Text style={styles.tooltipLabel}>Net</Text>
            <Text style={styles.tooltipValue}>{fmtTooltipValue(tooltipData.net)}</Text>
          </View>
        </View>
      ) : null}
    </View>
  );

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>6-Month Trend</Text>
        {isScrollable ? <Text style={styles.swipeHint}>← Swipe for older</Text> : null}
      </View>

      <View style={{ flexDirection: "row", height: chartH }}>
        {/* Fixed Y-axis column (labels only) */}
        <Svg width={yAxisW} height={chartH}>
          {ticks.map((t, i) => {
            const y = yFor(t);
            return (
              <SvgText
                key={`yl-${i}`}
                x={yAxisW - 6}
                y={y + 4}
                fontSize={10}
                fill="#9CA3AF"
                textAnchor="end"
                fontFamily={FONTS.bodyMedium}
              >
                {fmtY(t)}
              </SvgText>
            );
          })}
        </Svg>

        {/* Scrollable bars area — auto-scrolls to latest (rightmost) on mount */}
        {isScrollable ? (
          <ScrollView
            ref={scrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            bounces
          >
            {innerChart}
          </ScrollView>
        ) : (
          <View style={{ width: plotW }}>{innerChart}</View>
        )}
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: COLOR_EXPENSES }]} />
          <Text style={styles.legendText}>Expenses</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: COLOR_INCOME }]} />
          <Text style={styles.legendText}>Income</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: COLOR_NET }]} />
          <Text style={styles.legendText}>Net</Text>
        </View>
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
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  title: {
    fontSize: 10,
    fontFamily: FONTS.displayBold,
    fontWeight: "900",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 2,
  },
  swipeHint: {
    fontSize: 10,
    fontFamily: FONTS.bodyMedium,
    color: "#9CA3AF",
  },
  empty: {
    height: 220,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontSize: 12,
    color: "#9CA3AF",
    fontFamily: FONTS.bodySemiBold,
    fontWeight: "600",
  },

  legend: {
    flexDirection: "row",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: 16,
    marginTop: 10,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 3,
  },
  legendText: {
    fontSize: 11,
    fontFamily: FONTS.bodyBold,
    fontWeight: "700",
    color: "#6B7280",
  },

  tooltip: {
    position: "absolute",
    backgroundColor: "#0F172A",
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: "#1E293B",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  tooltipDate: {
    fontSize: 11,
    fontFamily: FONTS.bodyExtraBold,
    fontWeight: "900",
    color: "#F8FAFC",
    marginBottom: 6,
  },
  tooltipRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 2,
  },
  tooltipDot: {
    width: 7,
    height: 7,
    borderRadius: 2,
  },
  tooltipLabel: {
    fontSize: 10,
    fontFamily: FONTS.bodyMedium,
    color: "#94A3B8",
    flex: 1,
  },
  tooltipValue: {
    fontSize: 11,
    fontFamily: FONTS.bodyExtraBold,
    fontWeight: "900",
    color: "#F8FAFC",
  },
});
