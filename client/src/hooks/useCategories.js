import { useEffect, useState } from "react";
import { listCategories } from "../lib/apiClient.js";
import { allCategories, applyCategories } from "../data/mockData.js";

// One request for the whole app, shared by every page that needs a category
// name, colour or icon. The result is pushed into the registry the lookup
// helpers read, so those call sites keep working unchanged.
let inflight = null;

function load() {
  if (!inflight) {
    inflight = listCategories()
      .then((data) => {
        applyCategories(data.categories);
        return data.categories;
      })
      .catch((error) => {
        // Cleared so a later mount can try again, and the seed fallback keeps
        // the pages rendering rather than blanking because one request failed.
        inflight = null;
        throw error;
      });
  }
  return inflight;
}

export function useCategories() {
  const [categories, setCategories] = useState(() => allCategories());
  const [status, setStatus] = useState(() => (inflight ? "loading" : "ready"));

  useEffect(() => {
    let active = true;
    load()
      .then((list) => {
        if (!active) return;
        setCategories(list);
        setStatus("ready");
      })
      .catch(() => {
        if (active) setStatus("error");
      });
    return () => {
      active = false;
    };
  }, []);

  return { categories, status };
}
