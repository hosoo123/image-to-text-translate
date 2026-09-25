import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const texts = body.texts;

    if (!Array.isArray(texts) || texts.length === 0) {
      return Response.json(
        { error: "Орчуулах текст олдсонгүй." },
        { status: 400 }
      );
    }

    const inputText = texts
      .map(
        (item: {
          id: string;
          type: string;
          originalText: string;
        }) =>
          `[${item.id}] [${item.type}] ${item.originalText}`
      )
      .join("\n");

    const interaction = await ai.interactions.create({
      model: "gemini-3.8-flash",
      input: [
        {
          type: "text",
          text: `
Чи Монгол хэл дээрх манхва, манга, вебтунгийн мэргэжлийн орчуулагч.

Доорх dialogue-уудыг тус тусад нь Монгол хэл рүү орчуул.

ГОЛ ЗОРИЛГО:
Монгол хүн бодит амьдрал дээр ярьж байгаа мэт
байгалийн, энгийн, ярианы хэллэг ашигла.

ДҮРЭМ:

- Үгчлэн орчуулахгүй.
- Номын болон албан ёсны хэллэгээс зайлсхий.
- Эх текстийн утгыг хадгал.
- Дүрийн сэтгэл хөдлөлийг хадгал.
- Богино dialogue байвал Монгол орчуулгыг мөн богино байлга.
- "чи", "та" зэрэг хэллэгийг нөхцөлд тохируул.
- Slang байвал Монголын тохирох ярианы хэллэг ашигла.
- Хэт зохиомол slang бүү хэрэглэ.
- Дүрийн хэлсэн үгийг хүн ярьж байгаа мэт болго.
- Narration болон SFX-ийг dialogue шиг хүчээр орчуулахгүй.

ЖИШЭЭ:

"I'M GLAD THAT I MET YOU."

→ "Чамтай уулзсандаа баяртай байна."

Гэхдээ жишээг сохроор хуулбарлахгүй.
Эх текстийн нөхцөлд тохируул.

МАШ ЧУХАЛ:

Dialogue бүрийн ID-г яг хэвээр нь хадгал.

Зөвхөн дараах JSON бүтэцтэй хариу өг:

{
  "translations": [
    {
      "id": "1",
      "translation": "Монгол орчуулга"
    }
  ]
}

JSON-оос өөр ямар ч текст бүү бич.

Dialogue-ууд:

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
      console.error("Gemini returned invalid JSON:", output);

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