import {useNavigate} from "react-router-dom";

export const IconRenderer = ({ item }) => {
    const iconSize = "w-100 h-90"; // Tailwind 클래스를 사용하여 크기 지정

    if (item.isCustomIcon) {
        return (
            <img
                src={item.icon}
                alt={item.label}
                className={`object-contain ${iconSize}`}
            />
        );
    } else {
        const IconComponent = item.icon;
        return <IconComponent size={48} />; // Lucide 아이콘의 크기를 직접 지정
    }
};
