import Head from "next/head";
import { ChatAdminContainer } from "@/containers/ChatAdminContainer";

export default function AdminChatPage() {
  return (
    <>
      <Head>
        <title>The Personae — Conversas</title>
      </Head>
      <ChatAdminContainer />
    </>
  );
}
