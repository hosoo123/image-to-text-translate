import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

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
      typeof body.sceneContext === "string"
        ? body.sceneContext
        : "";

    if (!Array.isArray(texts) || texts.length === 0) {
      return Response.json(
        {
          error: "Орчуулах текст олдсонгүй.",
        },
        { status: 400 }
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

    const interaction = await ai.interactions.create({
      model: "gemini-3.8-flash",
      input: [
        {
          type: "text",
          text: `
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
          `,
        },
      ],
    });

    const output = interaction.output_text || "";

    let result;

    try {
      const cleanedOutput = output
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();

      result = JSON.parse(cleanedOutput);
    } catch {
      console.error(
        "Gemini returned invalid JSON:",
        output
      );

      return Response.json(
        {
          error: "AI зөв JSON буцаасангүй.",
          raw: output,
        },
        { status: 500 }
      );
    }

    return Response.json(result);
  } catch (error) {
    console.error("Gemini translate error:", error);

    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Орчуулгын үед алдаа гарлаа.",
      },
      { status: 500 }
    );
  }
}