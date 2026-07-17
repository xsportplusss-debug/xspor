import { useState, useMemo, useCallback } from "react";

export function useSelection<T extends { id: string }>(items: T[]) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const ids = useMemo(() => items.map((x) => x.id), [items]);
  const allChecked = ids.length > 0 && ids.every((id) => selected.has(id));
  const someChecked = !allChecked && ids.some((id) => selected.has(id));

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    setSelected((prev) => {
      const allNow = ids.length > 0 && ids.every((id) => prev.has(id));
      return allNow ? new Set() : new Set(ids);
    });
  }, [ids]);

  const clear = useCallback(() => setSelected(new Set()), []);
  const selectedIds = useMemo(() => Array.from(selected), [selected]);

  return { selected, selectedIds, allChecked, someChecked, toggle, toggleAll, clear };
}
