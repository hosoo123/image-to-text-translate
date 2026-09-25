import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const data = await request.formData();
    const image = data.get("image");

    if (!(image instanceof File)) {
      return Response.json({ error: "Зураг олдсонгүй." }, { status: 400 });
    }

    const arrayBuffer = await image.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const base64Image = buffer.toString("base64");
    const mimeType = image.type || "image/jpeg";

    const interaction = await ai.interactions.create({
      model: "gemini-3.8-flash",
      input: [
        {
          type: "text",
          text: `
Энэ бол манхвагийн зураг.

Зураг дээр байгаа бүх харагдах текстийг илрүүл.

Дараах төрлийн текстүүдийг ялгаж тань:
- Ярианы bubble
- Дүрийн хэлсэн үг
- Бодлын bubble
- Narration
- Sound effect

Одоохондоо орчуулга хийхгүй.

Текст бүрийг тусдаа dialogue/object гэж үз.

Зөвхөн JSON буцаа.

JSON бүтэц яг ийм байна:

{
  "texts": [
    {
      "id": "1",
      "type": "dialogue",
      "originalText": "эх текст",
      "x": 120,
      "y": 240,
      "width": 300,
      "height": 100
    }
  ]
}

БҮР ТЕКСТИЙН БАЙРШЛЫГ МӨН ОЛ:

- x = текст/bubble-ийн зүүн талаас эхлэх координат
- y = текст/bubble-ийн дээд талаас эхлэх координат
- width = текст/bubble-ийн өргөн
- height = текст/bubble-ийн өндөр

Координатыг эх зургийн pixel хэмжээгээр тооц.

Байршлыг ойролцоогоор биш, зураг дээрх тухайн текст байрласан хэсгийг хамарсан bounding box байдлаар өг.

Жишээ:

{
  "id": "1",
  "type": "dialogue",
  "originalText": "I'M GLAD THAT I MET YOU.",
  "x": 120,
  "y": 240,
  "width": 300,
  "height": 100
}

Дүрийн хэлсэн үг бол type = "dialogue".

Бодлын текст бол type = "thought".

Narration бол type = "narration".

Sound effect бол type = "sfx".

Текстийг эх зураг дээр байгаагаар нь аль болох яг хэвээр нь бич.

Нэг bubble дотор хэд хэдэн мөр байсан ч нэг text object болго.

Зураг дээр текст байхгүй бол:

{
  "texts": []
}

гэсэн JSON буцаа.

JSON-оос өөр ямар ч текст бүү буцаа.
          `,
        },
        {
          type: "image",
          data: base64Image,
          mime_type: mimeType,
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
        { status: 500 },
      );
    }

    return Response.json(result);
  } catch (error) {
    console.error("Gemini analyze error:", error);

    return Response.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
