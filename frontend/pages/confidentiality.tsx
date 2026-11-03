import Head from "next/head";
import { LegalContainer } from "@/containers/LegalContainer";

export default function ConfidentialityPage() {
  return (
    <>
      <Head><title>The Personae — Confidencialidade</title></Head>
      <LegalContainer page="confidentiality" />
    </>
  );
}
