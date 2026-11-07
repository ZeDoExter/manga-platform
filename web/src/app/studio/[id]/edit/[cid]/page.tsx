import { ChapterEditor } from "@/components/studio/ChapterEditor";

export default async function EditChapterPage({ params }: { params: Promise<{ id: string; cid: string }> }) {
  const { id, cid } = await params;
  return <ChapterEditor storyId={id} chapterId={cid} />;
}
