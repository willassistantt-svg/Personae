import Head from "next/head";
import { ProfileFormContainer } from "@/containers/ProfileFormContainer";

export default function NewProfilePage() {
  return (
    <>
      <Head>
        <title>The Personae — Nova persona</title>
      </Head>
      <ProfileFormContainer />
    </>
  );
}
