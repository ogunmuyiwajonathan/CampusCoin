import { useEffect } from "react";

const DEFAULT_TITLE = "CampusCoin - Smart Spending, Student Style";
const DEFAULT_DESCRIPTION =
  "CampusCoin - a student budget tracker. Log income and expenses, set budgets, and get plain-language insights. Smart spending, student style.";

function applyMeta(description) {
  let tag = document.querySelector('meta[name="description"]');
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute("name", "description");
    document.head.appendChild(tag);
  }
  tag.setAttribute("content", description || DEFAULT_DESCRIPTION);
}

/**
 * Sets the tab title and the meta description for a page, then puts the
 * site defaults back when the page is left. No extra dependency needed.
 */
export function useDocumentMeta(title, description) {
  useEffect(() => {
    document.title = title ? `${title} - CampusCoin` : DEFAULT_TITLE;
    applyMeta(description);
    return () => {
      document.title = DEFAULT_TITLE;
      applyMeta();
    };
  }, [title, description]);
}

export default useDocumentMeta;
