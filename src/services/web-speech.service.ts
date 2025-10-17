import { Injectable } from '@angular/core'
import { Subject } from 'rxjs'
import { ConfigService } from 'tabby-core'

export interface TranscriptResult {
    transcript: string
    isFinal: boolean
}

@Injectable({ providedIn: 'root' })
export class WebSpeechService {
    private recognition: any = null
    private isListening = false

    public onTranscript = new Subject<TranscriptResult>()
    public onStart = new Subject<void>()
    public onStop = new Subject<void>()
    public onError = new Subject<string>()

    constructor(private config: ConfigService) {
        this.initializeRecognition()
    }

    private initializeRecognition(): void {
        // Check if browser supports Web Speech API
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition

        if (!SpeechRecognition) {
            console.error('Web Speech API is not supported in this browser')
            return
        }

        this.recognition = new SpeechRecognition()

        // Configure recognition
        this.recognition.continuous = true  // Keep listening
        this.recognition.interimResults = true  // Get real-time results
        this.recognition.maxAlternatives = 1

        // Set language from config
        const language = this.config.store.speechToText?.language || 'en-US'
        this.recognition.lang = language

        // Handle results
        this.recognition.onresult = (event: any) => {
            const results = event.results
            const lastResult = results[results.length - 1]

            if (lastResult) {
                const transcript = lastResult[0].transcript
                const isFinal = lastResult.isFinal

                this.onTranscript.next({
                    transcript: transcript,
                    isFinal: isFinal,
                })
            }
        }

        // Handle start
        this.recognition.onstart = () => {
            this.isListening = true
            this.onStart.next()
            console.log('Speech recognition started')
        }

        // Handle end
        this.recognition.onend = () => {
            this.isListening = false
            this.onStop.next()
            console.log('Speech recognition stopped')
        }

        // Handle errors
        this.recognition.onerror = (event: any) => {
            console.error('Speech recognition error:', event.error)
            this.onError.next(`Speech recognition error: ${event.error}`)

            // Don't stop on 'no-speech' error, just continue listening
            if (event.error !== 'no-speech') {
                this.isListening = false
            }
        }
    }

    start(): void {
        if (!this.recognition) {
            this.onError.next('Speech recognition not available')
            return
        }

        if (this.isListening) {
            console.warn('Already listening')
            return
        }

        try {
            this.recognition.start()
        } catch (error) {
            console.error('Failed to start recognition:', error)
            this.onError.next('Failed to start recognition: ' + error)
        }
    }

    stop(): void {
        if (!this.recognition) {
            return
        }

        if (!this.isListening) {
            console.warn('Not currently listening')
            return
        }

        try {
            this.recognition.stop()
        } catch (error) {
            console.error('Failed to stop recognition:', error)
        }
    }

    toggle(): void {
        if (this.isListening) {
            this.stop()
        } else {
            this.start()
        }
    }

    isReady(): boolean {
        return this.recognition !== null
    }

    isCurrentlyListening(): boolean {
        return this.isListening
    }
}
