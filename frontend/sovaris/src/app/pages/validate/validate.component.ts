import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-validate',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page">
      <div class="page-header">
        <h1>Validate OTA Package</h1>
        <p class="subtitle">Upload an OTA update package for AI-powered safety analysis</p>
      </div>

      <div class="card form-card">
        <div class="form-group">
          <label>Package Name <span class="required">*</span></label>
          <input
            type="text"
            [(ngModel)]="packageName"
            placeholder="e.g. ABS_ECU_v2.3.1_delta.pkg"
            class="input"
            [disabled]="loading"
          />
        </div>

        <div class="form-group">
          <label>Description</label>
          <textarea
            [(ngModel)]="description"
            placeholder="Describe what this update changes. Be specific: which ECUs, what functionality, known CVE fixes, etc."
            class="input textarea"
            rows="4"
            [disabled]="loading"
          ></textarea>
        </div>

        <div class="form-group">
          <label>Package File <span class="optional">(optional — for size analysis)</span></label>
          <div
            class="dropzone"
            [class.dragover]="isDragging"
            (dragover)="onDragOver($event)"
            (dragleave)="isDragging = false"
            (drop)="onDrop($event)"
            (click)="fileInput.click()"
          >
            <input #fileInput type="file" hidden (change)="onFileSelected($event)" />
            <div *ngIf="!selectedFile">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="color:var(--text-muted);margin:0 auto 12px;display:block"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
              <p style="color:var(--text-muted);margin:0;font-size:14px">Drop file here or click to browse</p>
            </div>
            <div *ngIf="selectedFile" class="file-selected">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              <span>{{ selectedFile.name }}</span>
              <span class="file-size">{{ (selectedFile.size / 1024).toFixed(1) }} KB</span>
            </div>
          </div>
        </div>

        <!-- Example packages for quick testing -->
        <div class="quick-tests">
          <span class="quick-label">Quick test:</span>
          <button class="chip" (click)="loadExample('low')" [disabled]="loading">Low risk</button>
          <button class="chip chip-warn" (click)="loadExample('high')" [disabled]="loading">High risk</button>
          <button class="chip chip-danger" (click)="loadExample('critical')" [disabled]="loading">Critical</button>
        </div>

        <button class="btn-primary" (click)="submit()" [disabled]="loading || !packageName">
          <span *ngIf="!loading">Analyze Package</span>
          <span *ngIf="loading" class="loading-text">
            <span class="spinner"></span>
            Analyzing with {{ llmHint }}...
          </span>
        </button>

        <div *ngIf="error" class="error-banner">{{ error }}</div>
      </div>

      <div class="info-cards">
        <div class="info-card">
          <div class="info-icon">AI</div>
          <div>
            <div class="info-title">Smart routing</div>
            <div class="info-desc">Simple updates → Ollama (local). Complex/critical → GPT-4o.</div>
          </div>
        </div>
        <div class="info-card">
          <div class="info-icon">R</div>
          <div>
            <div class="info-title">UN R156 aligned</div>
            <div class="info-desc">Risk classification follows regulatory safety categories.</div>
          </div>
        </div>
        <div class="info-card">
          <div class="info-icon">K</div>
          <div>
            <div class="info-title">RAG-powered</div>
            <div class="info-desc">Context from AUTOSAR docs, CVE DB, and ECU safety guides.</div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page { max-width: 760px; }
    .page-header { margin-bottom: 28px; }
    h1 { font-size: 24px; font-weight: 700; margin: 0 0 8px; color: var(--text-primary); }
    .subtitle { color: var(--text-muted); margin: 0; font-size: 14px; }

    .card { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 28px; }
    .form-card { display: flex; flex-direction: column; gap: 20px; margin-bottom: 20px; }

    .form-group { display: flex; flex-direction: column; gap: 8px; }
    label { font-size: 13px; font-weight: 600; color: var(--text-secondary); }
    .required { color: var(--danger); }
    .optional { font-weight: 400; color: var(--text-muted); }

    .input {
      padding: 10px 14px; border: 1px solid var(--border); border-radius: 8px;
      background: var(--bg); color: var(--text-primary); font-size: 14px;
      outline: none; transition: border-color 0.15s; font-family: inherit;
    }
    .input:focus { border-color: var(--accent); }
    .input:disabled { opacity: 0.5; }
    .textarea { resize: vertical; min-height: 90px; }

    .dropzone {
      border: 1.5px dashed var(--border); border-radius: 10px; padding: 32px 20px;
      text-align: center; cursor: pointer; transition: border-color 0.15s, background 0.15s;
    }
    .dropzone:hover, .dropzone.dragover { border-color: var(--accent); background: var(--accent-soft); }
    .file-selected { display: flex; align-items: center; gap: 10px; color: var(--text-primary); font-size: 14px; justify-content: center; }
    .file-size { color: var(--text-muted); font-size: 12px; }

    .quick-tests { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .quick-label { font-size: 12px; color: var(--text-muted); font-weight: 600; }
    .chip {
      padding: 4px 12px; border-radius: 20px; border: 1px solid var(--border);
      background: var(--hover); color: var(--text-secondary); font-size: 12px;
      cursor: pointer; font-weight: 500; transition: all 0.15s;
    }
    .chip:hover { background: var(--accent-soft); border-color: var(--accent); color: var(--accent); }
    .chip-warn { border-color: var(--warning-border); color: var(--warning); background: var(--warning-soft); }
    .chip-danger { border-color: var(--danger-border); color: var(--danger); background: var(--danger-soft); }
    .chip:disabled { opacity: 0.5; cursor: not-allowed; }

    .btn-primary {
      padding: 12px 24px; background: var(--accent); color: white; border: none;
      border-radius: 8px; font-size: 15px; font-weight: 600; cursor: pointer;
      transition: opacity 0.15s; display: flex; align-items: center; justify-content: center; gap: 10px;
    }
    .btn-primary:hover { opacity: 0.88; }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

    .loading-text { display: flex; align-items: center; gap: 8px; }
    .spinner {
      width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3);
      border-top-color: white; border-radius: 50%; animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    .error-banner {
      padding: 12px 16px; background: var(--danger-soft); border: 1px solid var(--danger-border);
      border-radius: 8px; color: var(--danger); font-size: 13px;
    }

    .info-cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
    .info-card {
      background: var(--surface); border: 1px solid var(--border); border-radius: 10px;
      padding: 16px; display: flex; gap: 12px; align-items: flex-start;
    }
    .info-icon {
      width: 32px; height: 32px; background: var(--accent-soft); color: var(--accent);
      border-radius: 8px; display: flex; align-items: center; justify-content: center;
      font-size: 11px; font-weight: 700; min-width: 32px;
    }
    .info-title { font-size: 13px; font-weight: 600; color: var(--text-primary); margin-bottom: 4px; }
    .info-desc { font-size: 12px; color: var(--text-muted); line-height: 1.5; }
  `]
})
export class ValidateComponent {
  packageName = '';
  description = '';
  selectedFile: File | null = null;
  isDragging = false;
  loading = false;
  error = '';
  llmHint = 'Ollama';

  constructor(private api: ApiService, private router: Router) {}

  loadExample(type: 'low' | 'high' | 'critical') {
    const examples = {
      low: {
        name: 'Infotainment_v4.2.1_delta.pkg',
        desc: 'UI theme update and maps database refresh for infotainment system. No ECU firmware changes.'
      },
      high: {
        name: 'ADAS_Camera_Fusion_v3.1.0.pkg',
        desc: 'Object detection model update for front camera ADAS ECU. Changes sensor fusion parameters and radar/camera calibration tables. ASIL-C component.'
      },
      critical: {
        name: 'ABS_ESC_Firmware_v8.0.2_ASILD.pkg',
        desc: 'Critical brake-by-wire firmware update for ABS and ESC ECU. Modifies braking force distribution algorithm and anti-lock pressure control logic. ASIL-D safety classification. Fixes CVE-2023-38545 buffer overflow.'
      }
    };
    const ex = examples[type];
    this.packageName = ex.name;
    this.description = ex.desc;
    this.llmHint = type === 'low' ? 'Ollama' : 'OpenAI';
  }

  onDragOver(e: DragEvent) {
    e.preventDefault();
    this.isDragging = true;
  }

  onDrop(e: DragEvent) {
    e.preventDefault();
    this.isDragging = false;
    const file = e.dataTransfer?.files[0];
    if (file) this.selectedFile = file;
  }

  onFileSelected(e: Event) {
    const input = e.target as HTMLInputElement;
    if (input.files?.length) this.selectedFile = input.files[0];
  }

  submit() {
    if (!this.packageName.trim()) return;
    this.loading = true;
    this.error = '';

    this.api.validate(this.packageName, this.description, this.selectedFile || undefined)
      .subscribe({
        next: (result) => {
          this.loading = false;
          this.router.navigate(['/result', result.id]);
        },
        error: (err) => {
          this.loading = false;
          this.error = err.error?.detail || 'Backend connection failed. Is the server running on port 8000?';
        }
      });
  }
}
