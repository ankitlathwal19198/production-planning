import Sheet1PlanningDataClient from "./Entries";
import { getCurrentUser } from "@/lib/auth";

export default async function PlanningPage() {
  const user = await getCurrentUser(); // { email, name, role, ... } | null
  return <Sheet1PlanningDataClient user={user} />;
}