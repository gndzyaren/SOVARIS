import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService, DailyStats } from '../../services/api.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page">
      <div class="page-header">
        <h1>Dashboard</h1>
        <span class="today-label">Today</span>
      </div>

      <div class="stats-grid" *ngIf="stats">
        <div class="stat-card">
          <div class="stat-value">{{ stats.total_validations }}</div>
          <div class="stat-label">Validations today</div>
        </div>
        <div class="stat-card" [class.warn]="stats.high_risk_count > 0">
          <div class="stat-value">{{ stats.high_risk_count }}</div>
          <div class="stat-label">High / critical risk</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ (stats.avg_risk_score * 100).toFixed(0) }}</div>
          <div class="stat-label">Avg risk score</div>
        </div>
        <div class="stat-card" [class.warn]="tokenPct > 80">
          <div class="stat-value">{{ stats.openai_tokens_used.toLocaleString() }}</div>
          <div class="stat-label">OpenAI tokens used</div>
          <div class="token-bar">
            <div class="token-fill" [style.width.%]="tokenPct"></div>
          </div>
          <div class="token-limit">Limit: {{ stats.openai_token_limit.toLocaleString() }}</div>
        </div>
      </div>

      <div class="info-section">
        <div class="info-card">
          <div class="info-title">LLM Routing logic</div>
          <div class="routing-diagram">
            <div class="route-node ollama">
              <div class="node-label">Ollama</div>
              <div class="node-sub">Local · Free · Fast</div>
            </div>
            <div class="route-arrows">
              <div class="route-row">
                <span class="cond low">complexity &lt; 0.7</span>
                <span class="arrow-left">←</span>
              </div>
              <div class="route-row">
                <span class="arrow-right">→</span>
                <span class="cond high">complexity ≥ 0.7</span>
              </div>
            </div>
            <div class="route-node openai">
              <div class="node-label">OpenAI</div>
              <div class="node-sub">GPT-4o · Powerful</div>
            </div>
          </div>
          <p class="info-desc">
            Complexity is computed from package metadata: ECU type keywords (ABS, ADAS, powertrain), file size, and safety-critical markers.
            This keeps OpenAI token usage minimal while ensuring critical updates get the most capable model.
          </p>
        </div>

        <div class="info-card">
          <div class="info-title">RAG knowledge base</div>
          <div class="doc-list">
            <div class="doc-item" *ngFor="let doc of knowledgeDocs">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/></svg>
              <span>{{ doc }}</span>
            </div>
          </div>
          <p class="info-desc">
            Add custom AUTOSAR specs, internal ECU documentation, or company-specific CVE reports to
            <code>backend/data/knowledge_base/</code> — the pipeline reloads on restart.
          </p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page { max-width: 900px; }
    .page-header { display: flex; align-items: center; gap: 16px; margin-bottom: 28px; }
    h1 { font-size: 24px; font-weight: 700; margin: 0; }
    .today-label { font-size: 12px; background: var(--hover); padding: 4px 12px; border-radius: 20px; color: var(--text-muted); font-weight: 600; }

    .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
    .stat-card {
      background: var(--surface); border: 1px solid var(--border); border-radius: 12px;
      padding: 20px; display: flex; flex-direction: column; gap: 4px;
    }
    .stat-card.warn { border-color: var(--warning-border); }
    .stat-value { font-size: 32px; font-weight: 800; color: var(--text-primary); line-height: 1; }
    .stat-label { font-size: 12px; color: var(--text-muted); margin-top: 4px; }
    .token-bar { height: 4px; background: var(--hover); border-radius: 4px; margin-top: 10px; overflow: hidden; }
    .token-fill { height: 100%; background: var(--accent); border-radius: 4px; transition: width 0.5s; }
    .token-limit { font-size: 11px; color: var(--text-muted); margin-top: 4px; }

    .info-section { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .info-card { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 24px; }
    .info-title { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: var(--text-muted); margin-bottom: 20px; }

    .routing-diagram { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
    .route-node { padding: 12px 16px; border-radius: 10px; text-align: center; flex: 1; }
    .route-node.ollama { background: #e8f5e9; border: 1px solid #a5d6a7; }
    .route-node.openai { background: #e3f2fd; border: 1px solid #90caf9; }
    .node-label { font-weight: 700; font-size: 14px; }
    .node-sub { font-size: 11px; color: var(--text-muted); margin-top: 2px; }
    .route-arrows { display: flex; flex-direction: column; gap: 8px; align-items: center; flex: 1.2; }
    .route-row { display: flex; align-items: center; gap: 6px; font-size: 11px; }
    .cond { background: var(--hover); padding: 2px 8px; border-radius: 4px; color: var(--text-secondary); white-space: nowrap; }
    .cond.high { background: var(--danger-soft); color: var(--danger); }
    .cond.low { background: var(--success-soft); color: var(--success); }
    .arrow-left, .arrow-right { font-size: 16px; color: var(--text-muted); }

    .doc-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; }
    .doc-item { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--text-secondary); }

    .info-desc { font-size: 12px; color: var(--text-muted); line-height: 1.6; margin: 0; }
    code { background: var(--hover); padding: 1px 6px; border-radius: 4px; font-size: 11px; }
  `]
})
export class DashboardComponent implements OnInit {
  stats: DailyStats | null = null;
  tokenPct = 0;
  knowledgeDocs = [
    'un_r156_ota_regulation.txt',
    'autosar_ecu_safety_guide.txt',
    'common_ota_vulnerabilities.txt',
    'ota_validation_checklist.txt'
  ];

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.api.getStats().subscribe({
      next: (s) => {
        this.stats = s;
        this.tokenPct = Math.min((s.openai_tokens_used / s.openai_token_limit) * 100, 100);
      },
      error: () => {}
    });
  }
}
