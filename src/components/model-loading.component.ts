import { Component, OnInit, OnDestroy } from '@angular/core'
import { Subscription } from 'rxjs'
import { TransformersWhisperService } from '../services/transformers-whisper.service'

@Component({
    selector: 'model-loading-indicator',
    template: `
        <div class="model-loading-overlay" *ngIf="isLoading && progress < 100">
            <div class="loading-card">
                <div class="loading-content">
                    <h3>Loading Speech Recognition Model</h3>
                    <p>Downloading model for offline use... This only happens once.</p>
                    <div class="progress-bar">
                        <div class="progress-fill" [style.width.%]="progress"></div>
                    </div>
                    <p class="progress-text">{{ progress }}%</p>
                </div>
            </div>
        </div>
    `,
    styles: [`
        .model-loading-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10001;
            animation: fadeIn 0.3s ease-out;
        }

        .loading-card {
            background: var(--bs-body-bg, #1e1e1e);
            border: 1px solid var(--bs-border-color, #444);
            border-radius: 8px;
            padding: 32px;
            max-width: 500px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
        }

        .loading-content h3 {
            margin: 0 0 16px 0;
            color: var(--bs-body-color, #fff);
            font-size: 20px;
            font-weight: 600;
        }

        .loading-content p {
            margin: 0 0 20px 0;
            color: var(--bs-secondary-color, #aaa);
            font-size: 14px;
        }

        .progress-bar {
            width: 100%;
            height: 8px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 4px;
            overflow: hidden;
            margin-bottom: 12px;
        }

        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #3b82f6, #8b5cf6);
            transition: width 0.3s ease-out;
            border-radius: 4px;
        }

        .progress-text {
            text-align: center;
            font-size: 18px;
            font-weight: 600;
            color: var(--bs-body-color, #fff);
            margin: 0;
        }

        @keyframes fadeIn {
            from {
                opacity: 0;
            }
            to {
                opacity: 1;
            }
        }
    `],
})
export class ModelLoadingComponent implements OnInit, OnDestroy {
    isLoading = false
    progress = 0
    private subscriptions: Subscription[] = []

    constructor(
        private whisperService: TransformersWhisperService,
    ) {}

    ngOnInit(): void {
        this.subscriptions.push(
            this.whisperService.onModelProgress.subscribe(progress => {
                this.isLoading = true
                this.progress = progress

                if (progress >= 100) {
                    // Hide after a short delay
                    setTimeout(() => {
                        this.isLoading = false
                    }, 500)
                }
            }),
        )
    }

    ngOnDestroy(): void {
        this.subscriptions.forEach(sub => sub.unsubscribe())
    }
}
