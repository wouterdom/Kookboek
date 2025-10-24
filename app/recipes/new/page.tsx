'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Mic, Loader2, MessageSquare, StopCircle, Send, Sparkles, X } from 'lucide-react'
import { toast } from 'sonner'
import MicrophonePermissionModal from '@/components/microphone-permission-modal'
import { LoadingOverlay } from '@/components/loading-overlay'

export default function NewRecipePage() {
  const router = useRouter()
  const [isSaving, setIsSaving] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingDuration, setRecordingDuration] = useState(0)
  const [isProcessing, setIsProcessing] = useState(false)
  const [chatInput, setChatInput] = useState('')
  const [isChatLoading, setIsChatLoading] = useState(false)
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [showPermissionModal, setShowPermissionModal] = useState(false)
  const [hasPermissionCheck, setHasPermissionCheck] = useState(false)
  const [microphoneStatus, setMicrophoneStatus] = useState<'unknown' | 'granted' | 'denied' | 'prompt'>('unknown')
  const [chatMessages, setChatMessages] = useState<Array<{ type: 'ai' | 'user', message: string, recipeData?: any }>>([
    {
      type: 'ai',
      message: 'Hallo! Heb je inspiratie nodig? Vraag me bijvoorbeeld: "Geef me een recept voor pasta pesto", "Wat kan ik maken met kip?", of "Eenvoudig dessert voor 6 personen"'
    }
  ])

  // Form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [ingredients, setIngredients] = useState('')
  const [instructions, setInstructions] = useState('')
  const [prepTime, setPrepTime] = useState('')
  const [cookTime, setCookTime] = useState('')
  const [servings, setServings] = useState('')
  const [difficulty, setDifficulty] = useState('')
  const [gang, setGang] = useState('')

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const hasSoundRef = useRef<boolean>(false)

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
              setHasPermissionCheck(true)
              toast.success('Microfoon toegang hersteld!', {
                description: 'Je kunt nu weer spraakdictatie gebruiken.'
              })
            }
          })
        } catch (e) {
          // Some browsers don't support microphone in permissions.query
          console.log('Cannot check microphone permission status:', e)
          // On mobile browsers, we can't always query permissions
          // So we'll try to request and see what happens
          setMicrophoneStatus('prompt')
        }
      } else {
        // For browsers that don't support permissions API
        // We'll assume prompt state and let the user try
        setMicrophoneStatus('prompt')
      }
    } catch (error) {
      console.error('Error checking microphone permission:', error)
      setMicrophoneStatus('prompt')
    }
  }, [])

  useEffect(() => {
    checkMicrophonePermission()

    // Re-check when page becomes visible (user returns to tab)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        checkMicrophonePermission()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [checkMicrophonePermission])

  const handleMicrophoneClick = useCallback(() => {
    // Check current permission status and handle accordingly
    if (microphoneStatus === 'denied') {
      toast.error('Microfoon toegang geblokkeerd', {
        description: 'Ga naar je browser instellingen om microfoon toegang te herstellen. Op mobiel: Menu → Site-instellingen → Microfoon.'
      })
      return
    }

    // For first time or unknown status, show permission modal
    if (!hasPermissionCheck || microphoneStatus === 'unknown') {
      setShowPermissionModal(true)
    } else {
      startVoiceInput()
    }
  }, [hasPermissionCheck, microphoneStatus]) // eslint-disable-line react-hooks/exhaustive-deps

  const requestMicrophonePermission = useCallback(async () => {
    setShowPermissionModal(false)
    setHasPermissionCheck(true)
    await startVoiceInput()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

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

        setHasPermissionCheck(true)
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
      setHasPermissionCheck(true) // Permission was granted
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

        // If average level is above threshold, we detected sound (lowered threshold for mobile)
        if (average > 10) {
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
        // Stop monitoring
        isMonitoring = false

        const audioBlob = new Blob(audioChunksRef.current, { type: selectedMimeType })
        const finalDuration = recordingDuration

        // Check minimum recording duration (2 seconds)
        if (finalDuration < 2) {
          toast.error('Opname te kort', {
            description: `Opname was slechts ${finalDuration} seconden. Neem minimaal 2 seconden op.`
          })
        } else if (!hasSoundRef.current) {
          // Check if we detected any sound
          toast.error('Geen spraak gedetecteerd', {
            description: 'Er is geen geluid opgenomen. Spreek duidelijk in de microfoon.'
          })
        } else {
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

      // Start timer
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1)
      }, 1000)

      toast.success('🎤 Opname gestart', {
        description: 'Dicteer je volledige recept. Klik opnieuw om te stoppen.'
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
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      toast.info('⏸️ Opname gestopt', {
        description: 'AI verwerkt je recept...'
      })
    }
  }, [isRecording])

  const processVoiceInput = async (audioBlob: Blob) => {
    try {
      setIsProcessing(true)

      const formData = new FormData()
      formData.append('audio', audioBlob, 'recording.webm')

      const response = await fetch('/api/recipes/voice', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Audio processing failed')
      }

      const data = await response.json()
      const recipe = data.recipe

      // Update all fields from the parsed recipe
      if (recipe.title) setTitle(recipe.title)
      if (recipe.description) setDescription(recipe.description)
      if (recipe.ingredients && Array.isArray(recipe.ingredients)) {
        setIngredients(recipe.ingredients.join('\n'))
      }
      if (recipe.instructions) setInstructions(recipe.instructions)
      if (recipe.prep_time) setPrepTime(recipe.prep_time.toString())
      if (recipe.cook_time) setCookTime(recipe.cook_time.toString())
      if (recipe.servings) setServings(recipe.servings.toString())
      if (recipe.difficulty) setDifficulty(recipe.difficulty)
      if (recipe.gang) setGang(recipe.gang)

      toast.success('✓ Recept automatisch ingevuld!', {
        description: 'Controleer de velden en pas aan waar nodig.'
      })
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

  const saveRecipe = async () => {
    if (!title.trim()) {
      toast.error('Titel is verplicht')
      return
    }

    setIsSaving(true)

    try {
      // Parse ingredients from textarea (one per line)
      const ingredientsList = ingredients
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)

      const recipeData = {
        title,
        description: description || undefined,
        ingredients: ingredientsList,
        instructions,
        prep_time: prepTime ? parseInt(prepTime) : undefined,
        cook_time: cookTime ? parseInt(cookTime) : undefined,
        servings: servings ? parseInt(servings) : undefined,
        difficulty: difficulty || undefined,
        gang: gang || undefined
      }

      // Save recipe
      const response = await fetch('/api/recipes/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(recipeData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save recipe')
      }

      const { slug, recipeId } = await response.json()

      toast.success('✓ Recept opgeslagen! Foto wordt gegenereerd...')

      // Generate image (async, don't wait)
      fetch('/api/recipes/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipeId,
          title,
          description
        })
      }).catch(err => console.error('Image generation failed:', err))

      // Redirect to recipe
      router.push(`/recipes/${slug}`)
    } catch (error) {
      console.error('Error saving recipe:', error)
      toast.error(error instanceof Error ? error.message : 'Er ging iets mis bij het opslaan.')
      setIsSaving(false)
    }
  }

  const sendChatMessage = async () => {
    if (!chatInput.trim() || isChatLoading) return

    const userMessage = chatInput.trim()
    setChatMessages(prev => [...prev, { type: 'user', message: userMessage }])
    setChatInput('')
    setIsChatLoading(true)

    try {
      const response = await fetch('/api/inspiration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          history: chatMessages
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Chat failed')
      }

      const data = await response.json()

      // Try to extract recipe-like data from response
      const aiMessage = data.reply
      const hasRecipeData = aiMessage.toLowerCase().includes('ingrediënt') ||
                            aiMessage.toLowerCase().includes('recept') ||
                            aiMessage.toLowerCase().includes('bereiding')

      setChatMessages(prev => [...prev, {
        type: 'ai',
        message: aiMessage,
        recipeData: hasRecipeData ? { canFillForm: true } : undefined
      }])
    } catch (error) {
      console.error('Chat error:', error)
      setChatMessages(prev => [...prev, {
        type: 'ai',
        message: 'Sorry, er ging iets mis. Probeer het opnieuw.'
      }])
    } finally {
      setIsChatLoading(false)
    }
  }

  const fillFormFromAI = async (messageText: string) => {
    toast.info('AI receptsuggestie wordt verwerkt...')

    try {
      const response = await fetch('/api/inspiration/parse-recipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: messageText })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Parsing failed')
      }

      const data = await response.json()
      const recipe = data.recipe

      // Fill all form fields
      if (recipe.title) setTitle(recipe.title)
      if (recipe.description) setDescription(recipe.description)
      if (recipe.ingredients && Array.isArray(recipe.ingredients)) {
        setIngredients(recipe.ingredients.join('\n'))
      }
      if (recipe.instructions) setInstructions(recipe.instructions)
      if (recipe.prep_time) setPrepTime(recipe.prep_time.toString())
      if (recipe.cook_time) setCookTime(recipe.cook_time.toString())
      if (recipe.servings) setServings(recipe.servings.toString())
      if (recipe.difficulty) setDifficulty(recipe.difficulty)
      if (recipe.gang) setGang(recipe.gang)

      toast.success('✓ Recept automatisch ingevuld!', {
        description: 'Controleer de velden en pas aan waar nodig.'
      })
      setIsChatOpen(false)
    } catch (error) {
      console.error('Error filling form from AI:', error)
      toast.error('Kon recept niet invullen', {
        description: error instanceof Error ? error.message : 'Probeer opnieuw'
      })
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Loading Overlay for Voice Processing */}
      <LoadingOverlay
        message="AI verwerkt je recept..."
        isOpen={isProcessing}
      />

      {/* Loading Overlay for Saving Recipe */}
      <LoadingOverlay
        message="Recept opslaan en foto genereren..."
        isOpen={isSaving}
      />

      {/* Header - Compact */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="font-medium text-sm">Terug</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        <div className="mb-4">
          <h1 className="font-[Montserrat] text-2xl sm:text-3xl font-bold mb-1">
            Nieuw Recept Toevoegen
          </h1>
          <p className="text-sm text-muted-foreground">
            Vul de velden handmatig in, of gebruik het microfoon icoontje om je hele recept te dicteren
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 space-y-5">
          {/* Voice Recording Button - COMPACT */}
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
                    : 'Dicteer je recept in één keer'
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

          {/* Title */}
          <div>
            <label className="block text-sm font-semibold mb-2">
              📝 Titel *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Bijv. Oma's Appeltaart"
              className="input w-full"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold mb-2">
              📄 Beschrijving
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Een heerlijke klassieke appeltaart met kaneel..."
              className="input w-full resize-none"
              rows={3}
            />
          </div>

          {/* Ingredients */}
          <div>
            <label className="block text-sm font-semibold mb-2">
              📋 Ingrediënten
            </label>
            <textarea
              value={ingredients}
              onChange={(e) => setIngredients(e.target.value)}
              placeholder={'250g bloem\n200g boter\n3 eieren\n150g suiker\n...\n(één per regel)'}
              className="input w-full resize-none"
              rows={8}
            />
            <p className="text-xs text-muted-foreground mt-1">
              💡 Tip: Eén ingrediënt per regel
            </p>
          </div>

          {/* Instructions */}
          <div>
            <label className="block text-sm font-semibold mb-2">
              👨‍🍳 Bereidingswijze
            </label>
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder={'1. Verwarm de oven voor op 180°C\n2. Meng de bloem en boter tot kruimelig\n3. Voeg eieren en suiker toe\n...'}
              className="input w-full resize-none"
              rows={10}
            />
          </div>

          {/* Details Grid */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold mb-2">
                  ⏱️ Voorbereiding (min)
                </label>
                <input
                  type="number"
                  value={prepTime}
                  onChange={(e) => setPrepTime(e.target.value)}
                  placeholder="20"
                  className="input w-full"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-2">
                  🍳 Koken (min)
                </label>
                <input
                  type="number"
                  value={cookTime}
                  onChange={(e) => setCookTime(e.target.value)}
                  placeholder="45"
                  className="input w-full"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-2">
                  🍽️ Porties
                </label>
                <input
                  type="number"
                  value={servings}
                  onChange={(e) => setServings(e.target.value)}
                  placeholder="4"
                  className="input w-full"
                  min="1"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-2">
                  📊 Moeilijkheid
                </label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  className="input w-full"
                >
                  <option value="">Selecteer...</option>
                  <option value="easy">Makkelijk</option>
                  <option value="medium">Gemiddeld</option>
                  <option value="hard">Moeilijk</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-2">
                🍴 Gang (categorie)
              </label>
              <select
                value={gang}
                onChange={(e) => setGang(e.target.value)}
                className="input w-full sm:w-1/2"
              >
                <option value="">Selecteer...</option>
                <option value="Amuse">Amuse</option>
                <option value="Voorgerecht">Voorgerecht</option>
                <option value="Soep">Soep</option>
                <option value="Hoofdgerecht">Hoofdgerecht</option>
                <option value="Dessert">Dessert</option>
                <option value="Bijgerecht">Bijgerecht</option>
              </select>
              <p className="text-xs text-muted-foreground mt-1">
                💡 AI detecteert dit automatisch, maar je kan het ook handmatig instellen
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t">
            <button
              onClick={saveRecipe}
              disabled={isSaving || !title.trim() || isRecording || isProcessing}
              className="btn btn-primary btn-md flex-1"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  Opslaan...
                </>
              ) : (
                <>
                  ✓ Opslaan & Foto Genereren
                </>
              )}
            </button>
            <button
              onClick={() => router.back()}
              disabled={isSaving || isRecording || isProcessing}
              className="btn btn-outline btn-md"
            >
              Annuleren
            </button>
          </div>
        </div>
      </main>

      {/* Floating AI Chat Button - Positioned higher to avoid form buttons */}
      <div className="fixed bottom-24 right-6 z-50">
        {!isChatOpen ? (
          <button
            onClick={() => setIsChatOpen(true)}
            className="bg-primary text-white rounded-full p-4 shadow-2xl hover:bg-primary/90 transition-all hover:scale-110"
            title="AI Inspiratie Chat"
          >
            <Sparkles className="h-6 w-6" />
          </button>
        ) : (
          <div className="bg-white rounded-2xl shadow-2xl w-[90vw] sm:w-96 max-h-[600px] flex flex-col border border-primary/20">
            {/* Chat Header */}
            <div className="flex items-center justify-between p-4 border-b bg-primary/5 rounded-t-2xl">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-primary">Inspiratie Chat</h3>
              </div>
              <button
                onClick={() => setIsChatOpen(false)}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[300px] max-h-[400px]">
              {chatMessages.map((msg, idx) => (
                <div key={idx}>
                  <div
                    className={`p-3 rounded-lg text-sm ${
                      msg.type === 'ai'
                        ? 'bg-blue-50 text-blue-900'
                        : 'bg-orange-50 text-orange-900 ml-4'
                    }`}
                  >
                    <div className="font-semibold text-xs mb-1 opacity-70">
                      {msg.type === 'ai' ? '🤖 AI' : '👤 Jij'}
                    </div>
                    {msg.message}
                  </div>

                  {/* "Neem over" button after AI response with recipe data */}
                  {msg.type === 'ai' && msg.recipeData?.canFillForm && (
                    <button
                      onClick={() => fillFormFromAI(msg.message)}
                      className="mt-2 text-sm btn btn-primary btn-sm w-full flex items-center justify-center gap-2"
                    >
                      <span>↓</span> Neem over
                    </button>
                  )}
                </div>
              ))}
              {isChatLoading && (
                <div className="p-3 rounded-lg text-sm bg-blue-50 text-blue-900">
                  <div className="font-semibold text-xs mb-1 opacity-70">
                    🤖 AI
                  </div>
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              )}
            </div>

            {/* Chat Input */}
            <div className="p-4 border-t bg-gray-50 rounded-b-2xl">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Vraag om inspiratie..."
                  className="input input-sm flex-1 text-sm"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !isChatLoading) {
                      sendChatMessage()
                    }
                  }}
                  disabled={isChatLoading}
                />
                <button
                  onClick={sendChatMessage}
                  className="btn btn-primary btn-sm"
                  disabled={!chatInput.trim() || isChatLoading}
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                💡 Vraag bijv. "pasta pesto recept"
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Microphone Permission Modal */}
      <MicrophonePermissionModal
        isOpen={showPermissionModal}
        onClose={() => setShowPermissionModal(false)}
        onRequestPermission={requestMicrophonePermission}
      />
    </div>
  )
}
