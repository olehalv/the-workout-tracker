import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet } from "react-native";
import { ExerciseBrowser } from "../../../../src/components/ExerciseBrowser";
import { Button, Input, KeyboardDismissBar, SectionLabel } from "../../../../src/components/ui";
import { theme } from "../../../../src/theme";
import { muscleLabel } from "../../../../src/workouts/types";
import { useWorkouts } from "../../../../src/workouts/WorkoutContext";

export default function ExercisesTab() {
  const { library } = useWorkouts();
  const [query, setQuery] = useState("");

  return (
    <>
      <ExerciseBrowser
        library={library}
        query={query}
        meta={(e) => `${muscleLabel(e)}${e.custom ? " · custom" : ""}`}
        onSelectGroup={(group) => router.push(`/exercises/${encodeURIComponent(group)}`)}
        onSelectExercise={(e) =>
          router.push({ pathname: "/exercise-progress", params: { id: e.id } })
        }
        header={
          <>
            <SectionLabel tone="accent">Library</SectionLabel>
            <Input
              style={styles.search}
              placeholder="Search exercises or muscle groups"
              value={query}
              onChangeText={setQuery}
              autoCorrect={false}
            />
            <Button
              title="+ New exercise"
              variant="dashed"
              onPress={() => router.push("/exercise-form")}
              style={styles.addBtn}
            />
          </>
        }
      />
      <KeyboardDismissBar />
    </>
  );
}

const styles = StyleSheet.create({
  search: {
    marginBottom: theme.space(3),
  },
  addBtn: {
    marginBottom: theme.space(4),
  },
});
