// Plain text content for the public pages: FAQ, Privacy Policy and Terms.
// The team edits this file to change wording. Nothing here is rendered as HTML.

export const CONTACT_EMAIL = "ogunmuyiwajonathan@gmail.com";
export const COUNTRY = "Nigeria";
export const LAST_UPDATED = "1 October 2026";

export const FAQ_GROUPS = [
  {
    id: "getting-started",
    title: "Getting started",
    items: [
      {
        id: "what-is-campuscoin",
        question: "What is CampusCoin and who is it for?",
        answer:
          "CampusCoin is a budget tracker built for students. You write down what you earn and what you spend. You set a limit for each category. The app then shows you what you spent, where it went, and a few ideas for the month ahead. Anyone can make an account.",
      },
      {
        id: "bank-connection",
        question: "Does CampusCoin connect to my bank or hold my money?",
        answer:
          "No. We never ask for a bank login, a card number or an account number. You type your income and expenses yourself, or you import a CSV file that you already have. CampusCoin cannot move money. No payments happen in the app.",
      },
      {
        id: "is-it-free",
        question: "Is it free?",
        answer: "Pricing is not set yet. [PRICING]",
      },
      {
        id: "add-transaction",
        question: "How do I add income and expenses?",
        answer:
          "Open Transactions and press Add. Choose income or expense, pick a category, enter the amount and the date, and add a short note if you want. You can edit or delete an entry later.",
      },
      {
        id: "recurring",
        question: "How do recurring entries work?",
        answer:
          "When you add an entry you can mark it as repeating. Only weekly and monthly repeats are available. On each repeat date CampusCoin creates the new row for you. If you did not open the app for a while, we add up to 24 missed rows in one go.",
      },
    ],
  },
  {
    id: "money-and-budgets",
    title: "Money and budgets",
    items: [
      {
        id: "budgets-and-alerts",
        question: "How do budgets and alerts work?",
        answer:
          "You can set one limit per category per month. When your spending in that category reaches 95 percent of the limit you get one alert saying you are close. At 100 percent you get one alert saying you are over. You get each alert only once for that budget.",
      },
      {
        id: "own-categories",
        question: "Can I create my own categories?",
        answer:
          "Yes. You can add, rename and delete your own categories. The categories that ship with CampusCoin cannot be renamed or deleted. You also cannot delete a category while a transaction or a budget is still using it.",
      },
      {
        id: "csv-import",
        question: "How do I import a CSV, and what happens to rows that fail?",
        answer: "Nothing is dropped without telling you. Every row in the file appears in the result list.",
        points: [
          "Open Transactions and press Import CSV.",
          "Your file needs a header row with at least a date column and an amount column.",
          "We take at most 500 rows in one file, and the file can be up to 2 MB.",
          "After the import you get every row marked accepted or rejected, with the reason for each rejection.",
          "A row whose category we do not recognise is still saved, using a fallback category.",
          "You can undo the whole import afterwards.",
        ],
      },
      {
        id: "delete-transaction",
        question: "What happens when I delete a transaction?",
        answer:
          "The row disappears from your transaction list. We keep a copy so you can bring it back from the deleted transactions list. Restoring puts the row back. The copy itself stays in the database.",
      },
      {
        id: "export-report",
        question: "How do I export a report?",
        answer:
          "Open Reports, choose a date range, then use Export PDF or Export image. You can also share a report by email. The email carries your category totals, not your full transaction list.",
      },
    ],
  },
  {
    id: "ai-and-insights",
    title: "AI and insights",
    items: [
      {
        id: "category-suggestion",
        question: "How does the category suggestion work, and can I change it?",
        answer:
          "When you type a description we try four things in order. First, what you corrected last time for the same words. Then our keyword list. Then the AI model. Then a match on the category name. Whatever answers first becomes the suggestion. You can always choose a different category. When you do, we remember it and use it next time for those words.",
      },
      {
        id: "ai-advice",
        question: "Is the AI advice financial advice?",
        answer:
          "No. The assistant gives general guidance about your own spending. It is not financial, tax or legal advice. It can be wrong. You decide what to do with it.",
      },
      {
        id: "ai-sees",
        question: "What does the AI assistant see?",
        answer:
          "The assistant is called Rix. Every time you ask it something, we send these to our AI provider: your name, your academic year, your monthly allowance figure, your monthly savings goal, a summary of your own spending, your budgets, your recent transaction notes, and the text of your question.",
        points: [
          "We do not send your email address.",
          "We do not send your password.",
          "You are the only person whose numbers the assistant can read.",
        ],
      },
      {
        id: "insights-and-tips",
        question: "What are insights and tips?",
        answer:
          "Insights gives you one short summary for a month. Tips are short saving ideas worked out from your own numbers. You can pin a tip or dismiss it. A dismissed tip stays dismissed.",
      },
    ],
  },
  {
    id: "account-and-privacy",
    title: "Account and privacy",
    items: [
      {
        id: "reset-password",
        question: "How do I reset my password?",
        answer:
          "On the sign in screen press Forgot password and enter your email address. If email delivery is set up, we send you a six digit code. The code works once and expires after 10 minutes. You get five tries. If the code expired, ask for a new one. Your password only changes after you enter a valid code.",
      },
      {
        id: "cannot-sign-in",
        question: "Why can I not sign in?",
        answer: "It is usually one of these.",
        points: [
          "The email or password is wrong. We use the same message for a wrong address and a wrong password, so we do not reveal which addresses have accounts.",
          "There is no account with that email address.",
          "An administrator has switched the account off.",
          "You have made too many failed attempts. After 10 failures in 5 minutes we pause sign in for 5 minutes.",
        ],
      },
      {
        id: "appearance",
        question: "How do I change dark mode or text size?",
        answer:
          "Settings has an Appearance row that switches between light and dark. It also has three text sizes. Both choices are saved in your browser and apply to every page.",
      },
      {
        id: "who-can-see",
        question: "Who can see my data?",
        answer: "Here is the honest list.",
        points: [
          "You can see everything in your own account.",
          "An administrator can see your name, email address, academic year, join date, and whether your account is on or off.",
          "An administrator can switch your account off and can set a new password for you.",
          "An administrator does not get a screen that lists your transactions.",
          "Team members with database access could technically read the stored data.",
        ],
      },
      {
        id: "contact-support",
        question: "How do I contact support?",
        answer: `Email ${CONTACT_EMAIL}. Tell us what happened and which email address you use, and we will try to help.`,
      },
    ],
  },
];
