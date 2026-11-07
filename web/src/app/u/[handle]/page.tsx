import { ProfileRouter } from "@/components/profile/ProfileRouter";

export default async function UserPage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  return <ProfileRouter handle={handle} />;
}
