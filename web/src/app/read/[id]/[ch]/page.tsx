import { ReaderPage } from "@/components/readers/ReaderPage";

export const metadata = { title: "Reading — TSUZUKU" };

export default async function ReadPage({ params }: { params: Promise<{ id: string; ch: string }> }) {
  const { id, ch } = await params;
  return <ReaderPage id={id} ch={ch} />;
}
