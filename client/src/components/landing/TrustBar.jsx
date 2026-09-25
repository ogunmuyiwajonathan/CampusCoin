import Icon from "../Icon.jsx";

const TRUST_ITEMS = [
  { icon: "zap", title: "Easy to Use", note: "In minutes, not hours" },
  { icon: "shield-check", title: "Secure & Private", note: "Your data, your control" },
  { icon: "smartphone", title: "Works on All Devices", note: "Desktop, tablet & mobile" },
];

export default function TrustBar() {
  return (
    <section className="border-y border-slate-100 bg-mint-50" aria-label="Why students trust Campus Coin">
      <div className="mx-auto grid max-w-7xl gap-5 px-4 py-6 sm:grid-cols-3 sm:px-6">
        {TRUST_ITEMS.map((item) => (
          <div key={item.title} className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-brand-600 shadow-sm ring-1 ring-sage-100">
              <Icon name={item.icon} size={17} />
            </span>
            <div>
              <p className="text-sm font-bold text-forest-900">{item.title}</p>
              <p className="text-xs text-ink-500">{item.note}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
