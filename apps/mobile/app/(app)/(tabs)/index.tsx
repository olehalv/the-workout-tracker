import { StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WorkoutsScreen } from "../../../src/screens/WorkoutsScreen";
import { theme } from "../../../src/theme";

// Top edge only — the native tab bar owns the bottom inset.
export default function WorkoutsTab() {
  return (
    <SafeAreaView edges={["top"]} style={styles.screen}>
      <WorkoutsScreen />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
});
