import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { RotateCw } from "lucide-react";

export default function ImageOptionsPanel({ editor }) {
  if (!editor) return null;

  const attrs = editor.getAttributes("image") || {};
  const { width = "100%", height = "auto", alt = "", wrap = "inline", rotation = 0 } = attrs;

  const updateAttr = (key, value) => {
    editor.chain().focus().updateAttributes("image", { [key]: value }).run();
  };

  return (
    <div className="w-80 h-full bg-white shadow-md border-l p-4 flex flex-col gap-6 overflow-y-auto">
      <h2 className="text-lg font-semibold">Image Options</h2>

      {/* Size & Rotation */}
      <section>
        <h3 className="text-sm font-medium mb-2">Size & Rotation</h3>
        <Label>Width (%)</Label>
        <Slider defaultValue={[parseInt(width) || 100]} max={200} step={5} onValueChange={([v]) => updateAttr("width", `${v}%`)} />
        <Label>Rotation (deg)</Label>
        <Slider defaultValue={[rotation]} max={360} step={5} onValueChange={([v]) => updateAttr("rotation", v)} />
      </section>

      {/* Crop */}
      <section>
        <h3 className="text-sm font-medium mb-2">Crop & Reset</h3>
        <Button size="sm" variant="outline" onClick={() => console.log("Open crop mode")}>
          <RotateCw size={14} className="mr-1" /> Crop
        </Button>
        <Button size="sm" variant="ghost" onClick={() => updateAttr("crop", null)}>Reset</Button>
      </section>

      {/* Wrapping */}
      <section>
        <h3 className="text-sm font-medium mb-2">Text Wrapping</h3>
        <div className="flex gap-2">
          {["inline", "square", "tight", "break"].map(mode => (
            <Button key={mode} size="sm" variant={wrap === mode ? "default" : "outline"} onClick={() => updateAttr("wrap", mode)}>
              {mode}
            </Button>
          ))}
        </div>
      </section>

      {/* Alt Text */}
      <section>
        <h3 className="text-sm font-medium mb-2">Accessibility</h3>
        <Label htmlFor="alt">Alt text</Label>
        <Input id="alt" value={alt} onChange={(e) => updateAttr("alt", e.target.value)} />
      </section>
    </div>
  );
}
