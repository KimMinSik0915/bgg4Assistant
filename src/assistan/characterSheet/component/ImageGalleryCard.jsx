import React from 'react';

/**
 * @Author : 김민식
 * ImageGalleryCard : PNG/JPG 이미지를 업로드하고 즉시 렌더링하여 보여주는 카드
 */
const ImageGalleryCard = ({ images = [], onUpload, onRemove }) => {
    return (
        <div className="p-3.5 rounded-xl border bg-[var(--card-bg)] flex flex-col gap-3" style={{ borderColor : 'var(--border-color)' }}>
            <div className="flex justify-between items-center pb-2 border-b" style={{ borderColor : 'rgba(255,255,255,0.1)' }}>
                <h4 className="text-xs font-bold" style={{ color : 'var(--accent-color)' }}>
                    🖼️ 이미지 & 지도 갤러리 ({images.length})
                </h4>

                {/* 이미지 업로드 버튼 */}
                <label className="cursor-pointer text-xs font-bold px-3 py-1.5 rounded-md text-white transition-opacity hover:opacity-90 flex items-center gap-1 shadow-sm" style={{ backgroundColor : 'var(--highlight)' }}>
                    <span>➕ 이미지 업로드</span>
                    <input
                        type="file"
                        accept="image/png, image/jpeg, image/jpg, image/webp"
                        multiple
                        className="hidden"
                        onChange={onUpload}
                    />
                </label>
            </div>

            {/* 이미지가 없을 때 안내 문구 */}
            {images.length === 0 && (
                <div className="text-xs text-center py-10 border-2 border-dashed rounded-lg" style={{ borderColor : 'var(--border-color)', color : 'var(--text-muted)' }}>
                    <p className="font-bold mb-1">🖼️ 등록된 이미지가 없습니다.</p>
                    <p className="text-[0.7rem]">상단 [➕ 이미지 업로드] 버튼을 눌러 캐릭터 일러스트나 지도를 등록해보세요!</p>
                </div>
            )}

            {/* 업로드된 이미지 리스트 (실제 이미지 표시) */}
            <div className="flex flex-col gap-4">
                {images.map((img) => (
                    <div
                        key={img.id}
                        className="relative rounded-lg overflow-hidden border p-2 bg-[rgba(0,0,0,0.2)] flex flex-col gap-2"
                        style={{ borderColor : 'var(--border-color)' }}
                    >
                        {/* 이미지 제목 및 삭제 버튼 */}
                        <div className="flex justify-between items-center text-xs px-1">
                            <span className="font-bold truncate max-w-[80%]" style={{ color : 'var(--text-main)' }}>
                                📁 {img.name}
                            </span>
                            <button
                                onClick={() => onRemove(img.id)}
                                className="px-2 py-0.5 text-[0.7rem] rounded font-bold transition-colors hover:bg-red-600 hover:text-white"
                                style={{ color : 'var(--danger,#ef4444)', border : '1px solid var(--border-color)' }}
                                title="이미지 삭제"
                            >
                                삭제 ✕
                            </button>
                        </div>

                        {/* 🖼️ 업로드된 실제 이미지 렌더링 */}
                        <div className="w-full flex justify-center bg-[rgba(0,0,0,0.4)] rounded-md p-1 overflow-hidden">
                            <img
                                src={img.url}
                                alt={img.name}
                                className="max-h-[500px] w-auto object-contain rounded transition-transform hover:scale-[1.01]"
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ImageGalleryCard;