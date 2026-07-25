import { ContentUnavailableView, Host } from "@expo/ui/swift-ui";
import { Platform, type StyleProp, StyleSheet, Text, View, type ViewStyle } from "react-native";
import type { SFSymbol } from "sf-symbols-typescript";
import { theme } from "../../theme";

export function EmptyState({
  title,
  description,
  systemImage = "tray",
  style,
}: {
  title: string;
  description?: string;
  systemImage?: SFSymbol;
  style?: StyleProp<ViewStyle>;
}) {
  if (Platform.OS === "ios") {
    return (
      <Host style={[styles.host, style]} colorScheme="dark" seedColor={theme.colors.accent}>
        <ContentUnavailableView
          title={title}
          systemImage={systemImage}
          description={description ?? ""}
        />
      </Host>
    );
  }

  return (
    <View style={[styles.fallback, style]}>
      <Text style={styles.title}>{title}</Text>
      {description ? <Text style={styles.description}>{description}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    minHeight: 220,
  },
  fallback: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: theme.space(10),
    paddingHorizontal: theme.gutter,
  },
  title: {
    color: theme.colors.text,
    fontSize: 17,
    fontWeight: "600",
    textAlign: "center",
  },
  description: {
    color: theme.colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    marginTop: theme.space(2),
  },
});
