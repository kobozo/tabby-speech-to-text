import { NgModule } from '@angular/core'
import { CommonModule } from '@angular/common'
import { HotkeyProvider, ConfigProvider, HotkeysService } from 'tabby-core'

import { SpeechRecognitionService } from './services/speech-recognition.service'
import { TerminalIntegrationService } from './services/terminal-integration.service'
import { SpeechHotkeyProvider } from './providers/speech-hotkey.provider'
import { SpeechConfigProvider } from './providers/config.provider'
import { SpeechIndicatorComponent } from './components/speech-indicator.component'

@NgModule({
    imports: [
        CommonModule,
    ],
    providers: [
        // Services
        SpeechRecognitionService,
        TerminalIntegrationService,

        // Providers
        {
            provide: HotkeyProvider,
            useClass: SpeechHotkeyProvider,
            multi: true,
        },
        {
            provide: ConfigProvider,
            useClass: SpeechConfigProvider,
            multi: true,
        },
    ],
    declarations: [
        SpeechIndicatorComponent,
    ],
    exports: [
        SpeechIndicatorComponent,
    ],
})
export default class SpeechToTextModule {
    constructor(
        private terminalIntegration: TerminalIntegrationService,
        private hotkeys: HotkeysService,
    ) {
        // Register hotkey handler
        this.hotkeys.hotkey$.subscribe(hotkey => {
            if (hotkey === 'speech-to-text-toggle') {
                this.terminalIntegration.toggleListening()
            }
        })
    }
}
