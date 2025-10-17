import { Injectable } from '@angular/core'
import { BaseTerminalTabComponent } from 'tabby-terminal'
import { AppService } from 'tabby-core'
import { SpeechRecognitionService } from './speech-recognition.service'

@Injectable({ providedIn: 'root' })
export class TerminalIntegrationService {
    private currentTranscript = ''
    private interimTranscript = ''
    private isListening = false

    constructor(
        private app: AppService,
        private speechService: SpeechRecognitionService,
    ) {
        this.setupSpeechHandlers()
    }

    private setupSpeechHandlers(): void {
        // Handle transcript updates (Whisper only provides final results)
        this.speechService.onTranscript.subscribe(result => {
            // Set the transcript
            this.currentTranscript = result.transcript
            this.updateTerminalInput()

            // Auto-submit after transcription completes
            setTimeout(() => {
                this.submitCommand()
            }, 100)
        })

        // Handle recording start
        this.speechService.onStart.subscribe(() => {
            this.isListening = true
            this.currentTranscript = ''
            this.interimTranscript = ''
            this.setupEnterKeyListener()
        })

        // Handle recording stop
        this.speechService.onStop.subscribe(() => {
            this.isListening = false
            this.removeEnterKeyListener()
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

    private updateTerminalInput(): void {
        const terminal = this.getActiveTerminal()
        if (!terminal) {
            return
        }

        // Get the full text to display (final + interim)
        const fullText = this.currentTranscript + this.interimTranscript

        // Send the text to the terminal
        // We need to clear the current input and write the new text
        // This is a simplified approach - you may need to adjust based on Tabby's API
        this.sendToTerminal(fullText)
    }

    private sendToTerminal(text: string): void {
        const terminal = this.getActiveTerminal()
        if (!terminal || !terminal.frontend) {
            return
        }

        // Clear current line and write new text
        // Note: This implementation may need adjustment based on how Tabby handles input
        // We're simulating typing the text
        terminal.frontend.write('\r\x1b[K' + text)
    }

    private enterKeyListener = (event: KeyboardEvent) => {
        if (!this.isListening) {
            return
        }

        if (event.key === 'Enter' || event.code === 'Enter') {
            event.preventDefault()
            event.stopPropagation()

            // Stop recording
            this.speechService.stop()

            // Submit the command
            this.submitCommand()
        }
    }

    private setupEnterKeyListener(): void {
        const terminal = this.getActiveTerminal()
        if (!terminal) {
            return
        }

        // Add keyboard event listener to intercept Enter key
        document.addEventListener('keydown', this.enterKeyListener, true)
    }

    private removeEnterKeyListener(): void {
        document.removeEventListener('keydown', this.enterKeyListener, true)
    }

    private submitCommand(): void {
        const terminal = this.getActiveTerminal()
        if (!terminal) {
            return
        }

        // Send Enter to execute the command
        terminal.sendInput('\n')

        // Clear our transcript buffer
        this.currentTranscript = ''
        this.interimTranscript = ''
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
