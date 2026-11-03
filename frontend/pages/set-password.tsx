import Head from "next/head";
import { SetPasswordContainer } from "@/containers/SetPasswordContainer";

export default function SetPasswordPage() {
  return (
    <>
      <Head>
        <title>The Personae — Criar senha</title>
      </Head>
      <SetPasswordContainer />
    </>
  );
}
