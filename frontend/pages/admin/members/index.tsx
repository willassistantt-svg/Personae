import Head from "next/head";
import { MembersContainer } from "@/containers/MembersContainer";

export default function MembersPage() {
  return (
    <>
      <Head>
        <title>The Personae — Cadastros</title>
      </Head>
      <MembersContainer />
    </>
  );
}
