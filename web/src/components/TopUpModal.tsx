'use client';

import React, { useState } from 'react';
import { useApp } from '@/lib/store';
import { Coins, QrCode, CreditCard, Sparkles, X, Check } from 'lucide-react';

export function TopUpModal() {
  const { isTopUpOpen, setIsTopUpOpen, totalCoins, purchasedCoins, bonusCoins, topUpCoins } = useApp();
  const [selectedTier, setSelectedTier] = useState<number>(1);
  const [paymentMethod, setPaymentMethod] = useState<'promptpay' | 'card'>('promptpay');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isTopUpOpen) return null;

  const tiers = [
    { id: 0, coins: 100, bonus: 0, price: '฿35', label: 'Starter Pack' },
    { id: 1, coins: 300, bonus: 35, price: '฿99', label: 'Most Popular', highlight: true },
    { id: 2, coins: 1000, bonus: 150, price: '฿299', label: 'Best Value' },
  ];

  const handleConfirmTopUp = () => {
    setIsProcessing(true);
    setTimeout(() => {
      const tier = tiers[selectedTier];
      topUpCoins(tier.coins, tier.bonus);
      setIsProcessing(false);
      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        setIsTopUpOpen(false);
      }, 1200);
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl text-slate-100">
        <button
          onClick={() => setIsTopUpOpen(false)}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 bg-amber-500/10 rounded-xl text-amber-400 border border-amber-500/20">
            <Coins className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold tracking-tight">Top Up Coins</h3>
            <p className="text-xs text-slate-400">Current Balance: <span className="text-amber-400 font-semibold">{totalCoins} coins</span> ({purchasedCoins} purchased + {bonusCoins} bonus)</p>
          </div>
        </div>

        {/* Tiers */}
        <div className="space-y-2.5 mb-5">
          {tiers.map((tier) => (
            <div
              key={tier.id}
              onClick={() => setSelectedTier(tier.id)}
              className={`relative flex items-center justify-between p-3.5 rounded-xl cursor-pointer border transition-all ${
                selectedTier === tier.id
                  ? 'bg-indigo-600/10 border-indigo-500 ring-1 ring-indigo-500/50'
                  : 'bg-slate-800/40 border-slate-700/60 hover:bg-slate-800/80 hover:border-slate-600'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                  selectedTier === tier.id ? 'border-indigo-400 bg-indigo-500' : 'border-slate-500'
                }`}>
                  {selectedTier === tier.id && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-base text-amber-400 flex items-center gap-1">
                      🪙 {tier.coins} Coins
                    </span>
                    {tier.bonus > 0 && (
                      <span className="px-2 py-0.5 text-xs font-semibold bg-emerald-500/20 text-emerald-400 rounded-full border border-emerald-500/30 flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> +{tier.bonus} Bonus
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-slate-400">{tier.label}</span>
                </div>
              </div>
              <span className="text-lg font-bold text-white">{tier.price}</span>
            </div>
          ))}
        </div>

        {/* Payment Methods */}
        <div className="mb-6">
          <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">Payment Method</label>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              onClick={() => setPaymentMethod('promptpay')}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-semibold transition ${
                paymentMethod === 'promptpay'
                  ? 'bg-blue-600/10 border-blue-500 text-blue-400'
                  : 'bg-slate-800/40 border-slate-700/60 text-slate-300 hover:bg-slate-800'
              }`}
            >
              <QrCode className="w-4 h-4" /> PromptPay QR
            </button>
            <button
              onClick={() => setPaymentMethod('card')}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-semibold transition ${
                paymentMethod === 'card'
                  ? 'bg-blue-600/10 border-blue-500 text-blue-400'
                  : 'bg-slate-800/40 border-slate-700/60 text-slate-300 hover:bg-slate-800'
              }`}
            >
              <CreditCard className="w-4 h-4" /> Credit / Debit
            </button>
          </div>
        </div>

        {/* Confirm Button */}
        <button
          onClick={handleConfirmTopUp}
          disabled={isProcessing || isSuccess}
          className="w-full py-3 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isProcessing ? (
            <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
          ) : isSuccess ? (
            <span className="flex items-center gap-1.5 text-slate-950">
              <Check className="w-5 h-5" /> Top-Up Successful!
            </span>
          ) : (
            `Pay ${tiers[selectedTier].price} & Credit Coins`
          )}
        </button>
      </div>
    </div>
  );
}
