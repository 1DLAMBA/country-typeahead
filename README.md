# Country Typeahead — Frontend Screening Task

A small React/Next.js typeahead/autocomplete built against the public
[REST Countries API](https://restcountries.com/) (`GET /v3.1/name/{query}`),
built for the Expert Listing Limited Frontend Engineer screening task.

## Running it

```bash
npm install
npm run dev
```

Then open http://localhost:3000 and start typing a country name (e.g. "nige",
"united", "japan").

## What it handles

- **Debounced input** — a 300ms debounce on keystrokes so we don't fire a
  request per character; the search only fires once typing pauses.
- **Loading / empty / error states** — tracked as an explicit `status`
  value (`idle | loading | success | empty | error`) rather than inferred
  from array length, since `results.length === 0` is ambiguous between
  "still loading," "no matches," and "the request failed."
- **Keyboard navigation** — `ArrowUp`/`ArrowDown` move the highlighted
  option, `Enter` selects it, `Escape` closes the panel. The input keeps
  DOM focus throughout; the highlight is exposed via
  `aria-activedescendant` so screen readers announce it correctly.
- **Out-of-order / stale responses** — every keystroke that fires a
  request gets an incrementing request ID, and the previous request's
  `AbortController` is aborted before the new one starts. A response is
  only applied to state if its request ID still matches the latest one
  issued, so a slow response for "nig" can never clobber a faster
  response for "nigeria" that arrived after it.

## Write-up (tradeoffs, scaling, testing)

The main tradeoff here is debounce delay versus perceived responsiveness:
300ms feels snappy without spamming the API on every keystroke, but on a
flaky connection it can still mean a few in-flight requests need to be
reconciled — hence the request-ID guard rather than relying on `abort()`
alone, since not every environment actually cancels the underlying fetch
promptly. I also capped results at 8 and required a 2-character minimum,
both cheap wins for perceived performance and API load.

To harden this for high traffic, I'd add a small client-side LRU cache
keyed by query string (countries are near-static data, so a 10-15 minute
TTL is safe), move the debounce to a shared hook if other typeaheads
appear elsewhere in the app, and put a thin proxy/edge function in front
of the third-party API so we can add our own rate-limiting, caching, and
a stable contract if the upstream API changes shape. For a heavier
dataset I'd also add virtualization to the results list.

For testing, I'd unit-test the hook logic in isolation (debounce timing,
stale-response rejection, keyboard index math) with fake timers and a
mocked fetch, then cover the component with React Testing Library for
the loading/empty/error/success states and keyboard interaction, and add
one Playwright/Cypress end-to-end test simulating a real slow-then-fast
typing sequence to catch race conditions that unit tests can miss.

(Word count: ~230)
