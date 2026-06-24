import type { Metadata } from "next";

import "./styles.css";

export const metadata: Metadata = {
  title: "RTRQ Next React Query Demo",
  description: "Scaffold for demonstrating RTRQ with Next.js and TanStack Query."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
