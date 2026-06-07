import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ECUImpact {
  ecu_name: string;
  impact_type: string;
  safety_critical: boolean;
  description: string;
}

export interface ValidationResult {
  id: string;
  timestamp: string;
  package_name: string;
  package_size_kb: number;
  risk_score: number;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  llm_source: 'ollama' | 'openai';
  affected_ecus: ECUImpact[];
  summary: string;
  recommendation: string;
  rollback_safe: boolean;
  un_r156_compliant: boolean;
  context_docs_used: string[];
  tokens_used: number;
}

export interface HistoryItem {
  id: string;
  timestamp: string;
  package_name: string;
  risk_level: string;
  risk_score: number;
  recommendation: string;
  llm_source: string;
}

export interface DailyStats {
  total_validations: number;
  openai_tokens_used: number;
  openai_token_limit: number;
  high_risk_count: number;
  avg_risk_score: number;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private base = 'http://localhost:8000/api/v1';

  constructor(private http: HttpClient) {}

  validate(packageName: string, description: string, file?: File): Observable<ValidationResult> {
    const form = new FormData();
    form.append('package_name', packageName);
    form.append('description', description);
    if (file) form.append('file', file);
    return this.http.post<ValidationResult>(`${this.base}/validate`, form);
  }

  getHistory(limit = 20): Observable<HistoryItem[]> {
    return this.http.get<HistoryItem[]>(`${this.base}/history?limit=${limit}`);
  }

  getValidation(id: string): Observable<ValidationResult> {
    return this.http.get<ValidationResult>(`${this.base}/validation/${id}`);
  }

  getStats(): Observable<DailyStats> {
    return this.http.get<DailyStats>(`${this.base}/stats`);
  }
}
