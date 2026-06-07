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
          <div class="logo-mark">S</div>
          <span class="logo-text">SOVARIS</span>
        </div>
        
        <div class="nav-group">
          <div class="nav-label">Platform</div>
          <a routerLink="/validate" routerLinkActive="active" class="nav-item">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 12l2 2 4-4M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            <span>Validate</span>
          </a>
          <a routerLink="/history" routerLinkActive="active" class="nav-item">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            <span>History</span>
          </a>
          <a routerLink="/dashboard" routerLinkActive="active" class="nav-item">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
            <span>Dashboard</span>
          </a>
        </div>

        <div class="sidebar-bottom">
          <div class="status-card">
             <div class="version">v1.0.0</div>
             <div class="compliance">UN R156 Active</div>
          </div>
        </div>
      </nav>

      <main class="content">
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
  styles: [`
    .sidebar {
      width: 260px;
      background: var(--surface);
      border-right: 1px solid var(--border);
      display: flex;
      flex-direction: column;
      padding: 32px 20px;
      box-shadow: var(--shadow);
    }
    .logo { display: flex; align-items: center; gap: 12px; margin-bottom: 40px; }
    .logo-mark { 
      width: 40px; height: 40px; background: var(--accent);
      border-radius: 12px; display: flex; align-items: center; justify-content: center;
      color: white; font-weight: 800; font-size: 20px;
    }
    .nav-label { font-size: 12px; font-weight: 700; color: var(--text-muted); margin-bottom: 12px; padding-left: 12px; }
    .nav-item {
      display: flex; align-items: center; gap: 12px;
      padding: 12px 16px; border-radius: 10px;
      color: var(--text-secondary); text-decoration: none;
      font-weight: 500; transition: all 0.2s ease;
      margin-bottom: 4px;
    }
    .nav-item:hover { background: var(--hover); color: var(--accent); }
    .nav-item.active { background: var(--accent-soft); color: var(--accent); font-weight: 600; }
    .status-card { 
      background: #141412; padding: 16px; border-radius: 12px;
      border: 1px solid var(--border); font-size: 12px; 
    }
    .compliance { color: var(--success); font-weight: 600; margin-top: 4px; }
  `]
})
export class App {}