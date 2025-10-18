import { Injectable, OnDestroy } from '@angular/core'
import { BaseTerminalTabComponent } from 'tabby-terminal'
import { AppService } from 'tabby-core'
import { SpeechRecognitionService } from './speech-recognition.service'
import { BehaviorSubject, Subscription } from 'rxjs'

@Injectable({ providedIn: 'root' })
export class TerminalIntegrationService implements OnDestroy {
    private currentTranscript = ''
    private interimTranscript = ''
    private isListening = false
    public isListening$ = new BehaviorSubject<boolean>(false)
    private activeTerminalWhenStarted: any | null = null
    private subscriptions: Subscription[] = []

    constructor(
        private app: AppService,
        private speechService: SpeechRecognitionService,
    ) {
        this.setupSpeechHandlers()
        this.setupTerminalMonitoring()
    }

    private setupSpeechHandlers(): void {
        // Handle transcript updates (both interim and final)
        this.subscriptions.push(
            this.speechService.onTranscript.subscribe(result => {
                if (result.isFinal) {
                    // Final result - type into terminal
                    console.log('Final transcript:', result.transcript)
                    this.currentTranscript = result.transcript
                    this.typeIntoTerminal(result.transcript)
                    this.interimTranscript = ''
                } else {
                    // Interim result - type into terminal with space after
                    console.log('Interim transcript:', result.transcript)
                    this.interimTranscript = result.transcript
                    this.typeIntoTerminal(result.transcript + ' ')
                }
            })
        )

        // Handle recording start
        this.subscriptions.push(
            this.speechService.onStart.subscribe(() => {
                this.isListening = true
                this.isListening$.next(true)
                this.currentTranscript = ''
                this.interimTranscript = ''
                this.activeTerminalWhenStarted = this.getActiveTerminal()
                console.log('Terminal integration: Speech recognition started')
            })
        )

        // Handle recording stop
        this.subscriptions.push(
            this.speechService.onStop.subscribe(() => {
                this.isListening = false
                this.isListening$.next(false)
                this.activeTerminalWhenStarted = null
                console.log('Terminal integration: Speech recognition stopped')
            })
        )

        // Handle errors
        this.subscriptions.push(
            this.speechService.onError.subscribe(error => {
                console.error('Speech service error:', error)
                // Don't stop listening on 'no-speech' errors
                if (!error.includes('no-speech')) {
                    this.isListening = false
                    this.isListening$.next(false)
                }
            })
        )

        // Handle warnings
        this.subscriptions.push(
            this.speechService.onWarning.subscribe(warning => {
                console.warn('Speech service warning:', warning)
                // Warnings are informational only, don't stop listening
            })
        )
    }

    private setupTerminalMonitoring(): void {
        // Monitor for terminal tab closures
        this.subscriptions.push(
            this.app.tabClosed$.subscribe(closedTab => {
                // If recording is active and the active terminal was closed, stop recording
                if (this.isListening && this.activeTerminalWhenStarted) {
                    // Check if the SPECIFIC terminal we started on was closed
                    if (closedTab === this.activeTerminalWhenStarted) {
                        console.log('Terminal integration: Active terminal closed, stopping recording')
                        this.speechService.stop()
                    }
                }
            })
        )
    }

    ngOnDestroy(): void {
        // Clean up all subscriptions to prevent memory leaks
        this.subscriptions.forEach(sub => sub.unsubscribe())
        this.subscriptions = []
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
