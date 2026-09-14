import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService, ValidationResult } from '../../services/api.service';

@Component({
  selector: 'app-result',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page" *ngIf="result">
      <div class="page-header">
        <button class="back-btn" (click)="router.navigate(['/validate'])">
          ← New validation
        </button>
        <div class="header-right">
          <span class="llm-badge" [class]="result.llm_source">
            {{ result.llm_source === 'openai' ? 'GPT-4o' : 'Ollama' }}
          </span>
          <span class="timestamp">{{ result.timestamp | date:'dd MMM yyyy, HH:mm' }}</span>
        </div>
      </div>

      <!-- Risk Banner -->
      <div class="risk-banner" [class]="'risk-' + result.risk_level">
        <div class="risk-score-circle">
          <span class="score-value">{{ (result.risk_score * 100).toFixed(0) }}</span>
          <span class="score-label">/ 100</span>
        </div>
        <div class="risk-info">
          <div class="risk-level-text">{{ result.risk_level | titlecase }} Risk</div>
          <div class="package-name">{{ result.package_name }}</div>
          <div class="badges-row">
            <span class="badge" [class.badge-ok]="result.rollback_safe" [class.badge-err]="!result.rollback_safe">
              {{ result.rollback_safe ? 'Rollback safe' : 'Rollback risky' }}
            </span>
            <span class="badge" [class.badge-ok]="result.un_r156_compliant" [class.badge-err]="!result.un_r156_compliant">
              {{ result.un_r156_compliant ? 'UN R156 compliant' : 'UN R156 gaps found' }}
            </span>
            <span class="badge badge-neutral" *ngIf="result.package_size_kb > 0">
              {{ result.package_size_kb.toFixed(1) }} KB
            </span>
          </div>
        </div>
      </div>

      <div class="two-col">
        <!-- Left column -->
        <div class="col">
          <div class="card">
            <div class="card-title">Summary</div>
            <p class="body-text">{{ result.summary }}</p>
          </div>

          <div class="card">
            <div class="card-title">Recommendation</div>
            <p class="body-text recommendation">{{ result.recommendation }}</p>
          </div>

          <div class="card" *ngIf="result.affected_ecus.length > 0">
            <div class="card-title">Affected ECUs</div>
            <div class="ecu-list">
              <div *ngFor="let ecu of result.affected_ecus" class="ecu-item">
                <div class="ecu-header">
                  <span class="ecu-name">{{ ecu.ecu_name }}</span>
                  <span class="ecu-type">{{ ecu.impact_type }}</span>
                  <span class="ecu-safety" *ngIf="ecu.safety_critical">SAFETY CRITICAL</span>
                </div>
                <div class="ecu-desc">{{ ecu.description }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Right column -->
        <div class="col">
          <div class="card">
            <div class="card-title">Analysis metadata</div>
            <div class="meta-list">
              <div class="meta-item">
                <span class="meta-key">Validation ID</span>
                <span class="meta-val mono">{{ result.id.split('-')[0] }}...</span>
              </div>
              <div class="meta-item">
                <span class="meta-key">LLM used</span>
                <span class="meta-val">{{ result.llm_source === 'openai' ? 'GPT-4o (OpenAI)' : 'Mistral (Ollama)' }}</span>
              </div>
              <div class="meta-item">
                <span class="meta-key">Tokens used</span>
                <span class="meta-val">{{ result.tokens_used }}</span>
              </div>
              <div class="meta-item">
                <span class="meta-key">Risk score</span>
                <span class="meta-val">{{ result.risk_score.toFixed(3) }}</span>
              </div>
            </div>
          </div>

          <div class="card" *ngIf="result.context_docs_used.length > 0">
            <div class="card-title">Knowledge base sources</div>
            <div class="source-list">
              <div *ngFor="let src of result.context_docs_used" class="source-item">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                {{ src }}
              </div>
            </div>
          </div>

          <!-- Risk gauge -->
          <div class="card gauge-card">
            <div class="card-title">Risk gauge</div>
            <div class="gauge-bar-bg">
              <div class="gauge-bar-fill" [style.width.%]="result.risk_score * 100" [class]="'gauge-' + result.risk_level"></div>
            </div>
            <div class="gauge-labels">
              <span>Safe</span><span>Low</span><span>Med</span><span>High</span><span>Critical</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="loading-state" *ngIf="!result && !error">
      <div class="spinner-large"></div>
      <p>Loading result...</p>
    </div>
    <div class="error-state" *ngIf="error">{{ error }}</div>
  `,
  styles: [`
    .page { max-width: 960px; }
    .page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; }
    .back-btn { background: none; border: 1px solid var(--border); padding: 8px 14px; border-radius: 8px; cursor: pointer; color: var(--text-secondary); font-size: 13px; }
    .back-btn:hover { background: var(--hover); }
    .header-right { display: flex; align-items: center; gap: 12px; }
    .timestamp { font-size: 13px; color: var(--text-muted); }

    .llm-badge { font-size: 11px; padding: 4px 10px; border-radius: 20px; font-weight: 700; }
    .llm-badge.ollama { background: #e8f5e9; color: #2e7d32; }
    .llm-badge.openai { background: #e3f2fd; color: #1565c0; }

    .risk-banner {
      border-radius: 12px; padding: 28px; margin-bottom: 24px;
      display: flex; gap: 24px; align-items: center;
    }
    .risk-low { background: var(--success-soft); border: 1px solid var(--success-border); }
    .risk-medium { background: var(--warning-soft); border: 1px solid var(--warning-border); }
    .risk-high { background: #fff3e0; border: 1px solid #f57c00; }
    .risk-critical { background: var(--danger-soft); border: 1px solid var(--danger-border); }

    .risk-score-circle {
      width: 88px; height: 88px; border-radius: 50%; background: rgba(255,255,255,0.5);
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      min-width: 88px;
    }
    .score-value { font-size: 28px; font-weight: 800; line-height: 1; }
    .score-label { font-size: 11px; color: var(--text-muted); }
    .risk-level-text { font-size: 22px; font-weight: 700; margin-bottom: 4px; }
    .package-name { font-size: 13px; color: var(--text-muted); margin-bottom: 12px; font-family: monospace; }
    .badges-row { display: flex; gap: 8px; flex-wrap: wrap; }
    .badge { font-size: 11px; padding: 3px 10px; border-radius: 20px; font-weight: 600; }
    .badge-ok { background: var(--success-soft); color: var(--success); }
    .badge-err { background: var(--danger-soft); color: var(--danger); }
    .badge-neutral { background: var(--hover); color: var(--text-muted); }

    .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .col { display: flex; flex-direction: column; gap: 16px; }

    .card { background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 20px; }
    .card-title { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: var(--text-muted); margin-bottom: 12px; }
    .body-text { color: var(--text-primary); font-size: 14px; line-height: 1.6; margin: 0; }
    .recommendation { color: var(--accent); font-weight: 500; }

    .ecu-list { display: flex; flex-direction: column; gap: 12px; }
    .ecu-item { padding: 12px; background: var(--bg); border-radius: 8px; border: 1px solid var(--border); }
    .ecu-header { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; flex-wrap: wrap; }
    .ecu-name { font-weight: 600; font-size: 13px; }
    .ecu-type { font-size: 11px; background: var(--hover); padding: 2px 8px; border-radius: 4px; color: var(--text-muted); }
    .ecu-safety { font-size: 10px; background: var(--danger-soft); color: var(--danger); padding: 2px 8px; border-radius: 4px; font-weight: 700; letter-spacing: 0.5px; }
    .ecu-desc { font-size: 12px; color: var(--text-muted); }

    .meta-list { display: flex; flex-direction: column; gap: 10px; }
    .meta-item { display: flex; justify-content: space-between; align-items: center; font-size: 13px; }
    .meta-key { color: var(--text-muted); }
    .meta-val { font-weight: 600; color: var(--text-primary); }
    .mono { font-family: monospace; font-size: 12px; }

    .source-list { display: flex; flex-direction: column; gap: 8px; }
    .source-item { display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--text-secondary); }

    .gauge-bar-bg { height: 10px; background: var(--hover); border-radius: 10px; overflow: hidden; margin-bottom: 8px; }
    .gauge-bar-fill { height: 100%; border-radius: 10px; transition: width 0.8s ease; }
    .gauge-low { background: var(--success); }
    .gauge-medium { background: var(--warning); }
    .gauge-high { background: #f57c00; }
    .gauge-critical { background: var(--danger); }
    .gauge-labels { display: flex; justify-content: space-between; font-size: 11px; color: var(--text-muted); }

    .loading-state, .error-state { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 300px; gap: 16px; color: var(--text-muted); }
    .spinner-large { width: 40px; height: 40px; border: 3px solid var(--border); border-top-color: var(--accent); border-radius: 50%; animation: spin 0.8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
  `]
})
export class ResultComponent implements OnInit {
  result: ValidationResult | null = null;
  error = '';

  constructor(
    private route: ActivatedRoute,
    public router: Router,
    private api: ApiService
  ) {}

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.api.getValidation(id).subscribe({
      next: (r) => this.result = r,
      error: () => this.error = 'Result not found.'
    });
  }
}
