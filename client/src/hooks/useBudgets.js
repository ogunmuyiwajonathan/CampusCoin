import { useCallback, useState } from "react";
import { budgets as seedBudgets } from "../data/mockData.js";

const STORAGE_KEY = "campuscoin.budgets";

// First read is synchronous so the page never flashes an empty state.
// When the API lands, replace this with a fetch that starts status at "loading"
// - the budgets grid already renders a skeleton and error alert off that status.
function readStore() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === null) return { items: seedBudgets, error: null };
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) throw new Error("Saved data is not a list.");
    return { items: parsed, error: null };
  } catch {
    return {
      items: seedBudgets,
      error: "Couldn't load your saved budgets. Showing sample data instead.",
    };
  }
}

export function useBudgets() {
  const [state, setState] = useState(() => ({ status: "ready", ...readStore() }));

  const commit = useCallback((nextItems) => {
    setState({ status: "ready", items: nextItems, error: null });
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextItems));
    } catch {
      setState({
        status: "ready",
        items: nextItems,
        error: "Couldn't save your changes. Browser storage may be full or blocked.",
      });
    }
  }, []);

  const add = useCallback(
    (payload) => {
      const record = { budget_id: `b${Date.now()}`, user_id: "demo-student", ...payload };
      commit([record, ...state.items]);
    },
    [state.items, commit],
  );

  const update = useCallback(
    (budgetId, payload) => {
      commit(
        state.items.map((item) =>
          item.budget_id === budgetId ? { ...item, ...payload } : item,
        ),
      );
    },
    [state.items, commit],
  );

  const remove = useCallback(
    (budgetId) => {
      commit(state.items.filter((item) => item.budget_id !== budgetId));
    },
    [state.items, commit],
  );

  return { ...state, add, update, remove };
}
