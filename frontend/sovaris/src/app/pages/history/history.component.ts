import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ApiService, HistoryItem } from '../../services/api.service';

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page">
      <div class="page-header">
        <h1>Validation History</h1>
        <button class="btn-secondary" (click)="load()">Refresh</button>
      </div>

      <div class="empty" *ngIf="!loading && items.length === 0">
        <p>No validations yet. <a (click)="router.navigate(['/validate'])" class="link">Run your first analysis →</a></p>
      </div>

      <div class="table-card" *ngIf="items.length > 0">
        <table>
          <thead>
            <tr>
              <th>Package</th>
              <th>Risk</th>
              <th>Score</th>
              <th>LLM</th>
              <th>Timestamp</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let item of items" (click)="open(item.id)" class="row">
              <td class="package-name">{{ item.package_name }}</td>
              <td>
                <span class="risk-pill" [class]="'risk-' + item.risk_level">
                  {{ item.risk_level }}
                </span>
              </td>
              <td class="score">{{ (item.risk_score * 100).toFixed(0) }}</td>
              <td>
                <span class="llm-tag" [class]="item.llm_source">{{ item.llm_source }}</span>
              </td>
              <td class="ts">{{ item.timestamp | date:'dd MMM, HH:mm' }}</td>
              <td class="arrow">→</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="loading" *ngIf="loading">Loading...</div>
    </div>
  `,
  styles: [`
    .page { max-width: 900px; }
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
    h1 { font-size: 24px; font-weight: 700; margin: 0; }
    .btn-secondary {
      padding: 8px 16px; border: 1px solid var(--border); border-radius: 8px;
      background: var(--surface); color: var(--text-secondary); cursor: pointer; font-size: 13px;
    }
    .btn-secondary:hover { background: var(--hover); }

    .empty { text-align: center; padding: 80px 0; color: var(--text-muted); }
    .link { color: var(--accent); cursor: pointer; text-decoration: underline; }

    .table-card { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; overflow: hidden; }
    table { width: 100%; border-collapse: collapse; }
    th { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: var(--text-muted); padding: 12px 16px; text-align: left; border-bottom: 1px solid var(--border); }
    .row { cursor: pointer; transition: background 0.12s; }
    .row:hover { background: var(--hover); }
    td { padding: 14px 16px; font-size: 13px; border-bottom: 1px solid var(--border); color: var(--text-primary); }
    .row:last-child td { border-bottom: none; }

    .package-name { font-family: monospace; font-size: 12px; max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .score { font-weight: 700; }
    .ts { color: var(--text-muted); }
    .arrow { color: var(--text-muted); text-align: right; }

    .risk-pill { font-size: 11px; padding: 3px 10px; border-radius: 20px; font-weight: 700; text-transform: uppercase; }
    .risk-low { background: var(--success-soft); color: var(--success); }
    .risk-medium { background: var(--warning-soft); color: var(--warning); }
    .risk-high { background: #fff3e0; color: #e65100; }
    .risk-critical { background: var(--danger-soft); color: var(--danger); }

    .llm-tag { font-size: 11px; padding: 2px 8px; border-radius: 4px; font-weight: 600; }
    .llm-tag.ollama { background: #e8f5e9; color: #2e7d32; }
    .llm-tag.openai { background: #e3f2fd; color: #1565c0; }

    .loading { text-align: center; padding: 40px; color: var(--text-muted); }
  `]
})
export class HistoryComponent implements OnInit {
  items: HistoryItem[] = [];
  loading = false;

  constructor(public router: Router, private api: ApiService) {}

  ngOnInit() { this.load(); }

  load() {
    this.loading = true;
    this.api.getHistory(50).subscribe({
      next: (data) => { this.items = data; this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

  open(id: string) {
    this.router.navigate(['/result', id]);
  }
}
