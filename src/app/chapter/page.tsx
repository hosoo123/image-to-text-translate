import { redirect } from "next/navigation";
import { requireUser } from "@/lib/supabase/require-user";
import ChapterTranslator from "@/app/ui/chapter-translator";

export default async function ChapterPage() {
  const { user, configured } = await requireUser();
  if (!configured) redirect("/login?setup=required&next=%2Fchapter");
  if (!user) redirect("/login?next=%2Fchapter");
  return <ChapterTranslator />;
}
