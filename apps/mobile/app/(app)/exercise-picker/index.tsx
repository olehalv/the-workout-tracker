import { router, Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { ExerciseBrowser, MIN_SEARCH_LENGTH } from "../../../src/components/ExerciseBrowser";
import { common, HeaderButton, Input } from "../../../src/components/ui";
import { type PickerTarget, useExercisePicker } from "../../../src/navigation/useExercisePicker";
import { theme } from "../../../src/theme";

export default function ExercisePickerRoute() {
  const { addTo = "workout" } = useLocalSearchParams<{ addTo?: PickerTarget }>();
  const { library, meta, toggle, isSelected, count, commit } = useExercisePicker(addTo);
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();
  const exactMatch = library.some((e) => e.name.toLowerCase() === q);

  return (
    <>
      <Stack.Screen
        options={{
          title: addTo === "template" ? "Add to template" : "Add exercise",
          headerLeft: () => <HeaderButton label="Back" onPress={() => router.back()} />,
          headerRight: () => (
            <HeaderButton
              label={count > 0 ? `Add (${count})` : "Add"}
              prominent
              disabled={count === 0}
              onPress={commit}
            />
          ),
        }}
      />
      <ExerciseBrowser
        library={library}
        query={query}
        meta={meta}
        isSelected={(e) => isSelected(e.id)}
        onSelectGroup={(group) =>
          router.push({ pathname: "/exercise-picker/[group]", params: { group, addTo } })
        }
        onSelectExercise={toggle}
        header={
          <>
            <Input
              style={styles.search}
              placeholder="Search or create an exercise"
              value={query}
              onChangeText={setQuery}
              autoFocus
              autoCorrect={false}
              returnKeyType="done"
            />
            {q.length >= MIN_SEARCH_LENGTH && !exactMatch ? (
              <Pressable
                style={({ pressed }) => [styles.createRow, pressed && common.pressed]}
                onPress={() =>
                  router.push({
                    pathname: "/exercise-form",
                    params: { name: query.trim(), addTo },
                  })
                }
              >
                <Text style={styles.createText}>Create “{query.trim()}”</Text>
                <Text style={styles.createHint}>Set muscle group, then create &amp; select</Text>
              </Pressable>
            ) : null}
          </>
        }
      />
    </>
  );
}

const styles = StyleSheet.create({
  search: {
    marginBottom: theme.space(3),
  },
  createRow: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.accent,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.space(4),
    paddingVertical: theme.space(3),
    marginBottom: theme.space(2),
  },
  createText: {
    color: theme.colors.accent,
    fontSize: 16,
    fontWeight: "600",
  },
  createHint: {
    color: theme.colors.textMuted,
    fontSize: 12,
    marginTop: theme.space(1),
  },
});
