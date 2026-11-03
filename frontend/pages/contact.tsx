import Head from "next/head";
import { LegalContainer } from "@/containers/LegalContainer";

export default function ContactPage() {
  return (
    <>
      <Head><title>The Personae — Contato</title></Head>
      <LegalContainer page="contact" />
    </>
  );
}
