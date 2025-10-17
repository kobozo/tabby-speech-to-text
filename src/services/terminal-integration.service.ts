import { Injectable } from '@angular/core'
import { BaseTerminalTabComponent } from 'tabby-terminal'
import { AppService } from 'tabby-core'
import { TransformersWhisperService } from './transformers-whisper.service'
import { BehaviorSubject } from 'rxjs'

@Injectable({ providedIn: 'root' })
export class TerminalIntegrationService {
    private currentTranscript = ''
    private isListening = false
    public isListening$ = new BehaviorSubject<boolean>(false)

    constructor(
        private app: AppService,
        private speechService: TransformersWhisperService,
    ) {
        this.setupSpeechHandlers()
    }

    private setupSpeechHandlers(): void {
        // Handle transcript updates
        this.speechService.onTranscript.subscribe(result => {
            if (result.isFinal) {
                // Only type into terminal when transcription is final
                this.currentTranscript = result.transcript
                this.typeIntoTerminal(result.transcript)
            } else {
                // For interim results, we could show a preview (future enhancement)
                console.log('Interim:', result.transcript)
            }
        })

        // Handle recording start
        this.speechService.onStart.subscribe(() => {
            this.isListening = true
            this.isListening$.next(true)
            this.currentTranscript = ''
            console.log('Terminal integration: Recording started')
        })

        // Handle recording stop
        this.speechService.onStop.subscribe(() => {
            this.isListening = false
            this.isListening$.next(false)
            console.log('Terminal integration: Recording stopped')
        })

        // Handle errors
        this.speechService.onError.subscribe(error => {
            console.error('Speech service error:', error)
            this.isListening = false
            this.isListening$.next(false)
        })
    }

    private getActiveTerminal(): any | null {
        const activeTab = this.app.activeTab

        // Debug logging
        console.log('Active tab:', activeTab)
        console.log('Active tab constructor:', activeTab?.constructor?.name)

        if (!activeTab) {
            return null
        }

        // Check if it's a split tab and get the focused tab from within it
        if (activeTab.constructor?.name === 'SplitTabComponent') {
            const focusedTab = (activeTab as any).getFocusedTab?.()
            console.log('Focused tab from split:', focusedTab)
            console.log('Focused tab constructor:', focusedTab?.constructor?.name)

            if (focusedTab && 'frontend' in focusedTab && 'sendInput' in focusedTab) {
                return focusedTab
            }
        }

        // Check if it's a terminal tab directly
        if ('frontend' in activeTab && 'sendInput' in activeTab) {
            return activeTab
        }

        return null
    }

    private typeIntoTerminal(text: string): void {
        const terminal = this.getActiveTerminal()
        if (!terminal) {
            console.warn('No active terminal found')
            return
        }

        // Send the text character by character to simulate typing
        // This will make it appear in the terminal's input buffer
        terminal.sendInput(text)
    }

    public toggleListening(): void {
        if (!this.speechService.isReady()) {
            console.error('Speech recognition is not available')
            return
        }

        const terminal = this.getActiveTerminal()
        if (!terminal) {
            console.warn('No active terminal tab')
            return
        }

        this.speechService.toggle()
    }

    public isCurrentlyListening(): boolean {
        return this.isListening
    }
}
