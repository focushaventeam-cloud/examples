/**
 * Aplicación Principal Pádel Manager Pro
 * Versión corregida y optimizada
 */

const App = (function() {
    'use strict';

    // Referencias a elementos DOM cacheados
    const DOM = {
        splash: null,
        genLoader: null,
        toast: null,
        views: {},
        header: null
    };

    // Estado interno de la app
    let currentMatchEdit = null;
    let currentEditIndex = -1;
    let bannerTimer = null;
    let bannerIndex = 0;
    let loaderInterval = null;
    let timerInterval = null;

    /**
     * Inicialización de la aplicación
     */
    function init() {
        // Cachear elementos DOM
        DOM.splash = document.getElementById('splash');
        DOM.genLoader = document.getElementById('gen-loader');
        DOM.toast = document.getElementById('toast');
        DOM.header = document.getElementById('main-header');
        DOM.views.config = document.getElementById('v-config');
        DOM.views.register = document.getElementById('v-register');
        DOM.views.dash = document.getElementById('v-dash');

        // Inicializar splash
        initSplash();
        
        // Configurar eventos globales
        setupGlobalEvents();
        
        // Cargar estado previo o iniciar en config
        setTimeout(() => {
            if (State.load()) {
                document.getElementById('tour-name').textContent = sanitize(State.tourName);
                updateTourLogoUI();
                switchView('dash');
            } else {
                switchView('config');
            }
        }, 2300);
    }

    /**
     * Animación de splash screen
     */
    function initSplash() {
        const bar = document.getElementById('splash-bar');
        const msg = document.getElementById('splash-msg');
        let progress = 0;
        
        const interval = setInterval(() => {
            progress += Math.random() * 15;
            if (progress >= 100) {
                progress = 100;
                clearInterval(interval);
                setTimeout(() => {
                    DOM.splash.style.transition = 'opacity 0.5s ease';
                    DOM.splash.style.opacity = '0';
                    setTimeout(() => {
                        DOM.splash.style.display = 'none';
                    }, 500);
                }, 500);
            }
            bar.style.width = progress + '%';
            bar.setAttribute('aria-valuenow', Math.floor(progress));
        }, 200);
    }

    /**
     * Cambia entre vistas principales
     */
    function switchView(viewName) {
        Object.keys(DOM.views).forEach(key => {
            const el = DOM.views[key];
            if (el) {
                if (key === viewName) {
                    el.classList.remove('hidden');
                    el.style.display = '';
                } else {
                    el.classList.add('hidden');
                    el.style.display = 'none';
                }
            }
        });

        // Actualizar navegación móvil
        ['config', 'register', 'dash'].forEach(key => {
            const btn = document.getElementById(`bn-${key}`);
            if (btn) {
                if (key === viewName) {
                    btn.classList.add('text-blue-600');
                    btn.classList.remove('text-gray-400');
                    btn.setAttribute('aria-current', 'page');
                } else {
                    btn.classList.remove('text-blue-600');
                    btn.classList.add('text-gray-400');
                    btn.removeAttribute('aria-current');
                }
            }
        });

        // Actualizar indicadores de paso
        const steps = ['config', 'register', 'dash'];
        const currentIndex = steps.indexOf(viewName);
        [0, 1, 2].forEach(i => {
            const el = document.getElementById(`step-${i}`);
            if (el) {
                el.style.background = i <= currentIndex ? 'rgba(255,255,255,0.88)' : 'rgba(255,255,255,0.2)';
            }
        });

        // Mostrar/ocultar toggle de header
        const toggle = document.getElementById('hdr-toggle');
        if (toggle) {
            toggle.style.display = viewName === 'dash' ? 'block' : 'none';
        }

        // Acciones específicas por vista
        if (viewName === 'dash') {
            renderDashboard();
            startBanner();
        } else if (viewName === 'register') {
            updateRegistrationView();
        }
    }

    /**
     * Configuración de eventos globales
     */
    function setupGlobalEvents() {
        // Scroll para efecto glass en header
        window.addEventListener('scroll', debounce(() => {
            if (DOM.header) {
                DOM.header.classList.toggle('glass', window.scrollY > 30);
            }
        }, 50), { passive: true });

        // Efecto ripple en botones
        document.addEventListener('pointerdown', (e) => {
            const btn = e.target.closest('button');
            if (!btn || btn.disabled) return;
            
            const ripple = document.createElement('span');
            ripple.className = 'ripple';
            const rect = btn.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height) * 2;
            ripple.style.cssText = `
                width: ${size}px;
                height: ${size}px;
                left: ${e.clientX - rect.left - size/2}px;
                top: ${e.clientY - rect.top - size/2}px;
            `;
            btn.appendChild(ripple);
            setTimeout(() => ripple.remove(), 600);
        });

        // Validación de formularios
        document.getElementById('config-form')?.addEventListener('submit', handleConfigSubmit);
    }

    /**
     * Maneja el envío del formulario de configuración
     */
    function handleConfigSubmit(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const playersPerTeam = parseInt(document.getElementById('f-playersPerTeam')?.value) || 2;
        
        if (playersPerTeam < 1 || playersPerTeam > 20) {
            showToast('⚠️ Jugadores por equipo debe estar entre 1 y 20');
            return;
        }

        const setType = document.getElementById('f-settype').value;
        let gamesPerSet = 6;
        if (setType === 'short') gamesPerSet = 4;
        else if (setType === 'pro') gamesPerSet = 8;
        else if (setType === 'custom') gamesPerSet = parseInt(document.getElementById('f-custom-games')?.value) || 6;

        const tiebreakType = document.getElementById('f-tiebreak-type').value;
        let tiebreakPoints = 7;
        if (tiebreakType === 'match' || tiebreakType === 'champions') tiebreakPoints = 10;
        else if (tiebreakType === 'custom') tiebreakPoints = parseInt(document.getElementById('f-tiebreak-points')?.value) || 7;

        State.config = {
            genderMode: formData.get('genderMode') || 'male',
            playersPerTeam,
            format: document.getElementById('f-format').value,
            matchType: document.getElementById('f-matchtype').value,
            numCourts: parseInt(document.getElementById('f-courts')?.value) || 2,
            ptsWin: parseInt(document.getElementById('f-win')?.value) || 3,
            ptsLoss: parseInt(document.getElementById('f-loss')?.value) || 0,
            ptsDraw: parseInt(document.getElementById('f-draw')?.value) || 0,
            setType,
            gamesPerSet,
            tiebreakType,
            tiebreakPoints,
            startDate: document.getElementById('f-startdate')?.value || '',
            matchesPerDay: parseInt(document.getElementById('f-matchesperday')?.value) || 4,
            availableDays: Array.from(document.querySelectorAll('.day-checkbox')).map(cb => cb.checked ? 1 : 0)
        };

        State.save();
        switchView('register');
        showToast('✅ Configuración guardada');
    }

    /**
     * Actualiza la vista de registro
     */
    function updateRegistrationView() {
        if (!State.config) return;
        
        const container = document.getElementById('v-register');
        if (!container) return;

        // Generar HTML de la vista de registro dinámicamente
        // (Simplificado - en producción sería más complejo)
        const teamCount = State.teams.filter(t => !t.isBye).length;
        
        container.innerHTML = `
            <div class="bg-white rounded-2xl shadow-sm p-5 mb-4">
                <div class="flex items-center gap-3 mb-4">
                    <button onclick="App.switchView('config')" class="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-100 hover:bg-gray-200 transition-all flex-shrink-0 ico-hscale" aria-label="Volver">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
                            <line x1="19" y1="12" x2="5" y2="12"/>
                            <polyline points="12 19 5 12 12 5"/>
                        </svg>
                    </button>
                    <div class="flex-1 min-w-0">
                        <h2 class="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2.5">
                            <span class="ico-badge ico-blue">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round">
                                    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                                    <circle cx="9" cy="7" r="4"/>
                                    <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
                                </svg>
                            </span>
                            Registrar Equipos
                        </h2>
                        <p class="text-sm text-gray-400">Mínimo 4 equipos para generar</p>
                    </div>
                    <span class="bg-blue-100 text-blue-700 font-black text-sm px-3 py-1 rounded-full ico-notify">${teamCount}</span>
                </div>
                
                <div class="flex gap-2 mb-4 flex-wrap">
                    <button onclick="App.openAddTeam()" class="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-black py-2.5 px-4 rounded-xl text-sm transition-all flex items-center justify-center gap-2 min-w-[130px] btn-shine shadow-md">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                            <circle cx="12" cy="12" r="10"/>
                            <line x1="12" y1="8" x2="12" y2="16"/>
                            <line x1="8" y1="12" x2="16" y2="12"/>
                        </svg>
                        + Nuevo Equipo
                    </button>
                </div>
                
                <div id="reg-list" class="space-y-2">
                    ${renderTeamList()}
                </div>
                
                ${teamCount >= 4 ? `
                <button onclick="App.generateTournament()" class="w-full mt-4 bg-gradient-to-r from-blue-900 to-blue-500 text-white font-black py-4 rounded-xl text-base shadow-lg hover:shadow-xl transition-all btn-pulse">
                    🏆 Generar Torneo (${teamCount} equipos)
                </button>
                ` : `
                <div class="mt-4 p-4 bg-gray-50 rounded-xl text-center text-gray-400 text-sm">
                    Necesitas al menos 4 equipos para generar el torneo
                </div>
                `}
            </div>
        `;
    }

    /**
     * Renderiza lista de equipos
     */
    function renderTeamList() {
        const teams = State.teams.filter(t => !t.isBye);
        if (!teams.length) {
            return `<div class="text-center py-10 text-gray-400">
                <p class="font-bold">Sin equipos registrados</p>
                <p class="text-sm mt-1">Pulsa Agregar para comenzar</p>
            </div>`;
        }
        
        return teams.map((t, i) => {
            const bg = t.gender === 'male' ? 'linear-gradient(135deg,#60a5fa,#2563eb)' : 
                      t.gender === 'female' ? 'linear-gradient(135deg,#f472b6,#be185d)' : 
                      'linear-gradient(135deg,#a78bfa,#7c3aed)';
            return `
                <div class="flex items-center gap-3 p-3 border-2 border-gray-100 rounded-xl bg-white">
                    ${t.photo ? 
                        `<img src="${sanitizeAttr(t.photo)}" class="w-10 h-10 rounded-full object-cover" alt="">` :
                        `<div class="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold" style="background: ${bg}">${sanitize(t.name.charAt(0))}</div>`
                    }
                    <div class="flex-1 min-w-0">
                        <p class="font-bold text-gray-900 truncate">${sanitize(t.name)}</p>
                        <p class="text-xs text-gray-500">${t.players.map(p => sanitize(p.name)).join(' · ')}</p>
                    </div>
                    <button onclick="App.editTeam(${i})" class="p-2 text-blue-600 hover:bg-blue-50 rounded-lg" aria-label="Editar">
                        ${ICO.pen}
                    </button>
                    <button onclick="App.deleteTeam(${i})" class="p-2 text-red-600 hover:bg-red-50 rounded-lg" aria-label="Eliminar">
                        ${ICO.trash}
                    </button>
                </div>
            `;
        }).join('');
    }

    /**
     * Genera el torneo según el formato configurado
     */
    function generateTournament() {
        if (!State.config) return;
        
        const teams = State.teams.filter(t => !t.isBye);
        if (teams.length < 4) {
            showToast('⚠️ Se necesitan al menos 4 equipos');
            return;
        }

        if (!State.config.availableDays.some(v => v === 1)) {
            showToast('⚠️ Selecciona al menos un día de juego');
            return;
        }

        startLoader();
        
        State.matches = [];
        State.swissState = null;
        State.groupsKOdone = false;
        State.groupsData = null;

        try {
            switch(State.config.format) {
                case 'elimination':
                    generateElimination(teams);
                    break;
                case 'league':
                    generateLeague(teams);
                    break;
                case 'groups':
                    generateGroups(teams);
                    break;
                case 'americano':
                case 'mexicano':
                    generateRoundRobin(teams, State.config.format);
                    break;
                case 'swiss':
                    generateSwiss(teams);
                    break;
                default:
                    generateElimination(teams);
            }

            assignMatchDates();
            assignMatchTimes();
            State.save();
            
            setTimeout(() => {
                finishLoader();
                showConfirmDialog();
            }, 800);
            
        } catch (error) {
            console.error('Error generando torneo:', error);
            showToast('❌ Error al generar torneo: ' + error.message);
            if (loaderInterval) clearInterval(loaderInterval);
            DOM.genLoader.style.display = 'none';
        }
    }

    /**
     * Genera bracket de eliminación
     */
    function generateElimination(teams) {
        let ordered = [...teams];
        
        // Aplicar sorteo según configuración
        if (State.config.matchType === 'seeded') {
            ordered.sort((a, b) => (b.seed ? 1 : 0) - (a.seed ? 1 : 0));
        } else if (State.config.matchType === 'snake') {
            ordered.sort((a, b) => (b.seed ? 1 : 0) - (a.seed ? 1 : 0));
            const temp = [];
            while (ordered.length) {
                temp.push(ordered.shift());
                if (ordered.length) temp.push(ordered.pop());
            }
            ordered = temp;
        } else {
            // Aleatorio (Fisher-Yates)
            for (let i = ordered.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [ordered[i], ordered[j]] = [ordered[j], ordered[i]];
            }
        }

        const n = ordered.length;
        const size = Math.pow(2, Math.ceil(Math.log2(n)));
        const byes = size - n;
        
        // Añadir BYEs
        for (let i = 0; i < byes; i++) {
            ordered.push({ id: `bye${i}`, name: 'BYE', isBye: true });
        }

        // Crear primera ronda
        let matchNum = 1;
        let currentRound = [];
        
        for (let i = 0; i < ordered.length; i += 2) {
            const t1 = ordered[i];
            const t2 = ordered[i + 1];
            const isBye = t1?.isBye || t2?.isBye;
            
            const match = {
                id: `ko_r0_${i/2}`,
                round: 0,
                matchNum: matchNum++,
                t1: [t1?.id],
                t2: [t2?.id],
                t1name: t1?.name || '?',
                t2name: t2?.name || '?',
                sets: [],
                done: !!isBye,
                winner: isBye ? (t1?.isBye ? t2?.id : t1?.id) : null,
                court: ((matchNum - 1) % State.config.numCourts) + 1,
                isBye: !!isBye,
                isKO: true
            };
            
            currentRound.push(match);
            State.matches.push(match);
        }

        // Crear rondas subsiguientes
        let roundNum = 1;
        while (currentRound.length > 1) {
            const nextRound = [];
            for (let i = 0; i < currentRound.length; i += 2) {
                const m1 = currentRound[i];
                const m2 = currentRound[i + 1] || currentRound[i]; // Handle odd numbers
                
                const match = {
                    id: `ko_r${roundNum}_${i/2}`,
                    round: roundNum,
                    matchNum: matchNum++,
                    t1: [`winner_of_${m1.id}`],
                    t2: [`winner_of_${m2.id}`],
                    t1name: '?',
                    t2name: '?',
                    sets: [],
                    done: false,
                    winner: null,
                    court: ((matchNum - 1) % State.config.numCourts) + 1,
                    isBye: false,
                    isKO: true
                };
                
                nextRound.push(match);
                State.matches.push(match);
            }
            currentRound = nextRound;
            roundNum++;
        }
    }

    /**
     * Genera liga (todos contra todos)
     */
    function generateLeague(teams) {
        let matchNum = 1;
        for (let i = 0; i < teams.length; i++) {
            for (let j = i + 1; j < teams.length; j++) {
                State.matches.push({
                    id: `lg_${i}_${j}`,
                    round: 0,
                    matchNum: matchNum++,
                    t1: [teams[i].id],
                    t2: [teams[j].id],
                    t1name: teams[i].name,
                    t2name: teams[j].name,
                    sets: [],
                    done: false,
                    winner: null,
                    court: ((matchNum - 1) % State.config.numCourts) + 1,
                    isBye: false,
                    format: 'league'
                });
            }
        }
    }

    /**
     * Genera formato suizo
     */
    function generateSwiss(teams) {
        const validTeams = teams.filter(t => !t.isBye);
        if (validTeams.length < 4) throw new Error('Se necesitan al menos 4 equipos para Suizo');
        
        const numRounds = Math.min(7, Math.max(3, Math.ceil(Math.log2(validTeams.length)) + 1));
        
        State.swissState = {
            roundsTotal: numRounds,
            currentRound: 0,
            stats: {},
            matchCounter: 1
        };

        validTeams.forEach(t => {
            State.swissState.stats[t.id] = {
                id: t.id,
                name: t.name,
                points: 0,
                opponents: new Set(),
                matchesPlayed: 0,
                setsWon: 0,
                setsLost: 0,
                gamesWon: 0,
                gamesLost: 0,
                byes: 0
            };
        });

        generateSwissRound();
    }

    /**
     * Genera una ronda suiza
     */
    function generateSwissRound() {
        if (!State.swissState) return;
        
        const currentRound = State.swissState.currentRound;
        if (currentRound >= State.swissState.roundsTotal) return;

        const stats = State.swissState.stats;
        const activeTeams = Object.values(stats);
        
        // Ordenar por puntos, sets, games
        const sorted = [...activeTeams].sort((a, b) => {
            if (b.points !== a.points) return b.points - a.points;
            const diffA = a.setsWon - a.setsLost;
            const diffB = b.setsWon - b.setsLost;
            if (diffB !== diffA) return diffB - diffA;
            return (b.gamesWon - b.gamesLost) - (a.gamesWon - a.gamesLost);
        }).map(s => s.id);

        const paired = [];
        const used = new Set();

        // Emparejamiento por cercanía de puntos sin repetir oponentes
        for (let i = 0; i < sorted.length; i++) {
            if (used.has(sorted[i])) continue;
            
            let opponent = null;
            // Buscar oponente no enfrentado previamente
            for (let j = i + 1; j < sorted.length; j++) {
                if (!used.has(sorted[j]) && !stats[sorted[i]].opponents.has(sorted[j])) {
                    opponent = sorted[j];
                    break;
                }
            }
            
            // Si no hay opción ideal, buscar cualquiera disponible
            if (!opponent) {
                for (let j = i + 1; j < sorted.length; j++) {
                    if (!used.has(sorted[j])) {
                        opponent = sorted[j];
                        break;
                    }
                }
            }
            
            if (opponent) {
                paired.push([sorted[i], opponent]);
                used.add(sorted[i]);
                used.add(opponent);
                stats[sorted[i]].opponents.add(opponent);
                stats[opponent].opponents.add(sorted[i]);
            }
        }

        // Manejar jugador libre (bye) si hay número impar
        const unpaired = sorted.filter(id => !used.has(id));
        if (unpaired.length > 0) {
            const byeCandidate = unpaired.sort((a, b) => stats[a].points - stats[b].points)[0];
            if (byeCandidate) {
                stats[byeCandidate].points += 1;
                stats[byeCandidate].matchesPlayed++;
                stats[byeCandidate].byes++;
            }
        }

        // Crear partidos
        paired.forEach(([id1, id2], idx) => {
            const t1 = State.teams.find(t => t.id === id1);
            const t2 = State.teams.find(t => t.id === id2);
            
            if (t1 && t2) {
                State.matches.push({
                    id: `swiss_r${currentRound}_${idx}`,
                    round: currentRound,
                    matchNum: State.swissState.matchCounter++,
                    t1: [id1],
                    t2: [id2],
                    t1name: t1.name,
                    t2name: t2.name,
                    sets: [],
                    done: false,
                    winner: null,
                    court: ((State.swissState.matchCounter - 1) % State.config.numCourts) + 1,
                    isBye: false,
                    format: 'swiss'
                });
            }
        });

        State.swissState.currentRound++;
        State.save();
    }

    /**
     * Asigna fechas a los partidos
     */
    function assignMatchDates() {
        if (!State.config?.startDate) return;
        
        const startDate = new Date(State.config.startDate + 'T12:00:00');
        if (isNaN(startDate.getTime())) return;

        const matchesPerDayTotal = State.config.matchesPerDay || 4;
        const availableDays = State.config.availableDays || [1,1,1,1,1,1,1];
        
        // Filtrar partidos pendientes de fecha
        const pending = State.matches.filter(m => !m.scheduledDate && !m.isBye);
        pending.sort((a, b) => (a.round || 0) - (b.round || 0) || (a.matchNum || 0) - (b.matchNum || 0));

        let currentDate = new Date(startDate);
        let matchesToday = 0;

        // Encontrar primer día disponible
        while (!availableDays[currentDate.getDay()]) {
            currentDate.setDate(currentDate.getDate() + 1);
        }

        for (const match of pending) {
            // Avanzar al siguiente día si es necesario
            while (!availableDays[currentDate.getDay()] || matchesToday >= matchesPerDayTotal) {
                if (!availableDays[currentDate.getDay()]) {
                    currentDate.setDate(currentDate.getDate() + 1);
                } else if (matchesToday >= matchesPerDayTotal) {
                    currentDate.setDate(currentDate.getDate() + 1);
                    matchesToday = 0;
                    // Encontrar siguiente día válido
                    while (!availableDays[currentDate.getDay()]) {
                        currentDate.setDate(currentDate.getDate() + 1);
                    }
                }
            }

            match.scheduledDate = new Date(currentDate);
            matchesToday++;
        }
    }

    /**
     * Asigna horarios a los partidos
     */
    function assignMatchTimes() {
        const matchesByDate = new Map();
        
        State.matches.forEach(m => {
            if (m.scheduledDate && !m.isBye) {
                const dateStr = m.scheduledDate.toISOString().split('T')[0];
                if (!matchesByDate.has(dateStr)) matchesByDate.set(dateStr, []);
                matchesByDate.get(dateStr).push(m);
            }
        });

        const startHour = 10;
        const matchDuration = 90; // minutos
        const maxHour = 22;

        for (const [dateStr, matches] of matchesByDate) {
            matches.sort((a, b) => (a.round || 0) - (b.round || 0) || (a.matchNum || 0) - (b.matchNum || 0));
            
            let hour = startHour;
            let minute = 0;

            for (const m of matches) {
                if (hour >= maxHour) {
                    console.warn(`Horario máximo excedido para ${dateStr}`);
                    break;
                }

                const date = new Date(dateStr + 'T00:00:00');
                date.setHours(hour, minute);
                m.scheduledDate = date;

                minute += matchDuration;
                if (minute >= 60) {
                    hour += Math.floor(minute / 60);
                    minute %= 60;
                }
            }
        }
        
        State.save();
    }

    /**
     * Muestra diálogo de confirmación post-generación
     */
    function showConfirmDialog() {
        const modal = document.getElementById('m-confirm') || createConfirmModal();
        const total = State.matches.filter(m => !m.isBye).length;
        const teams = State.teams.filter(t => !t.isBye).length;
        
        document.getElementById('cfm-sub').textContent = `${teams} equipos · ${total} partidos`;
        modal.style.display = 'flex';
    }

    function createConfirmModal() {
        const modal = document.createElement('div');
        modal.id = 'm-confirm';
        modal.className = 'fixed inset-0 bg-black/55 z-[8000] flex items-center justify-center p-4 backdrop-blur-sm';
        modal.innerHTML = `
            <div class="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl manim text-center">
                <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2" stroke-linecap="round">
                        <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
                        <polyline points="22 4 12 14.01 9 11.01"/>
                    </svg>
                </div>
                <h3 class="text-xl font-black text-gray-900 mb-1">¡Torneo Creado!</h3>
                <p class="text-sm text-gray-400 mb-4" id="cfm-sub">—</p>
                <button onclick="this.closest('#m-confirm').style.display='none'; App.switchView('dash');" 
                        class="w-full bg-gradient-to-r from-blue-800 to-blue-500 text-white font-black py-3 rounded-xl hover:shadow-lg transition-all">
                    Ver Torneo
                </button>
            </div>
        `;
        document.body.appendChild(modal);
        return modal;
    }

    /**
     * Renderiza el dashboard
     */
    function renderDashboard() {
        const container = document.getElementById('v-dash');
        if (!container) return;

        const total = State.matches.filter(m => !m.isBye).length;
        const done = State.matches.filter(m => m.done && !m.isBye).length;
        const pending = total - done;
        const pct = total > 0 ? Math.round(done / total * 100) : 0;

        // Actualizar contadores
        document.getElementById('d-teams').textContent = State.teams.filter(t => !t.isBye).length;
        document.getElementById('d-done').textContent = done;
        document.getElementById('d-pend').textContent = pending;
        document.getElementById('dash-prog').style.width = pct + '%';
        document.getElementById('dash-prog-lbl').textContent = `${done}/${total}`;
        document.getElementById('dash-prog-pct').textContent = pct + '%';

        // Renderizar bracket
        renderBracket();
    }

    /**
     * Renderiza el bracket/cuadro
     */
    function renderBracket() {
        const wrap = document.getElementById('bracket-wrap');
        if (!wrap) return;

        const format = State.config?.format;
        if (['league', 'americano', 'mexicano'].includes(format)) {
            wrap.innerHTML = `<div class="p-8 text-center text-gray-500">Este formato no tiene cuadro eliminatorio</div>`;
            return;
        }

        const rounds = [...new Set(State.matches.map(m => m.round))].sort((a, b) => a - b);
        const roundNames = {
            0: '1ª Ronda',
            1: 'Cuartos',
            2: 'Semifinal',
            3: 'Final',
            100: 'KO-Cuartos',
            101: 'KO-Semi',
            102: 'KO-Final'
        };

        wrap.innerHTML = rounds.map(r => {
            const matches = State.matches.filter(m => m.round === r && !m.isBye);
            if (!matches.length) return '';
            
            return `
                <div class="bcol">
                    <div class="bcol-title">${roundNames[r] || `Ronda ${r + 1}`}</div>
                    ${matches.map(m => {
                        const winner = m.winner;
                        const t1Winner = winner && m.t1.includes(winner);
                        const t2Winner = winner && m.t2.includes(winner);
                        const setResults = m.sets.map(s => {
                            if (s.tiebreak) return `${s.games[0]}-${s.games[1]} (${s.tiebreak[0]}-${s.tiebreak[1]})`;
                            return `${s.games[0]}-${s.games[1]}`;
                        }).join(', ');
                        
                        return `
                            <div class="bmatch ${m.done ? 'done' : ''} ${r === Math.max(...rounds) ? 'final' : ''}" 
                                 onclick="App.openScore('${m.id}')">
                                <div class="bteam ${t1Winner ? 'winner' : t2Winner ? 'loser' : ''}">
                                    <span class="truncate">${sanitize(m.t1name || State.teams.find(t => t.id === m.t1[0])?.name || '?')}</span>
                                    <span class="bscore">${setResults || '—'}</span>
                                </div>
                                <div class="bteam ${t2Winner ? 'winner' : t1Winner ? 'loser' : ''}">
                                    <span class="truncate">${sanitize(m.t2name || State.teams.find(t => t.id === m.t2[0])?.name || '?')}</span>
                                    <span class="bscore">${setResults || '—'}</span>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
        }).join('');
    }

    /**
     * Abre modal para editar resultado
     */
    function openScore(matchId) {
        const m = State.matches.find(x => x.id === matchId);
        if (!m) return;

        // Validación Suizo: no permitir abrir si no es la ronda actual
        if (State.config.format === 'swiss' && State.swissState) {
            const currentRound = State.swissState.currentRound - 1;
            if (m.round > currentRound) {
                showToast('⚠️ Completa primero la ronda actual');
                return;
            }
        }

        currentMatchEdit = matchId;
        
        // Construir modal dinámicamente si no existe
        let modal = document.getElementById('m-score');
        if (!modal) {
            modal = createScoreModal();
        }
        
        // Llenar datos
        document.getElementById('score-badge').textContent = m.done ? 'Jugado' : 'Pendiente';
        document.getElementById('score-badge').className = `text-xs font-bold px-2 py-0.5 rounded-full ${m.done ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-600'}`;
        
        document.getElementById('score-teams').innerHTML = `
            <div class="text-center flex-1">
                <p class="font-bold">${sanitize(m.t1name)}</p>
                ${m.winner && m.t1.includes(m.winner) ? '<span class="text-green-600 text-sm">⭐ Ganador</span>' : ''}
            </div>
            <div class="text-gray-400">VS</div>
            <div class="text-center flex-1">
                <p class="font-bold">${sanitize(m.t2name)}</p>
                ${m.winner && m.t2.includes(m.winner) ? '<span class="text-green-600 text-sm">⭐ Ganador</span>' : ''}
            </div>
        `;

        // Generar inputs de sets
        const numSets = State.config.setType === 'pro' ? 1 : 
                       State.config.setType === 'champions' ? 3 : 2;
        const gamesPerSet = State.config.gamesPerSet || 6;
        
        let setsHtml = '';
        for (let i = 0; i < numSets; i++) {
            const set = m.sets[i] || { games: [0, 0], tiebreak: null };
            setsHtml += `
                <div class="mb-4 p-4 border rounded-xl">
                    <p class="text-sm font-bold text-gray-500 mb-2">SET ${i + 1}</p>
                    <div class="flex items-center gap-2">
                        <input type="number" id="st1s${i}" value="${set.games[0] || ''}" 
                               class="w-full border-2 rounded-xl py-2 text-center font-bold text-xl" min="0" max="20">
                        <span class="font-bold text-gray-400">-</span>
                        <input type="number" id="st2s${i}" value="${set.games[1] || ''}" 
                               class="w-full border-2 rounded-xl py-2 text-center font-bold text-xl" min="0" max="20">
                    </div>
                    ${i === 2 && State.config.setType === 'champions' ? 
                        `<div class="mt-2 text-xs text-amber-600 bg-amber-50 p-2 rounded">Super Tie-Break a 10 puntos</div>` : ''}
                </div>
            `;
        }
        
        document.getElementById('score-sets-container').innerHTML = setsHtml;
        modal.style.display = 'flex';
        
        startTimer();
    }

    function createScoreModal() {
        const modal = document.createElement('div');
        modal.id = 'm-score';
        modal.className = 'fixed inset-0 bg-black/55 z-[8000] hidden items-center justify-center p-4 backdrop-blur-sm';
        modal.innerHTML = `
            <div class="bg-white rounded-2xl p-5 w-full max-w-md shadow-2xl manim">
                <div class="flex justify-between items-center mb-3">
                    <div>
                        <h3 class="text-lg font-black text-gray-900">Resultado</h3>
                        <span id="score-badge" class="text-xs font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-600">Pendiente</span>
                    </div>
                    <span id="score-timer" class="font-mono text-sm font-black text-blue-600">00:00</span>
                    <button onclick="App.closeScore()" class="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                            <line x1="18" y1="6" x2="6" y2="18"/>
                            <line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                    </button>
                </div>
                <div id="score-teams" class="flex justify-between items-center mb-4 p-3 bg-slate-50 rounded-xl"></div>
                <form onsubmit="App.saveScore(event)" id="score-form">
                    <div id="score-sets-container"></div>
                    <button type="submit" class="w-full bg-gradient-to-r from-blue-800 to-blue-500 text-white font-black py-3 rounded-xl hover:shadow-lg transition-all mt-4">
                        Guardar Resultado
                    </button>
                </form>
            </div>
        `;
        document.body.appendChild(modal);
        return modal;
    }

    /**
     * Guarda el resultado del partido
     */
    function saveScore(e) {
        e.preventDefault();
        if (!currentMatchEdit) return;
        
        const m = State.matches.find(x => x.id === currentMatchEdit);
        if (!m) return;

        const numSets = State.config.setType === 'pro' ? 1 : 
                       State.config.setType === 'champions' ? 3 : 2;
        const gamesPerSet = State.config.gamesPerSet || 6;
        const newSets = [];
        let t1Sets = 0, t2Sets = 0;

        for (let i = 0; i < numSets; i++) {
            const g1 = parseInt(document.getElementById(`st1s${i}`)?.value) || 0;
            const g2 = parseInt(document.getElementById(`st2s${i}`)?.value) || 0;
            
            // Validación básica de set
            if (g1 === gamesPerSet && g2 === gamesPerSet) {
                showToast(`⚠️ Set ${i+1}: No puede haber empate a ${gamesPerSet}`);
                return;
            }
            
            const maxGames = Math.max(g1, g2);
            const minGames = Math.min(g1, g2);
            
            if (maxGames < gamesPerSet && maxGames - minGames !== 2) {
                showToast(`⚠️ Set ${i+1}: Se necesitan ${gamesPerSet} games o diferencia de 2`);
                return;
            }
            
            if (maxGames >= gamesPerSet && maxGames - minGames < 2) {
                showToast(`⚠️ Set ${i+1}: Debe haber diferencia de 2 games`);
                return;
            }

            newSets.push({ games: [g1, g2], tiebreak: null });
            
            if (g1 > g2) t1Sets++;
            else if (g2 > g1) t2Sets++;
        }

        // Determinar ganador
        const winner = t1Sets > t2Sets ? m.t1[0] : (t2Sets > t1Sets ? m.t2[0] : null);
        
        if (!winner && State.config.ptsDraw === 0) {
            showToast('⚠️ Debe haber un ganador');
            return;
        }

        m.sets = newSets;
        m.done = true;
        m.winner = winner;

        // Avanzar en eliminación directa
        if (winner && (State.config.format === 'elimination' || State.config.format === 'groups')) {
            advanceWinner(m.id, winner);
        }

        // Actualizar estadísticas suizo
        if (State.config.format === 'swiss') {
            updateSwissStats(m.id, winner);
        }

        State.save();
        closeScore();
        renderDashboard();
        checkChampion();
        showToast('✅ Resultado guardado');
    }

    /**
     * Avanza al ganador en bracket
     */
    function advanceWinner(matchId, winnerId) {
        const nextMatch = State.matches.find(m => 
            m.t1[0] === `winner_of_${matchId}` || m.t2[0] === `winner_of_${matchId}`
        );
        
        if (nextMatch) {
            const isT1 = nextMatch.t1[0] === `winner_of_${matchId}`;
            const team = State.teams.find(t => t.id === winnerId);
            
            if (isT1) {
                nextMatch.t1 = [winnerId];
                nextMatch.t1name = team?.name || '?';
            } else {
                nextMatch.t2 = [winnerId];
                nextMatch.t2name = team?.name || '?';
            }
            State.save();
        }
    }

    /**
     * Actualiza estadísticas del sistema suizo
     */
    function updateSwissStats(matchId, winnerId) {
        if (!State.swissState) return;
        
        const m = State.matches.find(x => x.id === matchId);
        if (!m || !m.done) return;

        const t1 = m.t1[0];
        const t2 = m.t2[0];
        const stats = State.swissState.stats;
        
        if (!stats[t1] || !stats[t2]) return;

        // Actualizar puntos
        if (winnerId === t1) {
            stats[t1].points += State.config.ptsWin;
            stats[t2].points += State.config.ptsLoss;
        } else if (winnerId === t2) {
            stats[t1].points += State.config.ptsLoss;
            stats[t2].points += State.config.ptsWin;
        } else if (State.config.ptsDraw > 0) {
            stats[t1].points += State.config.ptsDraw;
            stats[t2].points += State.config.ptsDraw;
        }

        // Actualizar sets y games
        m.sets.forEach(set => {
            const [g1, g2] = set.games;
            stats[t1].setsWon += g1 > g2 ? 1 : 0;
            stats[t1].setsLost += g1 < g2 ? 1 : 0;
            stats[t1].gamesWon += g1;
            stats[t1].gamesLost += g2;
            
            stats[t2].setsWon += g2 > g1 ? 1 : 0;
            stats[t2].setsLost += g2 < g1 ? 1 : 0;
            stats[t2].gamesWon += g2;
            stats[t2].gamesLost += g1;
        });

        stats[t1].matchesPlayed++;
        stats[t2].matchesPlayed++;

        // Verificar si se completó la ronda para generar la siguiente
        const currentRound = State.swissState.currentRound - 1;
        const roundMatches = State.matches.filter(m => m.round === currentRound && !m.isBye);
        const allDone = roundMatches.every(m => m.done);

        if (allDone && State.swissState.currentRound < State.swissState.roundsTotal) {
            generateSwissRound();
            showToast('🔄 Nueva ronda generada');
        }

        State.save();
    }

    /**
     * Verifica si hay campeón
     */
    function checkChampion() {
        const total = State.matches.filter(m => !m.isBye).length;
        const done = State.matches.filter(m => m.done && !m.isBye).length;
        
        if (total === 0 || done < total) return;

        // Lógica para determinar campeón según formato...
        // (Simplificado para el ejemplo)
    }

    /**
     * Cierra modal de score
     */
    function closeScore() {
        const modal = document.getElementById('m-score');
        if (modal) modal.style.display = 'none';
        stopTimer();
        currentMatchEdit = null;
    }

    /**
     * Timer para el modal de score
     */
    function startTimer() {
        stopTimer();
        let seconds = 0;
        const el = document.getElementById('score-timer');
        timerInterval = setInterval(() => {
            seconds++;
            if (el) {
                el.textContent = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
            }
        }, 1000);
    }

    function stopTimer() {
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
    }

    /**
     * Loader de generación
     */
    function startLoader() {
        DOM.genLoader.style.display = 'flex';
        DOM.genLoader.setAttribute('aria-hidden', 'false');
        
        let progress = 0;
        const steps = ['Creando cuadro...', 'Asignando partidos...', 'Calculando fechas...', '¡Casi listo!'];
        let stepIndex = 0;
        
        loaderInterval = setInterval(() => {
            progress += 2;
            if (progress >= 100) {
                progress = 100;
                clearInterval(loaderInterval);
            }
            
            const bar = document.getElementById('gl-bar');
            const pct = document.getElementById('gl-pct');
            const msg = document.getElementById('gl-msg');
            
            if (bar) bar.style.width = progress + '%';
            if (pct) pct.textContent = Math.round(progress) + '%';
            
            const newStep = Math.floor(progress / 25);
            if (newStep !== stepIndex && newStep < steps.length) {
                stepIndex = newStep;
                if (msg) msg.textContent = steps[stepIndex];
            }
        }, 80);
    }

    function finishLoader() {
        if (loaderInterval) {
            clearInterval(loaderInterval);
            loaderInterval = null;
        }
        DOM.genLoader.style.display = 'none';
        DOM.genLoader.setAttribute('aria-hidden', 'true');
    }

    function skipLoader() {
        if (loaderInterval) {
            clearInterval(loaderInterval);
            loaderInterval = null;
        }
        finishLoader();
    }

    /**
     * Banner rotativo
     */
    function startBanner() {
        stopBanner();
        // Lógica del banner...
        bannerTimer = setInterval(() => {
            // Rotar slides...
        }, 5000);
    }

    function stopBanner() {
        if (bannerTimer) {
            clearInterval(bannerTimer);
            bannerTimer = null;
        }
    }

    /**
     * Muestra toast notification
     */
    function showToast(message, duration = 3000) {
        if (!DOM.toast) return;
        
        DOM.toast.innerHTML = message;
        DOM.toast.classList.add('show');
        
        setTimeout(() => {
            DOM.toast.classList.remove('show');
        }, duration);
    }

    /**
     * Toggle dark mode
     */
    function toggleDarkMode() {
        document.body.classList.toggle('dark-mode');
        const isDark = document.body.classList.contains('dark-mode');
        localStorage.setItem('pm12_darkmode', isDark ? '1' : '0');
        showToast(isDark ? '🌙 Modo oscuro activado' : '☀️ Modo claro activado');
    }

    /**
     * Reinicia todo
     */
    function resetAll() {
        if (!confirm('⚠️ ¿Eliminar TODO el torneo? Esta acción no se puede deshacer.')) return;
        
        if (State.teams.length > 0 && confirm('¿Exportar torneo antes de borrar?')) {
            State.exportTournament();
        }
        
        stopBanner();
        stopTimer();
        if (loaderInterval) clearInterval(loaderInterval);
        
        State.clearAll();
        document.getElementById('tour-name').textContent = 'Torneo Pádel';
        switchView('config');
        showToast('🔄 Torneo reiniciado');
    }

    // API Pública
    return {
        init,
        switchView,
        openAddTeam: () => showToast('Función de agregar equipo - implementar modal'),
        editTeam: (idx) => showToast('Editando equipo ' + idx),
        deleteTeam: (idx) => {
            if (confirm('¿Eliminar este equipo?')) {
                State.teams.splice(idx, 1);
                State.save();
                updateRegistrationView();
                showToast('Equipo eliminado');
            }
        },
        generateTournament,
        openScore,
        saveScore,
        closeScore,
        skipLoader,
        toggleDarkMode,
        resetAll,
        toggleHeader: () => {
            const body = document.getElementById('hdr-body');
            const strip = document.getElementById('hdr-strip');
            const toggle = document.getElementById('hdr-toggle');
            
            if (body.classList.contains('hdr-hidden')) {
                body.classList.remove('hdr-hidden');
                strip?.classList.remove('visible');
                toggle?.classList.remove('collapsed');
                toggle?.setAttribute('aria-expanded', 'true');
            } else {
                body.classList.add('hdr-hidden');
                strip?.classList.add('visible');
                toggle?.classList.add('collapsed');
                toggle?.setAttribute('aria-expanded', 'false');
            }
        }
    };
})();

// Inicializar cuando DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', App.init);
} else {
    App.init();
}

// Exponer globalmente para los onclick inline (mejor práctica sería event delegation)
window.App = App;
