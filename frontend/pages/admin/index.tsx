import Head from "next/head";
import { DashboardContainer } from "@/containers/DashboardContainer";

export default function AdminHome() {
  return (
    <>
      <Head>
        <title>The Personae — Direção</title>
      </Head>
      <DashboardContainer />
    </>
  );
}
