import { useCallback, useRef } from "react";
import type { TextInput, TextInputProps } from "react-native";

interface CaretTarget {
  ref: TextInput;
  start: number;
  end: number;
  length: number;
}

let target: CaretTarget | null = null;
const listeners = new Set<() => void>();

const set = (next: CaretTarget | null) => {
  target = next;
  for (const l of listeners) l();
};

export function subscribeCaret(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getCaret(): CaretTarget | null {
  return target;
}

export function canMoveCaret(delta: -1 | 1): boolean {
  if (!target) return false;
  return delta === -1 ? target.start > 0 : target.end < target.length;
}

export function moveCaret(delta: -1 | 1): void {
  if (!target || !canMoveCaret(delta)) return;
  const collapsed = target.start !== target.end;
  const at =
    delta === -1
      ? collapsed
        ? target.start
        : target.start - 1
      : collapsed
        ? target.end
        : target.end + 1;
  target.ref.setSelection(at, at);
  set({ ...target, start: at, end: at });
}

export function useKeyboardField(
  text: string,
  handlers?: Pick<TextInputProps, "onFocus" | "onBlur" | "onSelectionChange">,
) {
  const ref = useRef<TextInput>(null);
  const lengthRef = useRef(text.length);
  lengthRef.current = text.length;

  const onFocus = useCallback<NonNullable<TextInputProps["onFocus"]>>(
    (e) => {
      if (ref.current) {
        set({
          ref: ref.current,
          start: lengthRef.current,
          end: lengthRef.current,
          length: lengthRef.current,
        });
      }
      handlers?.onFocus?.(e);
    },
    [handlers],
  );

  const onBlur = useCallback<NonNullable<TextInputProps["onBlur"]>>(
    (e) => {
      if (target?.ref === ref.current) set(null);
      handlers?.onBlur?.(e);
    },
    [handlers],
  );

  const onSelectionChange = useCallback<NonNullable<TextInputProps["onSelectionChange"]>>(
    (e) => {
      const { start, end } = e.nativeEvent.selection;
      if (ref.current) set({ ref: ref.current, start, end, length: lengthRef.current });
      handlers?.onSelectionChange?.(e);
    },
    [handlers],
  );

  return { ref, onFocus, onBlur, onSelectionChange };
}
