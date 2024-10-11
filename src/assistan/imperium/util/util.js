export const nations = ['마우리아', '이집트', '진', '미노스', '아틀란티스', '유토피아', '아서왕', '올멕'];

export const Button = ({ onClick, disabled, children, className }) => (
    <button onClick={onClick} disabled={disabled} className={`p-2 rounded text-sm sm:text-base ${className}`}>
        {children}
    </button>
);