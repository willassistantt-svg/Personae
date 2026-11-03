import Head from "next/head";
import { ActivityContainer } from "@/containers/ActivityContainer";

export default function ActivityPage() {
  return (
    <>
      <Head>
        <title>The Personae — Atividade</title>
      </Head>
      <ActivityContainer />
    </>
  );
}
