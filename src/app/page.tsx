import { redirect } from "next/navigation";
import Translator from "./translator";
import { requireUser } from "@/lib/supabase/require-user";

export default async function HomePage() {
  const { user, configured } = await requireUser();
  if (!configured || !user) redirect("/login");
  return <Translator />;
}
