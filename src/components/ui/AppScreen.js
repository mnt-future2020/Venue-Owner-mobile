import { StyleSheet, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import Header from "../Header";

export default function AppScreen({
  children,
  title,
  subtitle,
  withTabs = false,
  showBack,
  showMenu,
  centerTitle,
  actions,
  logo,
  showLocation,
  hideHeader = false,
  contentStyle,
}) {
  const insets = useSafeAreaInsets();
  const contentPad = withTabs ? 0 : Math.max(8, insets.bottom);

  return (
    <SafeAreaView
      style={[styles.container, !withTabs && styles.containerStack]}
      edges={withTabs ? ["left", "right"] : ["left", "right", "bottom"]}
    >
      {!hideHeader ? (
        <Header
          title={title}
          subtitle={subtitle}
          showBack={showBack}
          showMenu={showMenu}
          centerTitle={centerTitle}
          actions={actions}
          logo={logo}
          showLocation={showLocation}
        />
      ) : null}
      <View style={[styles.content, { paddingBottom: contentPad }, contentStyle]}>
        {children}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  containerStack: {
    backgroundColor: "#FFFFFF",
  },
  content: {
    flex: 1,
  },
});
