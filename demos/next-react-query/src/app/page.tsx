import { demoMetadata } from "../demoMetadata";

export default function Page() {
  return (
    <main className="shell">
      <p className="eyebrow">RTRQ demo</p>
      <h1>{demoMetadata.purpose}</h1>
      <p>
        This placeholder will demonstrate browser subscriptions with a public app ID and React Query
        invalidation once runtime behavior is implemented.
      </p>
    </main>
  );
}
