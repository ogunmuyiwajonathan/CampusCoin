// Normalize a user's name however it was typed: "jAMIE tESTER" -> "Jamie Tester".
// Applied in AuthProvider on every read and write so greetings, the avatar
// letter and profile fields always show a capitalized name.
export function formatName(name) {
  if (typeof name !== "string") return name;
  return name
    .trim()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}
