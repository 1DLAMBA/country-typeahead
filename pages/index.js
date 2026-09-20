import Head from "next/head";
import CountryTypeahead from "../components/CountryTypeahead";

export default function Home() {
  return (
    <>
      <Head>
        <title>Country Typeahead — Screening Task Demo</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=IBM+Plex+Sans:wght@400;500&family=IBM+Plex+Mono:wght@500;600&display=swap"
          rel="stylesheet"
        />
      </Head>
      <main className="page">
        <div className="card">
          <span className="eyebrow">REST Countries API</span>
          <h1>Country Search</h1>
          <p className="subtitle">
            Type at least two letters and matching countries appear below.
            Data from the public{" "}
            <a
              href="https://restcountries.com/"
              target="_blank"
              rel="noreferrer"
            >
              REST Countries API
            </a>
            .
          </p>
          <CountryTypeahead />
        </div>
      </main>
    </>
  );
}
