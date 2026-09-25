import { Link } from "react-router-dom";

export default function Placeholder({ title, note = "Part of the build order - coming next." }) {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-4 p-6 text-center">
      <img src="/logo.png" alt="" width="56" height="56" />
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="max-w-md text-ink-500">{note}</p>
      <Link
        to="/"
        className="rounded-lg bg-brand-500 px-5 py-2.5 font-semibold text-white transition hover:bg-brand-600"
      >
        Back to home
      </Link>
    </main>
  );
}
