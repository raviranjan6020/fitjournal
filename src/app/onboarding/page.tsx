import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getOnboardingStatus } from "@/modules/users/service";
import { OnboardingWizard } from "./wizard";

export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const status = await getOnboardingStatus(session.user.id as string);

  // Already onboarded — skip to dashboard
  if (status.profileComplete && status.goalSet) redirect("/dashboard");

  return <OnboardingWizard initialStep={status.profileComplete ? 3 : 2} />;
}
