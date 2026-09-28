"use client";

import { useCallback, useEffect, useRef, useState } from "react";

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
  bubbleShape?: "rounded" | "ellipse" | "rectangle" | "none";
  bubbleBackground?: "solid" | "transparent" | "none";
  bubbleConfidence?: number;

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

type BubbleShape = NonNullable<AnalysisText["bubbleShape"]>;

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
  const [activeProvider, setActiveProvider] = useState("");

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewImageRef = useRef<HTMLImageElement | null>(null);
  const bubbleDragRef = useRef<BubbleDrag | null>(null);

  const getBubbleShape = useCallback((item: AnalysisText): BubbleShape => {
    if (item.bubbleShape) return item.bubbleShape;
    if (item.type.toLowerCase() === "thought") return "ellipse";
    if (item.type.toLowerCase() === "narration") return "rectangle";
    return "rounded";
  }, []);

  const getBubbleBounds = useCallback(
    (
      item: AnalysisText,
      imageWidth: number,
      imageHeight: number,
    ): BubbleBounds => {
      const isBackgroundless = getBubbleShape(item) === "none";
      const hasBubbleBounds =
        Number.isFinite(item.bubbleX) &&
        Number.isFinite(item.bubbleY) &&
        Number.isFinite(item.bubbleWidth) &&
        Number.isFinite(item.bubbleHeight) &&
        (item.bubbleWidth ?? 0) > 0 &&
        (item.bubbleHeight ?? 0) > 0;
      const fallbackPaddingX = Math.max(12, item.width * 0.55);
      const fallbackPaddingY = Math.max(12, item.height * 0.55);
      const rawX = hasBubbleBounds
        ? item.bubbleX!
        : isBackgroundless
          ? item.x
          : item.x - fallbackPaddingX;
      const rawY = hasBubbleBounds
        ? item.bubbleY!
        : isBackgroundless
          ? item.y
          : item.y - fallbackPaddingY;
      const rawWidth = hasBubbleBounds
        ? item.bubbleWidth!
        : isBackgroundless
          ? item.width
          : item.width + fallbackPaddingX * 2;
      const rawHeight = hasBubbleBounds
        ? item.bubbleHeight!
        : isBackgroundless
          ? item.height
          : item.height + fallbackPaddingY * 2;
      const x = Math.max(0, Math.min(imageWidth - 1, rawX));
      const y = Math.max(0, Math.min(imageHeight - 1, rawY));

      return {
        x,
        y,
        width: Math.max(1, Math.min(imageWidth - x, rawWidth)),
        height: Math.max(1, Math.min(imageHeight - y, rawHeight)),
      };
    },
    [getBubbleShape],
  );

  const traceBubbleShape = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      bounds: BubbleBounds,
      shape: BubbleShape,
    ) => {
      ctx.beginPath();

      if (shape === "ellipse") {
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

      if (shape === "rectangle" || shape === "none") {
        ctx.rect(bounds.x, bounds.y, bounds.width, bounds.height);
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
    },
    [],
  );

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
        const bounds = getBubbleBounds(item, canvas.width, canvas.height);
        const shape = getBubbleShape(item);
        const handleSize = Math.max(12, Math.round(img.naturalWidth / 100));

        ctx.save();
        ctx.strokeStyle =
          item.bubbleConfidence !== undefined && item.bubbleConfidence < 0.55
            ? "#f59e0b"
            : "#22c55e";
        ctx.lineWidth = Math.max(2, Math.round(img.naturalWidth / 500));
        ctx.setLineDash([
          Math.max(6, handleSize / 2),
          Math.max(4, handleSize / 3),
        ]);
        traceBubbleShape(ctx, bounds, shape);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = ctx.strokeStyle;
        ctx.fillRect(
          bounds.x + bounds.width - handleSize / 2,
          bounds.y + bounds.height - handleSize / 2,
          handleSize,
          handleSize,
        );
        ctx.restore();

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
  }, [image, analysisTexts, getBubbleBounds, getBubbleShape, traceBubbleShape]);

  /*
   * Зураг сонгох
   */
  function handleImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0];

    if (!selectedFile) return;

    if (!selectedFile.type.startsWith("image/")) {
      setError("Зөвхөн зураг файл сонгоно уу.");
      return;
    }

    if (selectedFile.size > 20 * 1024 * 1024) {
      setError("Зураг 20MB-аас бага хэмжээтэй байх ёстой.");
      return;
    }

    const imageUrl = URL.createObjectURL(selectedFile);

    setFile(selectedFile);

    setImage(imageUrl);
    setOriginalImage(imageUrl);

    setTranslations([]);
    setOriginalTexts([]);
    setAnalysisTexts([]);
    setSceneContext("");
    setActiveProvider("");

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

      setActiveProvider(analyzeResponse.headers.get("X-AI-Provider") || "");

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

      setActiveProvider(translateResponse.headers.get("X-AI-Provider") || "");

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

  function eraseTextRegionWithInterpolation(
    ctx: CanvasRenderingContext2D,
    bounds: BubbleBounds,
  ) {
    const margin = Math.min(
      10,
      Math.max(2, Math.round(Math.min(bounds.width, bounds.height) * 0.12)),
    );
    const left = Math.max(0, Math.floor(bounds.x));
    const top = Math.max(0, Math.floor(bounds.y));
    const right = Math.min(
      ctx.canvas.width,
      Math.ceil(bounds.x + bounds.width),
    );
    const bottom = Math.min(
      ctx.canvas.height,
      Math.ceil(bounds.y + bounds.height),
    );
    const regionLeft = Math.max(0, left - margin);
    const regionTop = Math.max(0, top - margin);
    const regionRight = Math.min(ctx.canvas.width, right + margin);
    const regionBottom = Math.min(ctx.canvas.height, bottom + margin);
    const region = ctx.getImageData(
      regionLeft,
      regionTop,
      regionRight - regionLeft,
      regionBottom - regionTop,
    );
    const regionWidth = region.width;
    const pixelAt = (x: number, y: number) => {
      const index = (y * regionWidth + x) * 4;
      return [
        region.data[index],
        region.data[index + 1],
        region.data[index + 2],
        region.data[index + 3],
      ];
    };

    for (let y = top; y < bottom; y += 1) {
      const localY = y - regionTop;
      const verticalRatio = (y - top + 0.5) / Math.max(1, bottom - top);
      const leftColor = pixelAt(Math.max(0, left - regionLeft - 1), localY);
      const rightColor = pixelAt(
        Math.min(regionWidth - 1, right - regionLeft),
        localY,
      );

      for (let x = left; x < right; x += 1) {
        const localX = x - regionLeft;
        const horizontalRatio = (x - left + 0.5) / Math.max(1, right - left);
        const topColor = pixelAt(localX, Math.max(0, top - regionTop - 1));
        const bottomColor = pixelAt(
          localX,
          Math.min(region.height - 1, bottom - regionTop),
        );
        const index = (localY * regionWidth + localX) * 4;

        for (let channel = 0; channel < 4; channel += 1) {
          const horizontal =
            leftColor[channel] * (1 - horizontalRatio) +
            rightColor[channel] * horizontalRatio;
          const vertical =
            topColor[channel] * (1 - verticalRatio) +
            bottomColor[channel] * verticalRatio;

          region.data[index + channel] = Math.round(
            (horizontal + vertical) / 2,
          );
        }
      }
    }

    ctx.putImageData(region, regionLeft, regionTop);
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
        const translation = translations.find((t) => t.id === item.id);

        if (!translation) return;

        const text = translation.translation.trim();

        if (!text) return;

        const isSfx = item.type.toLowerCase() === "sfx";
        const isThought = item.type.toLowerCase() === "thought";
        const shape = getBubbleShape(item);
        const background = item.bubbleBackground ?? "solid";
        const hasFill = background === "solid" && shape !== "none";
        const bubbleBounds = getBubbleBounds(item, canvas.width, canvas.height);
        const {
          x: bubbleX,
          y: bubbleY,
          width: bubbleWidth,
          height: bubbleHeight,
        } = bubbleBounds;
        const textBounds = {
          x: item.x,
          y: item.y,
          width: item.width,
          height: item.height,
        };

        /*
         * Bubble-ийн background
         * өнгийг автоматаар авна.
         */
        const backgroundColor = detectBackgroundColor(
          ctx,
          hasFill ? bubbleX : item.x,
          hasFill ? bubbleY : item.y,
          hasFill ? bubbleWidth : item.width,
          hasFill ? bubbleHeight : item.height,
          isThought,
          !hasFill,
        );

        ctx.fillStyle = backgroundColor;
        if (hasFill) {
          traceBubbleShape(ctx, bubbleBounds, shape);
          ctx.fill();
        } else {
          eraseTextRegionWithInterpolation(ctx, textBounds);
        }

        const textBoundsForLayout =
          shape === "none" ? textBounds : bubbleBounds;
        const layoutWidth = textBoundsForLayout.width;
        const layoutHeight = textBoundsForLayout.height;
        const fontSize = getBestFontSize(
          ctx,
          text,
          layoutWidth,
          layoutHeight,
          isThought,
        );
        ctx.font = isSfx
          ? `italic 700 ${fontSize}px Arial`
          : `700 ${fontSize}px Arial`;

        const textColor = getTextColor(backgroundColor);
        const outlineColor = textColor === "#111111" ? "#ffffff" : "#111111";
        ctx.fillStyle = textColor;
        ctx.strokeStyle = outlineColor;
        ctx.lineWidth = hasFill ? 0 : Math.max(1, fontSize * 0.12);
        ctx.lineJoin = "round";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        const lines = wrapText(
          ctx,
          text,
          layoutWidth * (isThought ? 0.68 : 0.84),
        );
        const lineHeight = fontSize * 1.25;
        const totalHeight = lines.length * lineHeight;
        const centerX = textBoundsForLayout.x + layoutWidth / 2;
        const centerY = textBoundsForLayout.y + layoutHeight / 2;
        let startY = centerY - totalHeight / 2;

        ctx.save();
        if (shape !== "none") {
          traceBubbleShape(ctx, bubbleBounds, shape);
          ctx.clip();
        }

        lines.forEach((line) => {
          const lineY = startY + lineHeight / 2;

          if (!hasFill) ctx.strokeText(line, centerX, lineY);
          ctx.fillText(line, centerX, lineY);
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
       * Bubble/text box-уудыг хадгална.
       * Ингэснээр хэрэглэгч render хийсний дараа
       * green box-ийг чирж дахин байрлуулж чадна.
       */
      setAnalysisTexts(originalTexts);
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
    setActiveProvider("");

    setError("");
  }

  const isAnalyzed = originalTexts.length > 0;
  const isRendered = image?.startsWith("data:image/") ?? false;

  return (
    <main className="min-h-screen text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-5 sm:px-8 sm:py-10">
        <header className="mb-8 flex flex-col gap-6 border-b border-white/10 pb-7 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-4 flex items-center gap-3 text-xs font-bold uppercase tracking-[0.22em] text-lime-300">
              <span className="h-2 w-2 rounded-full bg-lime-300 shadow-[0_0_18px_rgba(215,255,101,0.9)]" />
              Panel to page
            </div>
            <h1 className="max-w-2xl text-4xl font-black tracking-[-0.04em] text-white sm:text-6xl">
              Manhwa AI
              <span className="block text-zinc-500">Translator.</span>
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-6 text-zinc-400 sm:text-base">
              Манхвагийн dialogue-г уншаад, дүрийн өнгө аясыг хадгалсан Монгол
              орчуулгыг bubble дээр нь буцааж байрлуулна.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 self-start sm:self-auto">
            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-zinc-400">
              <span
                className={`h-2 w-2 rounded-full ${isAnalyzed ? "bg-lime-300" : "bg-zinc-600"}`}
              />
              {activeProvider ? `${activeProvider} provider` : "AI ready"}
            </div>
            <a href="/account" className="rounded-full border border-white/10 px-3 py-2 text-xs text-zinc-300 hover:bg-white/10">Бүртгэл</a>
          </div>
        </header>

        <div className="mb-7 grid grid-cols-3 gap-1 sm:max-w-xl sm:gap-2">
          {["Upload", "Understand", "Export"].map((step, index) => {
            const complete =
              index === 0
                ? Boolean(file)
                : index === 1
                  ? isAnalyzed
                  : isRendered;
            return (
              <div
                key={step}
                className="flex items-center gap-1 text-[11px] text-zinc-500 sm:gap-2 sm:text-xs"
              >
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-full border text-[11px] font-bold ${complete ? "border-lime-300 bg-lime-300 text-black" : "border-white/15 bg-white/[0.04]"}`}
                >
                  {complete ? "✓" : index + 1}
                </span>
                <span className={complete ? "text-zinc-200" : ""}>{step}</span>
              </div>
            );
          })}
        </div>

        <div className="w-full">
          {/* UPLOAD */}

          {!image ? (
            <label
              htmlFor="image-upload"
              className="group relative flex min-h-[320px] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-[2rem] border border-dashed border-white/15 bg-white/[0.045] p-6 text-center shadow-2xl shadow-black/20 transition hover:border-lime-300/60 hover:bg-white/[0.07] sm:min-h-[380px] sm:p-8"
            >
              <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl border border-lime-300/30 bg-lime-300/10 text-4xl transition group-hover:scale-105">
                ✦
              </div>

              <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
                Зургаа энд оруул
              </h2>

              <p className="mt-3 max-w-sm text-sm leading-6 text-zinc-500">
                JPG, PNG, WEBP · 20MB хүртэл. Нэг panel upload хийгээд AI-гаар
                уншуулна.
              </p>
              <span className="mt-7 rounded-full bg-lime-300 px-5 py-2.5 text-sm font-bold text-black">
                Choose image
              </span>
            </label>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/25 p-2 shadow-2xl shadow-black/30 sm:rounded-[2rem] sm:p-5">
              <canvas
                ref={canvasRef}
                onPointerDown={handleBubblePointerDown}
                onPointerMove={handleBubblePointerMove}
                onPointerUp={handleBubblePointerUp}
                onPointerCancel={handleBubblePointerUp}
                title="Ногоон bubble хүрээг чирж байрлуулж, буланг чирж хэмжээг нь өөрчилнө"
                className="mx-auto max-h-[76svh] max-w-full touch-none rounded-xl object-contain sm:max-h-[760px] sm:rounded-2xl"
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
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={analyzeImage}
                disabled={loading}
                className="flex-1 rounded-2xl bg-lime-300 px-6 py-3.5 font-bold text-black shadow-[0_12px_30px_rgba(215,255,101,0.12)] transition hover:bg-lime-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading
                  ? "AI уншиж байна..."
                  : isAnalyzed
                    ? "↻ Дахин AI-аар уншуулах"
                    : "✦ AI-аар уншуулж эхлэх"}
              </button>

              <label
                htmlFor="image-upload"
                className="cursor-pointer rounded-2xl border border-white/10 bg-white/[0.05] px-6 py-3.5 text-center font-bold text-zinc-200 transition hover:bg-white/[0.1]"
              >
                Өөр зураг сонгох
              </label>
            </div>
          )}

          {/* ERROR */}

          {error && (
            <div className="mt-5 flex items-start gap-3 rounded-2xl border border-red-400/25 bg-red-400/10 p-4 text-sm leading-6 text-red-200">
              <span className="mt-0.5 text-red-300">!</span>
              {error}
            </div>
          )}

          {/* SCENE CONTEXT */}

          {sceneContext && (
            <div className="mt-8 rounded-[1.75rem] border border-white/10 bg-white/[0.045] p-4 sm:p-6">
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-lime-300">
                Scene note
              </p>

              <p className="max-w-3xl text-sm leading-7 text-zinc-300">
                {sceneContext}
              </p>
            </div>
          )}

          {/* OCR RESULTS */}

          {originalTexts.length > 0 && (
            <div className="mt-12">
              <div className="mb-6 flex flex-col gap-3 border-b border-white/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-lime-300">
                    Translation desk
                  </p>
                  <h2 className="text-3xl font-black tracking-tight">
                    Орчуулгаа өнгөлөх
                  </h2>

                  <p className="mt-2 text-sm text-zinc-500">
                    AI-ийн орчуулгыг хүссэнээрээ өөрчилж болно.
                  </p>
                </div>
                <span className="text-sm text-zinc-500">
                  {originalTexts.length} text layer
                </span>
              </div>

              <div className="space-y-4">
                {originalTexts.map((original) => {
                  const translation = translations.find(
                    (item) => item.id === original.id,
                  );

                  return (
                    <div
                      key={original.id}
                      className="rounded-[1.5rem] border border-white/10 bg-white/[0.045] p-4 shadow-xl shadow-black/10 transition hover:border-white/20 sm:p-5"
                    >
                      <div className="mb-4 flex items-center justify-between">
                        <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs font-bold text-lime-200">
                          #{original.id}
                        </span>

                        <span className="rounded-full bg-white/[0.06] px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-zinc-500">
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
                              <div className="break-words rounded-lg bg-zinc-950 px-3 py-2">
                                <span className="text-xs text-zinc-600">
                                  Дүр
                                </span>

                                <p className="text-sm text-zinc-300">
                                  {original.character}
                                </p>
                              </div>
                            )}

                          {original.emotion && (
                            <div className="break-words rounded-lg bg-zinc-950 px-3 py-2">
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
                              <div className="break-words rounded-lg bg-zinc-950 px-3 py-2">
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
                              <div className="break-words rounded-lg bg-zinc-950 px-3 py-2">
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

                      <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">
                        Эх текст
                      </p>

                      <div className="break-words rounded-2xl border border-white/5 bg-black/25 p-4 text-sm leading-7 text-zinc-300">
                        {original.originalText}
                      </div>

                      {/* TRANSLATION */}

                      <p className="mb-2 mt-5 text-xs font-bold uppercase tracking-[0.16em] text-lime-300/80">
                        Монгол орчуулга
                      </p>

                      <textarea
                        value={translation?.translation || ""}
                        onChange={(event) =>
                          updateTranslation(original.id, event.target.value)
                        }
                        rows={3}
                        className="w-full resize-y rounded-2xl border border-white/15 bg-black/30 p-3 text-base leading-7 text-white outline-none transition placeholder:text-zinc-600 focus:border-lime-300/70 focus:ring-4 focus:ring-lime-300/10 sm:p-4 sm:text-lg sm:leading-8"
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
                  className="rounded-2xl bg-lime-300 px-6 py-4 font-bold text-black transition hover:bg-lime-200 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {rendering
                    ? "Зураг үүсгэж байна..."
                    : isRendered
                      ? "↻ Дахин render хийх"
                      : "↓ Орчуулсан зураг үүсгэх"}
                </button>

                {image && originalTexts.length > 0 && (
                  <button
                    type="button"
                    onClick={downloadImage}
                    className="rounded-2xl border border-white/10 bg-white/[0.05] px-6 py-4 font-bold text-zinc-200 transition hover:bg-white/[0.1]"
                  >
                    ⬇️ PNG татах
                  </button>
                )}
              </div>

              {/* RESET */}

              <button
                type="button"
                onClick={resetProject}
                className="mt-4 w-full rounded-2xl border border-transparent px-6 py-3 text-sm text-zinc-500 transition hover:border-white/10 hover:bg-white/[0.04] hover:text-white"
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
