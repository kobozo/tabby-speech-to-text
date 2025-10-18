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
    private isActive = false
    private isAvailable = false
    private stream: MediaStream | null = null
    private audioContext: AudioContext | null = null
    private analyser: AnalyserNode | null = null
    private silenceDetectionInterval: any = null
    private lastSoundTime = 0
    private isProcessingChunk = false
    private isRecordingChunk = false
    private hadSpeechInChunk = false  // Track if current chunk had actual speech
    private totalSilenceStartTime: number | null = null  // Track continuous silence
    private recordingStartTime = 0  // Track total recording duration
    private continuousRecordingWarningShown = false

    public onTranscript = new Subject<TranscriptResult>()
    public onStart = new Subject<void>()
    public onStop = new Subject<void>()
    public onError = new Subject<string>()
    public onWarning = new Subject<string>()

    constructor(
        private config: ConfigService,
    ) {
        this.checkAvailability()
        this.requestNotificationPermission()
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

    private async requestNotificationPermission(): Promise<void> {
        if ('Notification' in window && Notification.permission === 'default') {
            try {
                await Notification.requestPermission()
            } catch (error) {
                console.error('Error requesting notification permission:', error)
            }
        }
    }

    private showNotification(title: string, body: string): void {
        if ('Notification' in window) {
            if (Notification.permission === 'granted') {
                try {
                    new Notification(title, {
                        body,
                        icon: 'assets/icons/microphone.png',  // Optional icon
                        tag: 'speech-to-text',  // Prevent duplicate notifications
                    })
                } catch (error) {
                    console.error('Error showing notification:', error)
                }
            } else if (Notification.permission === 'default') {
                // Request permission and retry showing the notification
                Notification.requestPermission().then(permission => {
                    if (permission === 'granted') {
                        try {
                            new Notification(title, {
                                body,
                                icon: 'assets/icons/microphone.png',
                                tag: 'speech-to-text',
                            })
                        } catch (error) {
                            console.error('Error showing notification after permission grant:', error)
                        }
                    }
                }).catch(error => {
                    console.error('Error requesting notification permission:', error)
                })
            }
            // If permission is 'denied', silently skip showing notification
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

        // Validate API key before starting
        const apiKey = this.config.store?.speechToText?.openaiApiKey
        if (!apiKey) {
            this.onError.next('OpenAI API key not configured. Please set it in Settings.')
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

            // Create MediaRecorder (no timeslice - we'll stop/restart for chunks)
            this.mediaRecorder = new MediaRecorder(this.stream, {
                mimeType: 'audio/webm',
            })

            this.lastSoundTime = Date.now()

            this.mediaRecorder.ondataavailable = async (event) => {
                if (event.data.size > 0) {
                    console.log(`[SpeechRecognition] Received complete WebM blob: ${event.data.size} bytes, Had speech: ${this.hadSpeechInChunk}`)

                    // Check minimum blob size (at least 2KB to avoid "too short" errors)
                    const MIN_BLOB_SIZE = 2048
                    if (event.data.size < MIN_BLOB_SIZE) {
                        console.log(`[SpeechRecognition] Skipping chunk - too small (${event.data.size} bytes < ${MIN_BLOB_SIZE} bytes)`)
                    } else if (!this.hadSpeechInChunk) {
                        console.log(`[SpeechRecognition] Skipping chunk - no actual speech detected (only background noise)`)
                    } else {
                        // This blob is a complete WebM file with actual speech
                        await this.transcribeAudio(event.data, false)
                    }

                    // After transcription (or skip), restart recording if still active
                    if (this.isActive && this.mediaRecorder && this.mediaRecorder.state === 'inactive') {
                        console.log('[SpeechRecognition] Restarting recording for next chunk...')
                        this.mediaRecorder.start()
                        this.isRecordingChunk = true
                        this.isProcessingChunk = false
                        this.hadSpeechInChunk = false  // Reset for next chunk
                    } else {
                        // Reset processing flag even if not restarting
                        this.isProcessingChunk = false
                        this.hadSpeechInChunk = false
                    }
                }
            }

            this.mediaRecorder.onstop = async () => {
                console.log('[SpeechRecognition] MediaRecorder stopped (final)')

                // This is the final stop, not a chunk stop
                if (!this.isActive) {
                    // Stop silence detection
                    if (this.silenceDetectionInterval) {
                        clearInterval(this.silenceDetectionInterval)
                        this.silenceDetectionInterval = null
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

                    this.onStop.next()
                }
            }

            // Start recording (no timeslice parameter)
            this.mediaRecorder.start()
            this.isActive = true
            this.isRecordingChunk = true
            this.recordingStartTime = Date.now()
            this.totalSilenceStartTime = null
            this.continuousRecordingWarningShown = false
            this.onStart.next()

            // Show notification that recording started
            this.showNotification('Speech-to-Text Recording Started', 'Speech recognition is now active and will continue even when Tabby is in the background.')

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

        console.log('[SpeechRecognition] Stopping recording...')

        try {
            // CRITICAL: Stop silence detection interval FIRST to prevent it from restarting recording
            if (this.silenceDetectionInterval) {
                clearInterval(this.silenceDetectionInterval)
                this.silenceDetectionInterval = null
                console.log('[SpeechRecognition] Silence detection interval cleared')
            }

            // Mark as inactive BEFORE stopping so onstop knows this is final
            this.isActive = false

            // Reset all timer state to prevent race conditions
            this.totalSilenceStartTime = null
            this.recordingStartTime = 0
            this.continuousRecordingWarningShown = false
            this.hadSpeechInChunk = false
            this.isProcessingChunk = false
            this.isRecordingChunk = false

            // Stop the MediaRecorder (this will trigger onstop handler)
            if (this.mediaRecorder.state !== 'inactive') {
                this.mediaRecorder.stop()
            }
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
        const SILENCE_THRESHOLD = 0.02  // Volume threshold for silence (increased from 0.01)
        const SPEECH_THRESHOLD = 0.05   // Minimum volume to consider as actual speech
        const SILENCE_DURATION = 1500   // 1.5 seconds of silence triggers transcription
        const MIN_RECORDING_DURATION = 1000  // Minimum 1 second of audio before processing
        const MAX_TOTAL_SILENCE_MS = 5 * 60 * 1000  // 5 minutes of total silence
        const MAX_CONTINUOUS_RECORDING_MS = 10 * 60 * 1000  // 10 minutes continuous warning
        let recordingStartTime = Date.now()
        let hasActualSpeech = false  // Track if we detected real speech (not just noise)

        console.log('[SpeechRecognition] Starting silence detection...')
        let logCounter = 0

        this.silenceDetectionInterval = setInterval(() => {
            if (!this.analyser || !this.mediaRecorder) {
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
                const recordingDuration = Date.now() - recordingStartTime
                console.log(`[SpeechRecognition] RMS: ${rms.toFixed(4)}, Recording: ${recordingDuration}ms, Has speech: ${hasActualSpeech}`)
            }

            // Check if there's actual speech (not just background noise)
            if (rms > SPEECH_THRESHOLD) {
                hasActualSpeech = true
                this.hadSpeechInChunk = true  // Mark that this chunk has speech
                this.lastSoundTime = Date.now()
                this.totalSilenceStartTime = null  // Reset total silence timer
            } else if (rms > SILENCE_THRESHOLD) {
                // Still some sound, but not strong enough to be considered speech
                this.lastSoundTime = Date.now()
            } else {
                // Track total silence duration for auto-stop
                if (this.totalSilenceStartTime === null) {
                    this.totalSilenceStartTime = Date.now()
                }
                const totalSilenceDuration = Date.now() - this.totalSilenceStartTime

                // Auto-stop after 5 minutes of total silence
                if (totalSilenceDuration >= MAX_TOTAL_SILENCE_MS) {
                    console.log('[SpeechRecognition] 5 minutes of silence detected - auto-stopping recording')
                    this.showNotification('Speech-to-Text Auto-Stopped', 'Recording stopped after 5 minutes of silence.')
                    this.stop()
                    return
                }
                // Check if silence duration exceeded AND we have enough audio duration
                const silenceDuration = Date.now() - this.lastSoundTime
                const recordingDuration = Date.now() - recordingStartTime

                // Check for continuous recording without significant silence breaks
                const totalRecordingDuration = Date.now() - this.recordingStartTime
                if (totalRecordingDuration >= MAX_CONTINUOUS_RECORDING_MS && !this.continuousRecordingWarningShown) {
                    console.log('[SpeechRecognition] Recording continuously for 10+ minutes - showing warning')
                    const warningMessage = 'Recording has been active for over 10 minutes continuously. Consider stopping if not needed.'
                    this.showNotification('Speech-to-Text Warning', warningMessage)
                    this.onWarning.next(warningMessage)
                    this.continuousRecordingWarningShown = true
                }

                // Only process if we have actual silence AND enough recording time
                // We'll check hasActualSpeech in ondataavailable before sending to API
                if (silenceDuration >= SILENCE_DURATION &&
                    recordingDuration >= MIN_RECORDING_DURATION &&
                    !this.isProcessingChunk &&
                    this.isRecordingChunk &&
                    this.mediaRecorder.state === 'recording') {

                    console.log('[SpeechRecognition] Silence detected! Stopping recorder to process chunk...')
                    console.log(`[SpeechRecognition] Silence: ${silenceDuration}ms, Recording duration: ${recordingDuration}ms, Had speech: ${hasActualSpeech}`)

                    this.isProcessingChunk = true
                    this.isRecordingChunk = false

                    // Stop the recorder - this will trigger ondataavailable with a complete WebM file
                    this.mediaRecorder.stop()

                    // Reset timer and speech detection for next chunk
                    recordingStartTime = Date.now()
                    hasActualSpeech = false
                }
            }
        }, 100)  // Check every 100ms
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
            // Add prompt to reduce hallucinations - tells Whisper to only transcribe actual speech
            formData.append('prompt', 'Transcribe only the speech that is actually spoken. If there is no speech or only silence, return an empty result.')

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
