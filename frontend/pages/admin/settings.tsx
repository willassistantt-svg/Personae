import Head from "next/head";
import { SettingsContainer } from "@/containers/SettingsContainer";

export default function SettingsPage() {
  return (
    <>
      <Head>
        <title>The Personae — Ajustes</title>
      </Head>
      <SettingsContainer />
    </>
  );
}
