# AI English Spelling

A pure frontend English spelling practice app built with Next.js, TypeScript, and Tailwind CSS.

## Features

- Save and switch multiple OpenAI-compatible AI profiles locally.
- Generate mixed English phrases and short sentences by topic.
- Store practice items, progress, mistakes, and marks in IndexedDB.
- Practice one word per input with blur validation and Enter checks.
- Use `Ctrl+S` for speech, `Ctrl+M` to mark, and `Ctrl+D` to show or hide the English text hint.
- Use separate pages for generated practice lists, active practice, marked items, mistakes, and settings.
- Switch between system, light, and dark themes.

## Run

```bash
pnpm install
pnpm dev
```

Open http://127.0.0.1:3000.

## Pages

- `/` Practice lists, with a modal for generating a new list.
- `/practice/[listId]` Active spelling practice for a selected list.
- `/practice` Opens the latest active list when available.
- `/marked` Marked phrases and sentences.
- `/mistakes` Mistake records.
- `/settings` AI profile settings.

## Local Data

AI profiles are saved in browser localStorage. Learning data is saved in IndexedDB.
