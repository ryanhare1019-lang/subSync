'use client';

import { useState } from 'react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { STREAMING_SERVICES } from '@/lib/constants';
import { ServiceOption } from '@/types';
import { Check } from 'lucide-react';

interface AddSubscriptionProps {
  open: boolean;
  onClose: () => void;
  onAdd: (data: {
    service_name: string;
    service_type: string;
    monthly_cost: number;
    billing_cycle: 'monthly' | 'annual';
    is_trial: boolean;
  }) => Promise<void>;
}

export function AddSubscription({ open, onClose, onAdd }: AddSubscriptionProps) {
  const [selected, setSelected] = useState<ServiceOption | null>(null);
  const [customName, setCustomName] = useState('');
  const [cost, setCost] = useState('');
  const [cycle, setCycle] = useState<'monthly' | 'annual'>('monthly');
  const [isTrial, setIsTrial] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'pick' | 'details'>('pick');

  const reset = () => {
    setStep('pick');
    setSelected(null);
    setCustomName('');
    setCost('');
    setCycle('monthly');
    setIsTrial(false);
  };

  const handleServicePick = (svc: ServiceOption) => {
    setSelected(svc);
    setCost(svc.defaultCost.toString());
    setStep('details');
  };

  const handleSubmit = async () => {
    if (!cost || (!selected && !customName)) return;
    setLoading(true);
    await onAdd({
      service_name: selected ? selected.name : customName,
      service_type: selected ? selected.type : 'other',
      monthly_cost: parseFloat(cost),
      billing_cycle: cycle,
      is_trial: isTrial,
    });
    setLoading(false);
    reset();
    onClose();
  };

  return (
    <Modal open={open} onClose={() => { reset(); onClose(); }} title="Add Subscription">
      {step === 'pick' ? (
        <div>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">Select a service:</p>
          <div className="grid grid-cols-3 gap-2 max-h-72 overflow-y-auto pr-1">
            {STREAMING_SERVICES.map(svc => (
              <button
                key={svc.name}
                onClick={() => handleServicePick(svc)}
                className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-all text-center"
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm"
                  style={{ backgroundColor: svc.color + '18', color: svc.color, border: `1px solid ${svc.color}33` }}
                >
                  {svc.name[0]}
                </div>
                <span className="text-gray-800 dark:text-white text-xs font-medium leading-tight">{svc.name}</span>
                <span className="text-gray-400 text-xs">${svc.defaultCost}/mo</span>
              </button>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
            <button
              onClick={() => setStep('details')}
              className="w-full text-center text-brand hover:text-brand-hover text-sm transition-colors"
            >
              + Add custom service
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <button onClick={reset} className="text-gray-400 hover:text-gray-600 dark:hover:text-white text-sm transition-colors">← Back</button>

          {selected ? (
            <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm"
                style={{ backgroundColor: selected.color + '18', color: selected.color }}>
                {selected.name[0]}
              </div>
              <span className="text-gray-900 dark:text-white font-medium">{selected.name}</span>
            </div>
          ) : (
            <div>
              <label className="text-gray-500 dark:text-gray-400 text-sm block mb-1.5">Service name</label>
              <input
                type="text"
                value={customName}
                onChange={e => setCustomName(e.target.value)}
                placeholder="e.g. Mubi, Criterion Channel"
                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-brand text-sm"
              />
            </div>
          )}

          <div>
            <label className="text-gray-500 dark:text-gray-400 text-sm block mb-1.5">Monthly cost ($)</label>
            <input
              type="number"
              value={cost}
              onChange={e => setCost(e.target.value)}
              placeholder="0.00"
              step="0.01"
              className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-brand text-sm"
            />
          </div>

          <div>
            <label className="text-gray-500 dark:text-gray-400 text-sm block mb-1.5">Billing cycle</label>
            <div className="flex gap-2">
              {(['monthly', 'annual'] as const).map(c => (
                <button
                  key={c}
                  onClick={() => setCycle(c)}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-all capitalize ${
                    cycle === c
                      ? 'bg-brand border-brand text-white'
                      : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <div
              onClick={() => setIsTrial(t => !t)}
              className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                isTrial ? 'bg-brand border-brand' : 'border-gray-300 dark:border-gray-600'
              }`}
            >
              {isTrial && <Check size={10} className="text-white" />}
            </div>
            <span className="text-gray-500 dark:text-gray-400 text-sm">This is a free trial</span>
          </label>

          <Button onClick={handleSubmit} loading={loading} className="w-full">Add Subscription</Button>
        </div>
      )}
    </Modal>
  );
}
