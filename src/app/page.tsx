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
  const [file, setFile] = useState<File | null>(null);

  const [text, setText] = useState("");

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
  const [error, setError] = useState("");

  const canvasRef = useRef<HTMLCanvasElement>(null);

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

      // AI-ийн олсон text/bubble-ийн bounding box-уудыг зурна
      analysisTexts.forEach((item) => {
        ctx.strokeStyle = "red";
        ctx.lineWidth = 4;

        ctx.strokeRect(
          item.x,
          item.y,
          item.width,
          item.height,
        );

        // ID харуулах
        ctx.fillStyle = "red";
        ctx.font = "bold 24px Arial";

        ctx.fillText(
          item.id,
          item.x,
          Math.max(item.y - 8, 24),
        );
      });
    };

    img.src = image;
  }, [image, analysisTexts]);

  function handleImageChange(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const selectedFile = event.target.files?.[0];

    if (!selectedFile) return;

    setFile(selectedFile);

    setImage(URL.createObjectURL(selectedFile));

    setText("");

    setTranslations([]);

    setOriginalTexts([]);

    setAnalysisTexts([]);

    setError("");
  }

  async function analyzeImage() {
    if (!file) return;

    setLoading(true);

    setText("");

    setTranslations([]);

    setError("");

    try {
      // 1. Зургийг OCR API руу илгээх

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
        setText("Зураг дээр текст олдсонгүй.");
        return;
      }

      // OCR results

      setOriginalTexts(texts);

      setAnalysisTexts(texts);

      // 2. OCR-оос гарсан текстийг Монгол хэл рүү орчуулах

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

      // 3. Монгол орчуулгуудыг хадгалах

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

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col items-center px-6 py-16">
        {/* Header */}

        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold tracking-tight">
            Manhwa AI Translator
          </h1>

          <p className="mt-3 text-zinc-400">
            Манхвагийн зургийг AI ашиглан унших
          </p>
        </div>

        <div className="w-full max-w-2xl">
          {/* Image upload */}

          <label
            htmlFor="image-upload"
            className="flex min-h-[320px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-zinc-700 bg-zinc-900 p-8 transition hover:border-zinc-500 hover:bg-zinc-800"
          >
            {image ? (
              <canvas
                ref={canvasRef}
                className="max-h-[500px] max-w-full rounded-lg object-contain"
              />
            ) : (
              <>
                <div className="mb-4 text-6xl">
                  🖼️
                </div>

                <h2 className="text-xl font-semibold">
                  Манхвагийн зураг оруулах
                </h2>

                <p className="mt-2 text-sm text-zinc-400">
                  Энд дарж зураг сонгоно уу
                </p>
              </>
            )}
          </label>

          <input
            id="image-upload"
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            className="hidden"
          />

          {/* Analyze button */}

          {image && (
            <button
              type="button"
              onClick={analyzeImage}
              disabled={loading}
              className="mt-6 w-full rounded-xl bg-white px-6 py-3 font-semibold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading
                ? "AI уншиж байна..."
                : "Analyze Image"}
            </button>
          )}

          {/* Error */}

          {error && (
            <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-300">
              {error}
            </div>
          )}

          {/* Translations */}

          {translations.length > 0 && (
            <div className="mt-8 space-y-4">
              <h2 className="text-lg font-semibold">
                Орчуулга
              </h2>

              {translations.map((item) => {
                const original =
                  originalTexts.find(
                    (text) => text.id === item.id,
                  );

                return (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5"
                  >
                    <p className="text-sm text-zinc-500">
                      Эх текст
                    </p>

                    <p className="mt-1 whitespace-pre-wrap text-zinc-300">
                      {original?.originalText}
                    </p>

                    <div className="my-4 border-t border-zinc-800" />

                    <p className="text-sm text-zinc-500">
                      Монгол орчуулга
                    </p>

                    <p className="mt-1 whitespace-pre-wrap text-lg leading-8 text-white">
                      {item.translation}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}