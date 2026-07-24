import { StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { TemplatesScreen } from "../../../src/screens/TemplatesScreen";
import { theme } from "../../../src/theme";

export default function TemplatesTab() {
  return (
    <SafeAreaView edges={["top"]} style={styles.screen}>
      <TemplatesScreen />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
});
