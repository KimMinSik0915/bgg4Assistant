
import imperiumIcoPath from '../../resource/icon/imperium_legend.png';
import banduIcoPath from '../../resource/icon/Lord_of_Rings_duel_.jpg';
import {SettingsIcon, BookOpenIcon} from "lucide-react";

export const homeScreenItems = [
      {id: 'imperium', icon: imperiumIcoPath, label: '임페리움:레전드', isCustomIcon: true, path : '/imperium', tag : '전략 보드게임'}
    , {id: 'bandu', icon: banduIcoPath, label: '반지의 제왕: 가운데땅에서의 대결', isCustomIcon: true, path : '/bandu', tag : '대결 보드게임'}
    , {id: 'character-sheet', icon: BookOpenIcon, label: 'D&D 캐릭터 시트', isCustomIcon: false, path : '/character-sheet', tag : 'TRPG · AI GM'}
    , {id: 'settings', icon: SettingsIcon, label: '설정', isCustomIcon: false, path : '/settings', tag : '앱 정보'}
];
