import Head from "next/head";
import { MemberCreateContainer } from "@/containers/MemberCreateContainer";

export default function NewMemberPage() {
  return (
    <>
      <Head>
        <title>The Personae — Entrada direta</title>
      </Head>
      <MemberCreateContainer />
    </>
  );
}
