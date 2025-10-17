import { Injectable } from '@angular/core'
import { ToolbarButtonProvider, ToolbarButton } from 'tabby-core'
import { TerminalIntegrationService } from '../services/terminal-integration.service'

@Injectable()
export class SpeechToTextToolbarButtonProvider extends ToolbarButtonProvider {
    private button: ToolbarButton | null = null

    constructor(
        private terminalIntegration: TerminalIntegrationService,
    ) {
        super()

        // Subscribe to recording state changes to update button appearance
        this.terminalIntegration.isListening$.subscribe(isListening => {
            this.updateButtonIcon(isListening)
        })
    }

    provide(): ToolbarButton[] {
        this.button = {
            icon: this.getMicIcon(false),
            title: 'Toggle Speech-to-Text',
            weight: 5,
            click: () => {
                this.terminalIntegration.toggleListening()
            },
        }
        return [this.button]
    }

    private updateButtonIcon(isRecording: boolean): void {
        if (this.button) {
            this.button.icon = this.getMicIcon(isRecording)
        }
    }

    private getMicIcon(isRecording: boolean): string {
        const color = isRecording ? '#dc2626' : 'currentColor'
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}">
            <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
            <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
            ${isRecording ? '<circle cx="12" cy="12" r="2" fill="white" opacity="0.8"><animate attributeName="opacity" values="0.8;0.3;0.8" dur="1.5s" repeatCount="indefinite"/></circle>' : ''}
        </svg>`
    }
}
