import Ionicons from "@expo/vector-icons/Ionicons";
import { useSyncExternalStore } from "react";
import { StyleSheet, View } from "react-native";
import { theme } from "../../theme";
import { GlassPressable } from "./GlassPressable";
import { canMoveCaret, getCaret, moveCaret, subscribeCaret } from "./keyboardCaret";

export function KeyboardCaretArrows() {
  useSyncExternalStore(subscribeCaret, getCaret);

  const canLeft = canMoveCaret(-1);
  const canRight = canMoveCaret(1);

  return (
    <View style={styles.arrows}>
      <GlassPressable
        onPress={() => moveCaret(-1)}
        disabled={!canLeft}
        surfaceStyle={styles.button}
        fallbackStyle={styles.buttonSolid}
        accessibilityLabel="Move cursor left"
      >
        <Ionicons
          name="chevron-back"
          size={18}
          color={canLeft ? theme.colors.accent : theme.colors.textMuted}
        />
      </GlassPressable>
      <GlassPressable
        onPress={() => moveCaret(1)}
        disabled={!canRight}
        surfaceStyle={styles.button}
        fallbackStyle={styles.buttonSolid}
        accessibilityLabel="Move cursor right"
      >
        <Ionicons
          name="chevron-forward"
          size={18}
          color={canRight ? theme.colors.accent : theme.colors.textMuted}
        />
      </GlassPressable>
    </View>
  );
}

const styles = StyleSheet.create({
  arrows: {
    flexDirection: "row",
    gap: theme.space(2),
  },
  button: {
    width: 40,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radius.sm,
  },
  buttonSolid: {
    backgroundColor: theme.colors.background,
  },
});
