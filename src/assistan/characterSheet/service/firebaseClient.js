/**
 * @Author : 김민식
 * firebaseClient : 2인 협동 세션을 위한 Firebase Realtime Database 저수준 래퍼
 *
 * ⚠️ 사용 전 필수 설정:
 *   1) https://console.firebase.google.com 에서 무료 프로젝트를 하나 생성한다.
 *   2) 왼쪽 메뉴 "빌드 > Realtime Database"에서 데이터베이스를 생성한다 (테스트 모드로 시작해도 됨).
 *   3) 프로젝트 설정(⚙️) > "내 앱" > 웹 앱 추가 후 나오는 firebaseConfig 값을
 *      아래 FIREBASE_CONFIG 자리에 그대로 붙여넣는다.
 *   4) Realtime Database > 규칙(Rules) 탭에서 이 프로젝트 전용 권장 규칙으로 교체한다
 *      (자세한 내용은 프로젝트 루트의 MULTIPLAYER_SETUP.md 참고).
 *
 * 이 값들은 "비밀 키"가 아니라 클라이언트에 그대로 노출되는 공개 식별자이므로
 * 코드에 직접 넣어도 되지만, 대신 Realtime Database 규칙으로 접근을 제어해야 한다.
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import {
    getDatabase, ref, set, update, onValue, off, get, runTransaction, push, serverTimestamp, remove
} from 'firebase/database';
// 🖼️ 전투지도/토큰 이미지는 Firebase Storage를 쓰지 않는다 - Storage 버킷 생성은 Blaze(종량제)
// 요금제 전환(결제 수단 등록)이 필요할 수 있어서, 카드 등록 없이 바로 쓸 수 있도록 압축한
// base64 이미지를 Realtime Database(무료 Spark 플랜)에 그대로 저장하는 방식을 쓴다.

const FIREBASE_CONFIG = {
    apiKey: "AIzaSyBe7Z889wUM6W4inCq70y0w1a1xPuA6-GI",
    authDomain: "tgultgul.firebaseapp.com",
    databaseURL: "https://tgultgul-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "tgultgul",
    storageBucket: "tgultgul.firebasestorage.app",
    messagingSenderId: "345947100947",
    appId: "1:345947100947:web:8a320b8af98e32fc3a6ce6"
};

let dbInstance = null;

// 여러 컴포넌트에서 중복 initializeApp 호출해도 안전하게 싱글턴으로 반환
export const getFirebaseDb = () => {
    if (dbInstance) return dbInstance;
    const app = getApps().length ? getApp() : initializeApp(FIREBASE_CONFIG);
    dbInstance = getDatabase(app);
    return dbInstance;
};

// 방 코드 생성 (사람이 부르기 쉬운 6자리 대문자+숫자)
export const generateRoomCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 헷갈리는 0/O, 1/I 제외
    let code = '';
    for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return code;
};

export const roomRef = (roomId) => ref(getFirebaseDb(), `rooms/${roomId}`);

export const roomExists = async (roomId) => {
    const snap = await get(roomRef(roomId));
    return snap.exists();
};

export const createRoom = async (roomId, initialData) => {
    await set(roomRef(roomId), {
        ...initialData
      , createdAt : serverTimestamp()
      , turnLock : null
    });
    return roomId;
};

export const subscribeRoom = (roomId, callback) => {
    const r = roomRef(roomId);
    onValue(r, (snap) => callback(snap.val()));
    return () => off(r);
};

export const updateRoom = (roomId, patch) => update(roomRef(roomId), patch);

export const setRoomPlayer = (roomId, playerId, playerData) =>
    update(roomRef(roomId), { [`players/${playerId}`] : playerData });

export const removeRoomPlayer = (roomId, playerId) =>
    remove(ref(getFirebaseDb(), `rooms/${roomId}/players/${playerId}`));

export const pushChatLog = (roomId, entry) =>
    push(ref(getFirebaseDb(), `rooms/${roomId}/chatLog`), { ...entry, ts : serverTimestamp() });

/**
 * 턴 잠금(turnLock) 획득 시도 - Firebase 트랜잭션으로 원자적 처리
 * 동시에 두 명이 눌러도 딱 한 명만 lockedBy를 자기 자신으로 세팅하는 데 성공한다.
 * @returns {boolean} 잠금 획득 성공 여부
 */
export const acquireTurnLock = async (roomId, playerId) => {
    const lockRef = ref(getFirebaseDb(), `rooms/${roomId}/turnLock`);
    const result = await runTransaction(lockRef, (current) => {
        // 5초 이상 잠긴 채로 방치된 잠금은 죽은 세션으로 간주하고 강제로 풀어준다 (락 영구 정지 방지)
        const isStale = current && current.lockedAt && (Date.now() - current.lockedAt > 15000);
        if (!current || isStale) {
            return { lockedBy : playerId, lockedAt : Date.now() };
        }
        return current; // 이미 다른 사람이 쥐고 있음 -> 트랜잭션 그대로 반환(변경 없음, abort 아님)
    });

    return !!(result.committed && result.snapshot.val()?.lockedBy === playerId);
};

export const releaseTurnLock = (roomId) =>
    set(ref(getFirebaseDb(), `rooms/${roomId}/turnLock`), null);
