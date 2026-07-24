import { StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ExercisesScreen } from "../../../src/screens/ExercisesScreen";
import { theme } from "../../../src/theme";

export default function ExercisesTab() {
  return (
    <SafeAreaView edges={["top"]} style={styles.screen}>
      <ExercisesScreen />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
});
