import { Component } from '@angular/core'
import { ConfigService } from 'tabby-core'

@Component({
    template: `
        <div class="p-3">
            <h3 class="mb-3">Speech-to-Text Settings</h3>

            <div class="form-group">
                <label>OpenAI API Key</label>
                <input
                    type="password"
                    class="form-control"
                    [(ngModel)]="config.store.speechToText.openaiApiKey"
                    (ngModelChange)="save()"
                    placeholder="sk-...">
                <small class="form-text text-muted">
                    Your OpenAI API key for Whisper transcription. Get one at
                    <a href="https://platform.openai.com/api-keys" target="_blank">platform.openai.com/api-keys</a>
                </small>
            </div>

            <div class="form-group mt-3">
                <label>Language</label>
                <select
                    class="form-control"
                    [(ngModel)]="config.store.speechToText.language"
                    (ngModelChange)="save()">
                    <option value="en">English</option>
                    <option value="es">Spanish</option>
                    <option value="fr">French</option>
                    <option value="de">German</option>
                    <option value="it">Italian</option>
                    <option value="pt">Portuguese</option>
                    <option value="nl">Dutch</option>
                    <option value="ru">Russian</option>
                    <option value="ja">Japanese</option>
                    <option value="zh">Chinese</option>
                </select>
                <small class="form-text text-muted">
                    Language for speech recognition
                </small>
            </div>

            <div class="form-check mt-3">
                <input
                    type="checkbox"
                    class="form-check-input"
                    id="showIndicator"
                    [(ngModel)]="config.store.speechToText.showIndicator"
                    (ngModelChange)="save()">
                <label class="form-check-label" for="showIndicator">
                    Show recording indicator
                </label>
            </div>

            <div class="alert alert-info mt-3">
                <strong>Usage:</strong>
                <ul class="mb-0">
                    <li>Press <kbd>Ctrl+Shift+S</kbd> (or <kbd>Cmd+Shift+S</kbd> on Mac) to start recording</li>
                    <li>Speak your command</li>
                    <li>Press the hotkey again to stop and transcribe</li>
                    <li>The command will be automatically entered in your terminal</li>
                </ul>
            </div>

            <div class="alert alert-warning mt-3" *ngIf="!config.store.speechToText.openaiApiKey">
                <strong>API Key Required:</strong> Please configure your OpenAI API key above to use speech-to-text.
            </div>
        </div>
    `,
})
export class SpeechToTextSettingsTabComponent {
    constructor(
        public config: ConfigService,
    ) {}

    save(): void {
        this.config.save()
    }
}
