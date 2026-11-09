import React from "react"
import { Toaster as Sonner, toast } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      richColors
      position="top-center"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-zinc-900/95 group-[.toaster]:backdrop-blur-md group-[.toaster]:text-zinc-100 group-[.toaster]:border-zinc-800/90 group-[.toaster]:shadow-xl group-[.toaster]:rounded-2xl font-sans group-[.toaster]:border",
          description: "group-[.toast]:text-zinc-400 text-xs",
          actionButton:
            "group-[.toast]:bg-amber-500 group-[.toast]:text-zinc-950 font-bold text-xs rounded-xl hover:bg-amber-400",
          cancelButton:
            "group-[.toast]:bg-zinc-800 group-[.toast]:text-zinc-300 font-bold text-xs rounded-xl hover:bg-zinc-700",
          success:
            "group-[.toaster]:border-emerald-500/40 group-[.toaster]:text-emerald-300",
          error:
            "group-[.toaster]:border-red-500/40 group-[.toaster]:text-red-300",
          info:
            "group-[.toaster]:border-sky-500/40 group-[.toaster]:text-sky-300",
          warning:
            "group-[.toaster]:border-amber-500/40 group-[.toaster]:text-amber-300",
        },
      }}
      {...props}
    />
  )
}

export { Toaster, toast }
