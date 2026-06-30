'use client'

import { Tour } from '@/components/tour'
import { CALCULATOR_TOUR } from '@/lib/tours'

// The income / commission goals calculator is a self-contained tool hosted at
// /tools/income-calculator.html and embedded here so its full logic, design, and
// saved progress (localStorage) work exactly as built.
export default function CalculatorPage() {
  return (
    <div className="space-y-3 pb-2">
      <div data-tour="calc-frame">
        <h1 className="text-h1 text-dark-text">Income Calculator</h1>
        <p className="mt-0.5 text-[13px] text-gray">Set your commission goal, then see exactly how many calls and demos a day it takes to hit it.</p>
      </div>
      <iframe
        src="/tools/income-calculator.html"
        title="BDR Income & Commission Goals Calculator"
        className="w-full rounded-xl border border-border bg-white shadow-card"
        style={{ height: 'calc(100vh - 11rem)', minHeight: 520 }}
      />
      <Tour tourKey="calculator" steps={CALCULATOR_TOUR} />
    </div>
  )
}
