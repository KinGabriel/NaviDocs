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
        const viewport = page.getViewport({ scale: 1 });
        // Use parent size for scaling
        const parent = canvasRef.current?.parentElement;
        let width = 1, height = 1;
        if (parent) {
          width = parent.offsetWidth;
          height = parent.offsetHeight;
        }
        const scale = Math.min(width / viewport.width, height / viewport.height);
        const scaledViewport = page.getViewport({ scale });
        const canvas = canvasRef.current;
        const context = canvas.getContext("2d");
        canvas.width = scaledViewport.width;
        canvas.height = scaledViewport.height;
        await page.render({ canvasContext: context, viewport: scaledViewport }).promise;
      } catch (e) {
        // fallback
      }
    };
    if (url && canvasRef.current) render();
    return () => { cancelled = true; };
  }, [url]);

if (!url) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded-lg">
        <FileText className="w-10 h-10 text-gray-300" />
      </div>
    );
  }

  return (
  <div className="w-full h-full bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
    <canvas
      ref={canvasRef}
      style={{
        width: "100%",
        height: "100%",
        objectFit: "contain",
        display: "block",
        background: "transparent",
      }}
    />
  </div>
);
}
