import { auth } from "@/lib/auth";
import { getUserProfile } from "@/modules/users/service";
import { SettingsClient } from "./client";

export default async function SettingsPage() {
  const session = await auth();
  const profile = await getUserProfile(session!.user!.id as string);
  return <SettingsClient profile={profile!} />;
}
