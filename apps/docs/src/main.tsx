import { createRoot } from "react-dom/client";

import { docsAppMetadata } from "./content";

import "./styles.css";

function App() {
  return (
    <main className="shell">
      <p className="eyebrow">RTRQ documentation</p>
      <h1>{docsAppMetadata.purpose}</h1>
      <p>
        This scaffold reserves space for guides covering app IDs, API keys, standalone server URLs,
        WebSocket origin allowlists, self-hosting, SaaS usage, and SDK references.
      </p>
    </main>
  );
}

const root = document.getElementById("root");

if (root) {
  createRoot(root).render(<App />);
}
