import React, { useEffect, useRef } from "react";
import * as pdfjsLib from "pdfjs-dist/build/pdf";
import PdfWorker from "pdfjs-dist/build/pdf.worker?worker";
import { FileText } from "lucide-react";

// Attach worker
pdfjsLib.GlobalWorkerOptions.workerPort = new PdfWorker();

export default function PdfThumbnail({ url }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    const render = async () => {
      try {
        const loadingTask = pdfjsLib.getDocument(url);
        const pdf = await loadingTask.promise;
        const page = await pdf.getPage(1);

        // Render with natural aspect ratio 
        const viewport = page.getViewport({ scale: 1 });
        const scale = 1.5; // sharper preview 
        const scaledViewport = page.getViewport({ scale });

        const canvas = canvasRef.current;
        const context = canvas.getContext("2d");

        // pixel ratio for sharpness 
        const dpr = window.devicePixelRatio || 1;
        canvas.width = scaledViewport.width * dpr;
        canvas.height = scaledViewport.height * dpr;
        context.setTransform(dpr, 0, 0, dpr, 0, 0);

        // Render PDF page into canvas
        await page.render({ canvasContext: context, viewport: scaledViewport }).promise;
      } catch (e) {
        console.error("PDF render error:", e);
      }
    };

    if (url && canvasRef.current) render();
    return () => {
      cancelled = true;
    };
  }, [url]);

  if (!url) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded-lg">
        <FileText className="w-10 h-10 text-gray-300" />
      </div>
    );
  }

  return (
    <div className="w-full h-full flex items-center justify-center bg-gray-100 overflow-hidden">
      <canvas
        ref={canvasRef}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: "center",
          display: "block",
        }}
      />
    </div>
  );
}