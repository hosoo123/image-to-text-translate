# AI HANDOFF — MANHWA AI TRANSLATOR

> Энэ файл нь өөр AI coding assistant төслийг үргэлжлүүлэх үед заавал унших project context юм.

---

## 1. PROJECT

Би Next.js + TypeScript ашиглан **AI-powered Manhwa/Manga Translator** хийж байна.

Гол зорилго:

```text
Манхва зураг
    ↓
AI зураг ойлгоно
    ↓
Dialogue / speech bubble илрүүлнэ
    ↓
Text уншина
    ↓
Character + scene + өмнөх dialogue context ойлгоно
    ↓
Байгалийн Монгол хэлээр орчуулна
    ↓
Хэрэглэгч шалгаж/засна
    ↓
Original text-ийг зурагнаас арилгана
    ↓
Монгол орчуулгыг bubble дээр автоматаар байрлуулна
    ↓
Translated image
```

Эцсийн зорилго нь зөвхөн OCR translator биш.

### Гол онцлог:

**Character-aware + Context-aware + Natural Mongolian translation**

---

# 2. USER

Хэрэглэгч Монгол хэлээр, ихэвчлэн Latin үсгээр бичдэг.

Жишээ:

```text
ene code ygd ajillahgui bna
```

гэсэн тохиолдолд Монгол хэлээр ойлгож:

```text
Энэ код яагаад ажиллахгүй байна?
```

гэж ойлго.

Хариултыг:

* Кирилл Монгол
* Энгийн
* Casual
* Шууд
* Хэт академик биш

байдлаар өг.

Technical нэршлүүдийг English хэвээр ашиглаж болно.

---

# 3. VERY IMPORTANT — DEVELOPMENT STYLE

Хэрэглэгч beginner/intermediate developer.

Тиймээс:

**Нэг дор асар их код битгий өг.**

Дараах workflow ашигла:

```text
Step 1
↓
User хийж үзнэ
↓
Test
↓
Success / Error
↓
Next step
```

Жишээ:

```text
1. Энэ file-ийг нээ.
2. Доорх кодыг оруул.
3. npm run dev ажиллуул.
4. localhost дээр шалга.
5. Ямар result гарсныг хэл.
```

Хэрэв error гарвал хэрэглэгч error-оо явуулна.

Тэгэхэд:

```text
Error юу гэсэн үг
↓
Яагаад гарсан
↓
Яг хаана засах
↓
Зассан code
↓
Test
```

гэсэн дарааллаар ажилла.

---

# 4. NEVER DESTROY EXISTING WORK

Existing project code-ийг эхлээд шалга.

Шууд:

```text
delete
rewrite
replace entire project
```

хийж болохгүй.

Эхлээд:

```text
package.json
app/
src/
components/
lib/
API routes
.env.local existence
```

зэргийг шалга.

Хэрэв existing implementation байгаа бол түүнийг хадгалж, хамгийн бага өөрчлөлтөөр үргэлжлүүл.

---

# 5. CURRENT MVP

Эхний ажиллах MVP:

```text
Upload image
      ↓
AI reads image
      ↓
Detect dialogue
      ↓
Translate to Mongolian
      ↓
Show result
```

UI жишээ:

```text
┌─────────────────────────────┐
│       Upload Manhwa         │
│                             │
│       [ Choose Image ]      │
└─────────────────────────────┘

Original:
"You came here?"

Монгол:
"Чи энд ирчихсэн юм уу?"
```

Энэ ажилласны дараа л дараагийн feature рүү ор.

---

# 6. TRANSLATION QUALITY

Translation нь Google Translate шиг word-by-word байж болохгүй.

AI дараах зүйлсийг ойлгох ёстой:

* Character personality
* Character relationship
* Age
* Gender when relevant
* Social status
* Formal/informal speech
* Emotion
* Anger
* Sarcasm
* Humor
* Scene
* Previous dialogue
* Story context

---

# 7. TRANSLATION EXAMPLE

Original:

```text
「お前、何してんだよ！」
```

Literal:

```text
"Чи юу хийж байна вэ?"
```

Natural Mongolian нөхцөлөөс хамаарч:

```text
"Чи ер нь юу хийгээд байгаа юм бэ?!"
```

гэж болох ёстой.

AI нь original-ийн **утга + emotion + character voice**-ийг хадгална.

