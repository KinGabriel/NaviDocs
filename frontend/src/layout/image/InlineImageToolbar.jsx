import React from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  Replace,
  Image as ImageIcon,
  Move,
  Settings,
} from "lucide-react";

export default function InlineImageToolbar({ editor, onOpenOptions }) {
  if (!editor) return null;

  const setAlign = (value) => {
    editor.chain().focus().updateAttributes("richImage", { align: value }).run();
  };

  const setWrap = (value) => {
    editor.chain().focus().updateAttributes("richImage", { wrapMode: value }).run();
  };

  const quickResize = (percent) => {
    editor.chain().focus().updateAttributes("richImage", { width: `${percent}%` }).run();
  };

  return (
    <div className="absolute z-50 bg-white shadow-md border rounded-lg p-2 flex gap-1">
      <Button size="icon" variant="ghost" onClick={() => setAlign("left")}>
        <AlignLeft size={16} />
      </Button>
      <Button size="icon" variant="ghost" onClick={() => setAlign("center")}>
        <AlignCenter size={16} />
      </Button>
      <Button size="icon" variant="ghost" onClick={() => setAlign("right")}>
        <AlignRight size={16} />
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="icon" variant="ghost">
            <Move size={16} />
          </Button>
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
          <Button size="icon" variant="ghost">
            <ImageIcon size={16} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={() => quickResize(50)}>50%</DropdownMenuItem>
          <DropdownMenuItem onClick={() => quickResize(75)}>75%</DropdownMenuItem>
          <DropdownMenuItem onClick={() => quickResize(100)}>100%</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Button size="sm" variant="outline">
        <Replace className="mr-1" size={14} /> Replace
      </Button>

      <Button size="sm" onClick={onOpenOptions}>
        <Settings className="mr-1" size={14} /> Image Options
      </Button>
    </div>
  );
}
