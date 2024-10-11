import React from 'react';
import { PlusCircle, MinusCircle, ArrowRightCircle } from 'lucide-react';
import {Button} from "../util/util";

const ResourceControl = ({ label, value, onIncrement, onDecrement, onConvert }) => (
    <div className="flex items-center space-x-2 mb-2">
        <span className="w-20 text-sm sm:text-base">{label}:</span>
        <Button onClick={onDecrement} className="bg-red-400 text-white"><MinusCircle size={16} /></Button>
        <span className="w-8 text-center text-sm sm:text-base">{value}</span>
        <Button onClick={onIncrement} className="bg-green-400 text-white"><PlusCircle size={16} /></Button>
        {onConvert && <Button onClick={onConvert} className="bg-indigo-500 text-white"><ArrowRightCircle size={16} /></Button>}
    </div>
);

export default ResourceControl;