---

# 8. CHARACTER MEMORY

Character бүрт context хадгалах боломжтой болго.

Жишээ:

```json
{
  "name": "Kai",
  "personality": [
    "cold",
    "quiet",
    "proud"
  ],
  "speechStyle": "short, direct, informal"
}
```

Дараагийн dialogue орчуулахдаа энэ мэдээллийг ашиглана.

---

# 9. DIALOGUE DATA

Target structure:

```ts
type Dialogue = {
  id: string;
  originalText: string;
  translatedText: string;

  x?: number;
  y?: number;
  width?: number;
  height?: number;

  character?: string;

  confidence?: number;
};
```

Coordinates нь дараагийн image-rendering phase-д ашиглагдана.

---

# 10. PHASES

## PHASE 1

Image upload + preview.

---

## PHASE 2

AI Vision/OCR:

```text
Image
 ↓
Detected dialogue
 ↓
Text
```

Possible output:

```json
{
  "dialogues": [
    {
      "originalText": "You came here?"
    }
  ]
}
```

---

## PHASE 3

Context-aware translation:

```text
Original dialogue
+
Character information
+
Previous dialogue
+
Scene context
↓
AI
↓
Natural Mongolian
```

---

## PHASE 4

Translation editor.

User:

* Монгол текст засна
* Regenerate хийнэ
* Original харна
* Translation хадгална

---

## PHASE 5

Speech bubble detection.

Dialogue бүрийн байрлал:

```json
{
  "x": 120,
  "y": 80,
  "width": 240,
  "height": 100
}
```

---

## PHASE 6

Original text removal.

Эхлээд bubble background дээр text area-г cover хийх энгийн хувилбар байж болно.

Дараа нь:

```text
AI inpainting
```

эсвэл илүү advanced image processing ашиглаж болно.

---

## PHASE 7

Монгол text placement.

Bubble дээр:

* Auto font size
* Line wrapping
* Center alignment
* Vertical alignment
* Overflow prevention

хий.

Жишээ:

```text
┌───────────────────┐
│   Чи энд ирчихсэн │
│       юм уу?      │
└───────────────────┘
```

---

# 11. CHAPTER MODE

Эцсийн шатанд нэг page биш бүх chapter боловсруулах.

Жишээ:

```text
chapter-001/
  page-001.jpg
  page-002.jpg
  page-003.jpg
  ...
```

Processing:

```text
Page 1
 ↓
Translation
 ↓
Context memory update

Page 2
 ↓
Translation using previous context
 ↓
Context update

Page 3
 ↓
...
```

Бүх chapter-ийг нэг том prompt болгохгүй.

Context summary/memory ашиглана.

---

# 12. PERFORMANCE

Олон зураг боловсруулах тул:

* Cache
* Translation cache
* Image compression
* Resize
* Duplicate detection
* Batch processing
* Queue
* Retry
* Rate limiting

зэрэг feature-үүдийг дараа нь нэмнэ.

Нэг зурагт ижил AI request-ийг шаардлагагүй олон удаа хийхгүй.

---

# 13. API SECURITY

API key client-side кодонд БИТГИЙ бич.

Зөв:

```env
OPENAI_API_KEY=...
```

API request server-side route-аар явна.

`.env.local` GitHub руу push хийхгүй.

---

# 14. AI OUTPUT

Боломжтой бол structured output / JSON schema ашигла.

Жишээ:

```json
{
  "dialogues": [
    {
      "original": "You came here?",
      "translation": "Чи энд ирчихсэн юм уу?",
      "character": "Kai",
      "x": 120,
      "y": 80,
      "width": 220,
      "height": 100
    }
  ]
}
```

Raw AI response-ийг blind parse хийхээс зайлсхий.

Invalid JSON үед graceful error handling хий.

---

# 15. ERROR HANDLING

Дараах тохиолдлуудыг бодолц:

```text
Missing API key
Invalid image
Image too large
API timeout
Rate limit
Network error
Invalid AI response
JSON parse error
```

UI дээр ойлгомжтой message харуул.

---

# 16. FUTURE UI

Эцсийн UI ойролцоогоор:

