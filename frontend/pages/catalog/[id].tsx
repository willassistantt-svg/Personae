import Head from "next/head";
import { DetailContainer } from "@/containers/DetailContainer";

export default function DetailPage() {
  return (
    <>
      <Head>
        <title>The Personae — Persona</title>
      </Head>
      <DetailContainer />
    </>
  );
}
