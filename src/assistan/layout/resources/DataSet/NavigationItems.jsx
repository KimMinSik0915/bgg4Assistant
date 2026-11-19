import { Crown, Swords, BookOpen } from 'lucide-react';

// 헤더 메뉴바 - 홈(로고 클릭으로 대체)/주사위(전역 FAB로 대체)/설정(로그인 옆 아이콘으로 이동)은 빼고,
// 홈 화면 "실행할 앱 선택하기"에 있는 실제 앱 3가지만 넣는다.
export const NavigationItems = [
    {path : '/imperium', icon : Crown, text : '임페리움'}
  , {path : '/bandu', icon : Swords, text : '반지의 제왕'}
  , {path : '/character-sheet', icon : BookOpen, text : '캐릭터 시트'}
]
