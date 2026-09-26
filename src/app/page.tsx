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
  bubbleX?: number;
  bubbleY?: number;
  bubbleWidth?: number;
  bubbleHeight?: number;

  character?: string;
  personality?: string[];
  speechStyle?: string;
  emotion?: string;
  relationship?: string;
  confidence?: number;
};

type Translation = {
  id: string;
  translation: string;
};

type BubbleBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type BubbleDrag = {
  id: string;
  mode: "move" | "resize";
  startX: number;
  startY: number;
  bounds: BubbleBounds;
};

export default function Home() {
  const [image, setImage] = useState<string | null>(null);
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);

  const [analysisTexts, setAnalysisTexts] = useState<AnalysisText[]>([]);

  const [originalTexts, setOriginalTexts] = useState<AnalysisText[]>([]);

  const [translations, setTranslations] = useState<Translation[]>([]);

  const [sceneContext, setSceneContext] = useState("");

  const [loading, setLoading] = useState(false);
  const [rendering, setRendering] = useState(false);
  const [error, setError] = useState("");

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewImageRef = useRef<HTMLImageElement | null>(null);
  const bubbleDragRef = useRef<BubbleDrag | null>(null);

  function getBubbleBounds(
    item: AnalysisText,
    imageWidth: number,
    imageHeight: number,
  ): BubbleBounds {
    const hasBubbleBounds =
      Number.isFinite(item.bubbleX) &&
      Number.isFinite(item.bubbleY) &&
      Number.isFinite(item.bubbleWidth) &&
      Number.isFinite(item.bubbleHeight) &&
      (item.bubbleWidth ?? 0) > 0 &&
      (item.bubbleHeight ?? 0) > 0;
    const fallbackPaddingX = Math.max(12, item.width * 0.55);
    const fallbackPaddingY = Math.max(12, item.height * 0.55);
    const rawX = hasBubbleBounds ? item.bubbleX! : item.x - fallbackPaddingX;
    const rawY = hasBubbleBounds ? item.bubbleY! : item.y - fallbackPaddingY;
    const rawWidth = hasBubbleBounds
      ? item.bubbleWidth!
      : item.width + fallbackPaddingX * 2;
    const rawHeight = hasBubbleBounds
      ? item.bubbleHeight!
      : item.height + fallbackPaddingY * 2;
    const x = Math.max(0, Math.min(imageWidth - 1, rawX));
    const y = Math.max(0, Math.min(imageHeight - 1, rawY));

    return {
      x,
      y,
      width: Math.max(1, Math.min(imageWidth - x, rawWidth)),
      height: Math.max(1, Math.min(imageHeight - y, rawHeight)),
    };
  }

  function traceBubbleShape(
    ctx: CanvasRenderingContext2D,
    bounds: BubbleBounds,
    isThought: boolean,
  ) {
    ctx.beginPath();

    if (isThought) {
      ctx.ellipse(
        bounds.x + bounds.width / 2,
        bounds.y + bounds.height / 2,
        bounds.width / 2,
        bounds.height / 2,
        0,
        0,
        Math.PI * 2,
      );
      return;
    }

    const radius = Math.min(bounds.width, bounds.height) * 0.16;

    ctx.moveTo(bounds.x + radius, bounds.y);
    ctx.lineTo(bounds.x + bounds.width - radius, bounds.y);
    ctx.quadraticCurveTo(
      bounds.x + bounds.width,
      bounds.y,
      bounds.x + bounds.width,
      bounds.y + radius,
    );
    ctx.lineTo(bounds.x + bounds.width, bounds.y + bounds.height - radius);
    ctx.quadraticCurveTo(
      bounds.x + bounds.width,
      bounds.y + bounds.height,
      bounds.x + bounds.width - radius,
      bounds.y + bounds.height,
    );
    ctx.lineTo(bounds.x + radius, bounds.y + bounds.height);
    ctx.quadraticCurveTo(
      bounds.x,
      bounds.y + bounds.height,
      bounds.x,
      bounds.y + bounds.height - radius,
    );
    ctx.lineTo(bounds.x, bounds.y + radius);
    ctx.quadraticCurveTo(bounds.x, bounds.y, bounds.x + radius, bounds.y);
    ctx.closePath();
  }

  /*
   * OCR box-уудыг зураг дээр харуулах
   */
  useEffect(() => {
    if (!image) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const drawPreview = (img: HTMLImageElement) => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      if (canvas.width !== img.naturalWidth) canvas.width = img.naturalWidth;
      if (canvas.height !== img.naturalHeight)
        canvas.height = img.naturalHeight;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);

      analysisTexts.forEach((item) => {
        if (item.type !== "sfx" && item.type !== "narration") {
          const bounds = getBubbleBounds(item, canvas.width, canvas.height);
          const isThought = item.type.toLowerCase() === "thought";
          const handleSize = Math.max(12, Math.round(img.naturalWidth / 100));

          ctx.save();
          ctx.strokeStyle = "#22c55e";
          ctx.lineWidth = Math.max(2, Math.round(img.naturalWidth / 500));
          ctx.setLineDash([
            Math.max(6, handleSize / 2),
            Math.max(4, handleSize / 3),
          ]);
          traceBubbleShape(ctx, bounds, isThought);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.fillStyle = "#22c55e";
          ctx.fillRect(
            bounds.x + bounds.width - handleSize / 2,
            bounds.y + bounds.height - handleSize / 2,
            handleSize,
            handleSize,
          );
          ctx.restore();
        }

        ctx.strokeStyle = "#ef4444";
        ctx.lineWidth = Math.max(2, Math.round(img.naturalWidth / 600));
        ctx.strokeRect(item.x, item.y, item.width, item.height);

        const fontSize = Math.max(16, Math.round(img.naturalWidth / 35));
        ctx.fillStyle = "#ef4444";
        ctx.font = `bold ${fontSize}px Arial`;
        ctx.fillText(item.id, item.x, Math.max(item.y - 8, fontSize));
      });
    };

    const cachedImage = previewImageRef.current;

    if (cachedImage?.src === image && cachedImage.complete) {
      drawPreview(cachedImage);
      return;
    }

    const img = new Image();
    previewImageRef.current = img;
    img.onload = () => {
      if (previewImageRef.current === img) drawPreview(img);
    };
    img.src = image;
  }, [image, analysisTexts]);

  /*
   * Зураг сонгох
   */
  function handleImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0];

    if (!selectedFile) return;

    const imageUrl = URL.createObjectURL(selectedFile);

    setFile(selectedFile);

    setImage(imageUrl);
    setOriginalImage(imageUrl);

    setTranslations([]);
    setOriginalTexts([]);
    setAnalysisTexts([]);
    setSceneContext("");

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
    setSceneContext("");

    try {
      /*
       * 1. AI IMAGE ANALYSIS
       */

      const formData = new FormData();

      formData.append("image", file);

      const analyzeResponse = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      });

      const analyzeData = await analyzeResponse.json();

      if (!analyzeResponse.ok) {
        throw new Error(analyzeData.error || "Зургийг унших үед алдаа гарлаа.");
      }

      const texts = analyzeData.texts as AnalysisText[];

      const detectedSceneContext =
        typeof analyzeData.sceneContext === "string"
          ? analyzeData.sceneContext
          : "";

      if (!texts || !Array.isArray(texts) || texts.length === 0) {
        setError("Зураг дээр текст олдсонгүй.");

        return;
      }

      setOriginalTexts(texts);
      setAnalysisTexts(texts);
      setSceneContext(detectedSceneContext);

      /*
       * 2. CONTEXT-AWARE TRANSLATION
       */

      const translateResponse = await fetch("/api/translate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          texts,
          sceneContext: detectedSceneContext,
        }),
      });

      const translateData = await translateResponse.json();

      if (!translateResponse.ok) {
        throw new Error(translateData.error || "Орчуулгын үед алдаа гарлаа.");
      }

      setTranslations(translateData.translations || []);
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
  function updateTranslation(id: string, value: string) {
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

  function updateBubbleBounds(id: string, bounds: BubbleBounds) {
    const updateItem = (item: AnalysisText) =>
      item.id === id
        ? {
            ...item,
            bubbleX: bounds.x,
            bubbleY: bounds.y,
            bubbleWidth: bounds.width,
            bubbleHeight: bounds.height,
          }
        : item;

    setOriginalTexts((current) => current.map(updateItem));
    setAnalysisTexts((current) => current.map(updateItem));
  }

  function getCanvasPoint(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();

    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
      scale: canvas.width / rect.width,
    };
  }

  function handleBubblePointerDown(
    event: React.PointerEvent<HTMLCanvasElement>,
  ) {
    const point = getCanvasPoint(event);
    const canvas = canvasRef.current;
    if (!point || !canvas) return;

    const hitRadius = Math.max(10, point.scale * 10);
    const item = [...analysisTexts].reverse().find((candidate) => {
      if (candidate.type === "sfx" || candidate.type === "narration") {
        return false;
      }

      const bounds = getBubbleBounds(candidate, canvas.width, canvas.height);
      const inResizeHandle =
        Math.abs(point.x - (bounds.x + bounds.width)) <= hitRadius &&
        Math.abs(point.y - (bounds.y + bounds.height)) <= hitRadius;
      const insideBounds =
        point.x >= bounds.x &&
        point.x <= bounds.x + bounds.width &&
        point.y >= bounds.y &&
        point.y <= bounds.y + bounds.height;

      return inResizeHandle || insideBounds;
    });

    if (!item) return;

    const bounds = getBubbleBounds(item, canvas.width, canvas.height);
    const inResizeHandle =
      Math.abs(point.x - (bounds.x + bounds.width)) <= hitRadius &&
      Math.abs(point.y - (bounds.y + bounds.height)) <= hitRadius;

    bubbleDragRef.current = {
      id: item.id,
      mode: inResizeHandle ? "resize" : "move",
      startX: point.x,
      startY: point.y,
      bounds,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
  }

  function handleBubblePointerMove(
    event: React.PointerEvent<HTMLCanvasElement>,
  ) {
    const drag = bubbleDragRef.current;
    const point = getCanvasPoint(event);
    const canvas = canvasRef.current;
    if (!drag || !point || !canvas) return;

    const deltaX = point.x - drag.startX;
    const deltaY = point.y - drag.startY;

    if (drag.mode === "move") {
      updateBubbleBounds(drag.id, {
        ...drag.bounds,
        x: Math.max(
          0,
          Math.min(canvas.width - drag.bounds.width, drag.bounds.x + deltaX),
        ),
        y: Math.max(
          0,
          Math.min(canvas.height - drag.bounds.height, drag.bounds.y + deltaY),
        ),
      });
    } else {
      const item = analysisTexts.find((candidate) => candidate.id === drag.id);
      if (!item) return;

      updateBubbleBounds(drag.id, {
        ...drag.bounds,
        width: Math.max(
          item.width,
          Math.min(canvas.width - drag.bounds.x, drag.bounds.width + deltaX),
        ),
        height: Math.max(
          item.height,
          Math.min(canvas.height - drag.bounds.y, drag.bounds.height + deltaY),
        ),
      });
    }

    event.preventDefault();
  }

  function handleBubblePointerUp() {
    bubbleDragRef.current = null;
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
      if (ctx.measureText(word).width > maxWidth) {
        if (currentLine) {
          lines.push(currentLine);
          currentLine = "";
        }

        let chunk = "";

        for (const character of Array.from(word)) {
          const nextChunk = `${chunk}${character}`;

          if (ctx.measureText(nextChunk).width > maxWidth && chunk) {
            lines.push(chunk);
            chunk = character;
          } else {
            chunk = nextChunk;
          }
        }

        currentLine = chunk;
        continue;
      }

      const testLine = currentLine ? `${currentLine} ${word}` : word;

      const width = ctx.measureText(testLine).width;

      if (width > maxWidth && currentLine) {
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
    isThought: boolean,
  ) {
    const maxWidth = width * (isThought ? 0.68 : 0.8);
    const maxHeight = height * (isThought ? 0.7 : 0.78);

    let fontSize = Math.min(width * 0.12, height * 0.28, 64);

    fontSize = Math.max(fontSize, 8);

    while (fontSize >= 8) {
      ctx.font = `700 ${fontSize}px Arial`;

      const lines = wrapText(ctx, text, maxWidth);

      const lineHeight = fontSize * 1.25;

      const totalHeight = lines.length * lineHeight;

      const widestLine = Math.max(
        ...lines.map((line) => ctx.measureText(line).width),
        0,
      );

      if (widestLine <= maxWidth && totalHeight <= maxHeight) {
        return fontSize;
      }

      fontSize -= 1;
    }

    return 8;
  }

  /*
   * Bubble-ийн background өнгийг
   * OCR box-ийн эргэн тойрны
   * пикселүүдээс ойролцоолно.
   */
  function detectBackgroundColor(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    isThought: boolean,
    sampleOutsideText = false,
  ) {
    const samples: [number, number, number][] = [];
    const margin = Math.max(2, Math.min(width, height) * 0.2);
    const horizontalFractions = isThought
      ? [0.25, 0.5, 0.75]
      : [0.15, 0.5, 0.85];
    const verticalFractions = isThought ? [0.12, 0.5, 0.88] : [0.12, 0.5, 0.88];
    const points = sampleOutsideText
      ? horizontalFractions.flatMap((fraction) => [
          [x + width * fraction, y - margin],
          [x + width * fraction, y + height + margin],
          [x - margin, y + height * fraction],
          [x + width + margin, y + height * fraction],
        ])
      : [
          ...horizontalFractions.flatMap((fraction) => [
            [x + width * fraction, y + height * 0.12],
            [x + width * fraction, y + height * 0.88],
          ]),
          ...verticalFractions.flatMap((fraction) => [
            [x + width * 0.15, y + height * fraction],
            [x + width * 0.85, y + height * fraction],
          ]),
        ];
    const sampleLeft = Math.max(
      0,
      Math.floor(x - (sampleOutsideText ? margin : 0)),
    );
    const sampleTop = Math.max(
      0,
      Math.floor(y - (sampleOutsideText ? margin : 0)),
    );
    const sampleRight = Math.min(
      ctx.canvas.width - 1,
      Math.ceil(x + width + (sampleOutsideText ? margin : 0)),
    );
    const sampleBottom = Math.min(
      ctx.canvas.height - 1,
      Math.ceil(y + height + (sampleOutsideText ? margin : 0)),
    );
    const region = ctx.getImageData(
      sampleLeft,
      sampleTop,
      sampleRight - sampleLeft + 1,
      sampleBottom - sampleTop + 1,
    );

    for (const [px, py] of points) {
      const safeX = Math.max(0, Math.min(ctx.canvas.width - 1, Math.floor(px)));

      const safeY = Math.max(
        0,
        Math.min(ctx.canvas.height - 1, Math.floor(py)),
      );

      const pixelIndex =
        ((safeY - sampleTop) * region.width + safeX - sampleLeft) * 4;
      const pixel = region.data;

      if (pixel[pixelIndex + 3] < 128) continue;

      samples.push([
        pixel[pixelIndex],
        pixel[pixelIndex + 1],
        pixel[pixelIndex + 2],
      ]);
    }

    if (samples.length === 0) {
      return "rgb(255, 255, 255)";
    }

    const channels = [0, 1, 2].map((channel) =>
      samples.map((color) => color[channel]).sort((a, b) => a - b),
    );
    const median = (values: number[]) => values[Math.floor(values.length / 2)];

    const r = median(channels[0]);
    const g = median(channels[1]);
    const b = median(channels[2]);

    return `rgb(${r}, ${g}, ${b})`;
  }

  /*
   * Background өнгөнөөс
   * хар эсвэл цагаан text сонгоно.
   */
  function getTextColor(backgroundColor: string) {
    const match = backgroundColor.match(/\d+/g);

    if (!match || match.length < 3) {
      return "#111111";
    }

    const r = Number(match[0]);
    const g = Number(match[1]);
    const b = Number(match[2]);

    const linearize = (channel: number) => {
      const normalized = channel / 255;

      return normalized <= 0.04045
        ? normalized / 12.92
        : ((normalized + 0.055) / 1.055) ** 2.4;
    };
    const luminance =
      linearize(r) * 0.2126 + linearize(g) * 0.7152 + linearize(b) * 0.0722;

    return luminance > 0.179 ? "#111111" : "#ffffff";
  }

  /*
   * Монгол орчуулгыг зураг дээр байрлуулах
   */
  async function renderTranslatedImage() {
    if (!originalImage) return;

    if (translations.length === 0) {
      setError("Эхлээд зурагт орчуулга үүсгэнэ үү.");

      return;
    }

    setRendering(true);
    setError("");

    try {
      const img = new Image();

      img.src = originalImage;

      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();

        img.onerror = () => reject(new Error("Зургийг ачаалж чадсангүй."));
      });

      const canvas = document.createElement("canvas");

      canvas.width = img.naturalWidth;

      canvas.height = img.naturalHeight;

      const ctx = canvas.getContext("2d", { willReadFrequently: true });

      if (!ctx) {
        throw new Error("Canvas ажиллахгүй байна.");
      }

      /*
       * Эх зургийг зурна.
       */
      ctx.drawImage(img, 0, 0);

      originalTexts.forEach((item) => {
        if (item.type === "narration") return;

        const translation = translations.find((t) => t.id === item.id);

        if (!translation) return;

        const text = translation.translation.trim();

        if (!text) return;

        const isSfx = item.type.toLowerCase() === "sfx";
        const isThought = item.type.toLowerCase() === "thought";
        const sfxPadding = Math.max(
          2,
          Math.round(Math.min(item.width, item.height) * 0.12),
        );
        const sfxX = Math.max(0, item.x - sfxPadding);
        const sfxY = Math.max(0, item.y - sfxPadding);
        const bubbleBounds = isSfx
          ? {
              x: sfxX,
              y: sfxY,
              width: Math.min(canvas.width - sfxX, item.width + sfxPadding * 2),
              height: Math.min(
                canvas.height - sfxY,
                item.height + sfxPadding * 2,
              ),
            }
          : getBubbleBounds(item, canvas.width, canvas.height);
        const {
          x: bubbleX,
          y: bubbleY,
          width: bubbleWidth,
          height: bubbleHeight,
        } = bubbleBounds;

        /*
         * Bubble-ийн background
         * өнгийг автоматаар авна.
         */
        const backgroundColor = detectBackgroundColor(
          ctx,
          isSfx ? item.x : bubbleX,
          isSfx ? item.y : bubbleY,
          isSfx ? item.width : bubbleWidth,
          isSfx ? item.height : bubbleHeight,
          isThought,
          isSfx,
        );

        ctx.fillStyle = backgroundColor;
        if (isSfx) {
          ctx.fillRect(bubbleX, bubbleY, bubbleWidth, bubbleHeight);
        } else {
          traceBubbleShape(ctx, bubbleBounds, isThought);
          ctx.fill();
        }

        /*
         * Font size
         */
        const fontSize = getBestFontSize(
          ctx,
          text,
          bubbleWidth,
          bubbleHeight,
          isThought,
        );

        ctx.font = isSfx
          ? `italic 700 ${fontSize}px Arial`
          : `700 ${fontSize}px Arial`;

        /*
         * Background-аас text color
         * автоматаар сонгоно.
         */
        ctx.fillStyle = getTextColor(backgroundColor);

        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        /*
         * Text wrap
         */
        const lines = wrapText(
          ctx,
          text,
          bubbleWidth * (isThought ? 0.68 : 0.8),
        );

        const lineHeight = fontSize * 1.25;

        const totalHeight = lines.length * lineHeight;

        const centerX = bubbleX + bubbleWidth / 2;

        const centerY = bubbleY + bubbleHeight / 2;

        let startY = centerY - totalHeight / 2;

        /*
         * Монгол текст зурна.
         */
        ctx.save();
        if (isSfx) {
          ctx.beginPath();
          ctx.rect(bubbleX, bubbleY, bubbleWidth, bubbleHeight);
          ctx.clip();
        } else {
          traceBubbleShape(ctx, bubbleBounds, isThought);
          ctx.clip();
        }

        lines.forEach((line) => {
          ctx.fillText(line, centerX, startY + lineHeight / 2);

          startY += lineHeight;
        });

        ctx.restore();
      });

      /*
       * PNG болгоно.
       */
      const renderedImage = canvas.toDataURL("image/png", 1);

      setImage(renderedImage);

      /*
       * OCR box-уудыг нуух
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

    const link = document.createElement("a");

    link.href = image;

    link.download = "manhwa-translated.png";

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

    setSceneContext("");

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
            Манхвагийн зургийг AI ашиглан Монгол хэл рүү орчуулах
          </p>
        </div>

        <div className="w-full max-w-3xl">
          {/* UPLOAD */}

          {!image ? (
            <label
              htmlFor="image-upload"
              className="flex min-h-[360px] cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed border-zinc-700 bg-zinc-900 p-8 transition hover:border-zinc-500 hover:bg-zinc-800"
            >
              <div className="mb-5 text-7xl">🖼️</div>

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
                onPointerDown={handleBubblePointerDown}
                onPointerMove={handleBubblePointerMove}
                onPointerUp={handleBubblePointerUp}
                onPointerCancel={handleBubblePointerUp}
                title="Ногоон bubble хүрээг чирж байрлуулж, буланг чирж хэмжээг нь өөрчилнө"
                className="mx-auto max-h-[700px] max-w-full touch-none rounded-xl object-contain"
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
                {loading ? "AI уншиж байна..." : "🤖 AI-аар уншиж орчуулах"}
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

          {/* SCENE CONTEXT */}

          {sceneContext && (
            <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                AI-ийн ойлгосон scene
              </p>

              <p className="leading-7 text-zinc-300">{sceneContext}</p>
            </div>
          )}

          {/* OCR RESULTS */}

          {originalTexts.length > 0 && (
            <div className="mt-10">
              <div className="mb-5">
                <h2 className="text-2xl font-bold">Орчуулга засах</h2>

                <p className="mt-1 text-sm text-zinc-500">
                  AI-ийн орчуулгыг хүссэнээрээ өөрчилж болно.
                </p>
              </div>

              <div className="space-y-4">
                {originalTexts.map((original) => {
                  const translation = translations.find(
                    (item) => item.id === original.id,
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

                      {/* CHARACTER INFO */}

                      {(original.character ||
                        original.emotion ||
                        original.relationship) && (
                        <div className="mb-5 grid gap-2 sm:grid-cols-2">
                          {original.character &&
                            original.character !== "unknown" && (
                              <div className="rounded-lg bg-zinc-950 px-3 py-2">
                                <span className="text-xs text-zinc-600">
                                  Дүр
                                </span>

                                <p className="text-sm text-zinc-300">
                                  {original.character}
                                </p>
                              </div>
                            )}

                          {original.emotion && (
                            <div className="rounded-lg bg-zinc-950 px-3 py-2">
                              <span className="text-xs text-zinc-600">
                                Сэтгэл хөдлөл
                              </span>

                              <p className="text-sm text-zinc-300">
                                {original.emotion}
                              </p>
                            </div>
                          )}

                          {original.relationship &&
                            original.relationship !== "unknown" && (
                              <div className="rounded-lg bg-zinc-950 px-3 py-2">
                                <span className="text-xs text-zinc-600">
                                  Харилцаа
                                </span>

                                <p className="text-sm text-zinc-300">
                                  {original.relationship}
                                </p>
                              </div>
                            )}

                          {original.speechStyle &&
                            original.speechStyle !== "unknown" && (
                              <div className="rounded-lg bg-zinc-950 px-3 py-2">
                                <span className="text-xs text-zinc-600">
                                  Ярианы хэв маяг
                                </span>

                                <p className="text-sm text-zinc-300">
                                  {original.speechStyle}
                                </p>
                              </div>
                            )}
                        </div>
                      )}

                      {/* PERSONALITY */}

                      {original.personality &&
                        original.personality.length > 0 && (
                          <div className="mb-5">
                            <span className="text-xs text-zinc-600">
                              Personality
                            </span>

                            <div className="mt-2 flex flex-wrap gap-2">
                              {original.personality.map((trait) => (
                                <span
                                  key={trait}
                                  className="rounded-full bg-zinc-800 px-3 py-1 text-xs text-zinc-400"
                                >
                                  {trait}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

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
                        value={translation?.translation || ""}
                        onChange={(event) =>
                          updateTranslation(original.id, event.target.value)
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
                  onClick={renderTranslatedImage}
                  disabled={rendering}
                  className="rounded-xl bg-white px-6 py-4 font-bold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {rendering
                    ? "Зураг үүсгэж байна..."
                    : "🇲🇳 Орчуулсан зураг үүсгэх"}
                </button>

                {image && analysisTexts.length === 0 && (
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
