import { StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ProfileScreen } from "../../../src/screens/ProfileScreen";
import { theme } from "../../../src/theme";

export default function ProfileTab() {
  return (
    <SafeAreaView edges={["top"]} style={styles.screen}>
      <ProfileScreen />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
});
