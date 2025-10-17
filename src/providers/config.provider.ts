import { Injectable } from '@angular/core'
import { ConfigProvider } from 'tabby-core'

export interface SpeechToTextConfig {
    enabled: boolean
    language: string
    showIndicator: boolean
    openaiApiKey: string
}

@Injectable()
export class SpeechConfigProvider extends ConfigProvider {
    defaults = {
        hotkeys: {
            'speech-to-text-toggle': ['Ctrl-Shift-S'],
        },
        speechToText: {
            enabled: true,
            language: 'en',
            showIndicator: true,
            openaiApiKey: '',
        },
    }

    platformDefaults = {}

    hintTemplates = {}
}
