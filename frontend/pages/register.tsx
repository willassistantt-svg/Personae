import Head from "next/head";
import { RegisterContainer } from "@/containers/RegisterContainer";

export default function RegisterPage() {
  return (
    <>
      <Head>
        <title>The Personae — Pedido de cadastro</title>
      </Head>
      <RegisterContainer />
    </>
  );
}
