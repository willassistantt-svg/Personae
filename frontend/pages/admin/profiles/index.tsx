import Head from "next/head";
import { ProfilesAdminContainer } from "@/containers/ProfilesAdminContainer";

export default function ProfilesPage() {
  return (
    <>
      <Head>
        <title>The Personae — Personas</title>
      </Head>
      <ProfilesAdminContainer />
    </>
  );
}
