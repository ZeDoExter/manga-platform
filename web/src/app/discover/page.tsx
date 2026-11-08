import { DiscoverView } from "@/components/DiscoverView";

export const metadata = { title: "Discover — DOOTOON" };

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function DiscoverPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const g = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  return <DiscoverView initial={{ q: g("q"), genre: g("genre"), type: g("type") }} />;
}