```text
┌─────────────────────────────────────┐
│        MANHWA TRANSLATOR            │
├─────────────────────────────────────┤
│                                     │
│       [ Upload Chapter ]             │
│                                     │
├─────────────────────────────────────┤
│ Original        │ Translation       │
│                 │                   │
│   Image         │  Монгол Image     │
│                 │                   │
├─────────────────────────────────────┤
│ [Edit] [Regenerate] [Save] [Export] │
└─────────────────────────────────────┘
```

Гэхдээ эхний MVP-г unnecessarily complex UI болгохгүй.

---

# 17. RECOMMENDED PROJECT STRUCTURE

Existing structure-ийг шалгаад шаардлагатай үед ойролцоогоор:

```text
app/
├── page.tsx
├── upload/
│   └── page.tsx
└── api/
    ├── analyze/
    │   └── route.ts
    ├── translate/
    │   └── route.ts
    └── render/
        └── route.ts

components/
├── ImageUploader.tsx
├── ImagePreview.tsx
├── TranslationResult.tsx
└── TranslationEditor.tsx

lib/
├── ai.ts
├── ocr.ts
├── translator.ts
├── context.ts
└── image.ts

types/
└── translation.ts
```

Гэхдээ энэ structure-ийг existing project-д хүчээр тулгахгүй.

---

# 18. WHEN CHOOSING APIs / LIBRARIES

Current date: 2026.

API/library сонгох үед outdated information битгий таамагла.

Шаардлагатай бол official documentation шалга.

Ялангуяа:

* AI API
* Vision
* OCR
* Image processing
* Next.js
* TypeScript
* Storage

зэрэг дээр current API syntax ашигла.

---

# 19. DEBUGGING RULE

Хэрэглэгч:

```text
error гарлаа
```

гэвэл эхлээд:

```text
Error message
Stack trace
File
Line
```

дээр үндэслэж оношил.

Таамгаар project-ийг бүхэлд нь rewrite хийхгүй.

---

# 20. DO NOT OVERENGINEER

Эхний MVP-д:

❌ Database шаардлагагүй бол бүү нэм
❌ Authentication шаардлагагүй бол бүү нэм
❌ Queue шаардлагагүй бол бүү нэм
❌ Complex state management шаардлагагүй бол бүү нэм
❌ Microservices бүү хий

Эхлээд:

**Image → AI → Mongolian translation**

ажилладаг болго.

---

# 21. LEGAL / CONTENT CONSIDERATION

Манхва/мангагийн бүтээлүүд copyright-той байж болно.

Энэ project-ийн technical development-д анхаарлаа төвлөрүүл.

Production үед:

* Translation rights
* Distribution rights
* Image hosting
* Public chapter publishing

зэрэг copyright/licensing асуудлыг тусад нь шалгах шаардлагатай.

---

# 22. FIRST ACTION FOR NEW AI

Энэ файлыг уншсаны дараа шууд код бичих хэрэггүй.

Эхлээд project-ийг inspect хий.

Шалгах:

```text
1. package.json
2. Next.js version
3. Existing folders
4. Existing API routes
5. Existing components
6. Existing environment setup
7. Existing AI/OCR code
```

Дараа нь:

```text
CURRENT PROJECT STATE
```

гэсэн богино summary өг.

Тэгээд **хамгийн эхний шаардлагатай алхам**-ыг л хийлгэ.

---

# 23. MOST IMPORTANT RULE

Энэ project-ийн эцсийн зорилго:

> Манхвагийн зургийг upload хийхэд AI нь зураг дээрх dialogue-г өөрөө олж, text-ийг уншиж, дүрүүдийн харилцаа болон өмнөх яриаг ойлгож, байгалийн Монгол хэлээр орчуулж, дараа нь Монгол орчуулгыг анхны speech bubble дээр автоматаар байрлуулдаг систем.

Энэ зорилгоос хазайхгүй.

Development order:

```text
MVP
 ↓
OCR/Vision accuracy
 ↓
Translation quality
 ↓
Character context
 ↓
Bubble detection
 ↓
Text removal
 ↓
Text placement
 ↓
Chapter automation
 ↓
Performance / caching
 ↓
Production
```

---

## END

New AI must treat this document as the primary project handoff context.

**Do not restart the project from zero unless the existing implementation is genuinely unusable.**

“Эхлээд AI_HANDOFF.md-г уншаад, дараа нь project-ийн одоогийн кодыг inspect хийгээд, тэндээс нь үргэлжлүүл.”