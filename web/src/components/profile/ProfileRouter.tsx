"use client";

import Link from "next/link";
import { ACCOUNT_MAP } from "@/data/accounts";
import { useApp } from "@/lib/store";
import { Empty } from "../ui";
import { CreatorProfile } from "./CreatorProfile";
import { ReaderProfile } from "./ReaderProfile";

export function ProfileRouter({ handle }: { handle?: string }) {
  const { state } = useApp();
  const id = handle ?? state.accountId;
  const a = ACCOUNT_MAP[id];
  if (!a)
    return (
      <div className="wrap py-24">
        <Empty icon="user" title="Profile not found" text={`There’s no account called “${id}”.`} action={<Link href="/" className="btn">Go home</Link>} />
      </div>
    );
  const isMe = id === state.accountId;
  return a.role === "creator" ? <CreatorProfile key={id} account={a} isMe={isMe} /> : <ReaderProfile key={id} account={a} isMe={isMe} />;
}
