// components/Popup.js
import React from 'react';
import { X } from 'lucide-react';
import {Button} from "../util/Util";

const Popup = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;
    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900/95 p-5 shadow-2xl shadow-black/40 backdrop-blur-xl sm:p-7"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="mb-5 flex items-center justify-between">
                    <h3 className="text-lg font-bold text-white sm:text-xl">{title}</h3>
                    <button
                        onClick={onClose}
                        className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-white/10 hover:text-white"
                        aria-label="닫기"
                    >
                        <X size={18}/>
                    </button>
                </div>
                {children}
                <Button onClick={onClose} className="mt-5 w-full bg-white/10 text-slate-200 hover:bg-white/15">닫기</Button>
            </div>
        </div>
    );
};

export default Popup;
