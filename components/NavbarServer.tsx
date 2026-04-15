import Navbar from "./Navbar";
import { getCurrentUser } from "@/lib/auth";

export default async function NavbarServer() {
  const user = await getCurrentUser(); // { email, name, role, ... } | null
  return <Navbar user={user} />;
}
