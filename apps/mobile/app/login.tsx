import { Redirect } from "expo-router";
import { StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../src/auth/AuthContext";
import { LoginScreen } from "../src/screens/LoginScreen";
import { theme } from "../src/theme";

export default function LoginRoute() {
  const { user } = useAuth();
  if (user) return <Redirect href="/" />;

  return (
    <SafeAreaView style={styles.container}>
      <LoginScreen />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
});
