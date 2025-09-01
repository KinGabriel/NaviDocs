import React from "react";
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubTrigger,
  ContextMenuSubContent,
} from "@/components/ui/context-menu";
import { Crop, Replace, Undo2, Settings, Type } from "lucide-react";

export default function ImageContextMenu({ children, onAction }) {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-56">
        <ContextMenuItem onClick={() => onAction?.("crop")}>
          <Crop className="mr-2 h-4 w-4" /> Crop image
        </ContextMenuItem>

        <ContextMenuSub>
          <ContextMenuSubTrigger>
            <Replace className="mr-2 h-4 w-4" /> Replace image
          </ContextMenuSubTrigger>
          <ContextMenuSubContent>
            <ContextMenuItem onClick={() => onAction?.("replace-upload")}>
              Upload from computer
            </ContextMenuItem>
            <ContextMenuItem onClick={() => onAction?.("replace-url")}>
              Paste image URL
            </ContextMenuItem>
          </ContextMenuSubContent>
        </ContextMenuSub>

        <ContextMenuSeparator />

        <ContextMenuItem onClick={() => onAction?.("reset")}>
          <Undo2 className="mr-2 h-4 w-4" /> Reset image
        </ContextMenuItem>

        <ContextMenuItem onClick={() => onAction?.("alt-text")}>
          <Type className="mr-2 h-4 w-4" /> Alt text
        </ContextMenuItem>

        <ContextMenuSeparator />

        <ContextMenuItem onClick={() => onAction?.("options")}>
          <Settings className="mr-2 h-4 w-4" /> Image options…
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
