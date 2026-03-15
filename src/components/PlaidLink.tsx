'use client';

import { useState, useCallback } from 'react';
import { usePlaidLink } from 'react-plaid-link';
import { Button } from './ui/Button';
import { ServiceIcon } from './ServiceIcon';
import { CheckCircle, AlertCircle, Landmark } from 'lucide-react';

interface PlaidLinkProps {
  onSuccess?: (imported: string[]) => void;
}

export function PlaidLinkButton({ onSuccess }: PlaidLinkProps) {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ imported: string[]; already_tracked: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fetching, setFetching] = useState(false);

  const fetchLinkToken = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/plaid/link-token', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to initialize bank connection');
        return;
      }
      setLinkToken(data.link_token);
    } catch {
      setError('Failed to connect to Plaid');
    } finally {
      setLoading(false);
    }
  };

  const onPlaidSuccess = useCallback(async (publicToken: string) => {
    setFetching(true);
    setError(null);
    try {
      const res = await fetch('/api/plaid/exchange-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ public_token: publicToken }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to import subscriptions');
        return;
      }
      setResult(data);
      setLinkToken(null);
      onSuccess?.(data.imported);
    } catch {
      setError('Failed to import subscriptions');
    } finally {
      setFetching(false);
    }
  }, [onSuccess]);

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: (public_token) => onPlaidSuccess(public_token),
    onExit: () => setLinkToken(null),
  });

  // Once we have a token and link is ready, open automatically
  if (linkToken && ready) {
    open();
  }

  if (result) {
    return (
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-3">
        {result.imported.length > 0 ? (
          <>
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
              <CheckCircle size={16} />
              <span className="text-sm font-medium">Imported {result.imported.length} subscription{result.imported.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {result.imported.map(name => (
                <div key={name} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-lg">
                  <ServiceIcon name={name} size={14} variant="brand" />
                  <span className="text-xs text-emerald-700 dark:text-emerald-300 font-medium">{name}</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
            <CheckCircle size={16} />
            <span className="text-sm">
              {result.already_tracked.length > 0
                ? `All found subscriptions already tracked (${result.already_tracked.join(', ')})`
                : 'No streaming subscriptions found in recent transactions'}
            </span>
          </div>
        )}
        <button
          onClick={() => setResult(null)}
          className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          Connect another account
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {error && (
        <div className="flex items-center gap-2 px-3 py-2 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg text-red-600 dark:text-red-400 text-xs">
          <AlertCircle size={13} />
          {error}
        </div>
      )}
      <Button
        onClick={fetchLinkToken}
        loading={loading || fetching}
        variant="secondary"
        size="sm"
        className="w-full"
      >
        <Landmark size={14} />
        Auto-import from bank
      </Button>
      <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
        Securely scan 90 days of transactions via Plaid
      </p>
    </div>
  );
}
