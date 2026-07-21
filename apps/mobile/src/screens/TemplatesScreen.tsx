import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { tabScrollClearance } from "../navigation/tabBar";
import { theme } from "../theme";
import type { WorkoutPreset } from "../workouts/types";
import { useWorkouts } from "../workouts/WorkoutContext";
import { PresetFormModal } from "./PresetFormModal";

function totalPresetSets(p: WorkoutPreset): number {
  return p.exercises.reduce((n, e) => n + e.sets, 0);
}

/** "Templates" tab: reusable workout presets — start one, or create/edit/delete. */
export function TemplatesScreen() {
  const { presets, active, startWorkoutFromPreset } = useWorkouts();
  const [editing, setEditing] = useState<WorkoutPreset | null>(null);
  const [creating, setCreating] = useState(false);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Reusable</Text>
        <Text style={styles.title}>Templates</Text>
      </View>

      <Pressable
        style={({ pressed }) => [styles.addBtn, pressed && styles.pressed]}
        onPress={() => setCreating(true)}
      >
        <Text style={styles.addBtnText}>+ New template</Text>
      </Pressable>

      {active ? (
        <Text style={styles.banner}>Finish your current workout to start a template.</Text>
      ) : null}

      <FlatList
        data={presets}
        keyExtractor={(p) => p.id}
        style={styles.list}
        contentContainerStyle={[
          presets.length === 0 ? styles.emptyWrap : styles.listContent,
          tabScrollClearance,
        ]}
        ListEmptyComponent={
          <Text style={styles.empty}>
            No templates yet. Create one, or save a workout as a template.
          </Text>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardName}>{item.name}</Text>
            <Text style={styles.cardMeta}>
              {item.exercises.length} exercise{item.exercises.length === 1 ? "" : "s"} ·{" "}
              {totalPresetSets(item)} sets
            </Text>
            <Text style={styles.cardPreview} numberOfLines={2}>
              {item.exercises.map((e) => e.name).join(" · ")}
            </Text>
            <View style={styles.cardActions}>
              <Pressable
                disabled={active !== null}
                style={({ pressed }) => [
                  styles.startBtn,
                  active !== null && styles.disabled,
                  pressed && styles.pressed,
                ]}
                onPress={() => startWorkoutFromPreset(item)}
              >
                <Ionicons name="play" size={16} color="#FFFFFF" />
                <Text style={styles.startText}>Start</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.editBtn, pressed && styles.pressed]}
                onPress={() => setEditing(item)}
              >
                <Ionicons name="create-outline" size={16} color={theme.colors.text} />
                <Text style={styles.editText}>Edit</Text>
              </Pressable>
            </View>
          </View>
        )}
      />

      <PresetFormModal
        visible={creating || editing !== null}
        preset={editing}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.space(6),
    paddingTop: theme.space(12),
    paddingBottom: theme.space(4),
  },
  header: {
    marginBottom: theme.space(6),
  },
  eyebrow: {
    color: theme.colors.accent,
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  title: {
    color: theme.colors.text,
    fontSize: 30,
    fontWeight: "700",
    marginTop: theme.space(2),
  },
  addBtn: {
    alignItems: "center",
    paddingVertical: theme.space(4),
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    borderStyle: "dashed",
    marginBottom: theme.space(4),
  },
  addBtnText: {
    color: theme.colors.accent,
    fontSize: 15,
    fontWeight: "600",
  },
  banner: {
    color: theme.colors.textMuted,
    fontSize: 13,
    marginBottom: theme.space(3),
  },
  list: {
    flex: 1,
  },
  listContent: {
    gap: theme.space(2),
    paddingBottom: theme.space(6),
  },
  emptyWrap: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  empty: {
    color: theme.colors.textMuted,
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: theme.radius.md,
    padding: theme.space(4),
  },
  cardName: {
    color: theme.colors.text,
    fontSize: 17,
    fontWeight: "700",
  },
  cardMeta: {
    color: theme.colors.textMuted,
    fontSize: 12,
    marginTop: theme.space(1),
  },
  cardPreview: {
    color: theme.colors.textMuted,
    fontSize: 13,
    marginTop: theme.space(2),
  },
  cardActions: {
    flexDirection: "row",
    gap: theme.space(3),
    marginTop: theme.space(4),
  },
  startBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.space(2),
    paddingVertical: theme.space(3),
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.accent,
  },
  startText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  editBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.space(2),
    paddingVertical: theme.space(3),
    borderRadius: theme.radius.sm,
    borderColor: theme.colors.border,
    borderWidth: StyleSheet.hairlineWidth,
  },
  editText: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: "600",
  },
  disabled: {
    opacity: 0.4,
  },
  pressed: {
    opacity: 0.6,
  },
});
