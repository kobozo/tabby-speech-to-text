import { Injectable } from '@angular/core'
import { Subject } from 'rxjs'
import { ConfigService } from 'tabby-core'

export interface TranscriptResult {
    transcript: string
    isFinal: boolean
}

@Injectable({ providedIn: 'root' })
export class SpeechRecognitionService {
    private mediaRecorder: MediaRecorder | null = null
    private audioChunks: Blob[] = []
    private allChunks: Blob[] = []  // Keep all chunks for full transcription
    private isActive = false
    private isAvailable = false
    private stream: MediaStream | null = null
    private audioContext: AudioContext | null = null
    private analyser: AnalyserNode | null = null
    private silenceDetectionInterval: any = null
    private lastSoundTime = 0
    private isProcessingChunk = false

    public onTranscript = new Subject<TranscriptResult>()
    public onStart = new Subject<void>()
    public onStop = new Subject<void>()
    public onError = new Subject<string>()

    constructor(
        private config: ConfigService,
    ) {
        this.checkAvailability()
    }

    private async checkAvailability(): Promise<void> {
        try {
            // Check if MediaRecorder is available
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                console.error('MediaDevices API not supported')
                this.isAvailable = false
                return
            }

            this.isAvailable = true
        } catch (error) {
            console.error('Error checking availability:', error)
            this.isAvailable = false
        }
    }

    public isReady(): boolean {
        return this.isAvailable
    }

    public isRecording(): boolean {
        return this.isActive
    }

    public async start(): Promise<void> {
        if (!this.isAvailable) {
            this.onError.next('Speech recognition not available')
            return
        }

        if (this.isActive) {
            console.warn('Speech recognition already active')
            return
        }

        try {
            // Request microphone access
            this.stream = await navigator.mediaDevices.getUserMedia({ audio: true })

            // Set up audio context for silence detection
            this.audioContext = new AudioContext()
            const source = this.audioContext.createMediaStreamSource(this.stream)
            this.analyser = this.audioContext.createAnalyser()
            this.analyser.fftSize = 2048
            source.connect(this.analyser)

            // Create MediaRecorder with timeslice for chunked recording
            this.mediaRecorder = new MediaRecorder(this.stream, {
                mimeType: 'audio/webm',
            })

            this.audioChunks = []
            this.allChunks = []
            this.lastSoundTime = Date.now()

            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.audioChunks.push(event.data)
                    this.allChunks.push(event.data)
                }
            }

            this.mediaRecorder.onstop = async () => {
                // Stop silence detection
                if (this.silenceDetectionInterval) {
                    clearInterval(this.silenceDetectionInterval)
                    this.silenceDetectionInterval = null
                }

                // Process any remaining audio
                if (this.audioChunks.length > 0 && !this.isProcessingChunk) {
                    const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' })
                    await this.transcribeAudio(audioBlob, true)
                }

                // Clean up
                if (this.audioContext) {
                    this.audioContext.close()
                    this.audioContext = null
                }
                if (this.stream) {
                    this.stream.getTracks().forEach(track => track.stop())
                    this.stream = null
                }

                this.isActive = false
                this.onStop.next()
            }

            // Start recording with 1-second time slices
            this.mediaRecorder.start(1000)
            this.isActive = true
            this.onStart.next()

            // Start silence detection
            this.startSilenceDetection()
        } catch (error) {
            console.error('Failed to start speech recognition:', error)
            this.onError.next('Failed to start recognition: ' + error)
            this.isActive = false
        }
    }

    public stop(): void {
        if (!this.isActive || !this.mediaRecorder) {
            return
        }

        try {
            this.mediaRecorder.stop()
        } catch (error) {
            console.error('Failed to stop speech recognition:', error)
        }
    }

    public toggle(): void {
        if (this.isActive) {
            this.stop()
        } else {
            this.start()
        }
    }

    private startSilenceDetection(): void {
        const SILENCE_THRESHOLD = 0.01  // Volume threshold for silence
        const SILENCE_DURATION = 1500   // 1.5 seconds of silence triggers transcription
        const MIN_CHUNKS = 2  // Minimum 2 seconds of audio before processing

        console.log('[SpeechRecognition] Starting silence detection...')
        let logCounter = 0

        this.silenceDetectionInterval = setInterval(() => {
            if (!this.analyser) {
                console.log('[SpeechRecognition] No analyser available')
                return
            }

            const bufferLength = this.analyser.frequencyBinCount
            const dataArray = new Uint8Array(bufferLength)
            this.analyser.getByteTimeDomainData(dataArray)

            // Calculate average volume
            let sum = 0
            for (let i = 0; i < bufferLength; i++) {
                const normalized = (dataArray[i] - 128) / 128
                sum += normalized * normalized
            }
            const rms = Math.sqrt(sum / bufferLength)

            // Log every 10 cycles (1 second) for debugging
            logCounter++
            if (logCounter % 10 === 0) {
                console.log(`[SpeechRecognition] RMS: ${rms.toFixed(4)}, Chunks: ${this.audioChunks.length}, Processing: ${this.isProcessingChunk}`)
            }

            // Check if there's sound
            if (rms > SILENCE_THRESHOLD) {
                this.lastSoundTime = Date.now()
            } else {
                // Check if silence duration exceeded AND we have enough audio (minimum 2 seconds)
                const silenceDuration = Date.now() - this.lastSoundTime
                if (silenceDuration >= SILENCE_DURATION && this.audioChunks.length >= MIN_CHUNKS && !this.isProcessingChunk) {
                    console.log('[SpeechRecognition] Silence detected! Processing chunk...')
                    console.log(`[SpeechRecognition] Silence duration: ${silenceDuration}ms, Audio chunks: ${this.audioChunks.length}`)
                    this.processCurrentChunk()
                } else if (silenceDuration >= SILENCE_DURATION && this.audioChunks.length < MIN_CHUNKS) {
                    console.log(`[SpeechRecognition] Silence detected but not enough audio yet (${this.audioChunks.length}/${MIN_CHUNKS} chunks)`)
                }
            }
        }, 100)  // Check every 100ms
    }

    private async processCurrentChunk(): Promise<void> {
        if (this.audioChunks.length === 0 || this.isProcessingChunk) {
            console.log(`[SpeechRecognition] Skipping chunk processing - chunks: ${this.audioChunks.length}, processing: ${this.isProcessingChunk}`)
            return
        }

        console.log(`[SpeechRecognition] Starting chunk processing with ${this.audioChunks.length} chunks`)
        this.isProcessingChunk = true
        const chunksToProcess = [...this.audioChunks]
        this.audioChunks = []  // Clear for next chunk

        const audioBlob = new Blob(chunksToProcess, { type: 'audio/webm' })
        console.log(`[SpeechRecognition] Created audio blob of size: ${audioBlob.size} bytes`)

        await this.transcribeAudio(audioBlob, false)
        console.log('[SpeechRecognition] Chunk processing completed')
        this.isProcessingChunk = false
    }

    private async transcribeAudio(audioBlob: Blob, isFinal: boolean = true): Promise<void> {
        const apiKey = this.config.store?.speechToText?.openaiApiKey

        if (!apiKey) {
            this.onError.next('OpenAI API key not configured. Please set it in Settings.')
            return
        }

        try {
            // Convert webm to format Whisper accepts (needs to be converted to mp3/mp4/mpeg/mpga/m4a/wav/webm)
            const formData = new FormData()
            formData.append('file', audioBlob, 'audio.webm')
            formData.append('model', 'whisper-1')
            formData.append('language', this.config.store?.speechToText?.language || 'en')

            const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                },
                body: formData,
            })

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.error?.message || 'Transcription failed')
            }

            const result = await response.json()
            const transcript = result.text

            if (transcript && transcript.trim()) {
                // Send transcript (interim or final)
                console.log(`[SpeechRecognition] Transcription result (${isFinal ? 'final' : 'interim'}):`, transcript.trim())
                this.onTranscript.next({ transcript: transcript.trim(), isFinal })
            }
        } catch (error) {
            console.error('Transcription error:', error)
            this.onError.next('Transcription failed: ' + error)
        }
    }
}
