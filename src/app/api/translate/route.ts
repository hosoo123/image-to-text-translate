import { generateJsonWithFallback } from "@/lib/ai-providers";
import { requireUser } from "@/lib/supabase/require-user";
import { consumeAiUsage } from "@/lib/supabase/usage";

type AnalyzeText = {
  id: string;
  type: string;
  originalText: string;
  character?: string;
  personality?: string[];
  speechStyle?: string;
  emotion?: string;
  relationship?: string;
  confidence?: number;
};

export async function POST(request: Request) {
  try {
    const auth = await requireUser();
    if (!auth.configured) {
      return Response.json({ error: "Supabase тохиргоо хийгдээгүй байна." }, { status: 503 });
    }
    if (!auth.user) {
      return Response.json({ error: "Энэ үйлдлийг хийхийн тулд нэвтэрнэ үү." }, { status: 401 });
    }

    const body = await request.json();

    const texts = body.texts as AnalyzeText[];
    const sceneContext =
      typeof body.sceneContext === "string" ? body.sceneContext : "";

    if (!Array.isArray(texts) || texts.length === 0) {
      return Response.json(
        {
          error: "Орчуулах текст олдсонгүй.",
        },
        { status: 400 },
      );
    }

    const dialogueTexts = texts.filter(
      (item) => typeof item.type === "string" && item.type.toLowerCase() === "dialogue",
    );
    if (dialogueTexts.length === 0) {
      return Response.json({ translations: [] });
    }

    let usage;
    try {
      usage = await consumeAiUsage("translate");
    } catch {
      return Response.json({ error: "Хэрэглээний хүснэгт тохируулагдаагүй байна. Supabase migration ажиллуулна уу." }, { status: 503 });
    }
    if (!usage.allowed) {
      return Response.json({ error: `Өдрийн AI лимит (${usage.daily_limit}) дууссан байна.` }, { status: 429 });
    }

    const inputText = dialogueTexts
      .map((item) => {
        return `
ID: ${item.id}

TYPE:
${item.type}

ORIGINAL:
${item.originalText}

CHARACTER:
${item.character || "unknown"}

PERSONALITY:
${item.personality?.join(", ") || "unknown"}

SPEECH STYLE:
${item.speechStyle || "unknown"}

EMOTION:
${item.emotion || "neutral"}

RELATIONSHIP:
${item.relationship || "unknown"}

CONFIDENCE:
${item.confidence ?? "unknown"}
`;
      })
      .join("\n--------------------\n");

    const prompt = `
Чи Монгол хэлний манхва/вэбтуны яриаг нутагшуулдаг туршлагатай орчуулагч.
Англи өгүүлбэрийг үгчлэн хөрвүүлэх биш, яг тэр дүр энэ нөхцөлд Монгол хэлээр
юу гэж хэлэхийг бич. Эхний хувилбар чинь орчуулга шиг сонсогдвол дахин найруул.

SCENE
${sceneContext || "Тодорхой scene context алга."}

ЯРИАНЫ ӨНГӨ АЯС
- Бүх мөрийг хамтад нь уншиж, хариу өгүүлбэрүүдийн холбоо, далд санааг ойлго.
- Эх текстийн үйлдэл, санааг бүрэн хадгал. Шинэ утга, сэтгэл хөдлөл бүү нэм.
- Дүрийн зан чанар, ярианы хэв маяг, сэтгэл хөдлөл, харилцааг өнгө аяс сонгохдоо
  ашигла. Энэ мэдээлэл эх мөртэй зөрвөл эх мөр ба scene-ийн утгыг дага.
- Дотно ярианд энгийн хэллэг, хүндэтгэлийн харилцаанд зохистой хэлбэр сонго.
  Харилцаа тодорхойгүй бол ах/эгч/дарга гэх мэт дуудлага, албаны “та”-г бүү зохио.
- Монгол өгүүлбэрийн үгийн дарааллыг хэрэглэ. “Би”, “чи”, “байна”, “юм” болон
  “just”, “you know”, “I think” зэрэг дүүргэгч үгийг утгад хэрэггүй бол орхи.
- Аман ярианы “шүү”, “чинь”, “л дээ”, “юм уу”, “ш дээ” зэрэг өнгө оруулагчийг
  дүрийн дуу хоолойд таарах үед хэрэглэ; олон мөрт ижил төгсгөл давтахгүй.
- Уур, гомдол, ичингүйрэл, айдас, эргэлзээг хэт тайлбарлахгүйгээр үг сонголт,
  тасалдал, цэг тэмдэг, өгүүлбэрийн хэмнэлээр мэдрүүл. Эхийн гурван цэг, урт зураас, гацалтыг
  шаардлагатай үед хадгал.
- Bubble-д багтахаар богино, цэгцтэй байлга. Хэт албан, номын, тайлбарласан хэллэгээс
  зайлсхий; шаардлагагүй slang бүү нэм.

ӨНГӨ ЯЛГАХ ЖИШЭЭ
- Өрсөлдөгчийн challenge-ийг зөвшөөрсөн “Okay. You're on.” → “За, тохирлоо.”
- “It'll go back in when you loosen your grip!” → “Атгалтаа суллавал буцаад орчихно!”
- “I thought about what you said before, and I made it!” →
  “Өмнө хэлснийг чинь бодож үзээд, хийчихлээ!”
- Гомдож, гайхсан “Why would you?!” → “Чи яах гэж тэгсэн юм бэ?!”
- Эргэлзэн тасалдсан “Uh, I don't think--” → “Өө, би тэгж бодохгүй байна—”

ХАРИУ ӨГӨХИЙН ӨМНӨ ДОТРОО ШАЛГА
1. Монгол хүн аман ярианд ингэж хэлэх үү? Хөшүүн сонсогдвол дахин найруул.
2. Эхэд байгаагүй санаа нэмээгүй, эхийн үйлдэл ба өнгө аясыг хадгалсан уу?
3. Нэг дүрийн мөрүүдийн voice хоорондоо нийцэж байна уу?
Энэ шалгалт болон тайлбараа бүү гарга; зөвхөн эцсийн орчуулгыг өг.

OUTPUT
Зөвхөн доорх бүтэцтэй JSON буцаа. Бүх ID-г яг хэвээр, эхний дарааллаар оруул;
нэг ч мөр алгасахгүй. JSON-оос өөр текст бүү бич.
{
  "translations": [
    { "id": "1", "translation": "Монгол ярианы байгалийн хувилбар" }
  ]
}

DIALOGUE TEXTS
${inputText}
`;
    const { provider, result } = await generateJsonWithFallback({
      prompt,
      reasoningEffort: "low",
      validate: (value) => {
        if (typeof value !== "object" || value === null) {
          throw new Error("AI хариу JSON object биш байна.");
        }

        const output = value as { translations?: unknown };

        if (!Array.isArray(output.translations)) {
          throw new Error("AI хариунд translations жагсаалт алга байна.");
        }

        const translations = output.translations as Array<{
          id?: unknown;
          translation?: unknown;
        }>;
        const expectedIds = new Set(dialogueTexts.map((item) => item.id));
        const valid = translations.every(
          (item) =>
            typeof item.id === "string" &&
            expectedIds.has(item.id) &&
            typeof item.translation === "string" &&
            item.translation.trim().length > 0,
        );

        if (!valid || translations.length !== expectedIds.size) {
          throw new Error("AI бүрэн, зөв translation жагсаалт буцаасангүй.");
        }

        return { translations };
      },
    });

    return Response.json(result, {
      headers: { "X-AI-Provider": provider },
    });
  } catch (error) {
    console.error("Gemini translate error:", error);

    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Орчуулгын үед алдаа гарлаа.",
      },
      { status: 500 },
    );
  }
}
