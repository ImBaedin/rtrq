import { createRoot } from "react-dom/client";

import { demoMetadata } from "./demoMetadata";

import "./styles.css";

function App() {
  return (
    <main className="shell">
      <p className="eyebrow">RTRQ demo</p>
      <h1>{demoMetadata.purpose}</h1>
      <p>
        This placeholder will connect to a standalone RTRQ server URL with a public app ID once runtime
        behavior is implemented.
      </p>
    </main>
  );
}

const root = document.getElementById("root");

if (root) {
  createRoot(root).render(<App />);
}
