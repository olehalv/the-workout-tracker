import { Host, Stepper } from "@expo/ui/swift-ui";
import { labelsHidden } from "@expo/ui/swift-ui/modifiers";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router, Stack, useLocalSearchParams } from "expo-router";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import ReorderableList, {
  type ReorderableListRenderItemInfo,
  reorderItems,
  useIsActive,
  useReorderableDrag,
} from "react-native-reorderable-list";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { REORDER_CELL_ANIMATIONS } from "../../src/components/reorder";
import { Button, HeaderButton, Input, SectionLabel } from "../../src/components/ui";
import { useExerciseSelection } from "../../src/navigation/ExerciseSelectionContext";
import { theme } from "../../src/theme";
import {
  type DraftExercise,
  MAX_SETS,
  MIN_SETS,
  useTemplateDraft,
} from "../../src/workouts/TemplateDraftContext";
import { useWorkouts } from "../../src/workouts/WorkoutContext";

export default function TemplateFormRoute() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { presets, createPreset, updatePreset, deletePreset } = useWorkouts();
  const draft = useTemplateDraft();
  const selection = useExerciseSelection();
  const insets = useSafeAreaInsets();

  const preset = id ? (presets.find((p) => p.id === id) ?? null) : null;
  const isEdit = preset !== null;

  const canSave = draft.name.trim().length > 0 && draft.exercises.length > 0;

  const save = () => {
    if (!canSave) return;
    const exercises = draft.exercises.map((e) => ({
      exerciseId: e.exerciseId,
      name: e.name,
      sets: e.sets,
    }));
    if (preset) updatePreset(preset.id, { name: draft.name, exercises });
    else createPreset(draft.name, exercises);
    router.back();
  };

  const confirmDelete = () => {
    if (!preset) return;
    Alert.alert("Delete template", `Delete “${preset.name}”?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          deletePreset(preset.id);
          router.back();
        },
      },
    ]);
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Stack.Screen
        options={{
          title: isEdit ? "Edit template" : "New template",
          headerLeft: () => <HeaderButton label="Back" onPress={() => router.back()} />,
        }}
      />
      <View style={[styles.container, { paddingBottom: insets.bottom + theme.space(4) }]}>
        <ReorderableList
          style={styles.list}
          data={draft.exercises}
          keyExtractor={(e) => e.uid}
          onReorder={({ from, to }) => draft.setExercises(reorderItems(draft.exercises, from, to))}
          cellAnimations={REORDER_CELL_ANIMATIONS}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <View>
              <SectionLabel style={styles.label}>Name</SectionLabel>
              <Input
                style={styles.input}
                placeholder="e.g. Push day"
                value={draft.name}
                onChangeText={draft.setName}
                autoFocus={!isEdit}
                autoCorrect={false}
                returnKeyType="done"
              />

              <SectionLabel style={styles.label}>
                Exercises{draft.exercises.length > 0 ? ` · ${draft.exercises.length}` : ""}
              </SectionLabel>
              {draft.exercises.length === 0 ? (
                <Text style={styles.hint}>Add exercises to build the template.</Text>
              ) : (
                <Text style={styles.hint}>Hold the grip to drag and reorder.</Text>
              )}
            </View>
          }
          renderItem={({ item }: ReorderableListRenderItemInfo<DraftExercise>) => (
            <SelectedRow
              item={item}
              onSetSets={(sets) => draft.setSets(item.uid, sets)}
              onRemove={() => draft.removeExercise(item.uid)}
            />
          )}
          ListFooterComponent={
            <Button
              title="+ Add exercise"
              variant="dashed"
              onPress={() => selection.open("template")}
              style={styles.addExercise}
            />
          }
        />

        <Button
          title={isEdit ? "Save template" : "Create template"}
          disabled={!canSave}
          onPress={save}
          style={styles.saveBtn}
        />
        {isEdit ? (
          <Button
            title="Delete template"
            variant="danger"
            onPress={confirmDelete}
            style={styles.gapTop}
          />
        ) : null}
      </View>
    </KeyboardAvoidingView>
  );
}

function SelectedRow({
  item,
  onSetSets,
  onRemove,
}: {
  item: DraftExercise;
  onSetSets: (sets: number) => void;
  onRemove: () => void;
}) {
  const drag = useReorderableDrag();
  const isActive = useIsActive();
  return (
    <View style={[styles.selRow, isActive && styles.selRowActive]}>
      <Pressable
        onLongPress={drag}
        delayLongPress={150}
        disabled={isActive}
        hitSlop={8}
        style={styles.dragHandle}
        accessibilityLabel="Drag to reorder exercise"
      >
        <Ionicons name="reorder-three" size={22} color={theme.colors.textMuted} />
      </Pressable>
      <Text style={styles.selName} numberOfLines={1}>
        {item.name}
      </Text>
      <Text style={styles.stepVal}>{item.sets}</Text>
      <Text style={styles.setsUnit}>sets</Text>
      <Host style={styles.stepper} colorScheme="dark" seedColor={theme.colors.accent}>
        <Stepper
          label={`${item.name} sets`}
          value={item.sets}
          step={1}
          min={MIN_SETS}
          max={MAX_SETS}
          onValueChange={onSetSets}
          modifiers={[labelsHidden()]}
        />
      </Host>
      <Pressable onPress={onRemove} hitSlop={6}>
        <Text style={styles.selRemove}>×</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    flex: 1,
    paddingHorizontal: theme.space(6),
    paddingTop: theme.space(4),
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: theme.space(4),
  },
  label: {
    marginBottom: theme.space(2),
    marginTop: theme.space(2),
  },
  input: {
    marginBottom: theme.space(3),
  },
  hint: {
    color: theme.colors.textMuted,
    fontSize: 13,
    marginBottom: theme.space(3),
  },
  selRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.space(2),
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.space(3),
    paddingVertical: theme.space(2),
    marginBottom: theme.space(2),
  },
  selRowActive: {
    borderColor: theme.colors.accent,
    shadowColor: "#000",
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  dragHandle: {
    paddingRight: theme.space(1),
  },
  selName: {
    flex: 1,
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: "600",
  },
  // UIStepper's intrinsic size; the Host has no content-driven size of its own.
  stepper: {
    width: 94,
    height: 32,
  },
  stepVal: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: "700",
    minWidth: 18,
    textAlign: "center",
    fontVariant: ["tabular-nums"],
  },
  setsUnit: {
    color: theme.colors.textMuted,
    fontSize: 12,
  },
  selRemove: {
    color: theme.colors.danger,
    fontSize: 20,
    fontWeight: "700",
    paddingLeft: theme.space(1),
  },
  addExercise: {
    marginTop: theme.space(1),
  },
  saveBtn: {
    marginTop: theme.space(2),
  },
  gapTop: {
    marginTop: theme.space(2),
  },
});
