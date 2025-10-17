import { Injectable } from '@angular/core'
import { ToolbarButtonProvider, ToolbarButton } from 'tabby-core'
import { TerminalIntegrationService } from '../services/terminal-integration.service'

@Injectable()
export class SpeechToTextToolbarButtonProvider extends ToolbarButtonProvider {
    private buttons: ToolbarButton[] = []

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
        const button: ToolbarButton = {
            icon: this.getMicIcon(false),
            title: 'Toggle Speech-to-Text',
            weight: 5,
            click: () => {
                this.terminalIntegration.toggleListening()
            },
        }
        this.buttons = [button]
        return this.buttons
    }

    private updateButtonIcon(isRecording: boolean): void {
        console.log('[SpeechToText] Updating button icon, isRecording:', isRecording)
        console.log('[SpeechToText] Button instances:', this.buttons.length)

        // Update all button instances
        this.buttons.forEach((button, index) => {
            const newIcon = this.getMicIcon(isRecording)
            console.log(`[SpeechToText] Button ${index} old icon length:`, button.icon?.length)
            console.log(`[SpeechToText] Button ${index} new icon length:`, newIcon.length)
            button.icon = newIcon
            button.title = isRecording ? 'Stop Recording (Recording...)' : 'Toggle Speech-to-Text'
        })
    }

    private getMicIcon(isRecording: boolean): string {
        const color = isRecording ? '#ef4444' : '#6b7280'
        const strokeColor = isRecording ? '#dc2626' : 'none'
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}" stroke="${strokeColor}" stroke-width="${isRecording ? '1' : '0'}">
            <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
            <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
            ${isRecording ? '<circle cx="12" cy="12" r="3" fill="#fee2e2" opacity="0.6"><animate attributeName="r" values="3;4;3" dur="1s" repeatCount="indefinite"/><animate attributeName="opacity" values="0.6;0.3;0.6" dur="1s" repeatCount="indefinite"/></circle>' : ''}
        </svg>`
    }
}
