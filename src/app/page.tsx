import Link from "next/link";

const features = [
  {
    number: "01",
    title: "Зургаас текст танина",
    description:
      "Ярианы bubble доторх текстийг уншиж, хаана байгааг нь зурагтай нь холбон гаргана.",
  },
  {
    number: "02",
    title: "Контексттэй орчуулна",
    description:
      "Scene, дүрийн сэтгэл хөдлөл, ярианы өнгийг харгалзан Монгол хэлээр хөрвүүлнэ.",
  },
  {
    number: "03",
    title: "Зураг дээр буцааж байрлуулна",
    description:
      "Орчуулгын байрлал, bubble-ийн хэмжээг засаж, бэлэн зургийг татаж авна.",
  },
];

const steps = [
  ["Зургаа оруулах", "Манхвагийн хуудсаа сонгоод AI анализ эхлүүл."],
  ["Текстээ шалгах", "Танигдсан текст болон bubble-ийн хүрээг засаж болно."],
  ["Орчуулах", "Дүрийн өнгө аясыг хадгалсан Монгол орчуулга гаргуул."],
  ["Татаж авах", "Орчуулсан тексттэй зургаа шалгаад төхөөрөмждөө хадгал."],
];

export default function HomePage() {
  return (
    <main className="min-h-svh text-white">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-2 px-4 py-3 sm:px-8 sm:py-5">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 font-semibold tracking-tight sm:gap-3"
        >
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-lime-300 font-black text-zinc-950 sm:h-11 sm:w-11">
            M
          </span>
          <span>
            Manhwa <span className="text-lime-300">AI</span>
          </span>
        </Link>
        <nav className="hidden items-center gap-7 text-sm text-white/65 md:flex">
          <a href="#features" className="hover:text-white">
            Боломжууд
          </a>
          <a href="#guide" className="hover:text-white">
            Хэрхэн ашиглах вэ?
          </a>
          <Link href="/plans" className="hover:text-white">Багцын үнэ</Link>
        </nav>
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/plans"
            className="hidden min-h-11 items-center rounded-xl px-3 py-2 text-sm text-white/75 hover:text-white sm:inline-flex"
          >
            Багцууд
          </Link>
          <Link
            href="/login"
            className="inline-flex min-h-11 items-center rounded-xl px-2 py-2 text-sm text-white/75 hover:text-white sm:px-3"
          >
            Нэвтрэх
          </Link>
          <Link
            href="/workspace"
            className="inline-flex min-h-11 items-center rounded-xl bg-lime-300 px-3 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-lime-200 sm:px-4"
          >
            Эхлэх
          </Link>
        </div>
      </header>

      <section className="mx-auto grid w-full max-w-6xl items-center gap-7 px-4 pb-12 pt-10 sm:gap-12 sm:px-8 sm:pb-28 sm:pt-20 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="text-center lg:text-left">
          <div className="mb-5 inline-flex max-w-full items-center gap-2 rounded-full border border-lime-300/20 bg-lime-300/5 px-3 py-1.5 text-[11px] font-medium leading-5 text-lime-200 sm:mb-6 sm:text-xs">
            <span className="h-1.5 w-1.5 rounded-full bg-lime-300" /> Манхва
            унших, орчуулахад туслах AI хэрэгсэл
          </div>
          <h1 className="mx-auto max-w-3xl text-[2.65rem] font-black leading-[1.02] tracking-[-0.055em] min-[380px]:text-5xl sm:text-7xl lg:mx-0">
            Манхвагаа <span className="text-lime-300">Монгол хэлээр.</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-zinc-400 sm:mt-6 sm:text-lg sm:leading-7 lg:mx-0">
            Зургаа оруулаад текстийг таньж, дүрийн ярианы өнгө аяст тохирсон
            орчуулгыг bubble дээр нь байрлуул.
          </p>
          <div className="mt-6 flex flex-col gap-3 min-[420px]:mx-auto min-[420px]:max-w-md min-[420px]:flex-row sm:mt-8 lg:mx-0">
            <Link
              href="/workspace"
              className="min-h-14 rounded-2xl bg-lime-300 px-5 py-3.5 text-center font-semibold text-zinc-950 hover:bg-lime-200 min-[420px]:w-fit sm:rounded-xl"
            >
              Орчуулж эхлэх <span aria-hidden="true">→</span>
            </Link>
            <a
              href="#guide"
              className="min-h-14 rounded-2xl border border-white/15 px-5 py-3.5 text-center font-medium text-white/80 hover:bg-white/5 min-[420px]:w-fit sm:rounded-xl"
            >
              Заавар үзэх
            </a>
          </div>
          <p className="mt-4 text-xs leading-5 text-zinc-500">
            Нүүр хуудсыг үзэхэд бүртгэл шаардлагагүй. Орчуулга ашиглахдаа
            нэвтэрнэ.
          </p>
        </div>

        <div
          aria-label="Зураг дээрх эх текст ба Монгол орчуулгын жишээ"
          className="relative mx-auto w-full max-w-md px-1 sm:px-0"
        >
          <div className="absolute -inset-5 rounded-4xl bg-lime-300/10 blur-3xl" />
          <div className="relative rounded-3xl border border-white/10 bg-[#171a20] p-3.5 shadow-2xl sm:-rotate-2 sm:rounded-[1.75rem] sm:p-5">
            <div className="mb-4 flex items-center justify-between text-[11px] uppercase tracking-[0.18em] text-zinc-500">
              <span>Panel → page</span>
              <span className="text-lime-300">AI translate</span>
            </div>
            <div className="relative flex h-60 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-[radial-gradient(ellipse_at_70%_35%,rgba(149,126,117,0.52),transparent_42%),linear-gradient(145deg,#34313a,#17191e_62%,#24262b)] p-5 sm:h-72 sm:p-6">
              <div className="absolute bottom-0 left-8 h-48 w-28 rounded-t-[50%] bg-linear-to-b from-[#777078] to-[#242329] opacity-80" />
              <div className="absolute right-7 top-7 rounded-[45%] border border-white/30 bg-[#f4f1e9] px-5 py-4 text-center text-xs font-semibold text-zinc-800 shadow-lg">
                I&apos;LL NEVER
                <br />
                GIVE UP!
              </div>
              <div className="absolute bottom-7 left-5 right-5 rounded-xl border border-lime-300/50 bg-zinc-950/90 px-4 py-3 text-center text-sm font-semibold text-lime-100 shadow-[0_0_24px_rgba(215,255,101,0.12)]">
                Би хэзээ ч бууж өгөхгүй!
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between text-xs text-zinc-500">
              <span>Танигдсан текст</span>
              <span className="text-zinc-300">1 bubble · MN</span>
            </div>
          </div>
        </div>
      </section>

      <section
        id="features"
        className="border-y border-white/[0.07] bg-white/2"
      >
        <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-8 sm:py-20">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-lime-300">
            Юу хийж чадах вэ?
          </p>
          <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-4xl">
            Зургаас бэлэн орчуулга хүртэл
          </h2>
          <div className="mt-6 grid gap-3 sm:mt-9 sm:gap-4 md:grid-cols-3">
            {features.map((feature) => (
              <article
                key={feature.number}
                className="rounded-2xl border border-white/10 bg-[#111319]/80 p-5 sm:p-6"
              >
                <p className="text-sm font-bold text-lime-300">
                  {feature.number}
                </p>
                <h3 className="mt-5 text-lg font-semibold">{feature.title}</h3>
                <p className="mt-3 text-sm leading-6 text-zinc-400">
                  {feature.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        id="guide"
        className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-8 sm:py-20"
      >
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-lime-300">
            Энгийн 4 алхам
          </p>
          <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-4xl">
            Хэрхэн ашиглах вэ?
          </h2>
          <p className="mt-3 leading-7 text-zinc-400">
            Орчуулгын ажлын хэсэгт нэвтэрсний дараа дараах алхмуудыг хийнэ.
          </p>
        </div>
        <ol className="mt-6 grid gap-3 sm:mt-9 sm:grid-cols-2">
          {steps.map(([title, description], index) => (
            <li
              key={title}
              className="flex gap-3 rounded-2xl border border-white/10 bg-white/2.5 p-4 sm:gap-4 sm:p-5"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-lime-300/10 text-sm font-bold text-lime-300">
                {index + 1}
              </span>
              <div>
                <h3 className="font-semibold">{title}</h3>
                <p className="mt-1.5 text-sm leading-6 text-zinc-400">
                  {description}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 pb-12 sm:px-8 sm:pb-24">
        <div className="flex flex-col items-start justify-between gap-5 rounded-3xl border border-lime-300/20 bg-linear-to-br from-lime-300/10 to-white/2 p-5 sm:flex-row sm:items-center sm:gap-6 sm:p-10">
          <div>
            <h2 className="text-xl font-bold sm:text-2xl">
              Эхний хуудсаа орчуулахад бэлэн үү?
            </h2>
            <p className="mt-2 text-sm text-zinc-400">
              Зургаа оруулаад AI орчуулгын ажлын хэсэгт үргэлжлүүлээрэй.
            </p>
          </div>
          <Link
            href="/workspace"
            className="w-full shrink-0 rounded-xl bg-lime-300 px-5 py-3.5 text-center font-semibold text-zinc-950 hover:bg-lime-200 sm:w-auto"
          >
            Эхлэх →
          </Link>
        </div>
      </section>

      <footer className="border-t border-white/[0.07] px-5 py-6 text-center text-xs text-zinc-500">
        Manhwa AI Translator · Манхваг Монгол хэлээр уншихад тусална
      </footer>
    </main>
  );
}
