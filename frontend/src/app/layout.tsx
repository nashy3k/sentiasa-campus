import type { Metadata } from "next";
import "./globals.css";

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "SENTIASA // Campus Safety Intelligence Engine",
  description: "Deterministic safety triage and ontology visualization",
  robots: {
    index: false,
    follow: false,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const runtimeConfig = {
    API_URL: process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "",
  };

  return (
    <html lang="en" className="dark">
      <head>
        <script
          id="runtime-config"
          dangerouslySetInnerHTML={{
            __html: `window.__RUNTIME_CONFIG__ = ${JSON.stringify(runtimeConfig)};`,
          }}
        />
      </head>
      <body className="bg-zinc-950 text-zinc-100 antialiased">
        {children}
      </body>
    </html>
  );
}
