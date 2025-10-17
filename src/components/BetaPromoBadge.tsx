'use client'

import { useState, useEffect } from 'react';
import { Sparkles } from 'lucide-react';

export default function BetaPromoBadge() {
  const [spotsLeft, setSpotsLeft] = useState(50);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch redemption count from your API
    fetch('/api/beta-count')
      .then(res => res.json())
      .then(data => {
        const remaining = 50 - (data.redeemed || 0);
        setSpotsLeft(remaining);
        setLoading(false);
      })
      .catch(() => {
        // If API fails, show the promo anyway
        setSpotsLeft(50);
        setLoading(false);
      });
  }, []);

  // Don't show if all spots are taken
  if (spotsLeft <= 0 || loading) {
    return null;
  }

  return (
    <div className="p-2.5 bg-gradient-to-r from-yellow-50 to-amber-50 border-2 border-yellow-300 rounded-lg inline-block">
      <div className="flex items-start gap-2">
        <Sparkles className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-xs font-bold text-yellow-900 uppercase tracking-wide">
              🚀 Launch Sale
            </span>
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-yellow-600 text-white">
              {spotsLeft}/50 left
            </span>
          </div>
          <p className="text-sm text-gray-700 font-semibold mb-1">
            50% off for 6 months
          </p>
          <div className="flex items-center gap-2">
            <code className="px-2 py-0.5 bg-white border border-gray-300 rounded text-xs font-mono font-bold text-gray-800">
              BETA50
            </code>
            <span className="text-xs text-gray-600">at checkout</span>
          </div>
          {spotsLeft <= 10 && (
            <p className="text-xs text-red-600 font-semibold mt-1.5">
              ⚡ Only {spotsLeft} left!
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
