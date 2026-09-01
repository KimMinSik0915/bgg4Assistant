import {useNavigate} from "react-router-dom";

export const IconRenderer = ({ item }) => {
    if (item.isCustomIcon) {
        return (
            <img
                src={item.icon}
                alt={item.label}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-110"
                draggable={false}
            />
        );
    } else {
        const IconComponent = item.icon;
        return (
            <div className="relative z-10 flex h-full w-full flex-col items-center justify-center gap-3">
                <div className="flex items-center justify-center w-14 h-14 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-cyan-400/20 to-indigo-500/20 ring-1 ring-white/10 transition-all duration-300 group-hover:from-cyan-400/30 group-hover:to-indigo-500/30 group-hover:ring-cyan-300/40">
                    <IconComponent className="w-7 h-7 sm:w-10 sm:h-10 text-cyan-300 transition-colors duration-300 group-hover:text-cyan-200" strokeWidth={1.75}/>
                </div>
            </div>
        );
    }
};
