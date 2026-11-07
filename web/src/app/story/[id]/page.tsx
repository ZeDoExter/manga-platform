import { StoryView } from "@/components/StoryView";
import { STORY_MAP } from "@/data/stories";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = STORY_MAP[id];
  return { title: s ? `${s.title} — TSUZUKU` : "Story — TSUZUKU", description: s?.tagline };
}

export default async function StoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <StoryView id={id} />;
}
