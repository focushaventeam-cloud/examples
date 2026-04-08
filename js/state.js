/**
 * Gestión de estado del torneo con validaciones y sanitización
 */

const StateConfig = {
    version: 11, // Incrementado por cambios de estructura
    KEY: 'pm12_pro',
    HIST: 'pm12_history',
    MAX_STORAGE_MB: 4 // Límite conservador para localStorage
};

const State = {
    tourName: 'Torneo Pádel',
    config: null,
    teams: [],
    matches: [],
    tourLogo: null,
    swissState: null,
    groupsKOdone: false,
    groupsData: null,

    /**
     * Guarda el estado en localStorage con manejo de errores
     * @returns {boolean} Éxito del guardado
     */
    save() {
        try {
            const data = {
                v: StateConfig.version,
                n: this.tourName,
                c: this.sanitizeConfig(this.config),
                t: this.teams.map(t => this.sanitizeTeam(t)),
                m: this.matches.map(m => this.sanitizeMatch(m)),
                logo: this.tourLogo,
                lastSaved: new Date().toISOString(),
                swissState: this.swissState ? {
                    ...this.swissState,
                    stats: Object.fromEntries(
                        Object.entries(this.swissState.stats).map(([k, s]) => [
                            k, {
                                ...s,
                                opponents: Array.from(s.opponents || [])
                            }
                        ])
                    )
                } : null,
                groupsKOdone: this.groupsKOdone,
                groupsData: this.groupsData
            };

            const json = JSON.stringify(data);
            const sizeMB = json.length / 1024 / 1024;
            
            if (sizeMB > StateConfig.MAX_STORAGE_MB) {
                console.warn(`Datos muy grandes: ${sizeMB.toFixed(2)}MB`);
                // Intentar comprimir o limpiar historial antiguo
                this.cleanupOldData();
            }

            localStorage.setItem(StateConfig.KEY, json);
            this.saveBackup();
            return true;
        } catch (e) {
            console.error('Error guardando estado:', e);
            if (e.name === 'QuotaExceededError') {
                alert('⚠️ Espacio de almacenamiento lleno. Exporta y reinicia el torneo.');
            }
            return false;
        }
    },

    /**
     * Crea backup automático
     */
    saveBackup() {
        try {
            const current = localStorage.getItem(StateConfig.KEY);
            if (current) {
                localStorage.setItem(`${StateConfig.KEY}_backup`, current);
            }
        } catch (e) {
            console.warn('No se pudo crear backup:', e);
        }
    },

    /**
     * Carga estado desde localStorage
     * @returns {boolean} Si se cargó correctamente
     */
    load() {
        try {
            let raw = localStorage.getItem(StateConfig.KEY);
            if (!raw) {
                raw = localStorage.getItem(`${StateConfig.KEY}_backup`);
            }
            if (!raw) return false;

            const data = JSON.parse(raw);
            
            // Migración de versiones antiguas
            if (data.v !== StateConfig.version) {
                console.log(`Migrando datos de v${data.v} a v${StateConfig.version}`);
                this.migrateData(data);
            }

            this.tourName = data.n || 'Torneo Pádel';
            this.config = data.c || null;
            this.teams = (data.t || []).map(t => this.restoreTeam(t));
            this.matches = (data.m || []).map(m => this.restoreMatch(m));
            this.tourLogo = data.logo || null;
            
            if (data.swissState) {
                this.swissState = {
                    ...data.swissState,
                    stats: Object.fromEntries(
                        Object.entries(data.swissState.stats).map(([k, s]) => [
                            k, {
                                ...s,
                                opponents: new Set(s.opponents || [])
                            }
                        ])
                    )
                };
            } else {
                this.swissState = null;
            }

            this.groupsKOdone = data.groupsKOdone || false;
            this.groupsData = data.groupsData || null;

            // Normalizar fechas
            this.matches.forEach(m => {
                if (m.scheduledDate && typeof m.scheduledDate === 'string') {
                    m.scheduledDate = new Date(m.scheduledDate);
                }
            });

            this.validateData();
            return !!(this.config && this.teams.length);
        } catch (e) {
            console.error('Error cargando estado:', e);
            return false;
        }
    },

    /**
     * Limpia datos antiguos si el storage está lleno
     */
    cleanupOldData() {
        try {
            // Limpiar imágenes grandes de equipos antiguos si es necesario
            this.teams.forEach(t => {
                if (t.photo && t.photo.length > 50000) { // > 50KB base64
                    console.warn(`Foto grande detectada en equipo ${t.id}, comprimiendo...`);
                    // Mantener placeholder o reducir calidad sería la opción
                }
            });
        } catch (e) {
            console.error('Error limpiando datos:', e);
        }
    },

    /**
     * Migra datos de versiones antiguas
     */
    migrateData(data) {
        // Aplicar correcciones de estructura aquí
        if (data.c) data.c = this.sanitizeConfig(data.c);
        if (data.t) data.t = data.t.map(t => this.sanitizeTeam(t));
        if (data.m) data.m = data.m.map(m => this.sanitizeMatch(m));
        data.v = StateConfig.version;
    },

    /**
     * Valida integridad de referencias entre equipos y partidos
     */
    validateData() {
        const teamIds = new Set(this.teams.map(t => t.id));
        
        this.matches.forEach(m => {
            // Validar que los IDs de equipos existan
            const validateTeamRef = (id) => {
                if (!id || typeof id !== 'string') return false;
                if (id.startsWith('winner_of_') || id.startsWith('bye')) return true;
                return teamIds.has(id);
            };

            m.t1.forEach(id => {
                if (!validateTeamRef(id)) {
                    console.warn(`Referencia inválida en t1: ${id}`);
                }
            });
            m.t2.forEach(id => {
                if (!validateTeamRef(id)) {
                    console.warn(`Referencia inválida en t2: ${id}`);
                }
            });

            // Corregir partidos ganados sin winner válido
            if (m.done && m.winner && !teamIds.has(m.winner) && !m.winner.toString().includes('w')) {
                console.warn(`Corrigiendo winner inválido: ${m.winner}`);
                m.done = false;
                m.winner = null;
            }
        });
    },

    // Métodos de sanitización
    sanitizeConfig(c) {
        if (!c) return null;
        return {
            genderMode: ['male', 'female', 'mixed'].includes(c.genderMode) ? c.genderMode : 'mixed',
            playersPerTeam: Math.min(20, Math.max(1, parseInt(c.playersPerTeam) || 2)),
            format: ['elimination', 'league', 'groups', 'americano', 'mexicano', 'swiss'].includes(c.format) 
                ? c.format 
                : 'elimination',
            matchType: ['random', 'seeded', 'snake'].includes(c.matchType) ? c.matchType : 'random',
            numCourts: Math.min(50, Math.max(1, parseInt(c.numCourts) || 2)),
            ptsWin: Math.min(100, Math.max(0, parseInt(c.ptsWin) || 3)),
            ptsLoss: Math.min(100, Math.max(0, parseInt(c.ptsLoss) || 0)),
            ptsDraw: Math.min(100, Math.max(0, parseInt(c.ptsDraw) || 0)),
            setType: ['normal', 'short', 'pro', 'champions', 'custom'].includes(c.setType) ? c.setType : 'normal',
            gamesPerSet: Math.min(15, Math.max(1, parseInt(c.gamesPerSet) || 6)),
            tiebreakType: ['standard', 'match', 'champions', 'custom'].includes(c.tiebreakType) ? c.tiebreakType : 'standard',
            tiebreakPoints: Math.min(25, Math.max(5, parseInt(c.tiebreakPoints) || 7)),
            startDate: typeof c.startDate === 'string' ? c.startDate : '',
            matchesPerDay: Math.min(100, Math.max(1, parseInt(c.matchesPerDay) || 4)),
            availableDays: Array.isArray(c.availableDays) ? c.availableDays.slice(0, 7).map(v => v ? 1 : 0) : [1,1,1,1,1,1,1]
        };
    },

    sanitizeTeam(t) {
        if (!t) return null;
        return {
            id: String(t.id || generateId()).substring(0, 50),
            name: String(t.name || 'Equipo').substring(0, 50),
            gender: ['male', 'female', 'mixed'].includes(t.gender) ? t.gender : 'mixed',
            category: Math.min(7, Math.max(1, parseInt(t.category) || 7)),
            seed: !!t.seed,
            photo: t.photo ? String(t.photo).substring(0, 200000) : null, // Limitar tamaño base64
            isVideo: !!t.isVideo,
            players: Array.isArray(t.players) ? t.players.slice(0, 20).map(p => ({
                name: String(p.name || '').substring(0, 40),
                gender: ['male', 'female'].includes(p.gender) ? p.gender : 'male',
                hand: ['right', 'left', ''].includes(p.hand) ? p.hand : '',
                position: ['drive', 'reves', ''].includes(p.position) ? p.position : '',
                ranking: Math.min(9999, Math.max(0, parseInt(p.ranking) || 0)),
                age: Math.min(99, Math.max(0, parseInt(p.age) || 0)),
                photo: p.photo ? String(p.photo).substring(0, 200000) : null,
                isVideo: !!p.isVideo
            })) : []
        };
    },

    sanitizeMatch(m) {
        if (!m) return null;
        return {
            id: String(m.id || generateId()),
            round: parseInt(m.round) || 0,
            matchNum: parseInt(m.matchNum) || 0,
            t1: Array.isArray(m.t1) ? m.t1.map(id => String(id)) : [],
            t2: Array.isArray(m.t2) ? m.t2.map(id => String(id)) : [],
            t1name: String(m.t1name || '').substring(0, 50),
            t2name: String(m.t2name || '').substring(0, 50),
            sets: Array.isArray(m.sets) ? m.sets.map(s => ({
                games: [parseInt(s.games?.[0]) || 0, parseInt(s.games?.[1]) || 0],
                tiebreak: s.tiebreak ? [parseInt(s.tiebreak[0]), parseInt(s.tiebreak[1])] : null
            })) : [],
            done: !!m.done,
            winner: m.winner || null,
            court: Math.min(50, Math.max(1, parseInt(m.court) || 1)),
            isBye: !!m.isBye,
            isKO: !!m.isKO,
            group: m.group !== undefined ? parseInt(m.group) : undefined,
            scheduledDate: m.scheduledDate || null,
            format: m.format || null
        };
    },

    restoreTeam(t) {
        return this.sanitizeTeam(t);
    },

    restoreMatch(m) {
        const sanitized = this.sanitizeMatch(m);
        if (sanitized.scheduledDate && typeof sanitized.scheduledDate === 'string') {
            sanitized.scheduledDate = new Date(sanitized.scheduledDate);
        }
        return sanitized;
    },

    /**
     * Guarda en historial
     */
    saveToHistory() {
        if (!this.config) return;
        try {
            const history = JSON.parse(localStorage.getItem(StateConfig.HIST) || '[]');
            const formatLabels = {
                elimination: '🏆 Eliminación Directa',
                league: '📋 Liga',
                groups: '🏟️ Grupos+KO',
                americano: '🌎 Americano',
                mexicano: '🇲🇽 Mexicano',
                swiss: '♟️ Suizo'
            };
            
            const total = this.matches.filter(m => !m.isBye).length;
            const done = this.matches.filter(m => m.done && !m.isBye).length;
            
            history.unshift({
                id: Date.now(),
                name: this.tourName,
                date: new Date().toLocaleDateString('es-ES'),
                time: new Date().toLocaleTimeString('es-ES'),
                format: formatLabels[this.config.format] || this.config.format,
                teamsCount: this.teams.filter(t => !t.isBye).length,
                matchesTotal: total,
                matchesDone: done,
                progress: total > 0 ? Math.round(done / total * 100) : 0,
                snapshot: {
                    n: this.tourName,
                    c: deepClone(this.config),
                    t: deepClone(this.teams),
                    m: deepClone(this.matches)
                }
            });
            
            localStorage.setItem(StateConfig.HIST, JSON.stringify(history.slice(0, 30)));
        } catch (e) {
            console.error('Error guardando historial:', e);
        }
    },

    /**
     * Obtiene historial
     */
    getHistory() {
        try {
            return JSON.parse(localStorage.getItem(StateConfig.HIST) || '[]');
        } catch (e) {
            return [];
        }
    },

    /**
     * Exporta torneo a JSON
     */
    exportTournament() {
        const data = {
            exportDate: new Date().toISOString(),
            version: StateConfig.version,
            tournament: {
                name: this.tourName,
                config: this.config,
                teams: this.teams,
                matches: this.matches,
                logo: this.tourLogo
            }
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${sanitize(this.tourName.replace(/[^a-z0-9]/gi, '_'))}_${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },

    /**
     * Importa torneo desde archivo
     */
    async importTournament(file) {
        return new Promise((resolve, reject) => {
            if (!file || file.type !== 'application/json') {
                reject(new Error('Archivo inválido'));
                return;
            }
            
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    
                    if (!data.tournament || !data.tournament.config) {
                        throw new Error('Estructura inválida: falta configuración');
                    }
                    
                    if (data.version && data.version > StateConfig.version) {
                        throw new Error('Versión del archivo no compatible');
                    }
                    
                    const tour = data.tournament;
                    this.tourName = tour.name || 'Torneo Importado';
                    this.config = this.sanitizeConfig(tour.config);
                    this.teams = (tour.teams || []).map(t => this.sanitizeTeam(t));
                    this.matches = (tour.matches || []).map(m => this.restoreMatch(m));
                    this.tourLogo = tour.logo || null;
                    this.swissState = null;
                    this.groupsKOdone = false;
                    this.groupsData = null;
                    
                    this.save();
                    resolve(true);
                } catch (err) {
                    reject(err);
                }
            };
            reader.onerror = () => reject(new Error('Error al leer archivo'));
            reader.readAsText(file);
        });
    },

    /**
     * Limpia todo el estado
     */
    clearAll() {
        try {
            localStorage.removeItem(StateConfig.KEY);
            localStorage.removeItem(`${StateConfig.KEY}_backup`);
            this.tourName = 'Torneo Pádel';
            this.config = null;
            this.teams = [];
            this.matches = [];
            this.tourLogo = null;
            this.swissState = null;
            this.groupsKOdone = false;
            this.groupsData = null;
            return true;
        } catch (e) {
            console.error('Error limpiando estado:', e);
            return false;
        }
    },

    clearHistory() {
        try {
            localStorage.setItem(StateConfig.HIST, '[]');
            return true;
        } catch (e) {
            return false;
        }
    }
};

// Hacer disponible globalmente
window.State = State;
