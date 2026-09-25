import Icon from "../Icon.jsx";
import studentIllustration from "../../assets/expenses.png";

export default function BuiltForStudents() {
  return (
    <section id="about" className="scroll-mt-20 bg-[#f3f7f5] py-16 sm:py-20">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 sm:px-6 md:grid-cols-2">
        <img
          src={studentIllustration}
          alt="Student at a laptop wondering where their money went"
          className="mx-auto w-full max-w-md mix-blend-multiply"
        />
        <div>
          <h2 className="font-display text-3xl font-extrabold tracking-tight text-forest-900 sm:text-4xl">
            Built for Real Student Life
          </h2>
          <p className="mt-4 max-w-xl leading-relaxed text-ink-500">
            Unlike generic finance apps, Campus Coin is designed around your student expenses —
            from food and transport to hostel, academics and subscriptions.
          </p>
          <a
            href="#features"
            className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-brand-600 transition hover:text-emerald-700"
          >
            See all features
            <Icon name="arrow-right" size={16} />
          </a>
        </div>
      </div>
    </section>
  );
}
