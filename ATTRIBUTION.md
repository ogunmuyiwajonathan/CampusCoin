# ATTRIBUTION - CampusCoin

TechWiz 7 rules require full disclosure of any AI assistance used while building this project.

## Tools used

| Tool | What it was used for |
|------|----------------------|
| Claude (AI assistant) | Design ideas, task breakdowns, code suggestions 
| Chatgpt (AI image generation) | Student-with-laptop hero illustration, logo concepts
| Vscode Copilot | Debugging and Fix my codes |
| Poolside (`laguna-xs-2.1`) | The in-app assistant "Rix" answers at runtime

## AI used inside the app

Rix calls an external model while the app is running, which is disclosed here as required:

- **Provider:** Poolside
- **Model:** `poolside/laguna-xs-2.1`
- **Protocol:** OpenAI-compatible chat completions at `https://inference.poolside.ai/v1`
- **Key location:** `server/.env`, which is gitignored. It is never sent to the browser bundle and never committed. `server/.env.example` carries a blank placeholder.
- **Data sent:** Rix sends the student's own transaction data to the Poolside API to generate answers. Only the figures of the student asking the question are sent - never their email address, and never any other student's data.
- **Guardrails:** requires a logged-in session, zod-validated input, 60 questions per hour per account (`AI_RATE_LIMIT`, default 60; the raised test ceiling is refused outright when `NODE_ENV=production`), a 30 second provider timeout and a size cap on every tool result. Message contents, tool results and the API key are never written to the logs. Transaction notes are delimited and labelled as data so they cannot act as instructions, and a conversation belonging to another account returns 404 rather than 403 so its existence is not disclosed.
- **No silent fallback:** with no key configured Rix returns 503, and if the provider fails or times out it returns 502 with a Retry button in the chat. There is no offline or canned answer that could be mistaken for a model reply.

## Rules we followed

- No AI-generated documentation - all docs written/rewritten by the team
- No ready-made templates copied unmodified - every component in this repo was written and reviewed for this project
- The team can explain every line of code in this repository on demand during the demo
- Reference material: approved mockups and the SRS document govern all design decisions

*This file is updated whenever a new AI-assisted step is added to the project.*
