import React from "react";
import { ContextMenu, ContextMenuTrigger, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuSub, ContextMenuSubTrigger, ContextMenuSubContent } from "@/components/ui/context-menu";
import { Crop, Replace, Undo2, Settings, Type } from "lucide-react";

export default function ImageContextMenu({ children, editor }) {
  const cropImage = () => editor.chain().focus().setNodeSelection().run();
  const resetImage = () => editor.chain().focus().updateAttributes("image", { width: null, height: null, crop: null }).run();

  return (
    <ContextMenu>
      <ContextMenuTrigger>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        <ContextMenuItem onClick={cropImage}>
          <Crop className="mr-2 h-4 w-4" /> Crop image
        </ContextMenuItem>

        <ContextMenuSub>
          <ContextMenuSubTrigger>
            <Replace className="mr-2 h-4 w-4" /> Replace image
          </ContextMenuSubTrigger>
          <ContextMenuSubContent>
            <ContextMenuItem>From computer</ContextMenuItem>
            <ContextMenuItem>From URL</ContextMenuItem>
            <ContextMenuItem>From Drive</ContextMenuItem>
          </ContextMenuSubContent>
        </ContextMenuSub>

        <ContextMenuItem onClick={resetImage}>
          <Undo2 className="mr-2 h-4 w-4" /> Reset image
        </ContextMenuItem>

        <ContextMenuItem onClick={() => console.log("Open sidebar options")}>
          <Settings className="mr-2 h-4 w-4" /> Image options
        </ContextMenuItem>

        <ContextMenuSeparator />

        <ContextMenuItem>
          <Type className="mr-2 h-4 w-4" /> Alt text
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
