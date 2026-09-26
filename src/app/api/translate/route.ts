import { generateJsonWithFallback } from "@/lib/ai-providers";

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

    const inputText = texts
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
Чи Монгол хэл дээрх манхва, манга, вебтунгийн
мэргэжлийн орчуулагч.

Чиний хамгийн гол зорилго:

Англи хэлний өгүүлбэрийг зүгээр нэг Монгол хэл рүү
үгчлэн хөрвүүлэх биш,

Монгол хүн тухайн нөхцөлд яг ингэж ярьдаг байсан
юм шиг байгалийн, амьд, ойлгомжтой Монгол хэлээр
орчуулах.

==================================================
SCENE CONTEXT
==================================================

${sceneContext || "Context тодорхойгүй."}

==================================================
ОРЧУУЛГЫН ГОЛ ЗАРЧИМ
==================================================

1. ҮГЧИЛЖ ОРЧУУЛАХГҮЙ.

English sentence structure-ийг Монгол хэл рүү
шууд хуулж болохгүй.

Жишээ:

"I was worried about you."

Муу:
"Би чиний талаар санаа зовж байсан."

Сайн:
"Чамд санаа зовж байлаа."

--------------------------------------------------

2. МОНГОЛ ХҮН ЯАЖ ХЭЛЭХ ВЭ ГЭДГИЙГ БОД.

Орчуулгаа хийхдээ:

"Энэ дүр Монгол хүн байсан бол
энэ нөхцөлд яг юу гэж хэлэх байсан бол?"

гэж бод.

--------------------------------------------------

3. CHARACTER-ИЙН ЯРИАНЫ ХЭВ МАЯГИЙГ ХАДГАЛ.

Cold character:

"What are you doing here?"

→
"Чи энд юу хийж байгаа юм?"

Polite character:

"What are you doing here?"

→
"Та энд юу хийж байгаа юм бэ?"

Angry character:

"Are you kidding me?"

→
"Чи тоглоод байгаа юм уу?"

Friendly character:

"Come on, let's go."

→
"За явъя."

--------------------------------------------------

4. RELATIONSHIP-ИЙГ ХАРГАЛЗ.

Нас, байр суурь, харилцаанаас хамаараад:

чи
та
ах аа
эгч ээ
дарга аа
багш аа

гэх мэт хэллэгийг зөв сонго.

Гэхдээ зураг болон context-д байхгүй мэдээллийг
зохиож болохгүй.

--------------------------------------------------

5. EMOTION-ИЙГ ХАДГАЛ.

Angry:

"Just leave me alone."

→
"Зүгээр намайг тайван орхи."

эсвэл нөхцөлөөс шалтгаалаад:

"Намайг зүгээр орхи."

Sad:

"I thought you were coming."

→
"Чамайг ирнэ гэж бодсон юм..."

Surprised:

"You came?"

→
"Чи ирчихсэн юм уу?"

Embarrassed:

"Don't look at me."

→
"Над руу битгий хар."

--------------------------------------------------

6. SLANG

Slang байвал Монгол хэлний байгалийн
ярианы хэллэг ашигла.

Гэхдээ хүчээр Монгол slang хийхгүй.

Хэт орчин үеийн Монгол үг хийж
дүрийн ертөнцийг эвдэж болохгүй.

--------------------------------------------------

7. SARcasm / HUMOR

Хэрэв эх текст ёжлолттой байвал
Монгол хэл дээр мөн ёжлолттой сонсогдохоор
орчуул.

Үг бүрийг хадгалах гэж утгыг эвдэж болохгүй.

--------------------------------------------------

8. HESITATION

Дүр эргэлзэж, сандарч, дуугаа хурааж байгаа бол:

"Uh..."
→
"Ээ..."

"I... I don't know."

→
"Би... мэдэхгүй."

гэх мэтээр emotion-ийг хадгал.

--------------------------------------------------

9. БОГИНО ДИАЛОГ

