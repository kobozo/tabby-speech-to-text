import { Injectable } from '@angular/core'
import { ConfigProvider } from 'tabby-core'

export interface SpeechToTextConfig {
    enabled: boolean
    language: string
    hotkey: string
    showIndicator: boolean
}

@Injectable()
export class SpeechConfigProvider extends ConfigProvider {
    defaults = {
        speechToText: {
            enabled: true,
            language: 'en-US',
            hotkey: 'Ctrl+Shift+S',
            showIndicator: true,
        },
    }

    platformDefaults = {}

    hintTemplates = {}
}
