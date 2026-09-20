import { useCallback, useEffect, useRef, useState } from "react";

const API_BASE = "https://restcountries.com/v3.1/name/";
const DEBOUNCE_MS = 300;
const MIN_CHARS = 2;

/**
 * A self-contained, dependency-free typeahead over the REST Countries API.
 *
 * Design notes (see README for the full write-up):
 * - Debounces keystrokes so we don't fire a request per character.
 * - Tracks requests with an incrementing id + AbortController so a slow
 *   response for an earlier query can never overwrite a newer one
 *   (the classic "out of order" race with fetch + setState).
 * - Explicit loading / empty / error states instead of inferring them
 *   from array length, which is ambiguous ("[]" means both "still
 *   loading" and "no results" if you're not careful).
 * - Full keyboard support: ArrowUp/Down to move the highlighted option,
 *   Enter to select, Escape to close, with aria-activedescendant so
 *   screen readers track the highlight without moving DOM focus off
 *   the input.
 */
export default function CountryTypeahead() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [status, setStatus] = useState("idle"); // idle | loading | success | empty | error
  const [errorMessage, setErrorMessage] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [selected, setSelected] = useState(null);

  const debounceRef = useRef(null);
  const abortRef = useRef(null);
  const requestIdRef = useRef(0);
  const listRef = useRef(null);
  const inputId = "country-typeahead-input";
  const listboxId = "country-typeahead-listbox";

  const runSearch = useCallback((rawQuery) => {
    const trimmed = rawQuery.trim();

    if (trimmed.length < MIN_CHARS) {
      // Cancel anything in flight; nothing to show for a too-short query.
      if (abortRef.current) abortRef.current.abort();
      setStatus("idle");
      setResults([]);
      setIsOpen(false);
      return;
    }

    // Cancel the previous in-flight request outright...
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    // ...and stamp this request with a ticket number. Even if abort()
    // doesn't actually cut the network request short (some browsers/
    // proxies still let it resolve), we ignore any response whose
    // ticket isn't the latest one issued.
    const requestId = ++requestIdRef.current;

    setStatus("loading");
    setErrorMessage("");
    setIsOpen(true);

    fetch(`${API_BASE}${encodeURIComponent(trimmed)}?fields=name,cca2,region,capital`, {
      signal: controller.signal,
    })
      .then(async (res) => {
        if (requestId !== requestIdRef.current) return; // stale, drop it

        if (res.status === 404) {
          setResults([]);
          setStatus("empty");
          return;
        }
        if (!res.ok) {
          throw new Error(`Request failed with status ${res.status}`);
        }
        const data = await res.json();
        if (requestId !== requestIdRef.current) return; // stale, drop it

        setResults(Array.isArray(data) ? data.slice(0, 8) : []);
        setStatus(data.length ? "success" : "empty");
        setHighlightedIndex(data.length ? 0 : -1);
      })
      .catch((err) => {
        if (err.name === "AbortError") return; // expected on supersede
        if (requestId !== requestIdRef.current) return; // stale, drop it
        setResults([]);
        setStatus("error");
        setErrorMessage("Couldn't reach the country database. Please try again.");
      });
  }, []);

  const handleChange = (event) => {
    const value = event.target.value;
    setQuery(value);
    setSelected(null);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(value), DEBOUNCE_MS);
  };

  const closeList = useCallback(() => {
    setIsOpen(false);
    setHighlightedIndex(-1);
  }, []);

  const selectResult = useCallback(
    (country) => {
      setSelected(country);
      setQuery(country.name?.common ?? "");
      setResults([]);
      setStatus("idle");
      closeList();
    },
    [closeList]
  );

  const handleKeyDown = (event) => {
    if (!isOpen || status !== "success") {
      return;
    }

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setHighlightedIndex((prev) => (prev + 1) % results.length);
        break;
      case "ArrowUp":
        event.preventDefault();
        setHighlightedIndex((prev) => (prev - 1 + results.length) % results.length);
        break;
      case "Enter":
        if (highlightedIndex >= 0 && results[highlightedIndex]) {
          event.preventDefault();
          selectResult(results[highlightedIndex]);
        }
        break;
      case "Escape":
        event.preventDefault();
        closeList();
        break;
      default:
        break;
    }
  };

  // Keep the highlighted option scrolled into view as the user navigates.
  useEffect(() => {
    if (highlightedIndex < 0 || !listRef.current) return;
    const activeEl = listRef.current.querySelector(
      `[data-index="${highlightedIndex}"]`
    );
    activeEl?.scrollIntoView({ block: "nearest" });
  }, [highlightedIndex]);

  // Clean up any pending debounce/request on unmount.
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  return (
    <div className="typeahead">
      <label htmlFor={inputId} className="visually-hidden">
        Search for a country
      </label>
      <input
        id={inputId}
        type="text"
        role="combobox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-activedescendant={
          highlightedIndex >= 0 ? `country-option-${highlightedIndex}` : undefined
        }
        autoComplete="off"
        placeholder="e.g. Nigeria, Brazil, Japan..."
        value={query}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={() => results.length > 0 && setIsOpen(true)}
        onBlur={() => setTimeout(closeList, 100)} // allow click on option first
        className="input"
      />

      {isOpen && (
        <div className="panel" role="presentation">
          {status === "loading" && (
            <div className="status-row" aria-live="polite">
              <span className="spinner" aria-hidden="true" />
              Searching…
            </div>
          )}

          {status === "error" && (
            <div className="status-row status-error" role="alert">
              {errorMessage}
            </div>
          )}

          {status === "empty" && (
            <div className="status-row" aria-live="polite">
              No countries match "{query.trim()}".
            </div>
          )}

          {status === "success" && (
            <ul
              id={listboxId}
              role="listbox"
              ref={listRef}
              className="results"
            >
              {results.map((country, index) => (
                <li
                  key={country.cca2 ?? country.name?.common ?? index}
                  id={`country-option-${index}`}
                  data-index={index}
                  role="option"
                  aria-selected={index === highlightedIndex}
                  className={
                    "result" + (index === highlightedIndex ? " result-active" : "")
                  }
                  onMouseDown={(e) => e.preventDefault()} // keep input focus
                  onMouseEnter={() => setHighlightedIndex(index)}
                  onClick={() => selectResult(country)}
                >
                  <span className="result-name">{country.name?.common}</span>
                  <span className="result-meta">
                    {country.capital?.[0] ? `${country.capital[0]}, ` : ""}
                    {country.region}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {selected && (
        <div className="selected-card">
          Selected: <strong>{selected.name?.common}</strong>
          {selected.capital?.[0] ? ` — capital: ${selected.capital[0]}` : ""}
        </div>
      )}
    </div>
  );
}
