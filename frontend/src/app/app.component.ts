import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule],
  template: `
    <div class="app-shell">
      <nav class="sidebar">
        <div class="logo">
          <span class="logo-mark">S</span>
          <span class="logo-text">SOVARIS</span>
        </div>
        <div class="nav-label">Platform</div>
        <a routerLink="/validate" routerLinkActive="active" class="nav-item">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M9 12l2 2 4-4M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          Validate
        </a>
        <a routerLink="/history" routerLinkActive="active" class="nav-item">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          History
        </a>
        <a routerLink="/dashboard" routerLinkActive="active" class="nav-item">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
          Dashboard
        </a>
        <div class="sidebar-bottom">
          <div class="version-badge">v1.0.0</div>
          <div class="compliance-badge">UN R156</div>
        </div>
      </nav>
      <main class="content">
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
  styles: [`
    .app-shell {
      display: flex;
      height: 100vh;
      background: var(--bg);
      overflow: hidden;
    }
    .sidebar {
      width: 220px;
      min-width: 220px;
      background: var(--surface);
      border-right: 1px solid var(--border);
      display: flex;
      flex-direction: column;
      padding: 24px 16px;
      gap: 4px;
    }
    .logo {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 0 8px 24px;
    }
    .logo-mark {
      width: 32px;
      height: 32px;
      background: var(--accent);
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 700;
      font-size: 16px;
    }
    .logo-text {
      font-weight: 700;
      font-size: 15px;
      letter-spacing: 2px;
      color: var(--text-primary);
    }
    .nav-label {
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 1px;
      color: var(--text-muted);
      padding: 0 12px 8px;
      text-transform: uppercase;
    }
    .nav-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 12px;
      border-radius: 8px;
      color: var(--text-secondary);
      text-decoration: none;
      font-size: 14px;
      font-weight: 500;
      transition: background 0.15s, color 0.15s;
    }
    .nav-item:hover { background: var(--hover); color: var(--text-primary); }
    .nav-item.active { background: var(--accent-soft); color: var(--accent); }
    .sidebar-bottom {
      margin-top: auto;
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding-top: 16px;
    }
    .version-badge, .compliance-badge {
      font-size: 11px;
      padding: 4px 10px;
      border-radius: 6px;
      text-align: center;
      font-weight: 600;
    }
    .version-badge { background: var(--hover); color: var(--text-muted); }
    .compliance-badge { background: var(--success-soft); color: var(--success); }
    .content {
      flex: 1;
      overflow-y: auto;
      padding: 32px;
    }
  `]
})
export class AppComponent {}
