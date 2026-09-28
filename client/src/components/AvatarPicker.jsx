import { useEffect, useRef, useState } from "react";
import Icon from "./Icon.jsx";
import UserAvatar from "./UserAvatar.jsx";
import { useAuth } from "../hooks/useAuth.js";
import { previewAvatar } from "../lib/apiClient.js";

export default function AvatarPicker({ name, onNotify }) {
  const { user, uploadProfileAvatar } = useAuth();
  const inputRef = useRef(null);
  const [pending, setPending] = useState(null);
  const [busy, setBusy] = useState(false);
  const displayName = name ?? user?.name;

  // The preview is an object URL, so it has to be revoked or the blob stays in
  // memory for as long as the tab is open.
  useEffect(() => {
    if (!pending) return undefined;
    const onKey = (event) => {
      if (event.key === "Escape" && !busy) setPending(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [pending, busy]);

  useEffect(() => () => {
    if (pending?.preview) URL.revokeObjectURL(pending.preview);
  }, [pending]);

  const onPick = (event) => {
    const file = event.target.files && event.target.files[0];
    event.target.value = "";
    if (!file) return;
    try {
      setPending({ file, preview: previewAvatar(file), name: file.name });
    } catch (error) {
      onNotify({ kind: "error", message: error.message });
    }
  };

  const confirm = async () => {
    if (!pending) return;
    setBusy(true);
    const result = await uploadProfileAvatar(pending.file);
    setBusy(false);
    if (!result.ok) {
      onNotify({ kind: "error", message: result.error });
      return;
    }
    setPending(null);
    onNotify({ kind: "success", message: "Profile photo updated." });
  };

  return (
    <>
      <div className="relative">
        <UserAvatar
          name={displayName}
          src={user?.profile_image_url}
          className="h-28 w-28"
          textClassName="text-4xl"
        />
        {busy && (
          <span
            className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 text-white"
            role="status"
            aria-label="Uploading photo"
          >
            <Icon name="clock" size={22} className="animate-spin" />
          </span>
        )}
        <button
          type="button"
          onClick={() => inputRef.current && inputRef.current.click()}
          aria-label="Upload profile photo"
          className="absolute bottom-1 right-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-surface text-ink-900 shadow-card transition hover:text-emerald-600"
        >
          <Icon name="camera" size={14} />
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={onPick}
          className="sr-only"
          aria-label="Choose profile photo"
        />
      </div>

      {pending && !busy && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Confirm profile photo"
        >
          <div className="absolute inset-0 bg-black/40" onClick={() => setPending(null)} aria-hidden="true" />
          <div className="relative w-full max-w-xs rounded-card bg-surface p-6 text-center shadow-card">
            <h3 className="font-display text-base font-bold text-ink-900">Use this photo?</h3>
            <img
              src={pending.preview}
              alt="Selected profile photo preview"
              className="mx-auto mt-4 h-28 w-28 rounded-full border border-slate-200 object-cover"
            />
            <p className="mt-3 truncate text-xs text-ink-500">{pending.name}</p>
            <div className="mt-5 flex justify-center gap-3">
              <button
                type="button"
                onClick={() => setPending(null)}
                className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-ink-500 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirm}
                className="rounded-lg bg-brand-700 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-brand-800"
              >
                Use photo
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
