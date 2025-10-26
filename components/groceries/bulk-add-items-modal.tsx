"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { X, Mic, Loader2, Plus, StopCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Modal } from "@/components/modal"
import { toast } from "sonner"

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
  const [isRecording, setIsRecording] = useState(false)
  const [recordingDuration, setRecordingDuration] = useState(0)
  const [isProcessing, setIsProcessing] = useState(false)
  const [microphoneStatus, setMicrophoneStatus] = useState<'unknown' | 'granted' | 'denied' | 'prompt'>('unknown')
  const [showMicErrorModal, setShowMicErrorModal] = useState(false)
  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    message: "",
    type: "info" as "info" | "success" | "error" | "warning"
  })

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const hasSoundRef = useRef<boolean>(false)
  const recordingDurationRef = useRef<number>(0)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current)
      }
    }
  }, [])

  // Check and monitor microphone permissions
  const checkMicrophonePermission = useCallback(async () => {
    try {
      // Check if we're in a secure context (HTTPS or localhost)
      if (!window.isSecureContext) {
        console.warn('Not in secure context, microphone may not work. Use HTTPS.')
        setMicrophoneStatus('denied')
        return
      }

      // Try to check permission status if available
      if (navigator.permissions && navigator.permissions.query) {
        try {
          const permissionStatus = await navigator.permissions.query({ name: 'microphone' as PermissionName })
          setMicrophoneStatus(permissionStatus.state as any)

          // Listen for permission changes
          permissionStatus.addEventListener('change', () => {
            setMicrophoneStatus(permissionStatus.state as any)
            if (permissionStatus.state === 'granted') {
              toast.success('Microfoon toegang hersteld!', {
                description: 'Je kunt nu weer spraakdictatie gebruiken.'
              })
            }
          })
        } catch (e) {
          // Some browsers don't support microphone in permissions.query
          console.log('Cannot check microphone permission status:', e)
          setMicrophoneStatus('prompt')
        }
      } else {
        // For browsers that don't support permissions API
        setMicrophoneStatus('prompt')
      }
    } catch (error) {
      console.error('Error checking microphone permission:', error)
      setMicrophoneStatus('prompt')
    }
  }, [])

  useEffect(() => {
    if (isOpen) {
      checkMicrophonePermission()
    }
  }, [isOpen, checkMicrophonePermission])

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
    setIsRecording(false)
    setRecordingDuration(0)
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop()
    }
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current)
    }
    onClose()
  }

  const handleMicrophoneClick = useCallback(() => {
    // Check current permission status and handle accordingly
    if (microphoneStatus === 'denied') {
      setShowMicErrorModal(true)
      return
    }

    // Just try to start voice input directly
    startVoiceInput()
  }, [microphoneStatus]) // eslint-disable-line react-hooks/exhaustive-deps

  const startVoiceInput = useCallback(async () => {
    try {
      // Check if mediaDevices is available (required for getUserMedia)
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        // Fallback for older browsers
        const getUserMedia = (navigator as any).getUserMedia ||
                            (navigator as any).webkitGetUserMedia ||
                            (navigator as any).mozGetUserMedia ||
                            (navigator as any).msGetUserMedia;

        if (!getUserMedia) {
          toast.error('Browser ondersteunt geen microfoon', {
            description: 'Update je browser of gebruik Chrome/Firefox voor spraakdictatie.'
          })
          return
        }

        // Use legacy API with promise wrapper
        const stream = await new Promise<MediaStream>((resolve, reject) => {
          getUserMedia.call(navigator, { audio: true }, resolve, reject)
        })

        setMicrophoneStatus('granted')
        processMediaStream(stream)
        return
      }

      // Modern API with better error handling for mobile
      const constraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100
        }
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      setMicrophoneStatus('granted')
      processMediaStream(stream)

    } catch (error: any) {
      handleMicrophoneError(error)
    }
  }, [isRecording]) // eslint-disable-line react-hooks/exhaustive-deps

  const processMediaStream = useCallback((stream: MediaStream) => {
    try {
      // Set up audio analysis for sound detection
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      audioContextRef.current = audioContext
      const source = audioContext.createMediaStreamSource(stream)
      const analyser = audioContext.createAnalyser()
      analyserRef.current = analyser
      analyser.fftSize = 2048
      source.connect(analyser)

      // Reset sound detection flag
      hasSoundRef.current = false

      // Start monitoring audio levels
      const dataArray = new Uint8Array(analyser.frequencyBinCount)
      let isMonitoring = true
      const checkAudioLevel = () => {
        if (!isMonitoring) return

        analyser.getByteFrequencyData(dataArray)
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length

        // If average level is above threshold, we detected sound (very low threshold for mobile compatibility)
        if (average > 3) {
          hasSoundRef.current = true
        }

        requestAnimationFrame(checkAudioLevel)
      }
      requestAnimationFrame(checkAudioLevel)

      // Create MediaRecorder with fallback for different mime types
      let mediaRecorder: MediaRecorder
      const mimeTypes = ['audio/webm', 'audio/webm;codecs=opus', 'audio/ogg', 'audio/mp4']
      let selectedMimeType = 'audio/webm'

      for (const mimeType of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mimeType)) {
          selectedMimeType = mimeType
          break
        }
      }

      try {
        mediaRecorder = new MediaRecorder(stream, { mimeType: selectedMimeType })
      } catch {
        // Fallback without mime type
        mediaRecorder = new MediaRecorder(stream)
      }

      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []
      setRecordingDuration(0)

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        console.log('MediaRecorder onstop triggered')
        // Stop monitoring
        isMonitoring = false

        const audioBlob = new Blob(audioChunksRef.current, { type: selectedMimeType })
        const finalDuration = recordingDurationRef.current // Use ref instead of state

        console.log('Recording stopped - Duration:', finalDuration, 'Blob size:', audioBlob.size, 'Had sound:', hasSoundRef.current, 'Chunks:', audioChunksRef.current.length)

        // Check minimum recording duration (2 seconds)
        if (finalDuration < 2) {
          console.log('Recording too short:', finalDuration)
          toast.error('Opname te kort', {
            description: `Opname was slechts ${finalDuration} seconden. Neem minimaal 2 seconden op.`
          })
        } else if (!hasSoundRef.current && finalDuration < 5) {
          // Only check for sound if recording is short (< 5s) - longer recordings likely have audio
          console.log('No sound detected in short recording')
          toast.error('Geen spraak gedetecteerd', {
            description: 'Er is geen geluid opgenomen. Spreek duidelijk in de microfoon.'
          })
        } else {
          console.log('Processing voice input...')
          await processVoiceInput(audioBlob)
        }

        // Cleanup
        stream.getTracks().forEach(track => track.stop())
        if (audioContextRef.current) {
          audioContextRef.current.close()
        }
        if (recordingTimerRef.current) {
          clearInterval(recordingTimerRef.current)
        }
      }

      mediaRecorder.start(1000)
      setIsRecording(true)
      recordingDurationRef.current = 0

      // Start timer
      recordingTimerRef.current = setInterval(() => {
        recordingDurationRef.current += 1
        setRecordingDuration(recordingDurationRef.current)
      }, 1000)

      toast.success('🎤 Opname gestart', {
        description: 'Dicteer je boodschappenlijst. Klik opnieuw om te stoppen.'
      })
    } catch (error: any) {
      handleMicrophoneError(error)
      // Stop the stream if there was an error
      stream.getTracks().forEach(track => track.stop())
    }
  }, [isRecording, recordingDuration]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleMicrophoneError = useCallback((error: any) => {
    console.error('Microphone error:', error)

    // Update permission status
    setMicrophoneStatus('denied')

    // More specific error handling
    if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
      toast.error('Microfoon toegang geweigerd', {
        description: 'Op mobiel: Ga naar browser menu → Site-instellingen → Microfoon → Toestaan.'
      })
    } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
      toast.error('Geen microfoon gevonden', {
        description: 'Controleer of je microfoon aangesloten is of probeer andere browser app.'
      })
    } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
      toast.error('Microfoon is in gebruik', {
        description: 'Sluit andere apps die de microfoon gebruiken en probeer opnieuw.'
      })
    } else if (error.name === 'SecurityError' || !window.isSecureContext) {
      toast.error('Beveiligingsfout', {
        description: 'Deze functie werkt alleen via HTTPS. Gebruik de productie URL.'
      })
    } else {
      toast.error('Microfoon probleem', {
        description: 'Probeer de pagina te verversen of gebruik een andere browser.'
      })
    }
  }, [])

  const stopVoiceInput = useCallback(() => {
    console.log('stopVoiceInput called, isRecording:', isRecording, 'mediaRecorder:', !!mediaRecorderRef.current)
    if (mediaRecorderRef.current && isRecording) {
      console.log('Stopping mediaRecorder, duration:', recordingDuration)
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      toast.info('⏸️ Opname gestopt', {
        description: 'AI verwerkt je lijst...'
      })
    }
  }, [isRecording, recordingDuration])

  const processVoiceInput = async (audioBlob: Blob) => {
    try {
      console.log('processVoiceInput starting, blob size:', audioBlob.size)
      setIsProcessing(true)

      const formData = new FormData()
      formData.append('audio', audioBlob, 'recording.webm')

      console.log('Sending to API...')
      const response = await fetch('/api/groceries/voice', {
        method: 'POST',
        body: formData
      })
      console.log('API response status:', response.status)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Audio processing failed')
      }

      const data = await response.json()
      const items = data.items

      if (!items || items.length === 0) {
        toast.error('Geen items gevonden', {
          description: 'Probeer opnieuw en noem duidelijk de items.'
        })
        return
      }

      // Add all items
      onAdd(items)

      toast.success(`✓ ${items.length} items toegevoegd!`, {
        description: 'Items zijn automatisch gecategoriseerd.'
      })

      // Close modal after successful processing
      handleClose()
    } catch (error) {
      console.error('Error processing voice:', error)
      toast.error('Verwerking mislukt', {
        description: error instanceof Error ? error.message : 'Er ging iets mis bij het verwerken.'
      })
    } finally {
      setIsProcessing(false)
      setRecordingDuration(0)
    }
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
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
              disabled={isProcessing || isRecording}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Body */}
          <form onSubmit={handleSubmit} className="space-y-4 p-6">
            {/* Voice Recording Section - EXACTLY matching recipe creation */}
            <div className={`border rounded-lg p-3 sm:p-4 ${
              microphoneStatus === 'denied'
                ? 'border-red-300 bg-red-50'
                : 'border-primary/30 bg-blue-50/30'
            }`}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm sm:text-base mb-0.5 flex items-center gap-2">
                    🎤 Spraakdictate
                    {microphoneStatus === 'denied' && (
                      <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                        Geblokkeerd
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {microphoneStatus === 'denied'
                      ? 'Microfoon toegang is geblokkeerd in browser instellingen'
                      : 'Dicteer je boodschappenlijst in één keer'
                    }
                  </p>
                </div>
                <button
                  type="button"
                  onClick={isRecording ? stopVoiceInput : handleMicrophoneClick}
                  disabled={isProcessing}
                  className={`p-3 sm:p-4 rounded-full transition-all shadow-lg flex-shrink-0 ${
                    isRecording
                      ? 'bg-red-500 text-white animate-pulse hover:bg-red-600'
                      : isProcessing
                      ? 'bg-gray-400 text-white cursor-not-allowed'
                      : microphoneStatus === 'denied'
                      ? 'bg-gray-400 text-white hover:bg-gray-500'
                      : 'bg-primary text-white hover:bg-primary/90'
                  }`}
                  title={
                    isRecording ? 'Stop opname' :
                    microphoneStatus === 'denied' ? 'Microfoon geblokkeerd - klik voor instructies' :
                    'Start opname'
                  }
                >
                  {isProcessing ? (
                    <Loader2 className="h-5 w-5 sm:h-6 sm:w-6 animate-spin" />
                  ) : isRecording ? (
                    <StopCircle className="h-5 w-5 sm:h-6 sm:w-6" />
                  ) : (
                    <Mic className="h-5 w-5 sm:h-6 sm:w-6" />
                  )}
                </button>
              </div>

              {/* Recording Status - Compact */}
              {(isRecording || isProcessing) && (
                <div className="mt-2 space-y-1.5">
                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <span className="font-medium">
                      {isRecording && '🔴 Opname bezig...'}
                      {isProcessing && '⚙️ Verwerken...'}
                    </span>
                    {isRecording && (
                      <span className="font-mono text-primary font-bold">
                        {formatDuration(recordingDuration)}
                      </span>
                    )}
                  </div>
                  {isProcessing && (
                    <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                      <div className="bg-primary h-1.5 rounded-full animate-pulse w-full"></div>
                    </div>
                  )}
                </div>
              )}

              {/* Help section when microphone is denied */}
              {microphoneStatus === 'denied' && (
                <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded text-xs">
                  <p className="font-semibold text-amber-900 mb-2">
                    Hoe microfoon toegang te herstellen:
                  </p>
                  <div className="space-y-2 text-amber-800">
                    <div>
                      <span className="font-medium">Chrome Android:</span>
                      <ol className="ml-4 mt-1">
                        <li>1. Tik op het slotje (🔒) of info (ⓘ) icoon in de adresbalk</li>
                        <li>2. Kies "Site-instellingen" of "Permissions"</li>
                        <li>3. Zet "Microfoon" op "Toestaan"</li>
                        <li>4. Ververs de pagina</li>
                      </ol>
                    </div>
                    <div>
                      <span className="font-medium">Samsung Internet:</span>
                      <ol className="ml-4 mt-1">
                        <li>1. Tik op het menu (⋮) → Instellingen</li>
                        <li>2. Ga naar "Sites en downloads" → "Site-machtigingen"</li>
                        <li>3. Vind deze website en zet "Microfoon" aan</li>
                      </ol>
                    </div>
                    <div>
                      <span className="font-medium">Firefox Android:</span>
                      <ol className="ml-4 mt-1">
                        <li>1. Tik op het slotje in de adresbalk</li>
                        <li>2. Tik op "Bewerken" bij Site-machtigingen</li>
                        <li>3. Zet "Microfoon" op "Toestaan"</li>
                      </ol>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Text Input Section - Optional for manual entry */}
            <div>
              <label className="mb-2 block text-sm font-medium">
                Of typ handmatig
              </label>
              <textarea
                ref={textareaRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Je kunt ook typen:&#10;- 2 liter melk&#10;- 500 gram gehakt&#10;- appels&#10;- brood"
                className="input min-h-[120px] w-full resize-none"
                disabled={isProcessing || isRecording}
              />
              <p className="mt-2 text-xs text-muted-foreground">
                💡 Tip: Gebruik spraakdictate hierboven voor sneller invoeren
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
                disabled={isProcessing || isRecording}
                className="flex-1"
              >
                Annuleren
              </Button>
              <Button
                type="submit"
                disabled={!text.trim() || isProcessing || isRecording}
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

      {/* Microphone Permission Error Modal */}
      <Modal
        isOpen={showMicErrorModal}
        onClose={() => setShowMicErrorModal(false)}
        title="Microfoon geblokkeerd"
        message="Deze app heeft toegang tot je microfoon nodig voor spraakdictatie. Ga naar je browserinstellingen om dit te herstellen."
        type="warning"
        confirmText="OK"
      />

      <Modal
        isOpen={modalConfig.isOpen}
        onClose={() => setModalConfig({ ...modalConfig, isOpen: false })}
        message={modalConfig.message}
        type={modalConfig.type}
      />
    </>
  )
}
