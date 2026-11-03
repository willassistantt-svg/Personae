import type { AppProps } from "next/app";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Inter, Playfair_Display } from "next/font/google";
import { useState } from "react";
import { LanguageProvider } from "@/lib/i18n";
import "@/styles/globals.css";

const sans = Inter({ subsets: ["latin"], variable: "--font-sans" });
const serif = Playfair_Display({ subsets: ["latin"], style: ["normal", "italic"], variable: "--font-serif" });

export default function App({ Component, pageProps }: AppProps) {
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { refetchOnWindowFocus: false } } }));
  return (
    <QueryClientProvider client={client}>
      <LanguageProvider>
        <div className={`${sans.variable} ${serif.variable} min-h-screen bg-ink font-sans text-zincBright antialiased`}>
          <Component {...pageProps} />
        </div>
      </LanguageProvider>
    </QueryClientProvider>
  );
}
