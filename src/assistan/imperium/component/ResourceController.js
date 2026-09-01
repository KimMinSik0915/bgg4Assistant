import React from 'react';
import { PlusCircle, MinusCircle, ArrowRightCircle } from 'lucide-react';

const ResourceControl = ({ label, value, onIncrement, onDecrement, onConvert }) => (
    <div className="mb-2 flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2">
        <span className="w-14 text-xs font-medium text-slate-400 sm:w-20 sm:text-sm">{label}</span>
        <button
            onClick={onDecrement}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-slate-300 transition hover:bg-rose-500/20 hover:text-rose-300 active:scale-90"
            aria-label={`${label} 감소`}
        >
            <MinusCircle size={16} />
        </button>
        <span className="w-7 text-center text-sm font-bold text-white sm:text-base">{value}</span>
        <button
            onClick={onIncrement}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-slate-300 transition hover:bg-emerald-500/20 hover:text-emerald-300 active:scale-90"
            aria-label={`${label} 증가`}
        >
            <PlusCircle size={16} />
        </button>
        {onConvert && (
            <button
                onClick={onConvert}
                className="ml-auto flex shrink-0 items-center gap-1 rounded-full bg-cyan-400/15 px-2.5 py-1 text-xs font-semibold text-cyan-300 transition hover:bg-cyan-400/25 active:scale-95"
            >
                <ArrowRightCircle size={14} /> 승점 변환
            </button>
        )}
    </div>
);

export default ResourceControl;
