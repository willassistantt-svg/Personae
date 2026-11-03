import Head from "next/head";
import { ProfileFormContainer } from "@/containers/ProfileFormContainer";

export default function EditProfilePage() {
  return (
    <>
      <Head>
        <title>The Personae — Editar persona</title>
      </Head>
      <ProfileFormContainer />
    </>
  );
}
