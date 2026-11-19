# Copilot instructions

Project context Copilot should apply to every session in this repository.

## Stack

- Framework: Astro (static output).
- Language: TypeScript.
- Styling: plain CSS in the base layout.

## Conventions

- Keep components small and focused.
- Prefer semantic HTML and accessible markup.
- Do not close, or add closing keywords for, the exercise walkthrough issue (issue #1) in any pull request. The exercise's GitHub Actions workflows manage that issue. When you open a pull request for app work, link only the specific app work-item issue you are implementing.

## Persistence and hydration rules

- Persistence: bookmarks are stored in the browser with `localStorage`. There is no backend or shortener service.
- Hydration: every piece of code that touches `localStorage` or other browser APIs runs behind a client side boundary, either a component with the `client:load` directive or the component's inline `<script>`. Never access `localStorage` in component frontmatter, so the static Astro build and SSR never touch browser APIs.
