import type { ReorderableListCellAnimations } from "react-native-reorderable-list";

// react-native-reorderable-list's default cell animation scales the dragged item
// to 1.025 and ghosts it to 0.75 opacity. That growth overflows the item's slot and
// visibly clips into the neighbouring cards' margins. We signal "picked up" with a
// solid border + shadow on the card itself, so disable both defaults.
export const REORDER_CELL_ANIMATIONS: ReorderableListCellAnimations = {
  opacity: 1,
  transform: [],
};
