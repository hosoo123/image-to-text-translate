import { generateJsonWithFallback } from "@/lib/ai-providers";

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

    const prompt = `
Чи манхва, манга, вебтунгийн зураг анализ хийдэг AI.

Энэ зураг дээрх бүх текстийг илрүүлээд,
дараа нь тухайн scene болон дүрүүдийн талаар
орчуулгад хэрэгтэй context-ийг гаргаж өг.

ЧУХАЛ:
Одоохондоо орчуулга хийхгүй.

==================================================
1. ТЕКСТ ИЛРҮҮЛЭЛТ
==================================================

Зураг дээр харагдаж байгаа бүх текстийг ол.

Дараах төрлүүдийг ялга:

- dialogue
- thought
- narration
- sfx

Нэг bubble дотор хэд хэдэн мөр байвал
нэг text object гэж үз.

Текстийг зураг дээр байгаа хэлбэрээр нь
аль болох яг хэвээр нь бич.

==================================================
2. COORDINATES
==================================================

Текст болон түүнийг агуулж байгаа dialogue/thought bubble-ийн координатыг
тус тусад нь ол.

Бүх координат эх зургийн pixel хэмжээгээр байна.

x = зүүн координат
y = дээд координат
width = өргөн
height = өндөр

Text bounding box нь зөвхөн тухайн текстийг бүрэн хамарна.

bubbleX = bubble-ийн дотор талын зүүн координат
bubbleY = bubble-ийн дотор талын дээд координат
bubbleWidth = bubble-ийн дотор талын өргөн
bubbleHeight = bubble-ийн дотор талын өндөр

Bubble-ийн координат нь text-ээс тусдаа байх ёстой бөгөөд bubble-ийн бүх
текст багтах дотор хэсгийг хамарна. Speech tail болон хүрээний зураасыг
оруулахгүй. Thought bubble бол ellipse-ийн дотор хэсгийг хамар.

==================================================
3. CHARACTER
==================================================

Хэрэв текстийг хэлж байгаа дүрийг зурагнаас
таних боломжтой бол character талбарт нэр өг.

Жишээ:

"character": "Kai"

Хэрэв нэрийг мэдэх боломжгүй бол:

"character": "unknown"

Нэрийг зохиож болохгүй.

==================================================
4. PERSONALITY
==================================================

Зураг дээрх дүрийн харагдах байдал,
үйлдэл болон scene-ийн нөхцөлөөс ойлгогдох
зан чанарыг тодорхойл.

Жишээ:

[
  "cold",
  "quiet",
  "proud"
]

Эсвэл:

[
  "friendly",
  "cheerful"
]

Гэхдээ зурагнаас нотлох боломжгүй зан чанарыг
зохиож болохгүй.

==================================================
5. SPEECH STYLE
==================================================

Тухайн дүр хэрхэн ярьдагийг тодорхойл.

Жишээ:

"short, direct, informal"

эсвэл:

"polite, soft, respectful"

эсвэл:

"rough, aggressive, slang-heavy"

==================================================
6. EMOTION
==================================================

Тухайн dialogue хэлж байгаа үеийн
сэтгэл хөдлөлийг тодорхойл.

Жишээ:

- angry
- sad
- happy
- nervous
- surprised
- embarrassed
- calm
- serious
- scared
- confused
- sarcastic

Хэрэв тодорхойгүй бол:

"neutral"

==================================================
7. RELATIONSHIP
==================================================

Тухайн дүрүүдийн хоорондын харилцааг
зурагнаас ойлгож болох хэмжээнд тодорхойл.

Жишээ:

- friend
- enemy
- stranger
- older_to_younger
- younger_to_older
- superior_to_subordinate
- lover
- family

Тодорхойгүй бол:

"unknown"

==================================================
8. SCENE CONTEXT
==================================================

Бүх зурагт хамаарах scene-ийн богино context өг.

Жишээ:

"Two friends are arguing after one of them broke a promise."

Энэ context нь дараагийн AI орчуулгад
хэрэглэгдэх тул аль болох ойлгомжтой,
богино байна.

==================================================
9. CONFIDENCE
==================================================

Character, emotion зэрэг мэдээлэл бүр дээр
ойролцоогоор confidence өг.

0.0 = огт итгэлгүй
1.0 = маш өндөр итгэлтэй

==================================================
JSON FORMAT
==================================================

Зөвхөн дараах JSON буцаа:

{
  "sceneContext": "scene-ийн богино тайлбар",
  "texts": [
    {
      "id": "1",
      "type": "dialogue",
      "originalText": "I'M GLAD THAT I MET YOU.",
      "x": 120,
      "y": 240,
      "width": 300,
      "height": 100,
      "bubbleX": 80,
      "bubbleY": 200,
      "bubbleWidth": 380,
      "bubbleHeight": 180,
      "character": "Kai",
      "personality": [
        "quiet",
        "proud"
      ],
      "speechStyle": "short, direct, informal",
      "emotion": "sad",
      "relationship": "friend",
      "confidence": 0.92
    }
  ]
}

Хэрэв текст байхгүй бол:

{
  "sceneContext": "",
  "texts": []
}

МАШ ЧУХАЛ:

- JSON-оос өөр ямар ч текст бүү буцаа.
- ID-г дарааллаар өг.
- Text бүрийг тусдаа object болго.
- Dialogue болон thought бүрт bubbleX, bubbleY, bubbleWidth, bubbleHeight буцаа.
- x, y, width, height-ийг bubble-ийн координаттай андуурч болохгүй.
- Мэдэхгүй зүйлээ зохиож болохгүй.
- Character нэрийг зурагнаас мэдэх боломжгүй бол "unknown".
- Relationship мэдэгдэхгүй бол "unknown".
- Emotion мэдэгдэхгүй бол "neutral".
- Personality мэдэгдэхгүй бол [].
- Speech style мэдэгдэхгүй бол "unknown".
          `;
    const { provider, result } = await generateJsonWithFallback({
      prompt,
      image: { base64: base64Image, mimeType },
      validate: (value) => {
        if (typeof value !== "object" || value === null) {
          throw new Error("AI хариу JSON object биш байна.");
        }

        const output = value as { sceneContext?: unknown; texts?: unknown };

        if (!Array.isArray(output.texts)) {
          throw new Error("AI хариунд texts жагсаалт алга байна.");
        }

        return {
          sceneContext:
            typeof output.sceneContext === "string" ? output.sceneContext : "",
          texts: output.texts,
        };
      },
    });

    return Response.json(result, {
      headers: { "X-AI-Provider": provider },
    });
  } catch (error) {
    console.error("Gemini analyze error:", error);

    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Зураг анализ хийх үед алдаа гарлаа.",
      },
      { status: 500 },
    );
  }
}
