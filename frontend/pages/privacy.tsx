import Head from "next/head";
import { LegalContainer } from "@/containers/LegalContainer";

export default function PrivacyPage() {
  return (
    <>
      <Head><title>The Personae — Privacidade</title></Head>
      <LegalContainer page="privacy" />
    </>
  );
}
