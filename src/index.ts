import { NgModule } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { HotkeyProvider, ConfigProvider, HotkeysService } from 'tabby-core'
import { SettingsTabProvider } from 'tabby-settings'

import { SpeechRecognitionService } from './services/speech-recognition.service'
import { TerminalIntegrationService } from './services/terminal-integration.service'
import { SpeechHotkeyProvider } from './providers/speech-hotkey.provider'
import { SpeechConfigProvider } from './providers/config.provider'
import { SpeechToTextSettingsTabProvider } from './providers/settings-tab.provider'
import { SpeechIndicatorComponent } from './components/speech-indicator.component'
import { SpeechToTextSettingsTabComponent } from './components/settings-tab.component'

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
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
        {
            provide: SettingsTabProvider,
            useClass: SpeechToTextSettingsTabProvider,
            multi: true,
        },
    ],
    declarations: [
        SpeechIndicatorComponent,
        SpeechToTextSettingsTabComponent,
    ],
    exports: [
        SpeechIndicatorComponent,
        SpeechToTextSettingsTabComponent,
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
