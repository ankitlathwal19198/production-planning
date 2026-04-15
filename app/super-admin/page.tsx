import { getCurrentUser } from "@/lib/auth";
import { notFound } from "next/navigation";
import SuperAdminPanel from "./super-admin-panel";

export const dynamic = "force-dynamic"; // role check always fresh

export default async function SuperAdminPage() {
  const user = await getCurrentUser();

  console.log(user)

  if (!user || user.role !== "Super Admin") {
    notFound(); // hides the route
  }

  return <SuperAdminPanel user={user} />;
}