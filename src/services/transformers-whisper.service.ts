import { Injectable } from '@angular/core'
import { pipeline } from '@xenova/transformers'
import { Subject } from 'rxjs'
import { ConfigService } from 'tabby-core'

export interface TranscriptResult {
    transcript: string
    isFinal: boolean
}

@Injectable({ providedIn: 'root' })
export class TransformersWhisperService {
    private transcriber: any = null
    private isModelLoaded = false
    private modelLoadProgress = 0
    private mediaRecorder: MediaRecorder | null = null
    private audioChunks: Blob[] = []
    private stream: MediaStream | null = null

    public onTranscript = new Subject<TranscriptResult>()
    public onStart = new Subject<void>()
    public onStop = new Subject<void>()
    public onModelProgress = new Subject<number>()
    public onError = new Subject<string>()

    constructor(private config: ConfigService) {}

    async ensureModelLoaded(): Promise<void> {
        if (this.isModelLoaded) return

        try {
            console.log('Loading Whisper model...')
            const modelName = this.config.store.speechToText?.whisperModel || 'Xenova/whisper-tiny.en'

            this.transcriber = await pipeline(
                'automatic-speech-recognition',
                modelName,
                {
                    quantized: true,
                    progress_callback: (progress: any) => {
                        if (progress.status === 'progress') {
                            const percent = Math.round((progress.loaded / progress.total) * 100)
                            this.modelLoadProgress = percent
                            this.onModelProgress.next(percent)
                            console.log(`Model loading: ${percent}%`)
                        }
                    },
                },
            )

            this.isModelLoaded = true
            this.onModelProgress.next(100)
            console.log('Whisper model loaded successfully')
        } catch (error) {
            console.error('Failed to load model:', error)
            this.onError.next('Failed to load speech recognition model: ' + error)
            throw error
        }
    }

    async start(): Promise<void> {
        // Ensure model is loaded first
        await this.ensureModelLoaded()

        try {
            this.stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                },
            })

            this.mediaRecorder = new MediaRecorder(this.stream, {
                mimeType: 'audio/webm',
            })

            this.audioChunks = []

            this.mediaRecorder.ondataavailable = (event: BlobEvent) => {
                if (event.data.size > 0) {
                    this.audioChunks.push(event.data)
                }
            }

            this.mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' })
                await this.transcribeAudio(audioBlob)

                // Clean up stream
                if (this.stream) {
                    this.stream.getTracks().forEach(track => track.stop())
                    this.stream = null
                }
            }

            this.mediaRecorder.start()
            this.onStart.next()
            console.log('Recording started')
        } catch (error) {
            console.error('Failed to start recording:', error)
            this.onError.next('Failed to start recording: ' + error)
        }
    }

    stop(): void {
        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            this.mediaRecorder.stop()
            this.onStop.next()
            console.log('Recording stopped')
        }
    }

    private async transcribeAudio(audioBlob: Blob): Promise<void> {
        if (!this.isModelLoaded) {
            this.onError.next('Model not loaded')
            return
        }

        try {
            console.log('Transcribing audio...')
            const arrayBuffer = await audioBlob.arrayBuffer()

            const language = this.config.store.speechToText?.language || 'en'
            const output = await this.transcriber(arrayBuffer, {
                language: language,
                return_timestamps: 'word',
                chunk_length_s: 30,
                stride_length_s: 5,
            })

            console.log('Transcription output:', output)

            // Simulate streaming by emitting words progressively
            if (output.chunks && output.chunks.length > 0) {
                let accumulatedText = ''
                for (const chunk of output.chunks) {
                    accumulatedText += chunk.text + ' '
                    this.onTranscript.next({
                        transcript: accumulatedText.trim(),
                        isFinal: false,
                    })
                    // Small delay for visual streaming effect
                    await new Promise(resolve => setTimeout(resolve, 30))
                }
            }

            // Emit final result
            this.onTranscript.next({
                transcript: output.text.trim(),
                isFinal: true,
            })

            console.log('Transcription complete:', output.text)
        } catch (error) {
            console.error('Transcription error:', error)
            this.onError.next('Transcription failed: ' + error)
        }
    }

    toggle(): void {
        if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
            this.stop()
        } else {
            this.start()
        }
    }

    getModelLoadProgress(): number {
        return this.modelLoadProgress
    }

    isReady(): boolean {
        return this.isModelLoaded
    }
}
