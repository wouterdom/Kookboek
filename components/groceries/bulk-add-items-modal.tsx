"use client"

import { useState, useEffect, useRef } from "react"
import { X, Mic, MicOff, Loader2, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Modal } from "@/components/modal"

export interface BulkAddItemsModalProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (items: Array<{
    name: string
    amount?: string
    category_id: string
  }>) => void
}

export function BulkAddItemsModal({
  isOpen,
  onClose,
  onAdd
}: BulkAddItemsModalProps) {
  const [text, setText] = useState("")
  const [isListening, setIsListening] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    message: "",
    type: "info" as "info" | "success" | "error" | "warning"
  })

  const recognitionRef = useRef<any>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition

      if (SpeechRecognition) {
        const recognition = new SpeechRecognition()
        recognition.continuous = true
        recognition.interimResults = true
        recognition.lang = "nl-NL"

        recognition.onresult = (event: any) => {
          let interimTranscript = ""
          let finalTranscript = ""

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript
            if (event.results[i].isFinal) {
              finalTranscript += transcript + " "
            } else {
              interimTranscript += transcript
            }
          }

          if (finalTranscript) {
            setText((prev) => prev + finalTranscript)
          }
        }

        recognition.onerror = (event: any) => {
          console.error("Speech recognition error:", event.error)
          setIsListening(false)
          setModalConfig({
            isOpen: true,
            message: "Fout bij spraakherkenning. Probeer het opnieuw.",
            type: "error"
          })
        }

        recognition.onend = () => {
          setIsListening(false)
        }

        recognitionRef.current = recognition
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
    }
  }, [])

  // Close on ESC key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        handleClose()
      }
    }
    window.addEventListener("keydown", handleEscape)
    return () => window.removeEventListener("keydown", handleEscape)
  }, [isOpen])

  const handleClose = () => {
    setText("")
    setIsListening(false)
    if (recognitionRef.current) {
      recognitionRef.current.stop()
    }
    onClose()
  }

  const toggleListening = () => {
    if (!recognitionRef.current) {
      setModalConfig({
        isOpen: true,
        message: "Spraakherkenning wordt niet ondersteund in deze browser.",
        type: "warning"
      })
      return
    }

    if (isListening) {
      recognitionRef.current.stop()
      setIsListening(false)
    } else {
      recognitionRef.current.start()
      setIsListening(true)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!text.trim()) {
      setModalConfig({
        isOpen: true,
        message: "Voer eerst items in",
        type: "warning"
      })
      return
    }

    setIsProcessing(true)

    try {
      // Call AI endpoint to parse the list
      const res = await fetch("/api/groceries/bulk-parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.trim() })
      })

      if (!res.ok) {
        throw new Error("Failed to parse items")
      }

      const { items } = await res.json()

      if (!items || items.length === 0) {
        setModalConfig({
          isOpen: true,
          message: "Geen items gevonden in de tekst",
          type: "warning"
        })
        return
      }

      // Add all items
      onAdd(items)

      setModalConfig({
        isOpen: true,
        message: `${items.length} items toegevoegd!`,
        type: "success"
      })

      handleClose()
    } catch (error) {
      console.error("Failed to process items:", error)
      setModalConfig({
        isOpen: true,
        message: "Fout bij verwerken van items",
        type: "error"
      })
    } finally {
      setIsProcessing(false)
    }
  }

  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="w-full max-w-md rounded-lg bg-white shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border p-6">
            <h3 className="font-[Montserrat] text-lg font-bold">
              Meerdere items toevoegen
            </h3>
            <button
              onClick={handleClose}
              className="rounded-full p-1 transition-colors hover:bg-gray-100"
              aria-label="Sluiten"
              disabled={isProcessing}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Body */}
          <form onSubmit={handleSubmit} className="space-y-4 p-6">
            <div>
              <label className="mb-2 block text-sm font-medium">
                Voer je boodschappenlijst in
              </label>
              <div className="relative">
                <textarea
                  ref={textareaRef}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Typ of dicteer je volledige lijst, bijv.:&#10;- 2 liter melk&#10;- 500 gram gehakt&#10;- appels&#10;- brood"
                  className="input min-h-[200px] w-full resize-none pr-12"
                  disabled={isProcessing}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={toggleListening}
                  disabled={isProcessing}
                  className={`absolute bottom-3 right-3 rounded-full p-2 transition-all ${
                    isListening
                      ? "bg-destructive text-white hover:bg-destructive/90"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                  aria-label={isListening ? "Stop opnemen" : "Start opnemen"}
                >
                  {isListening ? (
                    <MicOff className="h-5 w-5" />
                  ) : (
                    <Mic className="h-5 w-5" />
                  )}
                </button>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {isListening
                  ? "🔴 Aan het opnemen... Klik nogmaals op de microfoon om te stoppen"
                  : "Typ je lijst of klik op de microfoon om te dicteren"}
              </p>
            </div>

            {/* Info */}
            <div className="rounded-lg bg-blue-50 p-4">
              <p className="text-sm text-blue-900">
                <strong>Tip:</strong> AI zal automatisch de categorie en hoeveelheid voor elk item bepalen.
              </p>
            </div>

            {/* Footer */}
            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isProcessing}
                className="flex-1"
              >
                Annuleren
              </Button>
              <Button
                type="submit"
                disabled={!text.trim() || isProcessing}
                className="flex-1"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verwerken...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Items toevoegen
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>

      <Modal
        isOpen={modalConfig.isOpen}
        onClose={() => setModalConfig({ ...modalConfig, isOpen: false })}
        message={modalConfig.message}
        type={modalConfig.type}
      />
    </>
  )
}
