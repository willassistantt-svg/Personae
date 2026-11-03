import Head from "next/head";
import { LinksContainer } from "@/containers/LinksContainer";

export default function LinksPage() {
  return (
    <>
      <Head>
        <title>The Personae — Links</title>
      </Head>
      <LinksContainer />
    </>
  );
}
