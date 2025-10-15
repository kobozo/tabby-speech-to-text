import { Injectable } from '@angular/core'
import { HotkeyDescription, HotkeyProvider } from 'tabby-core'
import { TerminalIntegrationService } from '../services/terminal-integration.service'

@Injectable()
export class SpeechHotkeyProvider extends HotkeyProvider {
    hotkeys: HotkeyDescription[] = [
        {
            id: 'speech-to-text-toggle',
            name: 'Toggle speech-to-text',
            defaults: ['Ctrl+Shift+S'],
        },
    ]

    constructor(
        private terminalIntegration: TerminalIntegrationService,
    ) {
        super()
    }

    async provide(): Promise<HotkeyDescription[]> {
        return this.hotkeys
    }
}
