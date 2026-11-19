export const nations = ['마우리아', '이집트', '진', '미노스', '아틀란티스', '유토피아', '아서왕', '올멕'];

export const Button = ({ onClick, disabled, children, className = '' }) => (
    <button
        onClick={onClick}
        disabled={disabled}
        className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-200 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100 sm:text-base ${className}`}
    >
        {children}
    </button>
);
