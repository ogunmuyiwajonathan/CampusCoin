import { Fragment } from "react";
import Icon from "../Icon.jsx";

const STEPS = [
  {
    title: "Add Your Money",
    note: "Log your income and expenses quickly and easily.",
    tone: "bg-emerald-500",
  },
  {
    title: "Track Spending",
    note: "See your transactions and categories in real time.",
    tone: "bg-blue-500",
  },
  {
    title: "Understand Your Habits",
    note: "View insights and reports made for you.",
    tone: "bg-violet-500",
  },
  {
    title: "Save Smarter",
    note: "Follow personalised tips and reach your goals.",
    tone: "bg-orange-500",
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-20 bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <h2 className="text-center font-display text-3xl font-extrabold tracking-tight text-forest-900 sm:text-4xl">
          How It Works
        </h2>
        <p className="mt-3 text-center text-ink-500">Get started in 4 simple steps.</p>

        <div className="mt-12 flex flex-col items-center gap-10 lg:flex-row lg:items-start lg:justify-between lg:gap-3">
          {STEPS.map((step, index) => (
            <Fragment key={step.title}>
              <div className="flex w-full max-w-[15rem] flex-col items-center text-center">
                <span
                  className={`flex h-12 w-12 items-center justify-center rounded-full text-base font-bold text-white ${step.tone}`}
                >
                  {index + 1}
                </span>
                <h3 className="mt-4 text-base font-bold text-forest-900">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-500">{step.note}</p>
              </div>
              {index < STEPS.length - 1 && (
                <Icon
                  name="chevron-right"
                  size={22}
                  className="hidden shrink-0 self-start pt-3.5 text-slate-300 lg:block"
                />
              )}
            </Fragment>
          ))}
        </div>
      </div>
    </section>
  );
}
