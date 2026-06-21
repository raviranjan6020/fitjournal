import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getOnboardingStatus } from "@/modules/users/service";
import { OnboardingWizard } from "./wizard";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ force?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { force } = await searchParams;

  if (!force) {
    const status = await getOnboardingStatus(session.user.id as string);
    if (status.profileComplete && status.goalSet) redirect("/dashboard");
  }

  const status = await getOnboardingStatus(session.user.id as string);

  return <OnboardingWizard initialStep={status.profileComplete ? 3 : 2} />;
}
