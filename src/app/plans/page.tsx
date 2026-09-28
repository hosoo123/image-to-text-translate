import Link from "next/link";
import PlanCards from "@/app/ui/plan-cards";

export default function PlansPage() {
  return <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-5 sm:py-12">
    <Link href="/account" className="inline-flex min-h-11 items-center text-sm text-lime-300">← Миний бүртгэл</Link>
    <h1 className="mt-6 text-2xl font-semibold sm:mt-8 sm:text-3xl">Эрхийн багц</h1>
    <p className="mt-2 max-w-2xl text-sm leading-6 text-white/60">Free эрх өдөрт 20 хүсэлттэй. Premium эрхээр өдөрт 100, сард нийт 2,000 хүсэлт ашиглана. Анализ болон орчуулга тус бүр нэг AI хүсэлтэд тооцогдоно. Эрх нэг удаагийн төлбөрөөр 1, 3 эсвэл 6 сар идэвхжинэ; автоматаар сунгахгүй.</p>
    <div className="mt-7"><PlanCards /></div>
    <p className="mt-5 text-xs text-white/45">WireMN-ийн аюулгүй checkout дээр QR болон банкны аппын төлбөр харагдана. Эрх төлбөр баталгаажсаны дараа идэвхжинэ.</p>
  </main>;
}
