"use client"

import { ConfirmationDialog, SuccessToast } from "@/components/ui/confirmation-dialog"
import { useConfirmationStore, useToastStore } from "@/lib/confirmation-service"

export function ConfirmationProvider() {
  const { isOpen, title, message, type, confirmText, cancelText, confirm, cancel, hideConfirmation } =
    useConfirmationStore()

  const { isOpen: toastOpen, message: toastMessage, hideToast } = useToastStore()

  return (
    <>
      <ConfirmationDialog
        isOpen={isOpen}
        onClose={cancel}
        onConfirm={confirm}
        title={title}
        message={message}
        type={type}
        confirmText={confirmText}
        cancelText={cancelText}
      />

      <SuccessToast isOpen={toastOpen} onClose={hideToast} message={toastMessage} />
    </>
  )
}
