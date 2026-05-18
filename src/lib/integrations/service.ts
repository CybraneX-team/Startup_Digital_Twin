import { api } from '../api';
import type { IntegrationConnection, IntegrationMetrics } from './types';

// Integrations that have real backend support
export const LIVE_SUPPORTED = new Set(['int-stripe', 'int-ga', 'int-meta', 'int-razorpay', 'int-sf', 'int-hubspot', 'int-qb', 'int-jira', 'int-slack']);

// ─── Fetch all connections for the current company ────────────────────────────

export async function fetchConnections(): Promise<Record<string, IntegrationConnection>> {
  const list = await api.get<IntegrationConnection[]>('/api/integrations/connections');
  return Object.fromEntries(list.map((c) => [c.integrationId, c]));
}

// ─── Connect ──────────────────────────────────────────────────────────────────

export async function connectStripe(secretKey: string): Promise<IntegrationConnection> {
  const result = await api.post<IntegrationConnection>('/api/integrations/stripe/connect', { secretKey });
  return result;
}

export async function connectRazorpay(keyId: string, keySecret: string): Promise<IntegrationConnection> {
  return api.post<IntegrationConnection>('/api/integrations/razorpay/connect', { keyId, keySecret });
}

export async function connectHubSpot(accessToken: string): Promise<IntegrationConnection> {
  return api.post<IntegrationConnection>('/api/integrations/hubspot/connect', { accessToken });
}

export async function connectJira(domain: string, email: string, apiToken: string): Promise<IntegrationConnection> {
  return api.post<IntegrationConnection>('/api/integrations/jira/connect', { domain, email, apiToken });
}

export async function connectSlack(botToken: string): Promise<IntegrationConnection> {
  return api.post<IntegrationConnection>('/api/integrations/slack/connect', { botToken });
}

export async function connectOAuth(integrationId: string): Promise<IntegrationConnection> {
  const endpointMap: Record<string, string> = {
    'int-ga':   '/api/integrations/google/auth-url',
    'int-meta': '/api/integrations/meta/auth-url',
    'int-sf':   '/api/integrations/salesforce/auth-url',
    'int-qb':   '/api/integrations/quickbooks/auth-url',
  };
  const endpoint = endpointMap[integrationId];
  if (!endpoint) throw new Error(`OAuth not supported for ${integrationId}`);

  const { url } = await api.get<{ url: string }>(endpoint);
  const { integrationId: returnedId, accountName } = await openOAuthPopup(url);

  return {
    integrationId: returnedId || integrationId,
    connectedAt: new Date().toISOString(),
    lastSynced: new Date().toISOString(),
    accountName: accountName || integrationId,
    sandboxMode: false,
  };
}

// ─── Disconnect ───────────────────────────────────────────────────────────────

export async function disconnectIntegration(integrationId: string): Promise<void> {
  await api.delete(`/api/integrations/${integrationId}/disconnect`);
}

// ─── Metrics ─────────────────────────────────────────────────────────────────

export async function fetchMetrics(integrationId: string): Promise<IntegrationMetrics> {
  return api.get<IntegrationMetrics>(`/api/integrations/${integrationId}/metrics`);
}

// ─── Analytics data: TrackedMetric[] derived from all stored snapshots ────────

export interface AnalyticsTrackedMetric {
  id: string;
  name: string;
  category: 'Growth' | 'Product' | 'Sales' | 'Finance' | 'Ops/People';
  value: number;
  unit: string;
  change: number;
  dataSource: 'auto-ingested';
  integration: string;
  trend: number[];
  description: string;
}

export interface AnalyticsData {
  metrics: AnalyticsTrackedMetric[];
  connectedIntegrations: string[];
  lastUpdated: string | null;
}

export async function fetchAnalyticsData(): Promise<AnalyticsData> {
  return api.get<AnalyticsData>('/api/integrations/analytics-data');
}

// ─── OAuth popup helper ───────────────────────────────────────────────────────

function openOAuthPopup(url: string): Promise<{ integrationId: string; accountName: string }> {
  return new Promise((resolve, reject) => {
    const popup = window.open(url, 'oauth_connect', 'width=520,height=640,scrollbars=yes,resizable=yes');
    if (!popup) {
      reject(new Error('Popup blocked — please allow popups for this site and try again'));
      return;
    }

    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'oauth_success') {
        cleanup();
        resolve({ integrationId: e.data.integrationId ?? '', accountName: e.data.accountName ?? '' });
      }
      if (e.data?.type === 'oauth_error') {
        cleanup();
        reject(new Error(e.data.error ?? 'OAuth failed'));
      }
    };

    const poll = setInterval(() => {
      if (popup.closed) {
        cleanup();
        reject(new Error('Authorization window closed before completing'));
      }
    }, 500);

    const cleanup = () => {
      window.removeEventListener('message', handler);
      clearInterval(poll);
      if (!popup.closed) popup.close();
    };

    window.addEventListener('message', handler);
  });
}
