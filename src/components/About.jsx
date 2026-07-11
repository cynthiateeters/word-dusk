import Backdrop from "./Backdrop.jsx";

export default function About({ onClose }) {
  return (
    <div className="app">
      <Backdrop />
      <div className="overlay">
        <div className="overlay-card about-card">
          <div className="overlay-eyebrow">Word Dusk</div>
          <h2 className="overlay-title">About</h2>
          <p className="about-text">
            Word Dusk is free, ad-free, and open source. No accounts, no ads, no analytics beyond
            what Netlify provides by default.
          </p>
          <p className="about-text">
            Grid words are drawn from the 12dicts word list (public domain). Bonus words are drawn
            from the ENABLE word list (public domain). Full source details and licenses are in this
            project's <code>scripts/README.md</code>.
          </p>
          <p className="about-text">
            Set in Fraunces and Nunito Sans, both SIL Open Font License, self-hosted with the app.
          </p>
          <button className="btn btn-primary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
