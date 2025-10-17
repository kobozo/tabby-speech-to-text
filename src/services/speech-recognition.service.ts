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
    private isActive = false
    private isAvailable = false
    private stream: MediaStream | null = null

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

            // Create MediaRecorder
            this.mediaRecorder = new MediaRecorder(this.stream, {
                mimeType: 'audio/webm',
            })

            this.audioChunks = []

            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.audioChunks.push(event.data)
                }
            }

            this.mediaRecorder.onstop = async () => {
                // Create blob from recorded chunks
                const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' })

                // Send to Whisper API for transcription
                await this.transcribeAudio(audioBlob)

                // Clean up
                if (this.stream) {
                    this.stream.getTracks().forEach(track => track.stop())
                    this.stream = null
                }

                this.isActive = false
                this.onStop.next()
            }

            this.mediaRecorder.start()
            this.isActive = true
            this.onStart.next()
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

    private async transcribeAudio(audioBlob: Blob): Promise<void> {
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
                // Send final transcript
                this.onTranscript.next({ transcript: transcript.trim(), isFinal: true })
            }
        } catch (error) {
            console.error('Transcription error:', error)
            this.onError.next('Transcription failed: ' + error)
        }
    }
}
