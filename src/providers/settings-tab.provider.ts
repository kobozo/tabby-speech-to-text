import { Injectable } from '@angular/core'
import { SettingsTabProvider } from 'tabby-settings'
import { SpeechToTextSettingsTabComponent } from '../components/settings-tab.component'

@Injectable()
export class SpeechToTextSettingsTabProvider extends SettingsTabProvider {
    id = 'speech-to-text'
    icon = 'microphone'
    title = 'Speech-to-Text'
    prioritized = false

    getComponentType(): any {
        return SpeechToTextSettingsTabComponent
    }
}
