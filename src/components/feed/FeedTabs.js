import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { FEED_TABS } from "./data";
import { PRIMARY_COLOR, FONTS } from "../../constants/theme";

function FeedTabs({ activeTab, onChange, onPost, onDiscover }) {
  return (
    <View style={styles.wrapper}>
      <View style={styles.row}>
        <View style={styles.tabsLeft}>
          {FEED_TABS.map((tab) => {
            const active = tab.key === activeTab;
            return (
              <TouchableOpacity key={tab.key} activeOpacity={0.85} onPress={() => onChange(tab.key)} style={styles.tabBtn}>
                <Text style={[styles.label, active && styles.labelActive]}>{tab.label}</Text>
                {active ? <View style={styles.underline} /> : null}
              </TouchableOpacity>
            );
          })}
        </View>
        <View style={styles.actions}>
          {/* {onDiscover ? (
            <TouchableOpacity activeOpacity={0.85} style={styles.discoverBtn} onPress={onDiscover}>
              <Ionicons name="search-outline" size={16} color={PRIMARY_COLOR} />
            </TouchableOpacity>
          ) : null} */}
          {onPost ? (
            <TouchableOpacity activeOpacity={0.85} style={styles.postBtn} onPress={onPost}>
              <Text style={styles.postBtnText}>Post</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
      <View style={styles.separator} />
    </View>
  );
}

export default React.memo(FeedTabs);

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  tabsLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
    flexShrink: 1,
  },
  tabBtn: {
    paddingBottom: 14,
    paddingTop: 4,
  },
  label: {
    color: "#64748B",
    fontSize: 15,
    fontFamily: FONTS.bodyBold,
  },
  labelActive: {
    color: PRIMARY_COLOR,
  },
  underline: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    borderRadius: 999,
    backgroundColor: PRIMARY_COLOR,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginLeft: 12,
  },
  discoverBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CFEFDE",
  },
  postBtn: {
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 999,
    paddingHorizontal: 20,
    paddingVertical: 9,
    shadowColor: PRIMARY_COLOR,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  postBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontFamily: FONTS.bodyBold,
  },
  separator: {
    height: 1,
    backgroundColor: "#E2E8F0",
    marginTop: 8,
  },
});
