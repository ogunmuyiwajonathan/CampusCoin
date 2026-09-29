import { useState } from "react";
import { apiAssetUrl } from "../lib/apiClient.js";

export default function UserAvatar({ name, src, className = "h-9 w-9", textClassName = "text-sm" }) {
  const [failed, setFailed] = useState(false);
  const resolved = apiAssetUrl(src);

  if (resolved && !failed) {
    return (
      <img
        src={resolved}
        alt=""
        onError={() => setFailed(true)}
        className={`${className} shrink-0 rounded-full border border-slate-200 object-cover`}
      />
    );
  }

  return (
    <span
      className={`${className} flex shrink-0 items-center justify-center rounded-full bg-forest-700 font-bold text-white ${textClassName}`}
    >
      {(name || "S").charAt(0).toUpperCase()}
    </span>
  );
}
