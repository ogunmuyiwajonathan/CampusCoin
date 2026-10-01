import PublicPage from "../components/PublicPage.jsx";
import { CONTACT_EMAIL, COUNTRY } from "../data/legal.js";

const DESCRIPTION =
  "The rules for using CampusCoin: what the service is and is not, account rules, acceptable use, and availability.";

function Section({ id, title, children }) {
  return (
    <section aria-labelledby={id} className="scroll-mt-6">
      <h2 id={id} className="font-display text-xl font-bold tracking-tight text-ink-900">
        {title}
      </h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-ink-500">{children}</div>
    </section>
  );
}

function Points({ items }) {
  return (
    <ul className="list-disc space-y-1.5 pl-5">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

export default function TermsOfService() {
  return (
    <PublicPage title="Terms of Service" description={DESCRIPTION} current="Terms of Service">
      <div className="space-y-8">
        <Section id="what-it-is" title="What CampusCoin is">
          <p>
            CampusCoin is a budgeting web app. You record your own income and expenses, set your
            own limits, and read summaries of your own figures. It runs in your browser and talks
            to our server. It is a student project built for a competition.
          </p>
        </Section>

        <Section id="who-can-use" title="Who can use it">
          <p>
            Anyone can make an account. You need an email address you control and a password of
            at least 8 characters, with a lowercase letter, an uppercase letter and a number. An
            administrator can switch an account off at any time.
          </p>
        </Section>

        <Section id="account-rules" title="Account rules">
          <Points
            items={[
              "Keep your password to yourself.",
              "Use one account for yourself. Do not share an account with anyone.",
              "Use an email address you control, so a reset code can reach you when email delivery is set up.",
              "Tell us if you think someone else has got into your account.",
              "Do not use a name that hides who you are.",
              "We may switch an account off that breaks these rules, or that we need to protect.",
            ]}
          />
        </Section>

        <Section id="what-it-is-not" title="What CampusCoin is not">
          <Points
            items={[
              "It is not a bank. We are not allowed to hold your money.",
              "It cannot move, hold or send money. There are no payments in the app.",
              "It does not connect to your bank. You type your own figures in.",
              "It is not financial, tax or legal advice.",
              "The assistant and the tips are general guidance about your own spending. They can be wrong, and you decide what to do.",
            ]}
          />
        </Section>

        <Section id="acceptable-use" title="Acceptable use">
          <Points
            items={[
              "Do not attack, scan, overload or try to break the service.",
              "Do not scrape the app or collect other people's data with automated tools.",
              "Do not use someone else's account.",
              "Do not upload harmful files. An avatar must be a JPG, PNG or WEBP image of up to 2 MB.",
              "Do not use the app for anything unlawful.",
              "Do not pretend to be another person.",
            ]}
          />
        </Section>

        <Section id="your-data" title="Your data">
          <p>
            Your data stays yours. You let us store and process it only to run the app: to keep
            you signed in, to show your figures, to work out your budgets, alerts and tips, and
            to answer your assistant questions. The{" "}
            <a className="font-semibold text-brand-600 hover:underline" href="/privacy">
              Privacy Policy
            </a>{" "}
            lists exactly what we store. You can ask us to remove your data by email at{" "}
            <a
              className="font-semibold text-brand-600 hover:underline"
              href={`mailto:${CONTACT_EMAIL}`}
            >
              {CONTACT_EMAIL}
            </a>
            . We will try to remove it.
          </p>
        </Section>

        <Section id="administrators" title="Administrators">
          <p>
            An administrator can see your name, email address, academic year, join date and
            account status. An administrator can switch your account off and can set a new
            password for you. Switching an account off signs you out everywhere and stops you
            signing back in. If that happens, email us.
          </p>
        </Section>

        <Section id="availability" title="Availability">
          <p>
            CampusCoin is a competition project, not a paid service with a support contract. We
            provide it as it is. We may change it, break it or take it down. We do not promise
            any uptime, and we do not promise that your data will always be reachable. Please
            keep your own copy of anything you cannot afford to lose.
          </p>
        </Section>

        <Section id="liability" title="Liability">
          <p>
            We are not responsible for money you lose because of a figure, a tip or an answer in
            the app. We are not responsible for losses because the service was down, or because
            someone else used your account. Nothing here limits any liability that the law does
            not allow us to limit.
          </p>
        </Section>

        <Section id="governing-law" title="Governing law">
          <p>
            These terms are governed by the laws of {COUNTRY}. If you have a complaint, email us
            first and we will try to sort it out.
          </p>
        </Section>

        <Section id="changes" title="Changes to these terms">
          <p>
            If we change this page we change the date at the top. Using the app after that means
            you accept the new text.
          </p>
        </Section>

        <Section id="contact" title="Contact">
          <p>
            Email{" "}
            <a
              className="font-semibold text-brand-600 hover:underline"
              href={`mailto:${CONTACT_EMAIL}`}
            >
              {CONTACT_EMAIL}
            </a>
            .
          </p>
        </Section>
      </div>
    </PublicPage>
  );
}
