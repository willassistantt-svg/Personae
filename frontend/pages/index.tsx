import Head from "next/head";
import { LoginContainer } from "@/containers/LoginContainer";

export default function LoginPage() {
  return (
    <>
      <Head>
        <title>The Personae — Acesso reservado</title>
      </Head>
      <LoginContainer />
    </>
  );
}
