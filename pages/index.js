import Head from "next/head";
import CountryTypeahead from "../components/CountryTypeahead";

export default function Home() {
  return (
    <>
      <Head>
        <title>Country Typeahead — Screening Task Demo</title>
      </Head>
      <main className="page">
        <div className="card">
          <h1>Country Search</h1>
          <p className="subtitle">
            Start typing a country name. Powered by the public{" "}
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
