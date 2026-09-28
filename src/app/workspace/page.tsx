import { redirect } from "next/navigation";
import Translator from "../translator";
import { requireUser } from "@/lib/supabase/require-user";

export default async function WorkspacePage() {
  const { user, configured } = await requireUser();
  if (!configured) redirect("/login?setup=required&next=%2Fworkspace");
  if (!user) redirect("/login?next=%2Fworkspace");
  return <Translator />;
}
