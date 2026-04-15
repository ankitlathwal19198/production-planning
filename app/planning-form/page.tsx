// app/planning/page.tsx
import PlanningWorkspace from "@/components/planning/PlanningWorkspace";
import { getCurrentUser } from "@/lib/auth";

export default async function PlanningForm() {
  const user = await getCurrentUser(); // { email, name, role, ... } | null
  return <PlanningWorkspace user={user} />;
}