'use client';

import { useState } from 'react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { STREAMING_SERVICES } from '@/lib/constants';
import { ServiceOption } from '@/types';

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

  const handleServicePick = (svc: ServiceOption) => {
    setSelected(svc);
    setCost(svc.defaultCost.toString());
    setStep('details');
  };

  const handleCustom = () => {
    setSelected(null);
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
    onClose();
    setStep('pick');
    setSelected(null);
    setCustomName('');
    setCost('');
  };

  return (
    <Modal open={open} onClose={onClose} title="Add Subscription">
      {step === 'pick' ? (
        <div>
          <p className="text-gray-400 text-sm mb-4">Select a service to add:</p>
          <div className="grid grid-cols-3 gap-2 max-h-72 overflow-y-auto">
            {STREAMING_SERVICES.map(svc => (
              <button
                key={svc.name}
                onClick={() => handleServicePick(svc)}
                className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-gray-800 hover:bg-gray-750 border border-gray-700 hover:border-gray-600 transition-all text-center"
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm"
                  style={{ backgroundColor: svc.color + '22', color: svc.color, border: `1px solid ${svc.color}44` }}
                >
                  {svc.name[0]}
                </div>
                <span className="text-white text-xs font-medium leading-tight">{svc.name}</span>
              </button>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-gray-700">
            <button
              onClick={handleCustom}
              className="w-full text-center text-blue-400 hover:text-blue-300 text-sm transition-colors"
            >
              + Add custom service
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <button
            onClick={() => setStep('pick')}
            className="text-gray-400 hover:text-white text-sm transition-colors flex items-center gap-1"
          >
            ← Back
          </button>

          {!selected && (
            <div>
              <label className="text-gray-400 text-sm block mb-1.5">Service name</label>
              <input
                type="text"
                value={customName}
                onChange={e => setCustomName(e.target.value)}
                placeholder="e.g. Mubi, Criterion Channel"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm"
              />
            </div>
          )}

          {selected && (
            <div className="flex items-center gap-3 p-3 bg-gray-800 rounded-xl border border-gray-700">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm"
                style={{ backgroundColor: selected.color + '22', color: selected.color }}
              >
                {selected.name[0]}
              </div>
              <span className="text-white font-medium">{selected.name}</span>
            </div>
          )}

          <div>
            <label className="text-gray-400 text-sm block mb-1.5">Monthly cost ($)</label>
            <input
              type="number"
              value={cost}
              onChange={e => setCost(e.target.value)}
              placeholder="0.00"
              step="0.01"
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm"
            />
          </div>

          <div>
            <label className="text-gray-400 text-sm block mb-1.5">Billing cycle</label>
            <div className="flex gap-2">
              {(['monthly', 'annual'] as const).map(c => (
                <button
                  key={c}
                  onClick={() => setCycle(c)}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-all capitalize ${
                    cycle === c
                      ? 'bg-blue-600 border-blue-500 text-white'
                      : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="trial"
              checked={isTrial}
              onChange={e => setIsTrial(e.target.checked)}
              className="w-4 h-4 rounded"
            />
            <label htmlFor="trial" className="text-gray-400 text-sm">This is a free trial</label>
          </div>

          <Button onClick={handleSubmit} loading={loading} className="w-full">
            Add Subscription
          </Button>
        </div>
      )}
    </Modal>
  );
}
