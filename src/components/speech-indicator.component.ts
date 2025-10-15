import { Component, OnInit, OnDestroy } from '@angular/core'
import { Subscription } from 'rxjs'
import { SpeechRecognitionService } from '../services/speech-recognition.service'

@Component({
    selector: 'speech-indicator',
    template: `
        <div class="speech-indicator" *ngIf="isRecording">
            <div class="recording-badge">
                <span class="mic-icon">🎤</span>
                <span class="recording-text">Listening...</span>
                <span class="pulse"></span>
            </div>
        </div>
    `,
    styles: [`
        .speech-indicator {
            position: fixed;
            top: 10px;
            right: 10px;
            z-index: 10000;
            pointer-events: none;
        }

        .recording-badge {
            display: flex;
            align-items: center;
            gap: 8px;
            background: rgba(220, 38, 38, 0.9);
            color: white;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: 500;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            animation: slideIn 0.3s ease-out;
        }

        .mic-icon {
            font-size: 16px;
            animation: pulse 1.5s ease-in-out infinite;
        }

        .recording-text {
            user-select: none;
        }

        .pulse {
            width: 8px;
            height: 8px;
            background: white;
            border-radius: 50%;
            animation: pulse 1.5s ease-in-out infinite;
        }

        @keyframes pulse {
            0%, 100% {
                opacity: 1;
                transform: scale(1);
            }
            50% {
                opacity: 0.5;
                transform: scale(1.1);
            }
        }

        @keyframes slideIn {
            from {
                opacity: 0;
                transform: translateY(-20px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
    `],
})
export class SpeechIndicatorComponent implements OnInit, OnDestroy {
    isRecording = false
    private subscriptions: Subscription[] = []

    constructor(
        private speechService: SpeechRecognitionService,
    ) {}

    ngOnInit(): void {
        // Subscribe to recording state changes
        this.subscriptions.push(
            this.speechService.onStart.subscribe(() => {
                this.isRecording = true
            }),
        )

        this.subscriptions.push(
            this.speechService.onStop.subscribe(() => {
                this.isRecording = false
            }),
        )
    }

    ngOnDestroy(): void {
        this.subscriptions.forEach(sub => sub.unsubscribe())
    }
}
