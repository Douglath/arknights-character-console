// Original geometric class glyphs for the archive and PV (24x24 viewBox, stroke-free fills).
export const PROF_ORDER=['PIONEER','WARRIOR','TANK','SNIPER','CASTER','MEDIC','SUPPORT','SPECIAL'];
export const PROF={
 PIONEER:{zh:'先锋',en:'VANGUARD',d:'M4 3h3v18H4zM8 4l12 4-12 4zM8 14h6l-2 3 2 3H8z'},
 WARRIOR:{zh:'近卫',en:'GUARD',d:'M17.5 2.5 21.5 2.5 21.5 6.5 10 18 6 14zM4.5 13.5 10.5 19.5 9 21 7 19 4 22 2 20 5 17 3 15z'},
 TANK:{zh:'重装',en:'DEFENDER',d:'M12 2 21 5v6c0 6-4 9.5-9 11-5-1.5-9-5-9-11V5zm0 4-5 1.8V11c0 3.8 2.2 6 5 7.2z'},
 SNIPER:{zh:'狙击',en:'SNIPER',d:'M11 1h2v5.1a6 6 0 0 1 4.9 4.9H23v2h-5.1a6 6 0 0 1-4.9 4.9V23h-2v-5.1A6 6 0 0 1 6.1 13H1v-2h5.1A6 6 0 0 1 11 6.1zm1 7a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm0 3a1 1 0 1 1 0 2 1 1 0 0 1 0-2z'},
 CASTER:{zh:'术师',en:'CASTER',d:'M12 1 15 9 23 12 15 15 12 23 9 15 1 12 9 9zm0 7.5L10.6 12 12 15.5 13.4 12z'},
 MEDIC:{zh:'医疗',en:'MEDIC',d:'M9 2h6v7h7v6h-7v7H9v-7H2V9h7z'},
 SUPPORT:{zh:'辅助',en:'SUPPORTER',d:'M12 1.5 21 6.75v10.5L12 22.5 3 17.25V6.75zm0 3.5L6 8.5v7l6 3.5 6-3.5v-7zm0 4a3 3 0 1 1 0 6 3 3 0 0 1 0-6z'},
 SPECIAL:{zh:'特种',en:'SPECIALIST',d:'M12 1 14.5 9.5 23 12 14.5 14.5 12 23 9.5 14.5 1 12 9.5 9.5zM4 4l5 3.5L7.5 9zM20 20l-5-3.5 1.5-1.5z'},
};
export const RARITY_COLOR={6:'#ff9b21',5:'#ffd23f',4:'#c9a7ff',3:'#4fc8ff',2:'#c6e27a',1:'#d0d0d0'};
export function glyph(prof,cls='glyph'){
 const p=PROF[prof];if(!p)return '';
 return `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" fill-rule="evenodd" d="${p.d}"/></svg>`;
}
// Chapter look tokens shared by archive accents and PV sections.
export const CHAPTER_STYLE={
 rhodes:{accent:'#ffd400',ink:'#0c0d10',paper:'#e9e8e3',ref:'主线 · 罗德岛 / 巴别塔'},
 yan:{accent:'#d6332b',ink:'#1a1412',paper:'#efe6d6',ref:'怀黍离 / 登临意 · 水墨与朱印'},
 columbia:{accent:'#2b6cff',ink:'#0d1730',paper:'#f2efe6',ref:'孤星 · 复古航天与科研图纸'},
 victoria:{accent:'#c7a24a',ink:'#121418',paper:'#e8e4da',ref:'维多利亚 / 长夜临光 · 纹章与骑士竞技'},
 north:{accent:'#9fd3ff',ink:'#0f1114',paper:'#e6e2da',ref:'叙拉古人 · 黑色电影 / 谢拉格雪境'},
 sea:{accent:'#3fe0c5',ink:'#04131a',paper:'#e5f1ef',ref:'愚人号 / 空想花庭 · 深海与圣光'},
 frontier:{accent:'#ff7a2f',ink:'#17110c',paper:'#efe4d2',ref:'沙洲遗闻 / 崔林特尔梅之金 · 沙海与金'},
 crossover:{accent:'#ff3d7f',ink:'#111',paper:'#f4f1ea',ref:'各联动活动 · 漫画分格'},
 mujica:{accent:'#b3001b',ink:'#07050a',paper:'#efe7da',ref:'无忧梦呓 · 哥特剧场 / 面具与玫瑰'},
};
