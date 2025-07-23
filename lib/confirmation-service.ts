import { create } from "zustand"

interface ConfirmationState {
  isOpen: boolean
  title: string
  message: string
  type: "success" | "warning" | "danger" | "info"
  confirmText: string
  cancelText: string
  onConfirm: (() => void) | null
  onCancel: (() => void) | null
}

interface ConfirmationStore extends ConfirmationState {
  showConfirmation: (config: Partial<ConfirmationState>) => Promise<boolean>
  hideConfirmation: () => void
  confirm: () => void
  cancel: () => void
}

export const useConfirmationStore = create<ConfirmationStore>((set, get) => ({
  isOpen: false,
  title: "",
  message: "",
  type: "info",
  confirmText: "OK",
  cancelText: "Batal",
  onConfirm: null,
  onCancel: null,

  showConfirmation: (config) => {
    return new Promise((resolve) => {
      set({
        isOpen: true,
        title: config.title || "Konfirmasi",
        message: config.message || "",
        type: config.type || "info",
        confirmText: config.confirmText || "OK",
        cancelText: config.cancelText || "Batal",
        onConfirm: () => {
          resolve(true)
          get().hideConfirmation()
        },
        onCancel: () => {
          resolve(false)
          get().hideConfirmation()
        },
      })
    })
  },

  hideConfirmation: () => {
    set({
      isOpen: false,
      onConfirm: null,
      onCancel: null,
    })
  },

  confirm: () => {
    const { onConfirm } = get()
    onConfirm?.()
  },

  cancel: () => {
    const { onCancel } = get()
    onCancel?.()
  },
}))

// Toast state
interface ToastState {
  isOpen: boolean
  message: string
  type: "success" | "error" | "info"
}

interface ToastStore extends ToastState {
  showToast: (message: string, type?: "success" | "error" | "info") => void
  hideToast: () => void
}

export const useToastStore = create<ToastStore>((set) => ({
  isOpen: false,
  message: "",
  type: "success",

  showToast: (message, type = "success") => {
    set({
      isOpen: true,
      message,
      type,
    })
  },

  hideToast: () => {
    set({
      isOpen: false,
      message: "",
    })
  },
}))
