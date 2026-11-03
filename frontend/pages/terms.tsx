import Head from "next/head";
import { LegalContainer } from "@/containers/LegalContainer";

export default function TermsPage() {
  return (
    <>
      <Head><title>The Personae — Termos</title></Head>
      <LegalContainer page="terms" />
    </>
  );
}
