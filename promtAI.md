Би Next.js ашиглан манхва/мангагийн зургийг AI-аар уншуулж, Монгол хэл рүү байгалийн, дүрийн ярианы хэв маягийг хадгалсан байдлаар орчуулдаг веб апп хийж байна.

## 🎯 Төслийн гол зорилго

Хэрэглэгч манхвагийн нэг page/image upload хийнэ.

Систем:

1. Зургийг хүлээж авна
2. Зураг дээрх speech bubble/dialogue-уудыг илрүүлнэ
3. Bubble бүрийн текстийг уншина
4. Дүрүүдийн өмнөх яриа болон контекстийг ашиглана
5. Ярианы хэв маягийг хадгалж Монголчилно
6. Original + Монгол орчуулгыг харуулна
7. Дараагийн шатанд Монгол орчуулгыг анхны bubble-ийн байрлал дээр автоматаар байрлуулна
8. Олон page/chapter-ийг batch байдлаар боловсруулах боломжтой болгоно

## 🧠 Орчуулгын гол шаардлага

Энгийн word-by-word translation хийхгүй.

Жишээ:

Original:
「お前、何してんだよ！」

Зүгээр:
"Чи юу хийж байна вэ?"

гэхээс илүү тухайн нөхцөл, дүрийн зан чанарт тохируулж:

"Чи ер нь юу хийгээд байгаа юм бэ?!"

гэх мэт байгалийн Монгол хэллэг ашиглана.

AI дараах зүйлсийг анхаарна:

* Дүрийн нас
* Хүйс
* Зан чанар
* Нийгмийн байр суурь
* Нөгөө дүртэй харилцаа
* Уурласан эсэх
* Хошигнож байгаа эсэх
* Албан/албан бус хэллэг
* Манхвагийн atmosphere
* Өмнөх dialogue
* Дараагийн dialogue-той холбоотой контекст

## 🏗️ Ерөнхий architecture

```text
Next.js
│
├── Image Upload
│
├── Image Analysis / OCR
│      ↓
│   Text + bubble coordinates
│
├── AI Translation
│      ↓
│   Context-aware Mongolian
│
├── Translation Editor
│
└── Image Renderer
       ↓
   Монгол текстийг bubble дээр байрлуулах
```

## 🚧 Хөгжүүлэлтийн үе шат

### Phase 1 — MVP

Эхлээд зөвхөн:

```text
Image upload
      ↓
AI image understanding / OCR
      ↓
Detected dialogue
      ↓
Mongolian translation
      ↓
UI дээр харуулах
```

ажилладаг болгоно.

### Phase 2 — Bubble detection

Bubble бүрийн:

```js
{
  text: "...",
  x: 0,
  y: 0,
  width: 0,
  height: 0
}
```

гэх мэт координат авна.

### Phase 3 — Context memory

Өмнөх panel/page-ийн dialogue-уудыг AI-д context болгон өгнө.

Жишээ:

```text
Character A:
"Чи энд юу хийж байгаа юм?"

Character B:
"Чамайг хайж ирсэн юм."

Character A:
"Намайг?"

```

AI тухайн харилцааг ойлгож дараагийн dialogue-г орчуулна.

### Phase 4 — Монгол текстийг зураг дээр буцааж байрлуулах

Bubble-ийн координат ашиглан:

```text
Original image
      ↓
Remove/cover original text
      ↓
Монгол translation
      ↓
Render inside bubble
      ↓
Translated image
```

### Phase 5 — Chapter processing

Жишээ:

```text
chapter-001/
  page-001.jpg
  page-002.jpg
  page-003.jpg
  ...
```

бүх page-ийг дарааллаар нь боловсруулна.

Context-ийг page хооронд хадгална.

### Phase 6 — Editor

Хэрэглэгч:

* Монгол текст засах
* Font өөрчлөх
* Font size өөрчлөх
* Bubble position өөрчлөх
* Translation дахин generate хийх
* Original текст харах
* Page preview хийх

боломжтой байна.

---

## 💻 Tech stack

Одоогоор Next.js ашиглана.

Зөвхөн шаардлагатай үед нэмэлт сан/API ашиглана.

Боломжит stack:

* Next.js
* TypeScript
* React
* Tailwind CSS
* AI vision model
* OCR шаардлагатай бол OCR API/library
* Image processing library
* Database шаардлагатай үед
* Object storage шаардлагатай үед

API болон library сонгохдоо одоогийн байдлаар найдвартай, боломжийн үнэтэй, developer-д хэрэглэхэд хялбар хувилбарыг сонго.

## ⚠️ Маш чухал

Нэг дор бүх системийг хийх гэж бүү оролд.

Би beginner/intermediate түвшинд байгаа учраас:

1. Нэг алхам
2. Код
3. Би ажиллуулна
4. Error гарвал error-оо явуулна
5. Засна
6. Дараагийн алхам руу орно

гэсэн байдлаар заа.

Нэг хариултаар асар их код битгий өг.

### Код өгөхдөө

Яг:

```text
1. Энэ folder руу ор
2. Энэ file үүсгэ
3. Үүнийг бүтнээр нь paste хий
4. Энэ command ажиллуул
5. Browser дээр ийм зүйл харагдах ёстой
```

гэж тайлбарла.

Хэрэв existing code байвал шууд overwrite хийхээс өмнө одоо байгаа кодыг асууж болно.

## 🔑 API key

API key-г frontend/client code-д хэзээ ч шууд бичихгүй.

```env
OPENAI_API_KEY=...
```

зэрэг environment variable ашиглана.

API call-ууд server-side route/API route-аар явна.

`.env.local`-ийг GitHub руу push хийхгүй.

## 🧪 Эхний MVP-ийн зорилго

Одоогоор хамгийн түрүүнд дараахыг ажиллуулна:

```text
[Upload Image]

        ↓

[AI reads image]

        ↓

Original:
"You came here?"

Монгол:
"Чи энд ирчихсэн юм уу?"
```

Үүнийг амжилттай болгосны дараа bubble detection рүү орно.

## 🗣️ Харилцааны хэл

Би Монгол хэлээр, ихэвчлэн Latin үсгээр бичдэг.

Надад Монгол хэлээр, энгийн, байгалийн хэллэгээр хариул.

Техникийн нэршлийг English хэвээр үлдээж болно.

Жишээ:

"Энийг `app/api/translate/route.ts` дотор хийнэ."

гэх мэт.

## ❗ Одоогоор хийх зүйл

Надад эхлээд:

1. Project-ийн эхний бүтэц
2. Ямар package хэрэгтэй
3. Phase 1-ийг хийх exact алхмууд

гэж хэл.

Дараа нь нэг нэг алхмаар хамт хий.

Би кодоо VS Code дээр хийж, terminal-аас ажиллуулна.

Хэрэв би error явуулбал error-ийг эхлээд оношлоод, дараа нь засах код өг.

Бид эцэст нь:

**"Манхва зураг upload хийхэд AI өөрөө dialogue-г ойлгож, дүрийн context-ийг хадгалж, байгалийн Монгол хэлээр орчуулж, bubble дээр нь автоматаар байрлуулдаг систем"**

хийх зорилготой.
