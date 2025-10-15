import { Injectable } from '@angular/core'
import { HotkeyDescription, HotkeyProvider } from 'tabby-core'

@Injectable()
export class SpeechHotkeyProvider extends HotkeyProvider {
    hotkeys: HotkeyDescription[] = [
        {
            id: 'speech-to-text-toggle',
            name: 'Toggle speech-to-text',
        },
    ]

    async provide(): Promise<HotkeyDescription[]> {
        return this.hotkeys
    }
}
