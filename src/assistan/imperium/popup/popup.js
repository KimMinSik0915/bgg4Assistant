// components/Popup.js
import React from 'react';
import {Button} from "../util/Util";

const Popup = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white p-4 sm:p-8 rounded-lg shadow-lg w-full max-w-md">
                <h3 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 text-center">{title}</h3>
                {children}
                <Button onClick={onClose} className="mt-4 sm:mt-6 w-full bg-gray-400 text-white">닫기</Button>
            </div>
        </div>
    );
};

export default Popup;