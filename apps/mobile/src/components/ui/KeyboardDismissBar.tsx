import Ionicons from "@expo/vector-icons/Ionicons";
import { useEffect, useState } from "react";
import { Keyboard, StyleSheet, Text, View } from "react-native";
import { theme } from "../../theme";
import { GlassPressable } from "./GlassPressable";
import { KeyboardCaretArrows } from "./KeyboardCaretArrows";

export const KEYBOARD_BAR_HEIGHT = 48;

// RN's InputAccessoryView wraps its children in SafeAreaView, which measures 0 inside a
// just-presented modal view controller — and every screen here with a text field is a
// modal — so the bar is docked over the keyboard by hand instead.
export function KeyboardDismissBar() {
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const shown = Keyboard.addListener("keyboardWillShow", (e) =>
      setKeyboardHeight(e.endCoordinates.height),
    );
    const hidden = Keyboard.addListener("keyboardWillHide", () => setKeyboardHeight(0));
    return () => {
      shown.remove();
      hidden.remove();
    };
  }, []);

  if (keyboardHeight === 0) return null;

  return (
    // Anchored to the screen bottom rather than the keyboard top so the fill runs behind
    // iOS 26's rounded keyboard corners instead of stopping short of them.
    <View
      style={[
        styles.bar,
        { height: KEYBOARD_BAR_HEIGHT + keyboardHeight, paddingBottom: keyboardHeight },
      ]}
    >
      <KeyboardCaretArrows />

      <GlassPressable
        onPress={Keyboard.dismiss}
        surfaceStyle={styles.doneButton}
        fallbackStyle={styles.buttonSolid}
        accessibilityLabel="Close keyboard"
      >
        <Text style={styles.label}>Done</Text>
        <Ionicons name="chevron-down" size={16} color={theme.colors.accent} />
      </GlassPressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: theme.gutter,
    backgroundColor: theme.colors.surface,
    borderTopColor: theme.colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  doneButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.space(1),
    paddingHorizontal: theme.space(3),
    height: 32,
    borderRadius: theme.radius.sm,
  },
  buttonSolid: {
    backgroundColor: theme.colors.background,
  },
  label: {
    color: theme.colors.accent,
    fontSize: 15,
    fontWeight: "600",
  },
});
