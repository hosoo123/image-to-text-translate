import Spinner from "@/app/ui/spinner";

export default function Loading() {
  return (
    <main className="flex min-h-svh flex-1 items-center justify-center px-4">
      <div role="status" aria-live="polite" className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/30 px-5 py-4 text-sm text-white/70 shadow-xl backdrop-blur">
        <Spinner className="h-5 w-5 text-lime-300" />
        Хуудасны мэдээлэл ачаалж байна…
      </div>
    </main>
  );
}
