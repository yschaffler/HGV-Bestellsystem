import React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Trash2 } from "lucide-react";
import type { DeleteDialog } from "@/app/settings/types";

export type DeleteConfirmDialogProps = {
  dialog: DeleteDialog;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
};

export function DeleteConfirmDialog({ dialog, onOpenChange, onConfirm }: DeleteConfirmDialogProps) {
  return (
    <AlertDialog
      open={!!dialog}
      onOpenChange={onOpenChange}
    >
      <AlertDialogContent className="max-w-sm">

        {/* Content */}
        <div className="flex flex-col items-center text-center gap-4">

          {/* Icon */}
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-destructive/10">
            <Trash2 className="w-6 h-6 text-destructive" />
          </div>

          {/* Text */}
          <AlertDialogHeader className="text-center">
            <AlertDialogTitle className="text-center">
            {dialog?.type === "product" ? "Produkt löschen?" :
            dialog?.type === "category" ? "Kategorie löschen?" : "Nutzer löschen?"}
            </AlertDialogTitle>

            <AlertDialogDescription className="text-center">
              „
              <span className="font-medium text-foreground">
                {dialog?.name}
              </span>
              “ wird dauerhaft entfernt.
            </AlertDialogDescription>
          </AlertDialogHeader>
        </div>

        {/* Actions */}
        <AlertDialogFooter className="flex-row gap-2 sm:justify-center">
          <AlertDialogCancel className="flex-1">
            Abbrechen
          </AlertDialogCancel>

          <AlertDialogAction
            onClick={onConfirm}
            className="flex-1"
          >
            Löschen
          </AlertDialogAction>
        </AlertDialogFooter>

      </AlertDialogContent>
    </AlertDialog>
  );
}