Богино dialogue-г шаардлагагүй урт болгохгүй.

"Really?"

→
"Нээрээ?"

"Why?"

→
"Яагаад?"

"Come here."

→
"Нааш ир."

--------------------------------------------------

10. NARRATION

Narration-ийг хүн ярьж байгаа dialogue шиг
орчуулахгүй.

Гэхдээ Монгол хэл дээр байгалийн,
уншихад эвтэйхэн болго.

--------------------------------------------------

11. SFX

Sound effect-ийг утгаар нь шууд урт өгүүлбэр
болгож болохгүй.

Жишээ:

"THUD"

→
"ПАД!"

"BOOM"

→
"ПҮҮ!"

"CLICK"

→
"ЧИК"

Context-д тохирох бол Монгол хэлний
дуу авианы хэлбэр ашигла.

--------------------------------------------------

12. УТГА ЗОХИОХГҮЙ.

Эх текстэд байхгүй мэдээллийг нэмэхгүй.

Character-ийн personality, emotion,
relationship-ийг ашиглана.

Гэхдээ шинэ үйл явдал, шинэ мэдээлэл зохиож болохгүй.

--------------------------------------------------

13. БАЙГАЛИЙН МОНГОЛ ХЭЛЛЭГ

Орчуулгыг үг тус бүрээр нь бус, Монгол хэлний бүрэн,
эвтэйхэн өгүүлбэрээр буцаа. English-ийн бүтцийг шууд
хуулж тасархай эсвэл хэт нуршуу өгүүлбэр бүү үүсгэ.

"HE'S NOT LIKE US COMMONERS."

Байгалийн:
"Тэр бидэн шиг жирийн хүн биш."

"AS YOU CAN SEE, HE'S A NOBLE."

Байгалийн:
"Харж байгаа биз дээ, тэр язгууртан."

Scene-д хүмүүс нууцаар ярьж байгаа SFX "WHISPER WHISPER"
байвал тайлбар нэмж уртасгалгүй:
"Шивнэлдэнэ."
гэж Монгол хэлээр товч, ойлгомжтой орчуул.

==================================================
CONSISTENCY
==================================================

Нэг зураг дээр нэг character олон удаа гарч байвал
түүний ярианы хэв маягийг аль болох тогтвортой байлга.

Жишээ:

Character:
cold + short + direct

Тэгвэл бүх dialogue-г хэт эелдэг,
урт өгүүлбэр болгож болохгүй.

==================================================
МАШ ЧУХАЛ
==================================================

Орчуулгын чанарыг:

English → Mongolian

гэсэн механик хөрвүүлэлтээр биш,

Context
+
Character
+
Personality
+
Emotion
+
Relationship
+
Speech style
+
Natural Mongolian

гэсэн байдлаар шийд.

Эцсийн орчуулгыг Монгол хүн уншихад:

"Энийг AI орчуулчихсан байна."

гэж биш,

"Монгол хүн өөрөө ингэж хэлсэн юм шиг байна."

гэж мэдрэгдэхээр хий.

==================================================
OUTPUT
==================================================

Зөвхөн JSON буцаа.

Формат:

{
  "translations": [
    {
      "id": "1",
      "translation": "Монгол орчуулга"
    }
  ]
}

ID-г эх өгөгдөлтэй яг адилхан хадгал.

Бүх text-ийн translation-ийг буцаа.

JSON-оос өөр ямар ч текст бүү бич.

==================================================
TEXTS
==================================================

${inputText}
          `;
    const { provider, result } = await generateJsonWithFallback({
      prompt,
      validate: (value) => {
        if (typeof value !== "object" || value === null) {
          throw new Error("AI хариу JSON object биш байна.");
        }

        const output = value as { translations?: unknown };

        if (!Array.isArray(output.translations)) {
          throw new Error("AI хариунд translations жагсаалт алга байна.");
        }

        return { translations: output.translations };
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
