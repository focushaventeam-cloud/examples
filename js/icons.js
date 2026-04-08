/**
 * Iconos SVG reutilizables
 * @const {Object} ICO
 */
const ICO = {
    ball: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" style="display:inline-block;flex-shrink:0;vertical-align:middle"><circle cx="12" cy="12" r="10"/><path d="M4 12 Q12 7 20 12"/><path d="M4 12 Q12 17 20 12"/></svg>',
    
    trophy: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="display:inline-block;flex-shrink:0;vertical-align:middle"><path d="M6 2h12v7a6 6 0 01-12 0V2z"/><path d="M6 5H2v2a4 4 0 004 4"/><path d="M18 5h4v2a4 4 0 01-4 4"/><line x1="12" y1="15" x2="12" y2="22"/><line x1="8" y1="22" x2="16" y2="22"/></svg>',
    
    star: '<svg width="12" height="12" viewBox="0 0 24 24" fill="#fbbf24" stroke="#f59e0b" stroke-width="1" style="display:inline-block;flex-shrink:0;vertical-align:middle"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>',
    
    pen: '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" style="display:inline-block;flex-shrink:0;vertical-align:middle"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
    
    trash: '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" style="display:inline-block;flex-shrink:0;vertical-align:middle"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>',
    
    img: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" style="display:inline-block;flex-shrink:0;vertical-align:middle"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>',
    
    check: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" style="display:inline-block;flex-shrink:0;vertical-align:middle"><polyline points="20 6 9 17 4 12"/></svg>',
    
    clock: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="display:inline-block;flex-shrink:0;vertical-align:middle"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
    
    court: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="display:inline-block;flex-shrink:0;vertical-align:middle"><rect x="2" y="3" width="20" height="18" rx="1"/><line x1="12" y1="3" x2="12" y2="21"/><line x1="2" y1="12" x2="22" y2="12" stroke-dasharray="3 2"/></svg>',
    
    sparkles: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="display:inline-block;flex-shrink:0;vertical-align:middle"><path d="M12 2l2 7h7l-5.5 4 2 7L12 16l-5.5 4 2-7L3 9h7z"/></svg>',
    
    racket: '<svg width="13" height="13" viewBox="0 0 44 44" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" style="display:inline-block;flex-shrink:0;vertical-align:middle"><ellipse cx="22" cy="17" rx="11" ry="13"/><line x1="22" y1="30" x2="22" y2="42"/><line x1="15" y1="42" x2="29" y2="42"/></svg>',
    
    calendar: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="display:inline-block;flex-shrink:0;vertical-align:middle"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>'
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = ICO;
}
