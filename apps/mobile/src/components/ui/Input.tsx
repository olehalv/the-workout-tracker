import { StyleSheet, TextInput, type TextInputProps } from "react-native";
import { theme } from "../../theme";
import { common } from "./common";

export function Input({ style, ...props }: TextInputProps) {
  return (
    <TextInput
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
