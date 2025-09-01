import React from "react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { AlignLeft, AlignCenter, AlignRight, Replace, Image as ImageIcon, Move } from "lucide-react";

export default function InlineImageToolbar({ editor }) {
  if (!editor) return null;

  const setAlign = (value) => {
    editor.chain().focus().updateAttributes("image", { align: value }).run();
  };

  const setWrap = (value) => {
    editor.chain().focus().updateAttributes("image", { wrap: value }).run();
  };

  const quickResize = (percent) => {
    const { node } = editor.state.selection;
    if (!node) return;
    editor.chain().focus().updateAttributes("image", { width: `${percent}%` }).run();
  };

  return (
    <div className="absolute z-50 bg-white shadow-md border rounded-lg p-2 flex gap-1">
      <Button size="icon" variant="ghost" onClick={() => setAlign("left")}><AlignLeft size={16} /></Button>
      <Button size="icon" variant="ghost" onClick={() => setAlign("center")}><AlignCenter size={16} /></Button>
      <Button size="icon" variant="ghost" onClick={() => setAlign("right")}><AlignRight size={16} /></Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="icon" variant="ghost"><Move size={16} /></Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={() => setWrap("inline")}>Inline</DropdownMenuItem>
          <DropdownMenuItem onClick={() => setWrap("square")}>Square</DropdownMenuItem>
          <DropdownMenuItem onClick={() => setWrap("tight")}>Tight</DropdownMenuItem>
          <DropdownMenuItem onClick={() => setWrap("break")}>Break Text</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="icon" variant="ghost"><ImageIcon size={16} /></Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={() => quickResize(50)}>50%</DropdownMenuItem>
          <DropdownMenuItem onClick={() => quickResize(75)}>75%</DropdownMenuItem>
          <DropdownMenuItem onClick={() => quickResize(100)}>100%</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Button size="sm" variant="outline" onClick={() => console.log("Replace image")}>
        <Replace className="mr-1" size={14} /> Replace
      </Button>

      <Button size="sm" onClick={() => console.log("Open sidebar options")}>
        Image Options
      </Button>
    </div>
  );
}
