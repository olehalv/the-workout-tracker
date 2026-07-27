import { StyleSheet, TextInput, type TextInputProps } from "react-native";
import { theme } from "../../theme";
import { common } from "./common";
import { useKeyboardField } from "./keyboardCaret";

export function Input({ style, onFocus, onBlur, onSelectionChange, ...props }: TextInputProps) {
  const field = useKeyboardField(typeof props.value === "string" ? props.value : "", {
    onFocus,
    onBlur,
    onSelectionChange,
  });

  return (
    <TextInput
      {...field}
      placeholderTextColor={theme.colors.textMuted}
      style={[common.surface, styles.input, style]}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    color: theme.colors.text,
    paddingHorizontal: theme.space(4),
    paddingVertical: theme.space(3),
    fontSize: 16,
  },
});
