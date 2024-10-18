
import imperiumIcoPath from '../../resource/icon/imperium_legend.png';
import banduIcoPath from '../../resource/icon/Lord_of_Rings_duel_.jpg';
import {SettingsIcon} from "lucide-react";

export const homeScreenItems = [
    {id: 'imperium', icon: imperiumIcoPath, label: '임페리움:레전드', isCustomIcon: true}
  , {id: 'bandu', icon: banduIcoPath, label: '반지의 제왕: 가운데땅에서의 대결', isCustomIcon: true}
  , {id: 'settings', icon: SettingsIcon, label: '설정', isCustomIcon: false}
];
