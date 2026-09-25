"use client";

import { useEffect, useRef, useState } from "react";

type AnalysisText = {
  id: string;
  type: string;
  originalText: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

type Translation = {
  id: string;
  translation: string;
};

export default function Home() {
  const [image, setImage] = useState<string | null>(null);
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);

  const [analysisTexts, setAnalysisTexts] = useState<
    AnalysisText[]
  >([]);

  const [originalTexts, setOriginalTexts] = useState<
    AnalysisText[]
  >([]);

  const [translations, setTranslations] = useState<
    Translation[]
  >([]);

  const [loading, setLoading] = useState(false);
  const [rendering, setRendering] = useState(false);
  const [error, setError] = useState("");

  const canvasRef = useRef<HTMLCanvasElement>(null);

  /*
   * OCR box-уудыг зураг дээр харуулах
   */
  useEffect(() => {
    if (!image) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();

    img.onload = () => {
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;

      ctx.clearRect(
        0,
        0,
        canvas.width,
        canvas.height,
      );

      ctx.drawImage(img, 0, 0);

      /*
       * OCR box байгаа үед улаан хүрээ харуулна.
       */
      analysisTexts.forEach((item) => {
        ctx.strokeStyle = "#ef4444";
        ctx.lineWidth = Math.max(
          2,
          Math.round(img.naturalWidth / 600),
        );

        ctx.strokeRect(
          item.x,
          item.y,
          item.width,
          item.height,
        );

        /*
         * ID
         */
        const fontSize = Math.max(
          16,
          Math.round(img.naturalWidth / 35),
        );

        ctx.fillStyle = "#ef4444";
        ctx.font = `bold ${fontSize}px Arial`;

        ctx.fillText(
          item.id,
          item.x,
          Math.max(item.y - 8, fontSize),
        );
      });
    };

    img.src = image;
  }, [image, analysisTexts]);

  /*
   * Зураг сонгох
   */
  function handleImageChange(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const selectedFile = event.target.files?.[0];

    if (!selectedFile) return;

    const imageUrl = URL.createObjectURL(selectedFile);

    setFile(selectedFile);

    setImage(imageUrl);
    setOriginalImage(imageUrl);

    setTranslations([]);
    setOriginalTexts([]);
    setAnalysisTexts([]);

    setError("");
  }

  /*
   * AI OCR + Translation
   */
  async function analyzeImage() {
    if (!file) return;

    setLoading(true);
    setError("");

    setTranslations([]);
    setOriginalTexts([]);
    setAnalysisTexts([]);

    try {
      /*
       * 1. OCR
       */

      const formData = new FormData();

      formData.append("image", file);

      const analyzeResponse = await fetch(
        "/api/analyze",
        {
          method: "POST",
          body: formData,
        },
      );

      const analyzeData =
        await analyzeResponse.json();

      if (!analyzeResponse.ok) {
        throw new Error(
          analyzeData.error ||
            "Зургийг унших үед алдаа гарлаа.",
        );
      }

      const texts = analyzeData.texts;

      if (
        !texts ||
        !Array.isArray(texts) ||
        texts.length === 0
      ) {
        setError("Зураг дээр текст олдсонгүй.");
        return;
      }

      setOriginalTexts(texts);
      setAnalysisTexts(texts);

      /*
       * 2. Translation
       */

      const translateResponse = await fetch(
        "/api/translate",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            texts,
          }),
        },
      );

      const translateData =
        await translateResponse.json();

      if (!translateResponse.ok) {
        throw new Error(
          translateData.error ||
            "Орчуулгын үед алдаа гарлаа.",
        );
      }

      setTranslations(
        translateData.translations || [],
      );
    } catch (error) {
      console.error(error);

      setError(
        error instanceof Error
          ? error.message
          : "Зургийг боловсруулах үед алдаа гарлаа.",
      );
    } finally {
      setLoading(false);
    }
  }

  /*
   * Орчуулгыг засах
   */
  function updateTranslation(
    id: string,
    value: string,
  ) {
    setTranslations((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              translation: value,
            }
          : item,
      ),
    );
  }

  /*
   * Text wrapping
   */
  function wrapText(
    ctx: CanvasRenderingContext2D,
    text: string,
    maxWidth: number,
  ) {
    const words = text.split(/\s+/);
    const lines: string[] = [];

    let currentLine = "";

    for (const word of words) {
      const testLine = currentLine
        ? `${currentLine} ${word}`
        : word;

      const width = ctx.measureText(testLine).width;

      if (
        width > maxWidth &&
        currentLine
      ) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    return lines;
  }

  /*
   * Bubble дотор багтах font size олох
   */
  function getBestFontSize(
    ctx: CanvasRenderingContext2D,
    text: string,
    width: number,
    height: number,
  ) {
    const maxWidth = width * 0.82;
    const maxHeight = height * 0.82;

    let fontSize = Math.min(
      width * 0.12,
      height * 0.28,
      64,
    );

    fontSize = Math.max(fontSize, 14);

    while (fontSize >= 10) {
      ctx.font = `700 ${fontSize}px Arial`;

      const lines = wrapText(
        ctx,
        text,
        maxWidth,
      );

      const lineHeight =
        fontSize * 1.25;

      const totalHeight =
        lines.length * lineHeight;

      const widestLine = Math.max(
        ...lines.map((line) =>
          ctx.measureText(line).width,
        ),
        0,
      );

      if (
        widestLine <= maxWidth &&
        totalHeight <= maxHeight
      ) {
        return fontSize;
      }

      fontSize -= 1;
    }

    return 10;
  }

  /*
   * Монгол орчуулгыг зураг дээр байрлуулах
   */
  async function renderTranslatedImage() {
    if (!originalImage) return;

    if (translations.length === 0) {
      setError(
        "Эхлээд зурагт орчуулга үүсгэнэ үү.",
      );
      return;
    }

    setRendering(true);
    setError("");

    try {
      const img = new Image();

      img.src = originalImage;

      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () =>
          reject(
            new Error(
              "Зургийг ачаалж чадсангүй.",
            ),
          );
      });

      const canvas =
        document.createElement("canvas");

      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;

      const ctx = canvas.getContext("2d");

      if (!ctx) {
        throw new Error(
          "Canvas ажиллахгүй байна.",
        );
      }

      /*
       * Эх зургийг эхлээд зурна.
       */
      ctx.drawImage(img, 0, 0);

      /*
       * Text бүрийг render хийнэ.
       */
      originalTexts.forEach((item) => {
        /*
         * SFX болон narration-ийг одоохондоо
         * автоматаар дарахгүй.
         */
        if (
          item.type === "sfx" ||
          item.type === "narration"
        ) {
          return;
        }

        const translation =
          translations.find(
            (t) => t.id === item.id,
          );

        if (!translation) return;

        const text =
          translation.translation.trim();

        if (!text) return;

        /*
         * OCR box-ийн бага зэрэг padding.
         */
        const padding = Math.max(
          8,
          Math.round(
            Math.min(
              item.width,
              item.height,
            ) * 0.08,
          ),
        );

        /*
         * Одоохондоо цагаан background.
         *
         * Дараагийн шатанд үүнийг:
         *
         * bubble shape detection
         *
         * болгож солино.
         */
        ctx.fillStyle = "white";

        ctx.fillRect(
          item.x - padding,
          item.y - padding,
          item.width + padding * 2,
          item.height + padding * 2,
        );

        /*
         * Font size автоматаар сонгоно.
         */
        const fontSize =
          getBestFontSize(
            ctx,
            text,
            item.width,
            item.height,
          );

        ctx.font = `700 ${fontSize}px Arial`;

        ctx.fillStyle = "#111111";

        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        /*
         * Text wrap
         */
        const lines = wrapText(
          ctx,
          text,
          item.width * 0.82,
        );

        const lineHeight =
          fontSize * 1.25;

        const totalHeight =
          lines.length * lineHeight;

        const centerX =
          item.x + item.width / 2;

        const centerY =
          item.y + item.height / 2;

        let startY =
          centerY - totalHeight / 2;

        /*
         * Монгол текст зурна.
         */
        lines.forEach((line) => {
          ctx.fillText(
            line,
            centerX,
            startY + lineHeight / 2,
          );

          startY += lineHeight;
        });
      });

      /*
       * PNG болгон хувиргана.
       */
      const renderedImage =
        canvas.toDataURL(
          "image/png",
          1,
        );

      setImage(renderedImage);

      /*
       * OCR box-уудыг нуух.
       */
      setAnalysisTexts([]);
    } catch (error) {
      console.error(error);

      setError(
        error instanceof Error
          ? error.message
          : "Орчуулсан зураг үүсгэхэд алдаа гарлаа.",
      );
    } finally {
      setRendering(false);
    }
  }

  /*
   * PNG татах
   */
  function downloadImage() {
    if (!image) return;

    const link =
      document.createElement("a");

    link.href = image;
    link.download =
      "manhwa-translated.png";

    link.click();
  }

  /*
   * Шинээр эхлэх
   */
  function resetProject() {
    if (image?.startsWith("blob:")) {
      URL.revokeObjectURL(image);
    }

    setImage(null);
    setOriginalImage(null);
    setFile(null);

    setAnalysisTexts([]);
    setOriginalTexts([]);
    setTranslations([]);

    setError("");
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col items-center px-6 py-12">
        {/* HEADER */}

        <div className="mb-10 text-center">
          <h1 className="text-4xl font-bold tracking-tight">
            Manhwa AI Translator
          </h1>

          <p className="mt-3 text-zinc-400">
            Манхвагийн зургийг AI ашиглан
            Монгол хэл рүү орчуулах
          </p>
        </div>

        <div className="w-full max-w-3xl">
          {/* UPLOAD */}

          {!image ? (
            <label
              htmlFor="image-upload"
              className="flex min-h-[360px] cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed border-zinc-700 bg-zinc-900 p-8 transition hover:border-zinc-500 hover:bg-zinc-800"
            >
              <div className="mb-5 text-7xl">
                🖼️
              </div>

              <h2 className="text-2xl font-semibold">
                Манхвагийн зураг оруулах
              </h2>

              <p className="mt-3 text-sm text-zinc-400">
                JPG, PNG, WEBP зураг сонгоно уу
              </p>
            </label>
          ) : (
            <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-4">
              <canvas
                ref={canvasRef}
                className="mx-auto max-h-[700px] max-w-full rounded-xl object-contain"
              />
            </div>
          )}

          <input
            id="image-upload"
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            className="hidden"
          />

          {/* BUTTONS */}

          {image && (
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={analyzeImage}
                disabled={loading}
                className="rounded-xl bg-white px-6 py-3 font-semibold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading
                  ? "AI уншиж байна..."
                  : "🤖 AI-аар уншиж орчуулах"}
              </button>

              <label
                htmlFor="image-upload"
                className="cursor-pointer rounded-xl border border-zinc-700 bg-zinc-900 px-6 py-3 text-center font-semibold transition hover:bg-zinc-800"
              >
                🖼️ Өөр зураг сонгох
              </label>
            </div>
          )}

          {/* ERROR */}

          {error && (
            <div className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
              {error}
            </div>
          )}

          {/* OCR RESULTS */}

          {originalTexts.length > 0 && (
            <div className="mt-10">
              <div className="mb-5">
                <h2 className="text-2xl font-bold">
                  Орчуулга засах
                </h2>

                <p className="mt-1 text-sm text-zinc-500">
                  AI-ийн орчуулгыг хүссэнээрээ
                  өөрчилж болно.
                </p>
              </div>

              <div className="space-y-4">
                {originalTexts.map((original) => {
                  const translation =
                    translations.find(
                      (item) =>
                        item.id === original.id,
                    );

                  return (
                    <div
                      key={original.id}
                      className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5"
                    >
                      <div className="mb-4 flex items-center justify-between">
                        <span className="rounded-lg bg-zinc-800 px-2.5 py-1 text-xs font-bold text-zinc-300">
                          #{original.id}
                        </span>

                        <span className="text-xs text-zinc-600">
                          {original.type}
                        </span>
                      </div>

                      {/* ORIGINAL */}

                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                        Эх текст
                      </p>

                      <div className="rounded-xl bg-zinc-950 p-4 text-zinc-300">
                        {original.originalText}
                      </div>

                      {/* TRANSLATION */}

                      <p className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                        Монгол орчуулга
                      </p>

                      <textarea
                        value={
                          translation?.translation ||
                          ""
                        }
                        onChange={(event) =>
                          updateTranslation(
                            original.id,
                            event.target.value,
                          )
                        }
                        rows={3}
                        className="w-full resize-y rounded-xl border border-zinc-700 bg-zinc-950 p-4 text-lg leading-8 text-white outline-none transition focus:border-zinc-400"
                        placeholder="Монгол орчуулга..."
                      />
                    </div>
                  );
                })}
              </div>

              {/* RENDER */}

              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={
                    renderTranslatedImage
                  }
                  disabled={rendering}
                  className="rounded-xl bg-white px-6 py-4 font-bold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {rendering
                    ? "Зураг үүсгэж байна..."
                    : "🇲🇳 Орчуулсан зураг үүсгэх"}
                </button>

                {image &&
                  analysisTexts.length ===
                    0 && (
                    <button
                      type="button"
                      onClick={downloadImage}
                      className="rounded-xl border border-zinc-700 bg-zinc-900 px-6 py-4 font-bold transition hover:bg-zinc-800"
                    >
                      ⬇️ PNG татах
                    </button>
                  )}
              </div>

              {/* RESET */}

              <button
                type="button"
                onClick={resetProject}
                className="mt-3 w-full rounded-xl px-6 py-3 text-sm text-zinc-500 transition hover:bg-zinc-900 hover:text-white"
              >
                ↻ Шинээр эхлэх
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}