import Head from "next/head";
import { MemberDetailContainer } from "@/containers/MemberDetailContainer";

export default function MemberPage() {
  return (
    <>
      <Head>
        <title>The Personae — Cadastro</title>
      </Head>
      <MemberDetailContainer />
    </>
  );
}
