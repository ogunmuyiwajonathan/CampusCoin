import PublicPage from "../components/PublicPage.jsx";
import { CONTACT_EMAIL } from "../data/legal.js";

const DESCRIPTION =
  "What CampusCoin stores, who receives it, how long it is kept, and what you can ask us to do.";

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

export default function PrivacyPolicy() {
  return (
    <PublicPage title="Privacy Policy" description={DESCRIPTION} current="Privacy Policy">
      <div className="space-y-8">
        <Section id="who-we-are" title="Who we are">
          <p>
            CampusCoin is built by a small student team. We are not a bank and we are not a
            financial adviser. This page explains what the app stores about you and what happens
            to it. If anything here is unclear, email <a className="font-semibold text-brand-600 hover:underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
          </p>
        </Section>

        <Section id="what-we-collect" title="What we collect and why">
          <Points
            items={[
              "Your name and email address. We use them to sign you in and, if email delivery is set up, to send a password reset code.",
              "Your password. We turn it into a one way hash and store only the hash. We cannot read your password.",
              "Your academic year, your monthly allowance figure and your monthly savings goal. You enter them. We use them to fill in your dashboard and to answer the assistant.",
              "Your profile picture, if you upload one. It must be a JPG, PNG or WEBP file of up to 2 MB.",
              "Your transactions: the amount, the date, whether it is income or expense, the category, and any note you write.",
              "Your budgets, your own categories, your bookmarks and their notes, your saving tips, your budget alerts, your monthly insights, your notifications, and the date you joined.",
              "Your assistant chats. We keep each conversation and each message so you can read them again.",
              "Your category corrections. When you change a suggested category, we remember the wording and the category you chose so we can suggest it again.",
              "A copy of every transaction you delete, and a copy of every row an import removes, kept so you can restore them.",
              "One session cookie, described under Cookies below.",
            ]}
          />
        </Section>

        <Section id="what-we-do-not-collect" title="What we do not collect">
          <Points
            items={[
              "No bank login. There is no field for one.",
              "No card number. There is no field for one.",
              "No account number. There is no field for one.",
              "No phone number. There is no field for one.",
              "No contacts, no location, and no photos taken from your device.",
            ]}
          />
        </Section>

        <Section id="browser-storage" title="What stays in your browser">
          <p>
            Three items are kept in your browser's local storage. They stay in the browser. We do
            not send them to our server.
          </p>
          <Points
            items={[
              "campuscoin.theme, which says whether you chose light or dark.",
              "campuscoin.fontSize, which is your text size choice.",
              "campuscoin.recentlyViewed, which holds up to 5 transaction entries you opened, with the label, the type, the amount and the date, so the app can show them again.",
            ]}
          />
          <p>
            Clearing your browser data removes them. Your account and your password are not stored
            in the browser.
          </p>
        </Section>

        <Section id="who-else-receives" title="Who else receives your data">
          <p>Three outside companies handle data for us.</p>
          <Points
            items={[
              "MongoDB Atlas stores our database. It has its own privacy terms, which we do not control. Your data may be processed outside Nigeria.",
              "Resend sends our emails. It receives your email address, and for a shared report it also receives your name and the report totals. It has its own privacy terms, which we do not control. Your data may be processed outside Nigeria.",
              "Poolside runs the AI assistant. It receives your name, academic year, allowance figure, savings goal, a summary of your own spending, your budgets, your recent transaction notes and the text of your question. It does not receive your email address or your password. It has its own privacy terms, which we do not control. Your data may be processed outside Nigeria.",
              "The category suggestion tool also uses Poolside. It sends one transaction description and the list of your category names. Nothing else.",
            ]}
          />
        </Section>

        <Section id="cookies" title="Cookies">
          <p>
            We use one cookie, called campuscoin.sid. It keeps you signed in and does nothing
            else. It cannot be read by scripts on the page. It lasts 7 days and is renewed each
            time you use the site. There is no advertising, tracking or analytics code in the
            app, and we set no other cookies.
          </p>
        </Section>

        <Section id="how-long" title="How long we keep things">
          <p>
            Most of what we store has no expiry date. It stays in the database until it is deleted.
          </p>
          <Points
            items={[
              "A password reset code expires 10 minutes after it is created. The database then removes the record.",
              "The record of a sign in is kept for 30 days.",
              "Your account, transactions, budgets, categories, bookmarks, tips, alerts, insights, notifications, assistant chats, learned categories and deleted transaction copies have no expiry date. They stay until they are deleted.",
              "A restored transaction copy is not removed. Restoring only marks the old copy as restored, and the copy stays.",
              "Your profile picture file: we keep the current one. When you upload a new picture we delete the old file.",
              "The three browser storage keys: kept until you clear your browser data.",
            ]}
          />
        </Section>

        <Section id="who-can-see" title="Who else can see it">
          <Points
            items={[
              "You can see everything in your own account.",
              "An administrator can see your name, email address, academic year, join date, and whether your account is on or off.",
              "An administrator can switch your account off and can set a new password for you.",
              "An administrator does not get a screen that lists your transactions.",
              "Team members with database access could technically read the stored data.",
              "Announcements written by an administrator are shown to every student. They are not tied to your account.",
            ]}
          />
        </Section>

        <Section id="your-choices" title="Your choices">
          <Points
            items={[
              "Edit your name, academic year, allowance figure and savings goal in Settings.",
              "Change your password in Settings. Changing it signs you out on your other devices.",
              "Upload a new profile picture, or remove the one you have.",
              "Delete a transaction, a budget, a category, a bookmark or an assistant conversation.",
              "Switch between light and dark, and change the text size.",
              "Ask an administrator to switch your account off.",
              `Email ${CONTACT_EMAIL} with a question about your data.`,
            ]}
          />
        </Section>

        <Section id="deletion" title="Asking us to delete your data">
          <p>
            There is no delete button in the app. If you want your data removed, email{" "}
            <a
              className="font-semibold text-brand-600 hover:underline"
              href={`mailto:${CONTACT_EMAIL}`}
            >
              {CONTACT_EMAIL}
            </a>{" "}
            from the address on your account and tell us what you want removed. We will try to
            remove it. We cannot promise how long that will take.
          </p>
        </Section>

        <Section id="security" title="Security">
          <Points
            items={[
              "Passwords are hashed with bcrypt. We store the hash, never the password.",
              "Failed sign in attempts are limited. Reset requests, account creation and AI questions are limited too.",
              "The live site uses HTTPS.",
              "Your session is checked on every request to the server.",
              "A browser is only allowed to call the API from our own site, and anything that changes your data must come from that site too.",
              "Avatars must be a JPG, PNG or WEBP image. Nothing else is accepted.",
              "We cannot promise that the service can never be broken into. Please keep your password to yourself.",
            ]}
          />
        </Section>

        <Section id="children" title="Children">
          <p>
            CampusCoin is built for students. We do not aim it at anyone under 13.{" "}
            [MINIMUM AGE - team to confirm]
          </p>
        </Section>

        <Section id="changes" title="Changes to this policy">
          <p>
            If we change this page we change the date at the top. That date tells you when the
            text was last written.
          </p>
        </Section>
      </div>
    </PublicPage>
  );
}
