import { StoryManager } from "@/components/studio/StoryManager";

export default async function ManageStoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <StoryManager id={id} />;
}
