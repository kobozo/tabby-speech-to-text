import { NgModule } from '@angular/core'
import { CommonModule } from '@angular/common'
import { HotkeyProvider, ConfigProvider, BootstrapData, BOOTSTRAP_DATA } from 'tabby-core'

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
        private bootstrapData: BootstrapData,
    ) {
        // Register hotkey handler
        this.bootstrapData.registerHotkeyHandler('speech-to-text-toggle', () => {
            this.terminalIntegration.toggleListening()
        })
    }
}
