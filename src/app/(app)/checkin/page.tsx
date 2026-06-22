import { auth } from "@/lib/auth";
import { getCheckinForDate } from "@/modules/body-metrics/service";
import { getPreferences } from "@/modules/users/service";
import { isoDate, addDays } from "@/lib/utils";
import { CheckinForm } from "./form";

export default async function CheckinPage() {
  const session = await auth();
  const userId  = session!.user!.id as string;
  const today   = isoDate();

  const [todayData, prefs] = await Promise.all([
    getCheckinForDate(userId, today),
    getPreferences(userId),
  ]);

  // Yesterday's weight for hint
  const yesterday = await getCheckinForDate(userId, addDays(today, -1));

  return (
    <CheckinForm
      today={today}
      existing={todayData}
      yesterdayWeight={yesterday.bodyMetrics?.weightKg ? Number(yesterday.bodyMetrics.weightKg) : null}
      proteinTarget={prefs?.proteinTargetG ? Number(prefs.proteinTargetG) : 134}
      waterTarget={prefs?.waterTargetL ? Number(prefs.waterTargetL) : 2.5}
    />
  );
}
