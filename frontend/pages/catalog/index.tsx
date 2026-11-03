import Head from "next/head";
import { CatalogContainer } from "@/containers/CatalogContainer";

export default function CatalogPage() {
  return (
    <>
      <Head>
        <title>The Personae — Catálogo</title>
      </Head>
      <CatalogContainer />
    </>
  );
}
