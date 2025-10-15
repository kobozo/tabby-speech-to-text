import { Injectable } from '@angular/core'
import { Subject } from 'rxjs'

// Extend Window interface for SpeechRecognition
declare global {
    interface Window {
        SpeechRecognition: any
        webkitSpeechRecognition: any
    }
}

export interface TranscriptResult {
    transcript: string
    isFinal: boolean
}

@Injectable({ providedIn: 'root' })
export class SpeechRecognitionService {
    private recognition: any
    private isActive = false
    private isAvailable = false

    public onTranscript = new Subject<TranscriptResult>()
    public onStart = new Subject<void>()
    public onStop = new Subject<void>()
    public onError = new Subject<string>()

    constructor() {
        this.initializeSpeechRecognition()
    }

    private initializeSpeechRecognition(): void {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition

        if (!SpeechRecognition) {
            console.error('Speech recognition not supported in this browser')
            this.isAvailable = false
            return
        }

        this.isAvailable = true
        this.recognition = new SpeechRecognition()

        // Configure recognition
        this.recognition.continuous = true // Keep listening until stopped
        this.recognition.interimResults = true // Get results as user speaks
        this.recognition.lang = 'en-US' // TODO: Make configurable
        this.recognition.maxAlternatives = 1

        // Event handlers
        this.recognition.onstart = () => {
            this.isActive = true
            this.onStart.next()
        }

        this.recognition.onend = () => {
            this.isActive = false
            this.onStop.next()
        }

        this.recognition.onerror = (event: any) => {
            console.error('Speech recognition error:', event.error)
            this.onError.next(event.error)
            this.isActive = false
        }

        this.recognition.onresult = (event: any) => {
            const result = event.results[event.results.length - 1]
            const transcript = result[0].transcript
            const isFinal = result.isFinal

            this.onTranscript.next({ transcript, isFinal })
        }
    }

    public isReady(): boolean {
        return this.isAvailable
    }

    public isRecording(): boolean {
        return this.isActive
    }

    public start(): void {
        if (!this.isAvailable) {
            this.onError.next('Speech recognition not available')
            return
        }

        if (this.isActive) {
            console.warn('Speech recognition already active')
            return
        }

        try {
            this.recognition.start()
        } catch (error) {
            console.error('Failed to start speech recognition:', error)
            this.onError.next('Failed to start recognition')
        }
    }

    public stop(): void {
        if (!this.isActive) {
            return
        }

        try {
            this.recognition.stop()
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

    public setLanguage(lang: string): void {
        if (this.recognition) {
            this.recognition.lang = lang
        }
    }
}
