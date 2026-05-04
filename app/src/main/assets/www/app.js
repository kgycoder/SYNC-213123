/* ════════════════════════════════════════════
   DYNAMIC BACKGROUND — Canvas orbs + beat reactor

════════════════════════════════════════════ */
const CVS = document.getElementById('bgc'), CX = CVS.getContext('2d');
const BG = {
    h: 240, th: 240, e: .05, te: .05, orbs: [], f: 0, playing: false,
    beat: 0, beatDecay: .04, energyLevel: 0, tEnergyLevel: 0
};

function szCvs() {
    CVS.width = innerWidth; CVS.height = innerHeight;
    BG.orbs = Array.from({ length: 7 }, (_, i) => ({
        x: Math.random() * CVS.width, y: Math.random() * CVS.height,
        vx: (Math.random() - .5) * .28, vy: (Math.random() - .5) * .28,
        r: 140 + Math.random() * 280, h: i * 51,
        a: .06 + Math.random() * .10, phase: Math.random() * Math.PI * 2
    }));
}
addEventListener('resize', szCvs); szCvs();

function triggerBeat() {
    BG.beat = Math.min(1, BG.beat + 0.85 * (0.3 + BG.energyLevel * 0.7));
}

let _beatTimer = null;
function startBeatTimer(bpm = 120) {
    clearInterval(_beatTimer);
    _beatTimer = setInterval(() => { if (BG.playing) triggerBeat(); }, 60000 / bpm);
}
function stopBeatTimer() { clearInterval(_beatTimer); _beatTimer = null; }

(function bgLoop() {
    requestAnimationFrame(bgLoop);
    BG.f++;
    BG.h += (BG.th - BG.h) * .005;
    BG.e += (BG.te - BG.e) * .014;
    BG.energyLevel += (BG.tEnergyLevel - BG.energyLevel) * .03;
    if (BG.beat > 0) BG.beat = Math.max(0, BG.beat - BG.beatDecay * (1 + BG.energyLevel));

    const beat = BG.beat, en = BG.energyLevel;
    CX.clearRect(0, 0, CVS.width, CVS.height);

    const cx = CVS.width / 2, cy = CVS.height / 2;
    const baseL = BG.playing ? 3 + beat * 5 : 1.5;
    const g = CX.createRadialGradient(cx, cy, 0, cx, cy, CVS.width * (.80 + beat * .20));
    g.addColorStop(0, `hsl(${BG.h},${16 + en * 14}%,${baseL + 1}%)`);
    g.addColorStop(1, `hsl(${BG.h + 40},${10 + en * 8}%,${baseL - 1}%)`);
    CX.fillStyle = g; CX.fillRect(0, 0, CVS.width, CVS.height);

    BG.orbs.forEach(o => {
        const speed = 1 + BG.e * 1.4 + beat * (1.5 + en * 3.5);
        o.x += o.vx * speed; o.y += o.vy * speed;
        if (o.x < -o.r) o.x = CVS.width + o.r; if (o.x > CVS.width + o.r) o.x = -o.r;
        if (o.y < -o.r) o.y = CVS.height + o.r; if (o.y > CVS.height + o.r) o.y = -o.r;
        const pulse = Math.sin(BG.f * .007 + o.phase) * .18 + beat * .40;
        const r = o.r * (1 + pulse);
        const og = CX.createRadialGradient(o.x, o.y, 0, o.x, o.y, r);
        const h = (BG.h + o.h) % 360;
        const alpha = (o.a * (BG.playing ? .60 : .28)) + beat * o.a * 1.1;
        og.addColorStop(0, `hsla(${h},${68 + beat * 22}%,${52 + beat * 14}%,${Math.min(alpha, .95)})`);
        og.addColorStop(1, `hsla(${h},68%,52%,0)`);
        CX.fillStyle = og; CX.beginPath(); CX.arc(o.x, o.y, r, 0, Math.PI * 2); CX.fill();
    });

    // Beat flash overlay
    if (beat > 0.12 && BG.playing) {
        const fa = beat * .12 * en;
        const fg = CX.createRadialGradient(cx, cy * .5, 0, cx, cy, CVS.width * .75);
        fg.addColorStop(0, `hsla(${BG.h},80%,72%,${fa})`);
        fg.addColorStop(1, `hsla(${BG.h},80%,72%,0)`);
        CX.fillStyle = fg; CX.fillRect(0, 0, CVS.width, CVS.height);
    }
})();

/* ════════════════════════════════════════════
   MOOD SYSTEM
════════════════════════════════════════════ */
const MOODS = {
    calm: { h: 210, e: .05, bpm: 68, energy: .08 },
    happy: { h: 42, e: .40, bpm: 118, energy: .55 },
    energetic: { h: 5, e: .90, bpm: 148, energy: .95 },
    sad: { h: 200, e: .04, bpm: 64, energy: .07 },
    romantic: { h: 318, e: .20, bpm: 86, energy: .28 },
    kpop: { h: 268, e: .42, bpm: 128, energy: .65 },
    default: { h: 240, e: .08, bpm: 100, energy: .30 }
};
const MOOD_COL = {
    calm: { h: 210, s: 70, l: 60 }, happy: { h: 42, s: 90, l: 60 },
    energetic: { h: 5, s: 95, l: 58 }, sad: { h: 200, s: 65, l: 55 },
    romantic: { h: 318, s: 80, l: 62 }, kpop: { h: 268, s: 75, l: 62 },
    default: { h: 240, s: 60, l: 58 }
};
let _curMood = 'default', _moodH = 240, _tMoodH = 240, _moodS = 60, _moodL = 58;

function setMood(mood) {
    _curMood = mood;
    const c = MOOD_COL[mood] || MOOD_COL.default;
    const m = MOODS[mood] || MOODS.default;
    _tMoodH = c.h; _moodS = c.s; _moodL = c.l;
    BG.th = m.h; BG.te = m.e;
    BG.tEnergyLevel = m.energy;
    BG.beatDecay = .022 + (1 - m.energy) * .045;
    if (BG.playing) startBeatTimer(m.bpm);
    // 메시 색상은 extractThumbColors 내부에서 무드와 혼합하므로 여기서는 건드리지 않음
}
function detectMood(title) {
    const s = title.toLowerCase();
    if (/calm|ambient|chill|sleep|relax|lo.?fi|acoustic|soft/.test(s)) return setMood('calm');
    if (/sad|heartbreak|cry|miss|alone|melanchol|hurt|pain/.test(s)) return setMood('sad');
    if (/happy|joy|sunshine|fun|party|upbeat|smile|good.?time/.test(s)) return setMood('happy');
    if (/hype|trap|drill|rage|hard|workout|edm|rave|bass|drop|fire|savage|power/.test(s)) return setMood('energetic');
    if (/love|romantic|night|moon|slow|ballad|heart|forever/.test(s)) return setMood('romantic');
    if (/kpop|k-pop|bts|blackpink|aespa|twice|ive|newjeans|stray|nct|exo/.test(s)) return setMood('kpop');
    setMood('default');
}

/* ════════════════════════════════════════════
   NP MESH GRADIENT BACKGROUND  v3
   ─ Shepard 역거리 가중 보간 (픽셀 단위)
   ─ 색 매칭: CORS 실패 시 무드 색 대신
     앨범아트 평균 명도에 맞게 조정
   ─ 동적 파동: 노드 6개, 고속 위상 oscillation
════════════════════════════════════════════ */

// ── RGB ↔ HSL 헬퍼 ────────────────────────
function hslToRgb(h, s, l) {
    s /= 100; l /= 100;
    const k = n => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
}
function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;
    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
            case g: h = ((b - r) / d + 2) / 6; break;
            case b: h = ((r - g) / d + 4) / 6; break;
        }
    }
    return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

// ── 상태 ────────────────────────────────────
const NP_MESH = {
    canvas: null, ctx: null,
    offCanvas: null, offCtx: null,
    W: 0, H: 0, frame: 0,

    // 6개 색상 노드 — HSL (현재 보간 중인 값)
    colors: [
        { h: 268, s: 72, l: 42 }, { h: 300, s: 68, l: 38 },
        { h: 240, s: 65, l: 44 }, { h: 210, s: 70, l: 40 },
        { h: 320, s: 66, l: 41 }, { h: 255, s: 74, l: 43 }
    ],
    targetColors: null,

    // 6개 mesh 노드 좌표 + 독립 이동벡터 + 위상
    nodes: [],
    initialized: false,
    RES: 180   // 오프스크린 해상도 (성능과 품질 균형)
};

function initNpMesh() {
    const cvs = document.getElementById('np-bg');
    if (!cvs || cvs.tagName !== 'CANVAS') return;
    NP_MESH.canvas = cvs;
    NP_MESH.ctx = cvs.getContext('2d');

    NP_MESH.offCanvas = document.createElement('canvas');
    NP_MESH.offCanvas.width = NP_MESH.offCanvas.height = NP_MESH.RES;
    NP_MESH.offCtx = NP_MESH.offCanvas.getContext('2d');

    // 6개 노드: 화면을 골고루 커버하는 초기 위치
    const seeds = [
        [0.15, 0.20], [0.85, 0.15],
        [0.10, 0.78], [0.88, 0.82],
        [0.50, 0.12], [0.50, 0.88]
    ];
    NP_MESH.nodes = seeds.map(([u, v], i) => ({
        u, v,
        // 기저 이동 벡터 (느린 드리프트)
        du: (Math.random() - 0.5) * 0.0014,
        dv: (Math.random() - 0.5) * 0.0014,
        // 위상 파동 (빠른 진동)
        phase: Math.random() * Math.PI * 2,
        phase2: Math.random() * Math.PI * 2,
        spd: 0.008 + Math.random() * 0.006,   // ← 이전보다 10× 빠름
        amp: 0.06 + Math.random() * 0.06,    // ← 진폭 대폭 증가
    }));
    NP_MESH.initialized = true;
    _applyMoodToMesh();
}

// ── 색상 추출: 앨범아트 + 무드 hue 혼합 ────
// title 파라미터로 무드를 참조 (detectMood 이후 호출되어 _curMood 이미 설정됨)
function extractThumbColors(hq, md, title) {
    _tryExtract(hq, () => _tryExtract(md, () => _applyMoodToMesh()));
}

function _tryExtract(src, onFail) {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
        try {
            const SIZE = 96; // 96×96: 성능과 정밀도 균형
            const tmp = document.createElement('canvas');
            tmp.width = tmp.height = SIZE;
            const cx = tmp.getContext('2d', { willReadFrequently: true });

            /* ════════════════════════════════════════════════════════
               [핵심] 픽셀 읽기 전 캔버스에 필터 적용
               ─ saturate(260%): 연한 색(갈색·베이지 등)은 억제,
                                 진짜 색조는 극적으로 증폭
               ─ contrast(112%): 중간 톤 밀어내고 명부/암부 분리
               ─ 결과: JPEG 아티팩트·배경 중립 톤이 히스토그램에서
                       걸러지고, 앨범아트 고유 색만 남음
            ════════════════════════════════════════════════════════ */
            cx.filter = 'saturate(260%) contrast(112%)';
            cx.drawImage(img, 0, 0, SIZE, SIZE);
            cx.filter = 'none';

            const d = cx.getImageData(0, 0, SIZE, SIZE).data;

            /* ── 0단계: 필터 적용 후 원본 채도 분포 파악 ───────────
               (필터 전 원본 통계도 별도 파악해 모노크롬 판별에 사용) */
            let rawTotalL = 0, rawTotalS = 0, rawCnt = 0;
            {
                // 필터 없는 원본을 소형 캔버스(24×24)로 재측정
                const raw = document.createElement('canvas');
                raw.width = raw.height = 24;
                const rx = raw.getContext('2d', { willReadFrequently: true });
                rx.drawImage(img, 0, 0, 24, 24);
                const rd = rx.getImageData(0, 0, 24, 24).data;
                for (let i = 0; i < rd.length; i += 4) {
                    const h = rgbToHsl(rd[i], rd[i + 1], rd[i + 2]);
                    rawTotalL += h.l; rawTotalS += h.s; rawCnt++;
                }
            }
            const rawAvgL = rawTotalL / (rawCnt || 1);
            const rawAvgS = rawTotalS / (rawCnt || 1);
            const isVeryDark = rawAvgL < 12;
            const liftDark = isVeryDark ? 20 : 0;

            /* ── 1단계: 모노크롬 감지 (원본 채도 기준, 필터 후 X) ── */
            if (rawAvgS < 9) {
                if (rawAvgL > 68) _setArtPalette('monochrome');
                else if (rawAvgL < 25) _setArtPalette('darkMono');
                else _setArtPalette('blackWhite');
                return;
            }

            /* ── 2단계: 필터 적용 픽셀로 hue 히스토그램 구성 ─────
               ┌ 72빈(5°/빈): 섬세한 hue 분리
               ├ 채도 임계값 22%: 필터로 증폭됐어도 22% 미만이면
               │  원본이 너무 중립 → 갈색·베이지 제거에 결정적
               └ 가중치: 채도³ (지수 3으로 고채도 색 극단 우선)     */
            const BINS = 72;
            const BIND = 360 / BINS;
            const bW = new Float32Array(BINS);
            const bHsin = new Float32Array(BINS);
            const bHcos = new Float32Array(BINS);
            const bS = new Float32Array(BINS);
            const bL = new Float32Array(BINS);
            let totalW = 0, coloredCnt = 0, totalCnt = 0;

            for (let i = 0; i < d.length; i += 4) {
                if (d[i + 3] < 120) continue;
                totalCnt++;
                const hsl = rgbToHsl(d[i], d[i + 1], d[i + 2]);

                /* 필터 적용 후에도 채도 22% 미만 → 원본이 중립 톤
                   (갈색/베이지/연한 노랑/마젠타 아티팩트 대부분 여기서 탈락) */
                if (hsl.s < 22) continue;

                /* 극단 명도(너무 어둡거나 너무 밝음) 제외
                   − 완전 흰색 하이라이트, 완전 검은 그림자는 색정보 없음 */
                if (hsl.l < 8 || hsl.l > 92) continue;

                coloredCnt++;
                // 채도³ 가중치: 고채도 색을 기하급수적으로 우선
                const w = (hsl.s / 100) ** 3 * Math.max(0.1, 1 - Math.abs(hsl.l - 48) / 48);
                const bin = Math.floor(hsl.h / BIND) % BINS;
                const rad = hsl.h * Math.PI / 180;
                bW[bin] += w;
                bHsin[bin] += Math.sin(rad) * w;
                bHcos[bin] += Math.cos(rad) * w;
                bS[bin] += hsl.s * w;
                bL[bin] += hsl.l * w;
                totalW += w;
            }

            /* 유효 색상 픽셀이 전체의 6% 미만 → 사실상 흑백 */
            if (coloredCnt < totalCnt * 0.06 || totalW < 0.5) {
                _setArtPalette(rawAvgL > 55 ? 'monochrome' : 'darkMono');
                return;
            }

            /* ── 3단계: NMS(Non-Maximum Suppression) 클러스터링 ───
               ┌ MERGE_R = 4빈(20°): 인접 hue 병합
               ├ minClusterFrac = 4%: 전체 가중치의 4% 미만 클러스터
               │  → "노이즈 클러스터" 로 판정, 제거
               │  (마젠타·노랑 아티팩트 클러스터가 여기서 소멸됨)
               └ 남은 클러스터만 지배 색으로 인정                   */
            const MERGE_R = 4;
            const MIN_FRAC = 0.08; // 클러스터 최소 비중 (4%→8%: 노이즈 클러스터 더 공격적 제거)
            const used = new Uint8Array(BINS);
            const clusters = [];

            const sortedBins = Array.from({ length: BINS }, (_, k) => k)
                .filter(k => bW[k] > 0)
                .sort((a, b) => bW[b] - bW[a]);

            for (const peak of sortedBins) {
                if (used[peak]) continue;

                let cW = 0, cHsin = 0, cHcos = 0, cS = 0, cL = 0;
                for (let d2 = -MERGE_R; d2 <= MERGE_R; d2++) {
                    const j = (peak + d2 + BINS) % BINS;
                    if (used[j] && d2 !== 0) continue;
                    const w = bW[j]; if (w <= 0) continue;
                    cW += w; cHsin += bHsin[j]; cHcos += bHcos[j];
                    cS += bS[j]; cL += bL[j];
                    used[j] = 1;
                }

                // 전체 가중치 대비 비중 필터 → 소수 아티팩트 색 제거
                if (cW / totalW < MIN_FRAC) continue;

                clusters.push({
                    w: cW,
                    h: ((Math.atan2(cHsin, cHcos) * 180 / Math.PI) + 360) % 360,
                    s: cS / cW,
                    l: cL / cW,
                });
            }

            if (clusters.length === 0) { onFail(); return; }
            clusters.sort((a, b) => b.w - a.w);

            /* ── 4단계: 원본 명도 기반 L_BASE 산출 ──────────────────
               필터로 명도가 왜곡돼 있으므로 원본 rawAvgL 사용         */
            const L_BASE = Math.max(28, Math.min(52, rawAvgL * 0.68 + 12));

            /* ── 5단계: 단색 판별 후 분기 생성 ──────────────────────
               [단색 판정 기준]
                 - 클러스터가 1개뿐 이거나
                 - 1위·2위 클러스터의 hue 차이가 25° 이내
               → 단색이면: [대표색(밝음) + 대표색을 어둡게(L-18)] 조합
                 두 색 사이의 명도/채도 차로 그라디언트가 확실히 보임
               → 다색이면: 기존대로 P·Q 두 색 사용                    */
            const P = clusters[0];
            const Q = clusters.length > 1 ? clusters[1] : null;

            // 두 클러스터 간 hue 거리 계산
            let hueDiff = 360;
            if (Q) {
                hueDiff = Math.abs(P.h - Q.h);
                if (hueDiff > 180) hueDiff = 360 - hueDiff;
            }
            const isMono = !Q || hueDiff < 25;

            let nodeDef; // [hue, saturation, lightness]

            if (isMono) {
                /* ── 단색 모드: 밝은 버전 + 어두운 버전 교차 배치 ──
                   명도 차이 16~20 확보 → 그라디언트가 확실히 보임
                   채도도 어두운 쪽을 약간 낮춰 자연스러운 깊이감      */
                const hBase = P.h;
                const sHi = Math.max(52, Math.min(86, P.s * 0.65 + 20));
                const sLo = Math.max(44, Math.min(78, P.s * 0.55 + 14)); // 어두운 쪽 채도 소폭 감소
                const lHi = Math.max(36 + liftDark, Math.min(58, L_BASE + 8 + liftDark * 0.5));
                const lLo = Math.max(20 + liftDark, Math.min(42, L_BASE - 10 + liftDark * 0.5));
                // lHi - lLo 가 최소 14 이상 되도록 보정
                const lLoFinal = Math.min(lLo, lHi - 14);

                nodeDef = [
                    { h: hBase, s: sHi, l: lHi },  // 0: 밝음
                    { h: hBase, s: sLo, l: lLoFinal },  // 1: 어두움
                    { h: hBase - 5, s: sHi, l: lHi - 3 },  // 2: 밝음 (hue -5°)
                    { h: hBase + 4, s: sLo, l: lLoFinal + 3 },  // 3: 어두움 (hue +4°)
                    { h: hBase + 6, s: sHi, l: lHi - 6 },  // 4: 밝음 (hue +6°)
                    { h: hBase - 3, s: sLo, l: lLoFinal + 2 },  // 5: 어두움 (hue -3°)
                ];
            } else {
                /* ── 다색 모드: P·Q 두 색 교차 배치 (기존 유지) ── */
                const makeNode = (cl, hOff, lOff, sOff) => ({
                    h: (cl.h + hOff + 360) % 360,
                    s: Math.max(50, Math.min(86, cl.s * 0.65 + 20 + sOff)),
                    l: Math.max(28 + liftDark, Math.min(58, L_BASE + lOff + liftDark * 0.5)),
                });
                nodeDef = [
                    makeNode(P, 0, 0, 0),
                    makeNode(Q, 0, 4, -4),
                    makeNode(P, -10, -4, 4),
                    makeNode(Q, -8, 6, -2),
                    makeNode(P, 8, -6, 2),
                    makeNode(Q, 6, -3, 4),
                ];
            }

            const targets = nodeDef.map(n => ({ h: (n.h + 360) % 360, s: n.s, l: n.l }));

            // 단색 모드: hue를 거의 건드리지 않음(4°), 다색 모드: 8°
            _enforceHueSpread(targets, isMono ? 4 : 8);

            /* ── 6단계: 무드 극소량 블렌딩 (5%) ─────────────────── */
            const mood = MOOD_COL[_curMood] || MOOD_COL.default;
            NP_MESH.targetColors = targets.map((c, i) => {
                let dh = (mood.h + i * 5) - c.h;
                if (dh > 180) dh -= 360;
                if (dh < -180) dh += 360;
                return { h: (c.h + dh * 0.05 + 360) % 360, s: c.s, l: c.l };
            });

        } catch (e) { onFail(); }
    };
    img.onerror = onFail;
    img.src = src;
}

// ── 팔레트 이름으로 직접 적용 ────────────────
function _setArtPalette(name) {
    const saved = _curMood;
    _curMood = name;
    _applyMoodToMesh();
    _curMood = saved;
}

// ── Hue 분산 강제: 인접 노드들이 너무 비슷한 색이면 벌려줌 ──
// [개선] iter 증가(6→8) + push 감쇠 계수 추가 → 급격한 hue 점프 방지
function _enforceHueSpread(targets, minDeg) {
    const DAMP = 0.72; // 한 번에 너무 많이 밀지 않도록 감쇠
    for (let iter = 0; iter < 8; iter++) {
        let moved = false;
        for (let i = 0; i < targets.length; i++) {
            for (let j = i + 1; j < targets.length; j++) {
                let dh = targets[j].h - targets[i].h;
                if (dh > 180) dh -= 360;
                if (dh < -180) dh += 360;
                const absDh = Math.abs(dh);
                if (absDh < minDeg && absDh > 0.5) {
                    const push = ((minDeg - absDh) / 2 + 0.5) * DAMP;
                    const sign = dh >= 0 ? 1 : -1;
                    targets[i].h = (targets[i].h - push * sign + 360) % 360;
                    targets[j].h = (targets[j].h + push * sign + 360) % 360;
                    moved = true;
                }
            }
        }
        if (!moved) break; // 더 이상 밀 필요 없으면 조기 종료
    }
}

// ── 무드 색상을 targetColors에 소폭 블렌딩 ──
function _blendMoodIntoTargets(moodRatio, isVeryDark) {
    if (!NP_MESH.targetColors) return;
    const mood = MOOD_COL[_curMood] || MOOD_COL.default;
    const liftDark = isVeryDark ? 18 : 0;
    NP_MESH.targetColors = NP_MESH.targetColors.map((c, i) => {
        let dh = (mood.h + i * 15) - c.h;
        if (dh > 180) dh -= 360;
        if (dh < -180) dh += 360;
        return {
            h: (c.h + dh * moodRatio + 360) % 360,
            s: Math.max(50, Math.min(92, c.s * (1 - moodRatio) + mood.s * moodRatio)),
            l: Math.max(32 + liftDark, Math.min(72, c.l + liftDark * 0.5))
        };
    });
    _enforceHueSpread(NP_MESH.targetColors, 20);
}

// ── 아트 평균 hue → 최적 팔레트 이름 매핑 ──
function _hueToPaletteName(hue, sat, light, mood) {
    if (sat < 9) return light > 55 ? 'monochrome' : 'darkMono';
    if (sat < 18) return 'blackWhite';

    // 고명도 파스텔
    if (light > 75 && sat < 50) {
        if (hue >= 280 || hue < 20) return 'cherry';
        if (hue >= 140 && hue < 220) return 'lavMint';
        return 'cherry';
    }

    if (hue >= 345 || hue < 15) return mood === 'romantic' ? 'romantic' : 'red';
    if (hue >= 15 && hue < 30) return mood === 'happy' ? 'orange' : 'sunset';
    if (hue >= 30 && hue < 48) return sat > 75 ? 'orange' : 'gold';
    if (hue >= 48 && hue < 68) return sat > 70 ? 'yellow' : 'gold';
    if (hue >= 68 && hue < 95) return 'lime';
    if (hue >= 95 && hue < 135) return sat > 60 ? 'green' : 'earth';
    if (hue >= 135 && hue < 165) return 'teal';
    if (hue >= 165 && hue < 195) return 'cyan';
    if (hue >= 195 && hue < 225) return light < 35 ? 'deepOcean' : (mood === 'sad' ? 'sad' : 'blue');
    if (hue >= 225 && hue < 248) return light < 38 ? 'navy' : 'blue';
    if (hue >= 248 && hue < 268) return mood === 'kpop' ? 'kpop' : 'indigo';
    if (hue >= 268 && hue < 290) return mood === 'kpop' ? 'kpop' : 'violet';
    if (hue >= 290 && hue < 315) return sat > 68 ? 'purple' : 'aurora';
    if (hue >= 315 && hue < 345) return sat > 72 ? (mood === 'romantic' ? 'romantic' : 'pink') : 'magenta';
    return null;
}

function _applyMoodToMesh() {
    // ── 무드별 확장 팔레트 ─────────────────────────────────────────────
    // 각 팔레트: [h, s, l] × 6 노드
    // 팔레트 키: 무드명 또는 아트 색조 범주
    const PALETTES = {
        // ── 무드 기반 (6노드 Hue 분산 최소 30° 이상) ────────────────────────
        calm: [[210, 68, 44], [178, 56, 40], [240, 60, 46], [155, 50, 41], [222, 64, 43], [188, 54, 39]],
        happy: [[42, 88, 52], [18, 86, 50], [72, 82, 55], [350, 76, 48], [54, 85, 53], [295, 70, 48]],
        energetic: [[4, 94, 48], [338, 86, 45], [30, 90, 50], [310, 80, 46], [355, 92, 47], [58, 84, 50]],
        sad: [[218, 52, 40], [194, 46, 37], [248, 50, 43], [172, 42, 38], [230, 52, 41], [275, 44, 40]],
        romantic: [[318, 78, 46], [348, 70, 44], [290, 66, 48], [358, 74, 45], [305, 74, 47], [42, 60, 46]],
        kpop: [[268, 74, 46], [305, 66, 44], [238, 68, 48], [330, 62, 45], [252, 72, 47], [185, 58, 44]],
        default: [[240, 62, 44], [270, 58, 42], [208, 58, 46], [300, 54, 43], [228, 60, 45], [168, 52, 42]],

        // ── 아트 색조 기반 ────────────────────────────────────────────────────
        red: [[4, 88, 45], [338, 80, 43], [30, 86, 48], [315, 74, 43], [355, 90, 46], [290, 64, 42]],
        pink: [[340, 80, 52], [308, 70, 50], [358, 76, 54], [275, 60, 47], [348, 78, 53], [48, 62, 48]],
        orange: [[28, 90, 50], [6, 84, 47], [55, 84, 53], [342, 72, 46], [38, 88, 51], [220, 62, 44]],
        gold: [[44, 82, 52], [22, 80, 49], [70, 76, 55], [348, 66, 47], [54, 80, 53], [200, 58, 46]],
        yellow: [[52, 90, 56], [30, 84, 52], [80, 84, 58], [338, 70, 48], [63, 88, 57], [210, 64, 48]],
        lime: [[82, 80, 48], [50, 76, 45], [112, 72, 50], [320, 60, 44], [94, 78, 49], [230, 60, 43]],
        green: [[140, 62, 44], [106, 58, 42], [168, 60, 46], [86, 50, 41], [152, 60, 45], [310, 52, 42]],
        teal: [[172, 68, 42], [142, 60, 40], [200, 64, 45], [125, 52, 39], [184, 66, 43], [325, 58, 42]],
        cyan: [[192, 72, 46], [163, 62, 43], [218, 68, 49], [140, 54, 42], [202, 70, 47], [340, 62, 44]],
        blue: [[220, 72, 46], [193, 64, 43], [250, 68, 49], [168, 54, 42], [233, 70, 47], [350, 60, 44]],
        navy: [[225, 60, 38], [198, 56, 35], [255, 58, 40], [172, 46, 36], [237, 58, 39], [355, 52, 38]],
        violet: [[258, 72, 46], [228, 64, 43], [288, 68, 49], [202, 56, 43], [270, 70, 47], [42, 58, 44]],
        purple: [[280, 70, 44], [248, 62, 41], [310, 68, 47], [222, 54, 40], [293, 68, 45], [48, 60, 43]],
        magenta: [[298, 76, 46], [266, 68, 43], [328, 72, 49], [240, 60, 42], [312, 74, 47], [60, 62, 45]],
        indigo: [[248, 68, 42], [218, 60, 39], [278, 66, 45], [192, 52, 38], [262, 66, 43], [50, 58, 42]],

        // ── 특수 조합 팔레트 ──────────────────────────────────────────────────
        monochrome: [[240, 6, 82], [240, 4, 72], [240, 8, 88], [240, 5, 64], [240, 7, 78], [240, 6, 90]],
        darkMono: [[240, 8, 28], [240, 6, 22], [240, 10, 34], [240, 7, 18], [240, 9, 30], [240, 8, 38]],
        blackWhite: [[0, 0, 92], [0, 0, 18], [0, 0, 85], [0, 0, 25], [0, 0, 78], [0, 0, 12]],
        sunset: [[22, 90, 50], [322, 76, 46], [58, 84, 52], [290, 68, 44], [38, 88, 51], [200, 62, 45]],
        aurora: [[150, 64, 46], [280, 68, 44], [175, 60, 48], [312, 62, 42], [163, 62, 47], [42, 62, 46]],
        deepOcean: [[220, 68, 36], [176, 68, 42], [250, 62, 34], [148, 58, 43], [212, 66, 38], [340, 52, 40]],
        cherry: [[345, 74, 72], [278, 50, 74], [358, 78, 68], [308, 46, 79], [338, 72, 74], [48, 52, 68]],
        neon: [[285, 94, 52], [170, 96, 48], [52, 92, 52], [320, 92, 50], [195, 94, 50], [42, 94, 54]],
        earth: [[22, 56, 46], [50, 44, 44], [6, 62, 42], [75, 38, 45], [33, 52, 47], [200, 36, 42]],
        cobaltGold: [[222, 72, 42], [44, 80, 52], [198, 64, 44], [60, 74, 54], [236, 70, 40], [350, 58, 44]],
        lavMint: [[268, 52, 68], [150, 56, 68], [298, 46, 72], [132, 48, 70], [280, 50, 70], [38, 44, 66]],
    };

    const pal = PALETTES[_curMood] || PALETTES.default;
    NP_MESH.targetColors = pal.map(([h, s, l]) => ({ h, s, l }));
    // 모노크롬 계열 제외하고 Hue 분산 재보장
    if (!['monochrome', 'darkMono', 'blackWhite'].includes(_curMood)) {
        _enforceHueSpread(NP_MESH.targetColors, 22);
    }
}

// ── 색상 lerp (적응형 속도) ───────────────────
// 기존 고정 spd=0.022 문제:
//  - 큰 hue 차이(180°)에서 수십 프레임 동안 전환 → 어색한 드리프트
//  - 작은 차이에서도 같은 속도 → 타겟에 영원히 수렴 못 함
// 개선: 거리에 비례한 적응형 속도 (가까울수록 느리게, 멀수록 빠르게)
// 오버슈트(진동) 방지를 위해 spd 상한 0.060으로 제한
function _lerpMeshColors() {
    const target = NP_MESH.targetColors;
    if (!target) return;

    NP_MESH.colors.forEach((c, i) => {
        const t = target[i] || target[i % target.length];

        // ── Hue: 최단 경로 원형 보간 ──────────────────
        let dh = t.h - c.h;
        if (dh > 180) dh -= 360;
        if (dh < -180) dh += 360;

        const ds = t.s - c.s;
        const dl = t.l - c.l;

        // 정규화된 거리 (0~1): hue는 180°, s/l은 100% 기준
        const distH = Math.abs(dh) / 180;
        const distS = Math.abs(ds) / 100;
        const distL = Math.abs(dl) / 100;
        const maxDist = Math.max(distH, distS, distL);

        // 적응형 속도: 먼 곳에서는 0.055, 가까운 곳에서는 0.014
        // 수식: 0.014 + maxDist^0.6 * 0.042  (지수 0.6 → 초반 빠른 가속)
        const spd = 0.014 + Math.pow(maxDist, 0.6) * 0.042;

        c.h = (c.h + dh * spd + 360) % 360;
        c.s += ds * spd;
        c.l += dl * spd;
    });
}

// ── 캔버스 크기 동기화: 항상 뷰포트 기준 ─────
function renderNpMesh(beat, en) {
    if (!NP_MESH.initialized) initNpMesh();
    const cvs = NP_MESH.canvas, ctx = NP_MESH.ctx;
    const off = NP_MESH.offCanvas, octx = NP_MESH.offCtx;
    if (!cvs || !ctx || !off || !octx) return;

    // 항상 뷰포트 전체 크기로 (전체화면 포함)
    const nw = innerWidth;
    const nh = innerHeight;
    if (nw !== NP_MESH.W || nh !== NP_MESH.H) {
        NP_MESH.W = cvs.width = nw;
        NP_MESH.H = cvs.height = nh;
    }

    _lerpMeshColors();
    NP_MESH.frame++;
    const bt = beat;
    // 재생 중일 때 파동 속도 증가, beat에 추가 반응
    const waveSpeed = 1.0 + en * 1.2 + bt * 2.5;

    // ── 노드 애니메이션 ─────────────────────────
    NP_MESH.nodes.forEach((nd, i) => {
        // 빠른 위상 진행
        nd.phase += nd.spd * waveSpeed;
        nd.phase2 += nd.spd * waveSpeed * 0.63;  // 비정수 비율 → 불규칙한 파동

        // 느린 드리프트
        nd.u += nd.du * (1 + en * 0.4);
        nd.v += nd.dv * (1 + en * 0.4);
        if (nd.u < 0.04 || nd.u > 0.96) { nd.du *= -1; nd.u = Math.max(0.04, Math.min(0.96, nd.u)); }
        if (nd.v < 0.04 || nd.v > 0.96) { nd.dv *= -1; nd.v = Math.max(0.04, Math.min(0.96, nd.v)); }
    });

    // ── 픽셀 렌더 (Shepard's method) ─────────────
    const R = NP_MESH.RES;
    const imgData = octx.createImageData(R, R);
    const buf = imgData.data;
    const N = NP_MESH.nodes.length;

    // 노드 색 → RGB 변환 (beat 부스트 포함)
    const cols = NP_MESH.colors.map(c => {
        const sB = Math.min(100, c.s + bt * 14 * en);
        const lB = Math.min(72, c.l + bt * 12 * en);
        return hslToRgb(c.h, sB, lB);
    });

    // 노드의 현재 파동 위치 사전계산 (픽셀 루프 밖)
    const waveNodes = NP_MESH.nodes.map((nd, i) => {
        // 위상별 진폭: beat일 때 진폭 크게 → 파동이 강하게
        const amp = nd.amp * (1 + bt * 1.8 * en);
        return {
            u: nd.u + Math.sin(nd.phase) * amp
                + Math.cos(nd.phase2 + i * 0.9) * amp * 0.5,
            v: nd.v + Math.cos(nd.phase) * amp
                + Math.sin(nd.phase2 * 1.1 + i) * amp * 0.5,
        };
    });

    for (let py = 0; py < R; py++) {
        const v = py / R;
        for (let px = 0; px < R; px++) {
            const u = px / R;

            let wSum = 0, wr = 0, wg = 0, wb = 0;
            for (let ni = 0; ni < N; ni++) {
                const wn = waveNodes[ni];
                const dx = u - wn.u, dy = v - wn.v;
                const dist2 = dx * dx + dy * dy;
                // 거듭제곱 3 → 부드러운 색 전환 + 충분한 대비
                const w = 1.0 / (dist2 * dist2 * dist2 + 1e-7);
                wr += cols[ni][0] * w;
                wg += cols[ni][1] * w;
                wb += cols[ni][2] * w;
                wSum += w;
            }

            const idx = (py * R + px) * 4;
            buf[idx] = wr / wSum | 0;
            buf[idx + 1] = wg / wSum | 0;
            buf[idx + 2] = wb / wSum | 0;
            buf[idx + 3] = 255;
        }
    }
    octx.putImageData(imgData, 0, 0);

    // 저해상도 → 실제 크기 (브라우저 bilinear + CSS blur 로 부드럽게)
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(off, 0, 0, NP_MESH.W, NP_MESH.H);

    // ── beat 플래시 오버레이 ───────────────────
    // [개선] frame 인덱스로 색 노드를 매 프레임 교체하면 flickering 발생
    // → 가장 밝은 노드 1개를 사용하여 안정적인 플래시 효과
    if (bt > 0.12 && en > 0.15) {
        // 현재 색 중 가장 밝은 노드 선택 (가장 눈에 띄는 색)
        const fc = NP_MESH.colors.reduce((best, c) => c.l > best.l ? c : best, NP_MESH.colors[0]);
        const fa = bt * 0.18 * en; // 강도 소폭 낮춰 과도한 플래시 방지
        const fg = ctx.createRadialGradient(
            NP_MESH.W * 0.5, NP_MESH.H * 0.3, 0,
            NP_MESH.W * 0.5, NP_MESH.H * 0.5, NP_MESH.W * 0.65
        );
        fg.addColorStop(0, `hsla(${Math.round(fc.h)},${Math.round(fc.s)}%,${Math.round(fc.l + 16)}%,${fa.toFixed(3)})`);
        fg.addColorStop(1, `hsla(${Math.round(fc.h)},${Math.round(fc.s)}%,${Math.round(fc.l)}%,0)`);
        ctx.fillStyle = fg;
        ctx.fillRect(0, 0, NP_MESH.W, NP_MESH.H);
    }
}

// DOM 준비 후 초기화
if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', initNpMesh);
else
    setTimeout(initNpMesh, 0);

/* ════════════════════════════════════════════
   NP BEAT REACTOR — particles, rings, spectrum, art
════════════════════════════════════════════ */

// Particle system for NP overlay
const NP_PARTICLES = [];
const NP_MAX_PARTICLES = 60;

function spawnParticles(count, h, s, l) {
    const canvas = document.getElementById('np-particles');
    if (!canvas) return;
    const { cx, cy } = _getArtCenter();
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1.2 + Math.random() * 3.5 * BG.energyLevel;
        const size = 1.5 + Math.random() * 3.5;
        NP_PARTICLES.push({
            x: cx + (Math.random() - .5) * 140,
            y: cy + (Math.random() - .5) * 140,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 1.2,
            life: 1.0,
            decay: .012 + Math.random() * .022,
            size,
            h, s, l: l + Math.random() * 20
        });
        if (NP_PARTICLES.length > NP_MAX_PARTICLES) NP_PARTICLES.shift();
    }
}

function renderParticles() {
    const canvas = document.getElementById('np-particles');
    if (!canvas || !document.getElementById('np').classList.contains('on')) return;
    const ctx = canvas.getContext('2d');
    canvas.width = canvas.offsetWidth || innerWidth;
    canvas.height = canvas.offsetHeight || innerHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let i = NP_PARTICLES.length - 1; i >= 0; i--) {
        const p = NP_PARTICLES[i];
        p.x += p.vx; p.y += p.vy;
        p.vy += 0.04; // gentle gravity
        p.vx *= 0.98;
        p.life -= p.decay;
        if (p.life <= 0) { NP_PARTICLES.splice(i, 1); continue; }
        ctx.save();
        ctx.globalAlpha = p.life * p.life * 0.85;
        ctx.fillStyle = `hsl(${p.h},${p.s}%,${p.l}%)`;
        ctx.shadowColor = `hsl(${p.h},${p.s}%,${p.l}%)`;
        ctx.shadowBlur = p.size * 3;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

// (ring emitter removed)





let _beatCount = 0;
function updateNpColor() {
    _moodH += (_tMoodH - _moodH) * .04;
    const h = Math.round(_moodH), s = _moodS, l = _moodL;
    const col = `hsl(${h},${s}%,${l}%)`;
    const glow = `hsla(${h},${s}%,${l}%,0.4)`;
    const npEl = document.getElementById('np');
    if (npEl) { npEl.style.setProperty('--np-glow', glow); npEl.style.setProperty('--np-acc', col); }

    const npOpen = npEl?.classList.contains('on');
    const beat = BG.beat;
    const en = BG.energyLevel;

    // ── NP-specific effects (only when overlay is open) ─────
    if (npOpen && S.playing) {

        // 1. NP Mesh Gradient background — render animated mesh
        renderNpMesh(beat, en);

        // 2. Album art beat-pulse
        const ash = document.getElementById('np-ash');
        if (ash) {
            const sc = 1 + beat * .038 * en;
            ash.style.transform = `scale(${sc.toFixed(4)})`;
            const gv = `0 0 ${60 + beat * 80 * en}px ${8 + beat * 30 * en}px ${glow}`;
            ash.style.boxShadow = `0 40px 120px rgba(0,0,0,0.85), 0 0 0 1.5px rgba(255,255,255,0.14), ${gv}`;
        }

        // 3. Vinyl ring — glows and spins faster on beat
        const vinyl = document.getElementById('np-vinyl');
        if (vinyl) {
            const ringAlpha = .15 + beat * .55 * en;
            const ringSize = 100 + beat * 8 * en;
            vinyl.style.opacity = ringAlpha.toFixed(3);
            vinyl.style.width = ringSize + '%';
            vinyl.style.height = ringSize + '%';
            vinyl.style.top = `${-(ringSize - 100) / 2}%`;
            vinyl.style.left = `${-(ringSize - 100) / 2}%`;
            vinyl.style.boxShadow = `0 0 ${10 + beat * 30 * en}px ${2 + beat * 10 * en}px hsla(${h},${s}%,${l}%,${(beat * .5).toFixed(2)}),
        inset 0 0 ${8 + beat * 20 * en}px hsla(${h},${s}%,${l}%,${(beat * .3).toFixed(2)})`;
            vinyl.style.border = `1.5px solid hsla(${h},${s}%,${l}%,${(.2 + beat * .6).toFixed(2)})`;
            vinyl.style.borderRadius = '50%';
            vinyl.style.position = 'absolute';
        }

        // 4. Art inner glow overlay
        const artGlow = document.getElementById('np-art-glow');
        if (artGlow && beat > .1) {
            artGlow.style.opacity = (beat * .45 * en).toFixed(3);
            artGlow.style.background = `radial-gradient(ellipse at center,
        hsla(${h},${s}%,${l}%,${(beat * .3).toFixed(2)}) 0%,
        transparent 70%)`;
        } else if (artGlow) artGlow.style.opacity = '0';

        // 5. Pulse bar
        const pulse = document.getElementById('np-pulse');
        if (pulse) {
            pulse.style.background = glow;
            pulse.style.display = 'block';
            if (beat > .08) {
                const sc2 = 1 + beat * .8 * en;
                pulse.style.transform = `translateX(-50%) scaleX(${sc2.toFixed(3)})`;
                pulse.style.opacity = (.5 + beat * .5).toFixed(3);
                pulse.style.filter = `blur(${8 + beat * 8 * en}px)`;
            } else {
                pulse.style.transform = 'translateX(-50%) scaleX(1)';
                pulse.style.opacity = '.7';
                pulse.style.filter = 'blur(9px)';
            }
        }

        // 6. rmv

        // 7. Particles — spawn on strong beats
        if (beat > .35 && en > .2) {
            const count = Math.round(beat * en * 8);
            spawnParticles(count, h, s, l);
        }
        renderParticles();

        // 8. (rings removed)

        // 9. Controls beat-sync glow
        const ncPlay = document.getElementById('nc-play');
        if (ncPlay && beat > .15) {
            const glowA = (beat * .6 * en).toFixed(3);
            ncPlay.style.boxShadow = `0 0 ${16 + beat * 24 * en}px hsla(${h},${s}%,${l}%,${glowA})`;
        } else if (ncPlay) ncPlay.style.boxShadow = '';

        // 10. Title text shimmer on strong beat
        const npTitle = document.getElementById('np-title');
        if (npTitle && beat > .5 && en > .5) {
            npTitle.style.textShadow = `0 0 ${beat * 20 * en}px hsla(${h},${s}%,${l + 10}%,${(beat * .6).toFixed(2)})`;
        } else if (npTitle) npTitle.style.textShadow = '';

    } else {
        // NP not open or not playing — render mesh slowly (idle wave)
        renderNpMesh(0, 0.05);
        const ash = document.getElementById('np-ash');
        if (ash) { ash.style.transform = ''; ash.style.boxShadow = ''; }
        const pulse = document.getElementById('np-pulse');
        if (pulse) pulse.style.display = S.playing ? 'block' : 'none';
        renderParticles();
    }

    _beatCount++;

    // ── Visualizer bars in bottom bar (always) ──
    const vb = document.querySelectorAll('.vb');
    if (S.playing) {
        vb.forEach((b, i) => {
            b.style.background = `hsl(${h},${s}%,62%)`;
            if (beat > .06) {
                const ht = 1 + beat * en * (0.8 + Math.sin(i * 1.4 + BG.f * .08) * 0.5);
                b.style.transform = `scaleY(${ht.toFixed(3)})`;
            } else b.style.transform = '';
        });
    }

    // ── Card beat reactor (home / search grids) ──
    if (S.playing && beat > .04) {
        document.querySelectorAll('.card').forEach((card, ci) => {
            card.classList.add('beat-active');
            const isPlaying = card.classList.contains('playing');
            const phase = Math.sin(BG.f * .06 + ci * 0.72);
            const jitter = phase * .008 * en;
            if (isPlaying) {
                const sc = 1.028 + beat * .038 * en;
                const glowPx = 8 + beat * 28 * en;
                const glowAmt = (.18 + beat * .35 * en).toFixed(3);
                card.style.transform = `translateY(-7px) scale(${sc.toFixed(4)})`;
                card.style.boxShadow =
                    `0 ${14 + beat * 18}px ${40 + beat * 28}px rgba(0,0,0,.65),` +
                    `0 0 0 1.5px var(--acc),` +
                    `0 0 ${glowPx}px ${(glowPx * .4).toFixed(1)}px hsla(${h},${s}%,${l}%,${glowAmt})`;
                card.style.borderColor = `hsla(${h},${s}%,${l}%,${(.5 + beat * .5).toFixed(2)})`;
            } else if (beat > .15 && en > .3) {
                const sc2 = 1 + beat * .012 * en + jitter;
                card.style.transform = `scale(${sc2.toFixed(4)})`;
                card.style.boxShadow = `0 ${6 + beat * 8}px ${18 + beat * 14}px rgba(0,0,0,${(.3 + beat * .2).toFixed(2)})`;
                card.style.borderColor = `rgba(255,255,255,${(.07 + beat * .10 * en).toFixed(3)})`;
            }
        });
    } else if (!S.playing || beat <= .02) {
        document.querySelectorAll('.card.beat-active').forEach(card => {
            card.classList.remove('beat-active');
            if (!card.matches(':hover')) {
                card.style.transform = '';
                card.style.boxShadow = '';
                card.style.borderColor = '';
            }
        });
    }
}
setInterval(updateNpColor, 50);

/* ════════════════════════════════════════════
   TITLE BAR
════════════════════════════════════════════ */
document.getElementById('tbar').addEventListener('mousedown', e => {
    if (e.target.classList.contains('wb')) return;
    try { if(window.SyncBridge) window.SyncBridge.postMessage(JSON.stringify({ type: 'drag' })); } catch { }
});

/* ════════════════════════════════════════════
   C# ↔ JS BRIDGE
════════════════════════════════════════════ */
const _cb = {}; let _cid = 0;
window.__sync = function (j) {
    try {
        const m = JSON.parse(j);
        if (m.type === 'searchResult' || m.type === 'suggestResult') {
            const fn = _cb[m.id]; if (fn) { delete _cb[m.id]; fn(m); }
        }
        if (m.type === 'lyricsResult') {
            const fn = _cb[m.id]; if (fn) { delete _cb[m.id]; fn(m); }
        }
        if (m.type === 'windowState') {
            _onWindowStateChange(m.maximized);
        }
    } catch (e) { console.error(e); }
};
function callCs(p) {
    return new Promise((ok, ng) => {
        const id = String(++_cid);
        _cb[id] = m => {
            // lyricsResult는 success 여부와 무관하게 항상 ok로 resolve
            // (성공/실패 판단은 fetchLyrics에서 res.success 체크)
            if (m.type === 'lyricsResult') { ok(m); return; }
            m.success ? ok(m) : ng(new Error(m.error || '오류'));
        };
        p.id = id;
        try { window.SyncBridge ? window.SyncBridge.postMessage(JSON.stringify(p)) : (() => { throw new Error('브릿지 없음'); })(); }
        catch { ng(new Error('브릿지 없음')); }
        setTimeout(() => { if (_cb[id]) { delete _cb[id]; ng(new Error('타임아웃')); } }, 18000);
    });
}
function post(type, extra = {}) {
    try { if(window.SyncBridge) window.SyncBridge.postMessage(JSON.stringify({ type, ...extra })); } catch { }
}

/* ════════════════════════════════════════════
   STATE
════════════════════════════════════════════ */
const S = {
    q: [], idx: -1, track: null,
    playing: false, shuffle: false, repeat: 0,
    vol: 80, muted: false, echo: 0, dur: 0, cur: 0,
    favs: JSON.parse(localStorage.getItem('xw_fav') || '[]'),
    ytReady: false, ytPlayer: null, ticker: null
};

/* ════════════════════════════════════════════
   BAR VISIBILITY — hidden when no track
════════════════════════════════════════════ */
function updateBarVisibility() {
    document.getElementById('bar')?.classList.toggle('bar-hidden', !S.track);
}

/* ════════════════════════════════════════════
   ECHO
════════════════════════════════════════════ */
let _echoTimer = null;
function setEcho(v) {
    S.echo = v;
    ['echo-sl', 'np-echo-sl'].forEach(id => { const el = document.getElementById(id); if (el) el.value = v; });
    clearInterval(_echoTimer);
    if (v <= 0) { applyVol(); return; }
    const depth = v / 100, period = 120 + (1 - depth) * 180;
    let phase = 0;
    _echoTimer = setInterval(() => {
        if (!S.ytPlayer || !S.ytReady) return; phase++;
        const wave = Math.abs(Math.sin(phase * Math.PI / 4)) * depth;
        try { S.ytPlayer.setVolume(S.muted ? 0 : Math.max(10, Math.round(S.vol * (1 - wave * .3)))); } catch { }
    }, period);
}

/* ════════════════════════════════════════════
   YOUTUBE IFRAME API
════════════════════════════════════════════ */
function loadYtApi() {
    return new Promise(ok => {
        if (window.YT?.Player) { ok(); return; }
        window.onYouTubeIframeAPIReady = ok;
        const s = document.createElement('script');
        s.src = 'https://www.youtube.com/iframe_api';
        document.head.appendChild(s);
    });
}
async function initYt() {
    await loadYtApi();
    S.ytPlayer = new YT.Player('yt-player', {
        height: '166', width: '296',
        playerVars: { autoplay: 1, controls: 0, disablekb: 1, fs: 0, iv_load_policy: 3, modestbranding: 1, rel: 0, enablejsapi: 1 },
        events: { onReady: () => { S.ytReady = true; applyVol(); }, onStateChange: onYtSt, onError: onYtErr }
    });
}
function onYtSt(e) {
    const P = YT.PlayerState;
    if (e.data === P.PLAYING) {
        S.playing = true; BG.playing = true; updPlay(); startTick();
        document.getElementById('vizz').classList.remove('off');
        document.getElementById('b-art').classList.add('glow');
        S.dur = S.ytPlayer.getDuration() || 0;
        setT('p-tot', S.dur); setT('np-tot', S.dur);
        document.getElementById('np-ash').classList.add('playing');
        document.getElementById('np-pulse').style.display = 'block';
        if (S.echo > 0) setEcho(S.echo);
        startBeatTimer((MOODS[_curMood] || MOODS.default).bpm);
    } else if (e.data === P.PAUSED) {
        S.playing = false; BG.playing = false; updPlay(); stopTick(); stopBeatTimer();
        document.getElementById('vizz').classList.add('off');
        document.getElementById('b-art').classList.remove('glow');
        document.getElementById('np-ash').classList.remove('playing');
        document.getElementById('np-pulse').style.display = 'none';
        clearInterval(_echoTimer);
    } else if (e.data === P.ENDED) {
        clearInterval(_echoTimer); stopBeatTimer();
        if (S.repeat === 2) { S.ytPlayer.seekTo(0); S.ytPlayer.playVideo(); }
        else if (S.repeat === 1 || S.idx < S.q.length - 1) nextT();
        else { S.playing = false; BG.playing = false; updPlay(); stopTick(); }
    }
}
function onYtErr() { toast('⚠️ 재생 불가 — 다음 곡으로 이동합니다'); setTimeout(nextT, 1200); }
initYt();

/* ════════════════════════════════════════════
   AUTOCOMPLETE — event delegation, no inline JS
════════════════════════════════════════════ */
let _sugTimer = null;

// Global mousedown delegation — fires before blur, prevents focus loss
document.addEventListener('mousedown', e => {
    const item = e.target.closest('.sug-item');
    if (!item) return;
    e.preventDefault(); // prevent input blur
    const drop = item.closest('.sug-drop');
    const text = item.dataset.query;
    if (!text || !drop) return;
    // Find paired input: first .srch-inp sibling before this drop
    const inp = drop.previousElementSibling?.querySelector?.('.srch-inp') ||
        drop.closest('.srch-wrap')?.querySelector('.srch-inp');
    if (inp) inp.value = text;
    drop.classList.remove('on');
    doSearch(text);
});

async function onSuggest(inp, dropId) {
    const q = inp.value.trim();
    const drop = document.getElementById(dropId);
    if (!q) { drop.classList.remove('on'); return; }
    clearTimeout(_sugTimer);
    _sugTimer = setTimeout(async () => {
        try {
            const res = await callCs({ type: 'suggest', query: q });
            const sugs = res.suggestions || [];
            if (!sugs.length) { drop.classList.remove('on'); return; }
            drop.innerHTML = sugs.map(s => `
        <div class="sug-item" data-query="${esc(s)}">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round">
            <circle cx="5" cy="5" r="3.5"/><path d="M8 8L11 11"/>
          </svg>
          <span>${esc(s)}</span>
        </div>`).join('');
            drop.classList.add('on');
        } catch { drop.classList.remove('on'); }
    }, 220);
}

function hideSug(id) { document.getElementById(id)?.classList.remove('on'); }

/* ════════════════════════════════════════════
   SEARCH — music-query boost + fix #2 closure
════════════════════════════════════════════ */
async function doSearch(query) {
    if (!query?.trim()) return;
    gv('search', document.querySelector('[data-v="search"]'));
    const qi = document.getElementById('q-s'); if (qi) qi.value = query;
    hideSug('sug-s'); hideSug('sug-home');
    const area = document.getElementById('s-res');
    area.innerHTML = `<div class="state"><div class="spinner"></div><p style="margin-top:12px">검색 중...</p></div>`;
    try {
        const musicQuery = query.trim() + ' official audio OR music video OR mv OR lyrics';
        const res = await callCs({ type: 'search', query: musicQuery });
        S.q = res.tracks || [];
        if (!S.q.length) { area.innerHTML = `<div class="state"><h3>결과 없음</h3><p>다른 검색어를 시도해보세요</p></div>`; return; }
        area.innerHTML = `<div class="sh"><h2>검색 결과 <span style="font-size:12px;font-weight:400;color:var(--t3)">${S.q.length}개</span></h2></div>
      <div class="cgrid" id="sg"></div>`;
        const sg = document.getElementById('sg');
        S.q.forEach((t, i) => {
            const card = mkCard(t, i, () => { S.idx = i; playTrack(t, i); });
            sg.appendChild(card);
        });
        renderQueue();
    } catch (err) { area.innerHTML = `<div class="state"><h3>검색 실패</h3><p>${esc(err.message)}</p></div>`; }
}

async function loadRec(kw, rowId) {
    const row = document.getElementById(rowId); if (!row) return;
    row.innerHTML = `<div class="state" style="padding:28px 20px"><div class="spinner"></div></div>`;
    try {
        const res = await callCs({ type: 'search', query: kw });
        const tracks = res.tracks || [];
        if (!tracks.length) { row.innerHTML = `<div class="state" style="padding:28px"><p>결과 없음</p></div>`; return; }
        row.innerHTML = '';
        const rec = tracks.slice(0, 10);
        rec.forEach((t, i) => {
            const card = mkCard(t, i, () => { S.q = rec; S.idx = i; playTrack(t, i); });
            row.appendChild(card);
        });
    } catch { row.innerHTML = `<div class="state" style="padding:28px"><p>로드 실패</p></div>`; }
}

/* ════════════════════════════════════════════
   THUMBNAILS
════════════════════════════════════════════ */
const getThumbHq = id => `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`;
const getThumbMd = id => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
const getThumbSd = id => `https://i.ytimg.com/vi/${id}/mqdefault.jpg`;

/* ════════════════════════════════════════════
   CARD — completely redesigned (#5)
════════════════════════════════════════════ */
function mkCard(t, i, playFn) {
    const f = isFav(t.id);
    const pl = S.track?.id === t.id;
    const c = document.createElement('div');
    c.className = 'card' + (pl ? ' playing' : '');
    c.dataset.id = t.id;
    c.style.animationDelay = (i * .045) + 's';

    c.innerHTML = `
    <div class="c-thumb">
      <img class="c-img"
        src="${esc(getThumbHq(t.id))}" loading="lazy"
        onerror="if(!this.dataset.f1){this.dataset.f1=1;this.src='${esc(getThumbMd(t.id))}'}else if(!this.dataset.f2){this.dataset.f2=1;this.src='${esc(getThumbSd(t.id))}'}" alt="">
      <div class="c-shine"></div>
      <div class="c-overlay">
        <button class="c-play-btn">
          <svg width="22" height="22" viewBox="0 0 22 22" fill="currentColor"><polygon points="6,3 18,11 6,19"/></svg>
        </button>
      </div>
      <button class="c-fav${f ? ' on' : ''}" onclick="event.stopPropagation();toggleFavT(${i})">
        <svg width="13" height="13" viewBox="0 0 13 13" fill="${f ? 'var(--acc)' : 'none'}" stroke="${f ? 'var(--acc)' : 'rgba(255,255,255,.85)'}" stroke-width="1.4" stroke-linecap="round">
          <path d="M6.5 11.5S1 8 1 5a2.8 2.8 0 0 1 5.5-1 2.8 2.8 0 0 1 5.5 1C12 8 6.5 11.5 6.5 11.5z"/>
        </svg>
      </button>
      <button class="c-pl-add" onclick="event.stopPropagation();plShowCtxById('${esc(t.id)}')" title="플레이리스트에 추가">
        <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <line x1="5.5" y1="1" x2="5.5" y2="10"/><line x1="1" y1="5.5" x2="10" y2="5.5"/>
        </svg>
      </button>
      ${t.dur ? `<span class="c-dur">${fmt(t.dur)}</span>` : ''}
      ${pl ? '<div class="c-now-bar"><span></span><span></span><span></span></div>' : ''}
    </div>
    <div class="c-info">
      <div class="c-title">${esc(t.title)}</div>
      <div class="c-ch">${esc(t.channel)}</div>
    </div>`;

    c.querySelector('.c-play-btn').addEventListener('click', e => { e.stopPropagation(); playFn(); });
    c.querySelector('.c-thumb').addEventListener('click', playFn);
    return c;
}

/* ════════════════════════════════════════════
   PLAYBACK — fix #2: always allow switch
════════════════════════════════════════════ */
function playIdx(i) { if (S.q[i]) { S.idx = i; playTrack(S.q[i], i); } }

function playTrack(t, idx = -1) {
    if (!S.ytReady || !S.ytPlayer) { toast('⏳ 플레이어 준비 중...'); return; }
    S.track = t; S.idx = idx;
    // stopVideo first so loadVideoById always triggers a fresh play
    try { S.ytPlayer.stopVideo(); } catch { }
    S.ytPlayer.loadVideoById(t.id);

    updateBarVisibility();

    const hq = getThumbHq(t.id), md = getThumbMd(t.id);
    const bArt = document.getElementById('b-art');
    bArt.src = hq; bArt.onerror = () => { bArt.src = md; bArt.onerror = () => { bArt.src = t.thumb; }; };
    document.getElementById('b-title').textContent = t.title;
    document.getElementById('b-ch').textContent = t.channel || 'YouTube';
    updFavBtn();

    const npArt = document.getElementById('np-art');
    npArt.src = hq; npArt.onerror = () => { npArt.src = md; npArt.onerror = () => { npArt.src = t.thumb; }; };
    document.getElementById('np-title').textContent = t.title;
    document.getElementById('np-ch').textContent = t.channel || 'YouTube';
    // [개선] 새 곡 전환 시 null 리셋 제거 — 이전 색에서 새 타겟으로 부드럽게 lerp
    // (기존: null 설정 → lerp 정지 → 새 타겟 설정 시 갑작스러운 시작)
    // NP_MESH.targetColors = null;  ← 제거됨

    document.querySelectorAll('.card').forEach(c => {
        const playing = c.dataset.id === t.id;
        c.classList.toggle('playing', playing);
        const nb = c.querySelector('.c-now-bar');
        if (playing && !nb) {
            const th = c.querySelector('.c-thumb'); if (th) {
                const d = document.createElement('div'); d.className = 'c-now-bar';
                d.innerHTML = '<span></span><span></span><span></span>'; th.appendChild(d);
            }
        } else if (!playing && nb) nb.remove();
    });

    detectMood(t.title);
    // 무드 결정 후 앨범아트 색 추출 — 무드 hue를 기준으로 아트색과 혼합
    extractThumbColors(hq, md, t.title);
    post('setTitle', { title: t.title });
    renderQueue(); openNP();
    toast(`▶  ${t.title.length > 44 ? t.title.slice(0, 44) + '…' : t.title}`);

    // 오버레이 모드 활성 시 NP 닫고 오버레이 바 동기화
    if (OV.active) {
        document.getElementById('np').classList.remove('on');
        _syncOvBar();
    }

    // 가사 fetch (자막 기반)
    _clearLyrics();
    fetchLyrics(t.id);
}

function togglePlay() {
    if (!S.ytPlayer || !S.ytReady) return;
    if (S.playing) S.ytPlayer.pauseVideo();
    else { if (S.track) S.ytPlayer.playVideo(); else toast('🎵 먼저 음악을 검색하세요'); }
}
function nextT() {
    if (!S.q.length) return;
    const n = S.shuffle ? Math.floor(Math.random() * S.q.length) : (S.idx + 1) % S.q.length;
    S.idx = n; playTrack(S.q[n], n);
}
function prevT() {
    if (!S.q.length) return;
    if (S.cur > 3) { S.ytPlayer?.seekTo(0); return; }
    const p = (S.idx - 1 + S.q.length) % S.q.length;
    S.idx = p; playTrack(S.q[p], p);
}
function updPlay() {
    const on = S.playing;
    document.getElementById('cb-play').innerHTML = on
        ? `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><rect x="2.5" y="2" width="4" height="12" rx="1"/><rect x="9.5" y="2" width="4" height="12" rx="1"/></svg>`
        : `<svg width="17" height="17" viewBox="0 0 17 17" fill="currentColor"><polygon points="4,2.5 14,8.5 4,14.5"/></svg>`;
    document.getElementById('nc-play').innerHTML = on
        ? `<svg width="20" height="20" viewBox="0 0 20 20" fill="#08080d"><rect x="3" y="2.5" width="5" height="15" rx="1.5"/><rect x="12" y="2.5" width="5" height="15" rx="1.5"/></svg>`
        : `<svg width="22" height="22" viewBox="0 0 22 22" fill="#08080d"><polygon points="6,3.5 18,11 6,18.5"/></svg>`;
    // 오버레이 바 재생 버튼도 동기화
    _syncOvPlayBtn();
}
function toggleShuf() {
    S.shuffle = !S.shuffle;
    ['cb-sh', 'nc-sh'].forEach(id => document.getElementById(id)?.classList.toggle('on', S.shuffle));
    toast(S.shuffle ? '셔플 켜짐' : '셔플 꺼짐');
}
function toggleRep() {
    S.repeat = (S.repeat + 1) % 3;
    ['cb-rep', 'nc-rep'].forEach(id => document.getElementById(id)?.classList.toggle('on', S.repeat > 0));
    toast(['반복 없음', '전체 반복', '한 곡 반복'][S.repeat]);
}
function setVol(v) {
    S.vol = v;
    ['vol-sl', 'np-vol-sl', 'ov-vol-sl'].forEach(id => { const el = document.getElementById(id); if (el) el.value = v; });
    applyVol();
    const vw = document.getElementById('vw'); if (vw) vw.style.display = v === 0 ? 'none' : 'inline';
    const ovVw = document.getElementById('ov-vw'); if (ovVw) ovVw.style.display = v === 0 ? 'none' : 'inline';
}
function applyVol() {
    if (!S.ytPlayer || !S.ytReady) return;
    if (S.echo > 0) return;
    S.ytPlayer.setVolume(S.muted ? 0 : S.vol);
}
function toggleMute() {
    S.muted = !S.muted; applyVol();
    const vw = document.getElementById('vw'); if (vw) vw.style.display = S.muted ? 'none' : 'inline';
}

/* ════════════════════════════════════════════
   SEEK BARS — smooth rAF animation (#1)
════════════════════════════════════════════ */
function initSeekBar(barId, fillId) {
    const bar = document.getElementById(barId);
    const fill = document.getElementById(fillId);
    if (!bar || !fill) return;
    // thumb: fill의 형제 .pbd 또는 .np-pd
    const thumb = bar.querySelector('.pbd, .np-pd');
    let dragging = false, animPct = 0, targetPct = 0, rafId = null;

    function setPos(pct) {
        fill.style.width = pct.toFixed(3) + '%';
        if (thumb) thumb.style.left = pct.toFixed(3) + '%';
    }

    function animStep() {
        const diff = targetPct - animPct;
        if (Math.abs(diff) > .02) {
            animPct += diff * .14;
            setPos(animPct);
            rafId = requestAnimationFrame(animStep);
        } else {
            animPct = targetPct;
            setPos(targetPct);
            rafId = null;
        }
    }
    bar._setFill = (pct, instant) => {
        targetPct = pct;
        if (instant) { animPct = pct; setPos(pct); if (rafId) { cancelAnimationFrame(rafId); rafId = null; } return; }
        if (!rafId) rafId = requestAnimationFrame(animStep);
    };

    function getP(e) {
        const r = bar.getBoundingClientRect();
        return Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
    }
    function seek(p, instant) {
        bar._setFill(p * 100, instant);
        if (S.ytPlayer && S.ytReady && S.dur) S.ytPlayer.seekTo(p * S.dur, true);
    }

    bar.addEventListener('mousedown', e => {
        e.preventDefault(); dragging = true; bar.classList.add('dragging'); seek(getP(e), true);
    });
    document.addEventListener('mousemove', e => { if (dragging) seek(getP(e), true); });
    document.addEventListener('mouseup', e => { if (!dragging) return; dragging = false; bar.classList.remove('dragging'); seek(getP(e), true); });
    bar.addEventListener('touchstart', e => { dragging = true; bar.classList.add('dragging'); seek(getP(e.touches[0]), true); }, { passive: true });
    document.addEventListener('touchmove', e => { if (dragging) seek(getP(e.touches[0]), true); }, { passive: true });
    document.addEventListener('touchend', () => { dragging = false; bar.classList.remove('dragging'); });
}
initSeekBar('pb', 'pbf');
initSeekBar('np-pb', 'np-pf');
// ov-pb는 오버레이 진입 시 동적 초기화 (_enterOverlay 내)

/* ════════════════════════════════════════════
   TICK — 4x/sec, smooth fill update
════════════════════════════════════════════ */
function startTick() {
    stopTick();
    S.ticker = setInterval(() => {
        if (!S.ytPlayer || !S.ytReady) return;
        try {
            S.cur = S.ytPlayer.getCurrentTime() || 0;
            S.dur = S.ytPlayer.getDuration() || 0;
            const pct = S.dur ? (S.cur / S.dur) * 100 : 0;
            const pb = document.getElementById('pb');
            const npb = document.getElementById('np-pb');
            const ovb = document.getElementById('ov-pb');
            if (!pb?.classList.contains('dragging')) pb?._setFill?.(pct);
            if (!npb?.classList.contains('dragging')) npb?._setFill?.(pct);
            if (OV.active && !ovb?.classList.contains('dragging')) ovb?._setFill?.(pct);
            setT('p-cur', S.cur); setT('np-cur', S.cur);
            setT('p-tot', S.dur); setT('np-tot', S.dur);
            if (OV.active) { setT('ov-p-cur', S.cur); setT('ov-p-tot', S.dur); }
        } catch { }
    }, 250);
}
function stopTick() { clearInterval(S.ticker); }

/* ════════════════════════════════════════════
   NOW PLAYING
════════════════════════════════════════════ */
function openNP() {
    document.getElementById('np').classList.add('on');
    if (LY.lines.length > 0) _startLyricsTick();
}
function closeNP() {
    document.getElementById('np').classList.remove('on');
    _stopLyricsTick();
}

/* ════════════════════════════════════════════
   FAVORITES
════════════════════════════════════════════ */
function isFav(id) { return S.favs.some(f => f.id === id); }
function saveFavs() { localStorage.setItem('xw_fav', JSON.stringify(S.favs)); }
function toggleFavT(idx) {
    const t = S.q[idx]; if (!t) return;
    if (isFav(t.id)) { S.favs = S.favs.filter(f => f.id !== t.id); toast('즐겨찾기 제거'); }
    else { S.favs.push(t); toast('✦ 즐겨찾기 추가'); }
    saveFavs(); refreshDots(); renderFavSide(); renderFavGrid();
    if (S.track?.id === t.id) updFavBtn();
}
function favCur() {
    if (!S.track) return;
    const i = S.q.findIndex(t => t.id === S.track.id);
    if (i >= 0) { toggleFavT(i); return; }
    if (isFav(S.track.id)) { S.favs = S.favs.filter(f => f.id !== S.track.id); toast('즐겨찾기 제거'); }
    else { S.favs.push(S.track); toast('✦ 즐겨찾기 추가'); }
    saveFavs(); renderFavSide(); renderFavGrid(); updFavBtn();
}
function updFavBtn() {
    const f = S.track && isFav(S.track.id);
    ['b-fav', 'np-fav'].forEach(id => document.getElementById(id)?.classList.toggle('on', !!f));
}
function refreshDots() {
    document.querySelectorAll('.c-fav').forEach(d => {
        const id = d.closest('.card')?.dataset?.id; if (!id) return;
        const f = isFav(id); d.classList.toggle('on', f);
        const p = d.querySelector('path'); if (p) {
            p.setAttribute('fill', f ? 'var(--acc)' : 'none');
            p.setAttribute('stroke', f ? 'var(--acc)' : 'rgba(255,255,255,.85)');
        }
    });
}
function renderFavSide() {
    const el = document.getElementById('fav-side');
    if (!S.favs.length) { el.innerHTML = '<div class="fi-empty">즐겨찾기 없음</div>'; return; }
    el.innerHTML = S.favs.map((f, i) => `
    <div class="fi" onclick="playFav(${i})">
      <img class="fi-art" src="${esc(getThumbMd(f.id))}" onerror="this.src='${esc(f.thumb)}'" alt="">
      <div class="fi-m"><div class="fi-t">${esc(f.title)}</div><div class="fi-c">${esc(f.channel)}</div></div>
    </div>`).join('');
}
function renderFavGrid() {
    const g = document.getElementById('fav-grid');
    if (!S.favs.length) {
        g.innerHTML = `<div class="state" style="grid-column:1/-1">
      <svg width="44" height="44" viewBox="0 0 44 44" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round">
        <path d="M22 38S6 28 6 18a9 9 0 0 1 16-5.6A9 9 0 0 1 38 18C38 28 22 38 22 38z"/>
      </svg><h3>즐겨찾기가 비었어요</h3></div>`;
        return;
    }
    g.innerHTML = '';
    S.favs.forEach((t, i) => {
        const card = mkCard(t, i, () => { S.q = [...S.favs]; S.idx = i; playTrack(t, i); });
        g.appendChild(card);
    });
}
function playFav(i) { S.q = [...S.favs]; S.idx = i; playTrack(S.favs[i], i); }

/* ════════════════════════════════════════════
   QUEUE
════════════════════════════════════════════ */
function renderQueue() {
    const wrap = document.getElementById('q-list');
    if (!S.q.length) {
        wrap.innerHTML = `<div class="state"><svg width="44" height="44" viewBox="0 0 44 44" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><path d="M6 11h32M6 22h22M6 33h28"/></svg><h3>대기열 없음</h3></div>`; return;
    }
    wrap.innerHTML = S.q.map((t, i) => `
    <div class="lcard${i === S.idx ? ' playing' : ''}" onclick="playIdx(${i})">
      <span class="lcard-n">${i + 1}</span>
      <img class="lcard-art" src="${esc(getThumbMd(t.id))}" onerror="this.src='${esc(t.thumb)}'" alt="">
      <div class="lcard-m">
        <div class="lcard-t">${esc(t.title)}</div>
        <div class="lcard-c">${esc(t.channel)}</div>
      </div>
      <span class="lcard-d">${fmt(t.dur)}</span>
      ${i === S.idx ? `<svg width="13" height="13" viewBox="0 0 13 13" fill="var(--acc)"><polygon points="3,2 11,6.5 3,11"/></svg>` : ''}
    </div>`).join('');
}

/* ════════════════════════════════════════════
   VIEWS / ROUTING
════════════════════════════════════════════ */
function gv(v, el) {
    document.querySelectorAll('.view').forEach(e => e.classList.remove('on'));
    document.getElementById('v-' + v)?.classList.add('on');
    document.querySelectorAll('.nb').forEach(e => e.classList.remove('on'));
    el?.classList.add('on');
    if (v === 'fav') renderFavGrid();
    if (v === 'queue') renderQueue();
    if (v === 'playlists') plRenderGrid();
}


/* ════════════════════════════════════════════
   PLAYLIST SYSTEM
════════════════════════════════════════════ */
const PL = {
    lists: JSON.parse(localStorage.getItem('xw_pl') || '[]'),
    curId: null
};

function plSave() { localStorage.setItem('xw_pl', JSON.stringify(PL.lists)); }
function plById(id) { return PL.lists.find(p => p.id === id); }

// ── 커스텀 다이얼로그 (이름 입력) ────────────────────
let _dlgResolve = null;

function plDialog(title, defaultVal = '') {
    return new Promise(resolve => {
        _dlgResolve = resolve;
        document.getElementById('pl-dialog-title').textContent = title;
        const inp = document.getElementById('pl-dialog-input');
        inp.value = defaultVal;
        document.getElementById('pl-dialog-overlay').classList.add('on');
        setTimeout(() => inp.focus(), 80);
    });
}
function plDialogConfirm() {
    const val = document.getElementById('pl-dialog-input').value.trim();
    document.getElementById('pl-dialog-overlay').classList.remove('on');
    if (_dlgResolve) { _dlgResolve(val || null); _dlgResolve = null; }
}
function plDialogCancel() {
    document.getElementById('pl-dialog-overlay').classList.remove('on');
    if (_dlgResolve) { _dlgResolve(null); _dlgResolve = null; }
}

// ── 커스텀 확인 다이얼로그 ────────────────────────────
let _confirmResolve = null;

function plConfirm(title, msg) {
    return new Promise(resolve => {
        _confirmResolve = resolve;
        document.getElementById('pl-confirm-title').textContent = title;
        document.getElementById('pl-confirm-msg').textContent = msg;
        document.getElementById('pl-confirm-overlay').classList.add('on');
    });
}
function plConfirmOk() {
    document.getElementById('pl-confirm-overlay').classList.remove('on');
    if (_confirmResolve) { _confirmResolve(true); _confirmResolve = null; }
}
function plConfirmCancel() {
    document.getElementById('pl-confirm-overlay').classList.remove('on');
    if (_confirmResolve) { _confirmResolve(false); _confirmResolve = null; }
}

// ── 새 플레이리스트 ────────────────────────────────────
async function plNewPrompt(defaultName = '') {
    const name = await plDialog('새 플레이리스트', defaultName);
    if (!name) return null;
    const pl = { id: Date.now().toString(), name, tracks: [] };
    PL.lists.unshift(pl);
    plSave(); plRenderGrid();
    return pl.id;
}

// ── 이름 변경 ──────────────────────────────────────────
async function plRenamePrompt() {
    const pl = plById(PL.curId); if (!pl) return;
    const name = await plDialog('이름 변경', pl.name);
    if (!name || name === pl.name) return;
    pl.name = name; plSave();
    document.getElementById('pl-detail-name').textContent = pl.name;
    plRenderGrid();
}

// ── 삭제 ──────────────────────────────────────────────
async function plDeleteCurrent() {
    const pl = plById(PL.curId); if (!pl) return;
    const ok = await plConfirm('플레이리스트 삭제', `"${pl.name}" 플레이리스트를 삭제할까요?`);
    if (!ok) return;
    PL.lists = PL.lists.filter(p => p.id !== PL.curId);
    PL.curId = null; plSave(); plShowList();
}

// ── 트랙 추가 ─────────────────────────────────────────
function plAddTrack(plId, track) {
    const pl = plById(plId); if (!pl) return false;
    if (pl.tracks.some(t => t.id === track.id)) { toast('이미 추가된 곡이에요'); return false; }
    pl.tracks.push({ id: track.id, title: track.title, channel: track.channel, dur: track.dur, thumb: track.thumb });
    plSave();
    if (PL.curId === plId) plRenderDetail(plId);
    toast(`✦ "${pl.name}"에 추가됨`);
    return true;
}

// ── 트랙 제거 ─────────────────────────────────────────
function plRemoveTrack(plId, trackId) {
    const pl = plById(plId); if (!pl) return;
    pl.tracks = pl.tracks.filter(t => t.id !== trackId);
    plSave(); plRenderDetail(plId);
}

// ── 전체 재생 ─────────────────────────────────────────
function plPlayAll() {
    const pl = plById(PL.curId); if (!pl || !pl.tracks.length) return;
    S.q = [...pl.tracks]; S.idx = 0; playTrack(pl.tracks[0], 0);
}

// ── 그리드 렌더 ───────────────────────────────────────
function plRenderGrid() {
    const g = document.getElementById('pl-grid'); if (!g) return;
    if (!PL.lists.length) {
        g.innerHTML = `<div class="state" style="grid-column:1/-1">
      <svg width="44" height="44" viewBox="0 0 44 44" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
        <rect x="4" y="4" width="14" height="14" rx="2"/><rect x="26" y="4" width="14" height="14" rx="2"/>
        <rect x="4" y="26" width="14" height="14" rx="2"/>
        <line x1="33" y1="26" x2="33" y2="40"/><line x1="26" y1="33" x2="40" y2="33"/>
      </svg>
      <h3>플레이리스트가 없어요</h3>
      <p>상단의 + 버튼으로 만들어보세요</p>
    </div>`;
        return;
    }
    g.innerHTML = '';
    PL.lists.forEach(pl => {
        const card = document.createElement('div');
        card.className = 'pl-card';
        const thumbs = pl.tracks.slice(0, 4).map(t => getThumbMd(t.id));
        const coverHtml = thumbs.length === 0
            ? `<div class="pl-cover-empty"><svg width="40" height="40" viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="13" height="13" rx="2"/><rect x="23" y="4" width="13" height="13" rx="2"/><rect x="4" y="23" width="13" height="13" rx="2"/><line x1="29.5" y1="23" x2="29.5" y2="36"/><line x1="23" y1="29.5" x2="36" y2="29.5"/></svg></div>`
            : `<div class="pl-cover${thumbs.length === 1 ? ' single' : ''}">${thumbs.map(src => `<img src="${esc(src)}" onerror="this.src=''" alt="">`).join('')}</div>`;
        card.innerHTML = `${coverHtml}
      <div class="pl-card-info">
        <div class="pl-card-name">${esc(pl.name)}</div>
        <div class="pl-card-count">${pl.tracks.length}곡</div>
      </div>`;
        card.addEventListener('click', () => plRenderDetail(pl.id));
        g.appendChild(card);
    });
}

// ── 상세 렌더 ─────────────────────────────────────────
function plRenderDetail(plId) {
    const pl = plById(plId); if (!pl) return;
    PL.curId = plId;
    document.getElementById('pl-list-view').style.display = 'none';
    document.getElementById('pl-detail-view').style.display = '';
    document.getElementById('pl-detail-name').textContent = pl.name;
    document.getElementById('pl-detail-count').textContent = `${pl.tracks.length}곡`;

    const cover = document.getElementById('pl-detail-cover');
    const thumbs = pl.tracks.slice(0, 4).map(t => getThumbMd(t.id));
    cover.className = 'pl-detail-cover' + (thumbs.length === 1 ? ' single' : '');
    cover.innerHTML = thumbs.length
        ? thumbs.map(src => `<img src="${esc(src)}" alt="">`).join('')
        : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:var(--glass-md)"><svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><path d="M4 9h24M4 16h16M4 23h20"/></svg></div>`;

    const list = document.getElementById('pl-track-list');
    if (!pl.tracks.length) {
        list.innerHTML = `<div class="state">
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><path d="M3 9h30M3 18h20M3 27h24"/></svg>
      <h3 style="font-size:14px">곡이 없어요</h3>
      <p>상단의 곡 추가 버튼을 눌러보세요</p>
    </div>`;
        return;
    }
    list.innerHTML = '';
    pl.tracks.forEach((t, i) => {
        const row = document.createElement('div');
        row.className = 'pl-track' + (S.track?.id === t.id ? ' playing' : '');
        row.innerHTML = `
      <span class="pl-track-num">${i + 1}</span>
      <img class="pl-track-art" src="${esc(getThumbMd(t.id))}" onerror="this.src='${esc(t.thumb)}'" alt="">
      <div class="pl-track-m">
        <div class="pl-track-t">${esc(t.title)}</div>
        <div class="pl-track-c">${esc(t.channel)}</div>
      </div>
      <span class="pl-track-dur">${fmt(t.dur)}</span>
      <button class="pl-track-del" onclick="event.stopPropagation();plRemoveTrack('${esc(plId)}','${esc(t.id)}')" title="제거">
        <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
          <line x1="1.5" y1="1.5" x2="9.5" y2="9.5"/><line x1="9.5" y1="1.5" x2="1.5" y2="9.5"/>
        </svg>
      </button>`;
        row.addEventListener('click', () => { S.q = [...pl.tracks]; S.idx = i; playTrack(t, i); });
        list.appendChild(row);
    });
}

function plShowList() {
    PL.curId = null;
    document.getElementById('pl-list-view').style.display = '';
    document.getElementById('pl-detail-view').style.display = 'none';
    plRenderGrid();
}

// ── 곡 추가 모달 ──────────────────────────────────────
let _plAddTimer = null;

function plAddModalOpen() {
    document.getElementById('pl-add-modal-overlay').classList.add('on');
    const inp = document.getElementById('pl-add-modal-inp');
    inp.value = '';
    document.getElementById('pl-add-modal-results').innerHTML =
        `<div class="pl-add-modal-hint">검색어를 입력하세요</div>`;
    setTimeout(() => inp.focus(), 80);
}

function plAddModalClose() {
    document.getElementById('pl-add-modal-overlay').classList.remove('on');
    clearTimeout(_plAddTimer);
}

async function plAddModalSearch(q, immediate = false) {
    q = q?.trim();
    if (!q) {
        document.getElementById('pl-add-modal-results').innerHTML =
            `<div class="pl-add-modal-hint">검색어를 입력하세요</div>`;
        return;
    }
    clearTimeout(_plAddTimer);
    _plAddTimer = setTimeout(async () => {
        const res = document.getElementById('pl-add-modal-results');
        res.innerHTML = `<div class="pl-add-modal-hint"><div class="spinner" style="width:20px;height:20px;border-width:1.5px;margin:0 auto 8px"></div>검색 중...</div>`;
        try {
            const data = await callCs({ type: 'search', query: q + ' official audio OR music video OR mv' });
            const tracks = data.tracks || [];
            if (!tracks.length) { res.innerHTML = `<div class="pl-add-modal-hint">결과가 없어요</div>`; return; }
            res.innerHTML = '';
            const pl = plById(PL.curId);
            tracks.forEach(t => {
                const alreadyIn = pl?.tracks.some(p => p.id === t.id);
                const row = document.createElement('div');
                row.className = 'pl-modal-row';
                row.innerHTML = `
          <img class="pl-modal-row-art" src="${esc(getThumbMd(t.id))}" onerror="this.src='${esc(t.thumb)}'" alt="">
          <div class="pl-modal-row-m">
            <div class="pl-modal-row-t">${esc(t.title)}</div>
            <div class="pl-modal-row-c">${esc(t.channel)}</div>
          </div>
          <span class="pl-modal-row-dur">${fmt(t.dur)}</span>
          <button class="pl-modal-add-btn${alreadyIn ? ' added' : ''}" title="${alreadyIn ? '이미 추가됨' : '추가'}">
            ${alreadyIn
                        ? `<svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="2,6 5,9 9,3"/></svg>`
                        : `<svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="5.5" y1="1" x2="5.5" y2="10"/><line x1="1" y1="5.5" x2="10" y2="5.5"/></svg>`
                    }
          </button>`;
                row.querySelector('.pl-modal-add-btn').addEventListener('click', e => {
                    e.stopPropagation();
                    const btn = e.currentTarget;
                    if (btn.classList.contains('added')) return;
                    if (plAddTrack(PL.curId, t)) {
                        btn.classList.add('added');
                        btn.innerHTML = `<svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="2,6 5,9 9,3"/></svg>`;
                    }
                });
                res.appendChild(row);
            });
        } catch { res.innerHTML = `<div class="pl-add-modal-hint">검색 실패</div>`; }
    }, immediate ? 0 : 400);
}

// ── 컨텍스트 메뉴 ─────────────────────────────────────
let _plCtxTrack = null;
let _lastMouseEvt = null;
document.addEventListener('mousemove', e => { _lastMouseEvt = e; });

function plShowCtxById(trackId) {
    const track = S.q.find(t => t.id === trackId)
        || S.favs.find(t => t.id === trackId)
        || (S.track?.id === trackId ? S.track : null);
    if (!track) return;
    plShowCtx(_lastMouseEvt || { clientX: innerWidth / 2, clientY: innerHeight / 2 }, track);
}

function plShowCtx(e, track) {
    _plCtxTrack = track;
    const menu = document.getElementById('pl-ctx-menu');
    const list = document.getElementById('pl-ctx-list');
    list.innerHTML = PL.lists.length
        ? PL.lists.map(pl => `
        <button class="pl-ctx-item" onclick="plCtxAdd('${esc(pl.id)}')">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <rect x="1" y="1" width="4" height="4" rx="0.8"/><rect x="7" y="1" width="4" height="4" rx="0.8"/>
            <rect x="1" y="7" width="4" height="4" rx="0.8"/>
          </svg>${esc(pl.name)}
        </button>`).join('')
        : '';
    const mw = 210, mh = 80 + PL.lists.length * 36;
    let x = e.clientX, y = e.clientY;
    if (x + mw > innerWidth) x = innerWidth - mw - 8;
    if (y + mh > innerHeight) y = innerHeight - mh - 8;
    menu.style.left = x + 'px'; menu.style.top = y + 'px';
    menu.classList.add('on');
}
function plCtxAdd(plId) { if (_plCtxTrack) plAddTrack(plId, _plCtxTrack); plCtxClose(); }
async function plCtxNew() {
    plCtxClose();
    if (!_plCtxTrack) return;
    const track = _plCtxTrack;
    const id = await plNewPrompt(track.title.slice(0, 20));
    if (id) plAddTrack(id, track);
}
function plCtxClose() {
    document.getElementById('pl-ctx-menu').classList.remove('on');
    _plCtxTrack = null;
}
document.addEventListener('click', e => {
    if (!e.target.closest('#pl-ctx-menu')) plCtxClose();
});
function togglePip() { document.getElementById('pip').classList.toggle('on'); }

/* ════════════════════════════════════════════
   UTILS
════════════════════════════════════════════ */
function fmt(s) { if (!s || isNaN(s)) return '0:00'; return `${Math.floor(s / 60)}:${(Math.floor(s % 60)).toString().padStart(2, '0')}`; }
function setT(id, s) { const el = document.getElementById(id); if (el) el.textContent = fmt(s); }
function esc(s) {
    if (!s) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
let _tt;
function toast(msg) {
    const el = document.getElementById('toast'); el.textContent = msg; el.classList.add('on');
    clearTimeout(_tt); _tt = setTimeout(() => el.classList.remove('on'), 2200);
}

/* ════════════════════════════════════════════
   OVERLAY MODE
════════════════════════════════════════════ */
const OV = {
    active: false,
    ticker: null,
    curIdx: -1
};

// 오버레이 바 실제 높이(px)
const OV_BAR_H = 58;

function toggleOverlay() {
    OV.active = !OV.active;
    if (OV.active) {
        _enterOverlay();
    } else {
        _exitOverlay();
    }
}

function _enterOverlay() {
    document.body.classList.add('overlay-mode');

    document.getElementById('np').classList.remove('on');

    document.getElementById('bt-overlay-btn')?.classList.add('on');
    document.getElementById('np-overlay-btn')?.classList.add('on');

    _syncOvBar();
    initSeekBar('ov-pb', 'ov-pbf');

    const ovVol = document.getElementById('ov-vol-sl');
    if (ovVol) ovVol.value = S.vol;

    _startOvLyrics();

    post('overlayMode', { active: true });
    toast('오버레이 모드 켜짐');
}

function _exitOverlay() {
    document.body.classList.remove('overlay-mode');

    document.getElementById('bt-overlay-btn')?.classList.remove('on');
    document.getElementById('np-overlay-btn')?.classList.remove('on');

    _stopOvLyrics();

    post('overlayMode', { active: false });
    toast('오버레이 모드 꺼짐');
}

// 오버레이 바 트랙 정보 동기화
function _syncOvBar() {
    if (!S.track) return;
    const hq = getThumbHq(S.track.id), md = getThumbMd(S.track.id);
    const art = document.getElementById('ov-b-art');
    if (art) { art.src = hq; art.onerror = () => { art.src = md; }; }
    const title = document.getElementById('ov-b-title');
    if (title) title.textContent = S.track.title || '—';
    const ch = document.getElementById('ov-b-ch');
    if (ch) ch.textContent = S.track.channel || 'YouTube';

    _syncOvPlayBtn();
}

function _syncOvPlayBtn() {
    const btn = document.getElementById('ov-cb-play');
    if (!btn) return;
    btn.innerHTML = S.playing
        ? `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><rect x="2.5" y="2" width="4" height="12" rx="1"/><rect x="9.5" y="2" width="4" height="12" rx="1"/></svg>`
        : `<svg width="17" height="17" viewBox="0 0 17 17" fill="currentColor"><polygon points="4,2.5 14,8.5 4,14.5"/></svg>`;
}

// 가사 오버레이 tick
function _startOvLyrics() {
    _stopOvLyrics();
    _buildOvLyricsDOM();
    OV.curIdx = -1;
    OV.ticker = setInterval(_syncOvLyrics, 100);
}
function _stopOvLyrics() {
    clearInterval(OV.ticker); OV.ticker = null;
}

// 가사 DOM 빌드 — LyricsForm(C#)이 렌더링하므로 JS DOM 불필요
function _buildOvLyricsDOM() {
    OV.curIdx = -1;
    post('overlayLyrics', { prev: '', active: '', next1: '', next2: '' });
}

function _updateOvLyricsVisibility(activeIdx) {
    // C# LyricsForm에서 처리 — 사용 안 함
}

function _syncOvLyrics() {
    if (!S.ytPlayer || !S.ytReady || !LY.lines.length) return;
    let cur;
    try { cur = S.ytPlayer.getCurrentTime() || 0; } catch { return; }

    let found = -1;
    for (let i = LY.lines.length - 1; i >= 0; i--) {
        if (cur >= LY.lines[i].start) {
            if (cur < LY.lines[i].end) found = i;
            break;
        }
    }

    if (found === OV.curIdx) return;
    OV.curIdx = found;

    // C#의 LyricsForm으로 가사 3줄 전송 (prev / active / next)
    const get = i => (i >= 0 && i < LY.lines.length) ? (LY.lines[i].text || '') : '';
    post('overlayLyrics', {
        prev: get(found - 1),
        active: get(found),
        next1: get(found + 1),
        next2: ''
    });

    // 프로그레스 바 동기화
    if (OV.active) {
        try {
            const dur = S.ytPlayer.getDuration() || 0;
            const pct = dur ? (cur / dur) * 100 : 0;
            const ovPb = document.getElementById('ov-pb');
            if (!ovPb?.classList.contains('dragging')) ovPb?._setFill?.(pct);
            setT('ov-p-cur', cur);
            setT('ov-p-tot', dur);
        } catch { }
    }
}

// 곡이 바뀔 때 오버레이 가사도 재빌드
const _origClearLyrics = _clearLyrics;

// playTrack 후 가사 다시 로드되면 오버레이도 갱신
const _origRenderLyrics = _renderLyrics;

/* ════════════════════════════════════════════
   KEYBOARD
════════════════════════════════════════════ */
document.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT') return;
    if (e.code === 'Space') { e.preventDefault(); togglePlay(); }
    if (e.code === 'ArrowRight') nextT();
    if (e.code === 'ArrowLeft') prevT();
    if (e.code === 'KeyM') toggleMute();
    if (e.code === 'Escape') closeNP();
});

/* ════════════════════════════════════════════
   LYRICS SYSTEM — YouTube 자막 기반 실시간 가사
════════════════════════════════════════════ */
const LY = {
    lines: [],     // [{start, end, text, el}]
    curIdx: -1,
    ticker: null,
    videoId: null,
    _fetching: null  // 현재 fetch 중인 videoId (중복 요청 방지용)
};

// ── 파티클 스폰: 앨범 아트 실제 위치 기준 ────────────
function _getArtCenter() {
    const ash = document.getElementById('np-ash');
    const canvas = document.getElementById('np-particles');
    if (!ash || !canvas) return { cx: canvas ? canvas.width / 2 : innerWidth / 2, cy: canvas ? canvas.height * .42 : innerHeight * .42 };
    const ar = ash.getBoundingClientRect();
    const cr = canvas.getBoundingClientRect();
    return {
        cx: ar.left + ar.width / 2 - cr.left,
        cy: ar.top + ar.height / 2 - cr.top
    };
}

// ── 가사 fetch — lrclib.net API (C# HttpClient 직접 호출) ────
async function fetchLyrics(videoId) {
    // 이미 성공적으로 로드된 경우에만 스킵 (실패 시엔 재시도 허용)
    if (LY.videoId === videoId && LY.lines.length > 0) return;
    // 동일 videoId로 이미 fetch 진행 중이면 중복 요청 방지
    if (LY._fetching === videoId) return;

    LY._fetching = videoId;
    LY.lines = [];
    LY.curIdx = -1;
    _showLyricsLoading();
    try {
        const title = S.track?.title ?? '';
        const channel = S.track?.channel ?? '';

        // S.dur가 0이면 플레이어에서 직접 가져오거나 최대 3초 대기
        let duration = S.dur || 0;
        if (!duration && S.ytPlayer && S.ytReady) {
            try { duration = S.ytPlayer.getDuration() || 0; } catch { }
        }
        if (!duration) {
            // 최대 3초 대기 (플레이어 로딩 중)
            for (let i = 0; i < 6 && !duration; i++) {
                await new Promise(r => setTimeout(r, 500));
                // 곡이 바뀌었으면 즉시 중단
                if (LY._fetching !== videoId) return;
                duration = S.dur || 0;
                if (!duration && S.ytPlayer && S.ytReady) {
                    try { duration = S.ytPlayer.getDuration() || 0; } catch { }
                }
            }
        }

        // fetch 도중 곡이 바뀌었으면 중단
        if (LY._fetching !== videoId) return;

        const res = await callCs({ type: 'fetchLyrics', videoId, title, channel, duration });

        // 응답 도착 전에 곡이 바뀌었으면 버림
        if (LY._fetching !== videoId) return;

        if (res.success && res.lines && res.lines.length > 0) {
            LY.videoId = videoId;   // 성공한 경우에만 캐시 키 확정
            LY.lines = res.lines;
            _renderLyrics();
        } else {
            LY.videoId = null;      // 실패 시 null → 재검색 허용
            _showLyricsEmpty();
        }
    } catch (err) {
        if (LY._fetching === videoId) {
            LY.videoId = null;      // 에러 시에도 재검색 허용
            _showLyricsEmpty();
        }
    } finally {
        if (LY._fetching === videoId) LY._fetching = null;
    }
}

// ── 렌더링 ────────────────────────────────────────────
function _renderLyrics() {
    const inner = document.getElementById('np-lyrics-inner');
    const artArea = document.querySelector('.np-art-area');
    if (!inner || !artArea) return;

    // 가사 없음 문구 제거
    document.getElementById('np-no-lyrics')?.remove();

    inner.innerHTML = '';
    LY.lines.forEach((line, i) => {
        const el = document.createElement('div');
        el.className = 'np-lyric-line';
        el.textContent = line.text;
        el.addEventListener('click', () => {
            if (S.ytPlayer && S.ytReady) S.ytPlayer.seekTo(line.start + 0.05, true);
        });
        inner.appendChild(el);
        LY.lines[i].el = el;
    });

    artArea.classList.add('has-lyrics');
    _startLyricsTick();

    if (document.getElementById('np')?.classList.contains('fullscreen')) {
        /* [FIX] 전체화면 상태에서 새 곡 재생 시 _buildFsLyricsDOM()을 즉시 호출하면
           레이아웃이 확정되기 전에 DOM을 구축해 _positionFsPanel이 잘못된 좌표를 읽음.
           _onWindowStateChange와 동일한 3단계 rAF 지연으로 페인트 후 실행 보장. */
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    _buildFsLyricsDOM();
                    _highlightFsLine(LY.curIdx);
                });
            });
        });
    }

    // 오버레이 모드 활성 시 오버레이 가사도 갱신
    if (OV.active) {
        _buildOvLyricsDOM();
    }
}

function _showLyricsLoading() {
    const inner = document.getElementById('np-lyrics-inner');
    const artArea = document.querySelector('.np-art-area');
    if (!inner) return;
    document.getElementById('np-no-lyrics')?.remove();
    artArea?.classList.add('has-lyrics');
    inner.innerHTML = `<div class="np-lyrics-loading"><div class="spinner"></div><span>가사 불러오는 중...</span></div>`;
}

function _showLyricsEmpty() {
    const inner = document.getElementById('np-lyrics-inner');
    const artArea = document.querySelector('.np-art-area');
    if (!inner) return;
    // has-lyrics 제거 → 기존 앨범 아트 중앙 레이아웃 복원
    artArea?.classList.remove('has-lyrics');
    inner.innerHTML = '';

    // 앨범 아래에 가사 없음 문구 표시
    document.getElementById('np-no-lyrics')?.remove();
    const el = document.createElement('div');
    el.id = 'np-no-lyrics';
    el.className = 'np-no-lyrics';
    el.textContent = '가사를 찾을 수 없습니다';
    document.getElementById('np')?.appendChild(el);
}

function _clearLyrics() {
    const inner = document.getElementById('np-lyrics-inner');
    const artArea = document.querySelector('.np-art-area');
    if (inner) inner.innerHTML = '';
    artArea?.classList.remove('has-lyrics');
    document.getElementById('np-no-lyrics')?.remove();
    document.getElementById('np-fs-lyrics')?.remove();
    document.getElementById('np-fs-artist')?.remove();
    _fsDotsLit = -1;
    if (LY._dotElFs) { LY._dotElFs = null; }
    _stopLyricsTick();
    LY.lines = [];
    LY.curIdx = -1;
    LY.videoId = null;
    LY._fetching = null;  // 진행 중인 fetch 취소 허용
}

/* ════════════════════════════════════════════
   FULLSCREEN STATE
════════════════════════════════════════════ */
/* ── fullscreen ResizeObserver — window.resize 대체 ──────────────
   window.resize는 WebView2 뷰포트 크기 변경 시점에 발생하지만,
   fullscreen CSS 레이아웃(np-art-shell 크기 등)이 확정되기 전에
   _positionFsPanel을 호출하는 타이밍 문제가 있었음.
   ResizeObserver로 #np 엘리먼트 자체의 크기 변화를 감지하면
   레이아웃 재계산 완료 후 콜백이 보장되어 타이밍 문제를 제거.
──────────────────────────────────────────────────────────────── */
let _fsResizeObserver = null;

function _attachFsResizeObserver() {
    const np = document.getElementById('np');
    if (!np || _fsResizeObserver) return;
    _fsResizeObserver = new ResizeObserver(() => {
        /* ResizeObserver 콜백은 레이아웃 완료 후 발생 — 안전하게 즉시 호출 */
        _positionFsPanel();
    });
    _fsResizeObserver.observe(np);
}

function _detachFsResizeObserver() {
    if (_fsResizeObserver) {
        _fsResizeObserver.disconnect();
        _fsResizeObserver = null;
    }
}

function _onWindowStateChange(isMaximized) {
    const np = document.getElementById('np');
    if (!np) return;
    if (isMaximized) {
        np.classList.add('fullscreen');
        document.body.classList.add('maximized');

        /* [FIX v2] window.resize → ResizeObserver 교체
           ResizeObserver는 레이아웃 재계산 완료 시점에 콜백을 보장하므로
           WebView2 뷰포트 확정 전 _positionFsPanel 호출 문제를 원천 차단 */
        _attachFsResizeObserver();

        /* [FIX] 노말모드 가사 하이라이트 클래스 즉시 제거
           fullscreen 진입 시 .np-lyric-line의 active/prev/near가 남아 있으면
           전체화면 레이아웃이 확정되기 전까지 잘못된 스타일이 보임 */
        document.querySelectorAll('.np-lyric-line')
            .forEach(el => el.classList.remove('active', 'prev', 'near'));

        /* fullscreen 클래스 추가 직후 레이아웃 강제 확정 후 패널 위치 세팅.
           np-art-shell은 min(420px, 38vw, 54vh) 계산이 필요하므로
           vw/vh가 새 창 크기 기준으로 확정될 때까지 rAF 3회 대기. */
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    /* 패널 위치 먼저 확정 */
                    _positionFsPanel();
                    /* 가사 DOM 구축 후 현재 재생 위치 기준으로 즉시 하이라이트 */
                    if (LY.lines.length > 0) {
                        _buildFsLyricsDOM();
                        /* _buildFsLyricsDOM 내부 rAF 완료 후 curIdx가 확정되므로
                           추가 rAF 1회로 _highlightFsLine 즉시 호출 */
                        requestAnimationFrame(() => {
                            _highlightFsLine(LY.curIdx);
                        });
                    }
                });
            });
        });
    } else {
        np.classList.remove('fullscreen');
        document.body.classList.remove('maximized');

        /* [FIX v2] ResizeObserver 해제 */
        _detachFsResizeObserver();

        /* np-panel inline style 완전 초기화 — 일반모드 레이아웃 복원 */
        _restoreNormalMode();
        document.getElementById('np-fs-lyrics')?.remove();
        document.getElementById('np-fs-artist')?.remove();

        if (LY.lines.length > 0) {
            /* _renderLyrics는 DOM을 새로 구축하고 내부적으로 _startLyricsTick을 호출.
               DOM 구축 직후 현재 curIdx 기준으로 노말모드 하이라이트를 즉시 적용해
               첫 tick(100ms 후) 전에 빈 화면이 보이는 문제를 제거. */
            _renderLyrics();
            requestAnimationFrame(() => {
                _highlightLine(LY.curIdx, true);  /* instant: 복원 직후 즉시 스크롤 */
            });
        }
    }
}

/* ═══════════════════════════════════════════════════════
   전체화면 가사 시스템  v6  — GPU-only compositor 렌더링
   ────────────────────────────────────────────────────────
   v5의 끊김 원인 & 해결:

   ① height/font-size/padding transition 완전 제거
      → 이 속성들은 매 프레임 레이아웃 재계산(reflow)을 강제하여
        메인 스레드를 블로킹 → 60fps 불가능
      → 해결: 모든 줄을 CSS로 고정 높이(FS_ROW_H) 사전 할당.
        크기 변화는 transform:scaleY()로만 표현.
        scaleY/translateY/opacity/filter는 GPU compositor 전담 →
        메인 스레드 완전 무관하게 60fps 유지

   ② isEntering 판정 오류 → _fsVisible Set으로 명확하게
      → 이전: curH < 1 체크는 transition 진행 중인 줄을 잘못 판정
      → 해결: 가시 줄을 Set으로 엄밀하게 추적

   ③ rAF 안에서 다시 rAF → 타이밍 불안정
      → 해결: FLIP 패턴. transition=none으로 목표 상태 즉시 세팅 후
        단 1회 rAF에서 transition 켜기만 하면 됨

   레이아웃:
   · #np-fs-lyrics-inner: position:relative, height = N * FS_ROW_H
   · 각 줄: position:absolute, top = i * FS_ROW_H (고정)
   · 줄 자체는 transform:translateY(offset) scaleY(sy) 로만 이동
   · active 기준 ± 범위 밖 줄: opacity=0, translateY(±shift)
═══════════════════════════════════════════════════════ */

/* ── 슬롯 정의 — active 기준 상대 인덱스(d) → 시각 속성 ── */
/*  op: opacity   bl: blur(px)   sy: scaleY   sc: scaleX
    dy: translateY 오프셋(px, slot 기준선에서의 추가 이동)
    각 속성은 GPU compositor 전용(transform/opacity/filter)만 사용 */
const FS_SLOTS = [
    /* d    op     bl    sy     sc    dy  */
    { d: -3, op: 0.18, bl: 4.0, sy: 0.82, sc: 0.90, dy: 0 },
    { d: -2, op: 0.38, bl: 2.0, sy: 0.88, sc: 0.94, dy: 0 },
    { d: -1, op: 0.62, bl: 0.6, sy: 0.95, sc: 0.98, dy: 0 },
    { d: 0, op: 1.00, bl: 0.0, sy: 1.00, sc: 1.00, dy: 0 },
    { d: 1, op: 0.58, bl: 0.6, sy: 0.95, sc: 0.98, dy: 0 },
    { d: 2, op: 0.34, bl: 2.0, sy: 0.88, sc: 0.94, dy: 0 },
    { d: 3, op: 0.15, bl: 4.0, sy: 0.82, sc: 0.90, dy: 0 },
];

/* 각 줄에 사전 할당하는 고정 행 높이(px) — CSS와 반드시 일치 */
const FS_ROW_H = 56;   /* CSS: .np-fs-lyric-line { height: FS_ROW_H px } */
/* active 줄 기준 앞/뒤 표시 범위 */
const FS_BEFORE = 3;
const FS_AFTER = 3;
/* 범위 밖 줄이 사라지는/나타나는 translateY 거리 */
const FS_SLIDE = 22;   /* px */

/* GPU transition — compositor 전용 속성만 열거 */
const FS_TRANS = [
    'opacity  0.40s cubic-bezier(0.4,0,0.2,1)',
    'filter   0.40s cubic-bezier(0.4,0,0.2,1)',
    'transform 0.46s cubic-bezier(0.34,1.15,0.64,1)',
].join(', ');

/* active 줄 색상 강조 — color는 compositor 비대상이나 변화가 거의 없어 OK */
function _fsColor(d) {
    if (d === 0) return 'rgba(255,255,255,0.97)';
    if (Math.abs(d) === 1) return 'rgba(255,255,255,0.65)';
    if (Math.abs(d) === 2) return 'rgba(255,255,255,0.42)';
    return 'rgba(255,255,255,0.22)';
}

/* active 줄 font-weight — 변경 시 reflow 없음(width 고정 레이아웃이므로) */
function _fsFW(d) {
    if (d === 0) return '800';
    if (Math.abs(d) <= 1) return '600';
    return '500';
}

let _fsLastIdx = -1;
let _fsVisible = new Set();   /* 현재 화면에 표시 중인 줄 인덱스 */
let _fsPanelRaf = null;

/* ── np-panel 위치: 아트쉘 바로 아래 픽셀 고정 ── */
let _posFsPanelRetry = null;
function _positionFsPanel() {
    const shell = document.querySelector('#np.fullscreen .np-art-shell');
    const panel = document.querySelector('#np.fullscreen .np-panel');
    if (!shell || !panel) return;

    const npRect = document.getElementById('np').getBoundingClientRect();
    const artRect = shell.getBoundingClientRect();

    /* [FIX v2] 방어: shell 크기가 아직 0이면 레이아웃 미확정 상태.
       한 번 더 rAF 후 재시도해 잘못된 좌표로 패널이 배치되는 것을 방지. */
    if (artRect.width < 1 || artRect.height < 1) {
        if (_posFsPanelRetry) cancelAnimationFrame(_posFsPanelRetry);
        _posFsPanelRetry = requestAnimationFrame(() => {
            _posFsPanelRetry = null;
            _positionFsPanel();
        });
        return;
    }

    panel.style.left = (artRect.left - npRect.left) + 'px';
    panel.style.top = (artRect.bottom - npRect.top + 16) + 'px';
    panel.style.width = artRect.width + 'px';
}

/* ── 전체화면 해제 시 np-panel inline style 초기화 ── */
function _restoreNormalMode() {
    const panel = document.querySelector('.np-panel');
    if (!panel) return;
    ['position', 'left', 'top', 'width', 'padding',
        'display', 'flexDirection', 'gap', 'background', 'boxShadow', 'zIndex'
    ].forEach(p => panel.style[p] = '');
}

/* ── 각 줄에 GPU 전용 스타일 즉시 적용 (transition 없이) ── */
function _fsApplySlot(el, slot, visible) {
    if (!visible) {
        el.style.opacity = '0';
        el.style.filter = 'blur(8px)';
        /* transform은 그대로 유지 — 방향만 dir로 결정하므로 호출부에서 세팅 */
        return;
    }
    el.style.opacity = String(slot.op);
    el.style.filter = slot.bl > 0 ? `blur(${slot.bl}px)` : 'none';
    el.style.color = _fsColor(slot.d);
    el.style.fontWeight = _fsFW(slot.d);
    /* transform: Y는 각 줄 고정 top 기반 → 추가 오프셋 0
       scaleY/scaleX로 크기 감쇠 표현 */
    el.style.transform = `scaleX(${slot.sc}) scaleY(${slot.sy}) translateY(${slot.dy}px)`;
}

/* ── DOM 구축 ── */
function _buildFsLyricsDOM() {
    document.getElementById('np-fs-lyrics')?.remove();
    document.getElementById('np-fs-artist')?.remove();
    const np = document.getElementById('np');
    if (!np) return;

    _fsLastIdx = -1;
    _fsVisible = new Set();

    const container = document.createElement('div');
    container.id = 'np-fs-lyrics';

    const inner = document.createElement('div');
    inner.id = 'np-fs-lyrics-inner';
    /* 전체 높이를 줄 수 × FS_ROW_H 로 고정 — 레이아웃 변동 없음 */
    inner.style.height = (LY.lines.length * FS_ROW_H) + 'px';
    container.appendChild(inner);
    np.appendChild(container);

    // ── dot 줄(•••): 인덱스 -1 가상 줄, 실제 DOM은 top=-FS_ROW_H 위치 ──
    const dotEl = document.createElement('div');
    dotEl.className = 'np-fs-lyric-line np-fs-dot-line';
    dotEl.innerHTML =
        '<span class="np-fs-dot" style="transition-delay:0s"></span>' +
        '<span class="np-fs-dot" style="transition-delay:0.07s"></span>' +
        '<span class="np-fs-dot" style="transition-delay:0.14s"></span>';
    dotEl.style.top = (-FS_ROW_H) + 'px';  // 가사 0번 줄 바로 위
    dotEl.style.transition = 'none';
    dotEl.style.opacity = '0';
    dotEl.style.filter = 'blur(8px)';
    dotEl.style.transform = `scaleX(0.88) scaleY(0.82) translateY(${FS_SLIDE}px)`;
    dotEl.style.willChange = 'transform, opacity, filter';
    dotEl.style.pointerEvents = 'none';
    inner.appendChild(dotEl);
    // LY 에 dot 줄 참조 저장
    LY._dotElFs = dotEl;

    LY.lines.forEach((line, i) => {
        const el = document.createElement('div');
        el.className = 'np-fs-lyric-line';
        el.textContent = line.text;
        /* 고정 위치: top = i * FS_ROW_H
           초기 상태: transition 없이 숨김 */
        el.style.top = (i * FS_ROW_H) + 'px';
        el.style.transition = 'none';
        el.style.opacity = '0';
        el.style.filter = 'blur(8px)';
        el.style.transform = `scaleX(0.88) scaleY(0.82) translateY(${FS_SLIDE}px)`;
        el.style.color = 'rgba(255,255,255,0.22)';
        el.style.fontWeight = '500';
        el.style.willChange = 'transform, opacity, filter';
        el.addEventListener('click', () => {
            if (S.ytPlayer && S.ytReady) S.ytPlayer.seekTo(line.start + 0.05, true);
        });
        inner.appendChild(el);
        LY.lines[i].el_fs = el;
    });

    /* 레이아웃 확정 → 패널 위치 → 강제 reflow → transition 켜기 */
    requestAnimationFrame(() => {
        _positionFsPanel();
        /* 강제 reflow: transition=none 상태를 브라우저가 확정하게 함 */
        void inner.offsetHeight;
        requestAnimationFrame(() => {
            /* 이 프레임부터 transition 적용 — 초기 하이라이트가 애니메이션됨 */
            _highlightFsLine(LY.curIdx);
        });
    });
}

/* ── 핵심: 가사 줄 하이라이트 (매 tick 호출) ── */
function _highlightFsLine(idx) {
    if (!LY.lines.length) return;

    // idx=-1: dot 줄이 active, 0번 가사가 next로 보임
    // dot 줄의 "가상 인덱스"는 -1 이므로 ai=-1, 실제 el 위치는 top=-FS_ROW_H
    // inner의 translateY 계산 시 ai=-1을 넣으면
    //   offsetY = containerH/2 - (-1)*FS_ROW_H - FS_ROW_H/2 = containerH/2 + FS_ROW_H/2
    const isDot = (idx < 0);
    const ai = isDot ? -1 : idx;
    const dir = (_fsLastIdx < 0 && !isDot) ? 1 : (isDot ? 1 : (idx >= _fsLastIdx ? 1 : -1));
    _fsLastIdx = isDot ? -1 : idx;

    /* inner 컨테이너를 translateY로 스크롤 — active 줄이 항상 중앙에 오도록 */
    const inner = document.getElementById('np-fs-lyrics-inner');
    if (!inner) return;
    const container = document.getElementById('np-fs-lyrics');
    const containerH = container ? container.offsetHeight : window.innerHeight;
    /* active 줄 중앙 y = ai * FS_ROW_H + FS_ROW_H/2
       컨테이너 중앙 = containerH / 2
       inner offset = containerH/2 - (ai * FS_ROW_H + FS_ROW_H/2) */
    const offsetY = Math.round(containerH / 2 - ai * FS_ROW_H - FS_ROW_H / 2);

    /* inner 이동은 transition 적용 (transform만 — GPU) */
    inner.style.transition = `transform 0.46s cubic-bezier(0.34,1.15,0.64,1)`;
    inner.style.transform = `translateY(${offsetY}px)`;

    const newVisible = new Set();

    // ── dot 줄(가상 인덱스 -1) 처리 ──────────────────────────────────
    const dotEl = LY._dotElFs;
    if (dotEl) {
        const d_dot = -1 - ai;   // dot줄(i=-1) 과 active(ai) 의 상대 거리
        const slot_dot = FS_SLOTS.find(s => s.d === d_dot);
        const wasDotVisible = _fsVisible.has(-1);

        if (!slot_dot) {
            if (wasDotVisible) {
                dotEl.style.transition = FS_TRANS;
                dotEl.style.opacity = '0';
                dotEl.style.filter = 'blur(8px)';
                dotEl.style.transform = `scaleX(0.88) scaleY(0.82) translateY(${dir > 0 ? -FS_SLIDE : FS_SLIDE}px)`;
            }
        } else {
            newVisible.add(-1);
            if (!wasDotVisible) {
                dotEl.style.transition = 'none';
                dotEl.style.opacity = '0';
                dotEl.style.filter = `blur(${Math.max(slot_dot.bl, 3)}px)`;
                dotEl.style.transform = `scaleX(${slot_dot.sc * 0.92}) scaleY(${slot_dot.sy * 0.88}) translateY(${dir > 0 ? FS_SLIDE : -FS_SLIDE}px)`;
                void dotEl.offsetHeight;
                dotEl.style.transition = FS_TRANS;
            } else {
                dotEl.style.transition = FS_TRANS;
            }
            dotEl.style.opacity = String(slot_dot.op);
            dotEl.style.filter = slot_dot.bl > 0 ? `blur(${slot_dot.bl}px)` : 'none';
            dotEl.style.transform = `scaleX(${slot_dot.sc}) scaleY(${slot_dot.sy}) translateY(${slot_dot.dy}px)`;
        }
    }

    LY.lines.forEach((line, i) => {
        const el = line.el_fs;
        if (!el) return;

        const d = i - ai;
        const slot = FS_SLOTS.find(s => s.d === d);
        const wasVisible = _fsVisible.has(i);

        if (!slot) {
            /* 범위 밖: 숨김 처리 */
            if (wasVisible) {
                /* 방금 범위를 벗어난 줄 → 방향에 따라 밀어내기 */
                el.style.transition = FS_TRANS;
                el.style.opacity = '0';
                el.style.filter = 'blur(8px)';
                el.style.transform = `scaleX(0.88) scaleY(0.82) translateY(${dir > 0 ? -FS_SLIDE : FS_SLIDE}px)`;
            }
            /* 이미 숨겨진 줄: 건드리지 않음 (불필요한 스타일 기록 방지) */
            return;
        }

        newVisible.add(i);

        if (!wasVisible) {
            /* 새로 진입하는 줄: transition 없이 진입 위치 → rAF 1회 후 transition 켜기 */
            el.style.transition = 'none';
            el.style.opacity = '0';
            el.style.filter = `blur(${Math.max(slot.bl, 3)}px)`;
            el.style.transform = `scaleX(${slot.sc * 0.92}) scaleY(${slot.sy * 0.88}) translateY(${dir > 0 ? FS_SLIDE : -FS_SLIDE}px)`;
            /* 강제 reflow: 위 스타일이 확정되어야 아래 transition이 의미있게 발동 */
            void el.offsetHeight;
            el.style.transition = FS_TRANS;
        } else {
            /* 이미 보이던 줄: transition 유지하며 목표 값으로 이동 */
            el.style.transition = FS_TRANS;
        }

        /* 목표 스타일 세팅 (진입/이동 공통) */
        _fsApplySlot(el, slot, true);
    });

    _fsVisible = newVisible;

    if (_fsPanelRaf) cancelAnimationFrame(_fsPanelRaf);
    _fsPanelRaf = requestAnimationFrame(_positionFsPanel);
}

// ── 싱크 타이머 ───────────────────────────────────────
function _startLyricsTick() {
    _stopLyricsTick();
    // 가사 렌더 직후 end 시간을 다음 줄 start로 클리핑 (반주 구간 대비)
    _clampLyricEnds();
    LY.ticker = setInterval(_syncLyrics, 100);
}
function _stopLyricsTick() { clearInterval(LY.ticker); LY.ticker = null; }

// 각 줄의 end를 다음 줄 start로 제한 — 반주 구간에 가사 안 넘어가도록
function _clampLyricEnds() {
    for (let i = 0; i < LY.lines.length - 1; i++) {
        const nextStart = LY.lines[i + 1].start;
        // end가 다음 줄 start보다 늦으면 클리핑
        if (LY.lines[i].end > nextStart) {
            LY.lines[i].end = nextStart;
        }
        // end가 start와 같거나 너무 짧으면 최소 0.5초 보장
        if (LY.lines[i].end <= LY.lines[i].start) {
            LY.lines[i].end = Math.min(LY.lines[i].start + 0.5, nextStart);
        }
    }
}

function _syncLyrics() {
    if (!S.ytPlayer || !S.ytReady || !LY.lines.length) return;
    let cur;
    try { cur = S.ytPlayer.getCurrentTime() || 0; } catch { return; }

    const isFullscreen = document.getElementById('np')?.classList.contains('fullscreen');

    // ── 전체화면: 첫 가사 이전 → dot 줄이 active, 비율로 점 점등 ──────
    if (isFullscreen && LY.lines[0].start > 0.5 && cur < LY.lines[0].start) {
        const ratio = cur / LY.lines[0].start;
        const lit = ratio > 0.90 ? 3 : ratio > 0.66 ? 2 : ratio > 0.33 ? 1 : 0;

        // dot 줄을 active(-1)로 하이라이트 (0번 가사가 next로 표시됨)
        if (LY.curIdx !== -1) {
            LY.curIdx = -1;
            _highlightFsLine(-1);
        }
        // dot 줄의 점 점등 상태 갱신
        if (LY._dotElFs && _fsDotsLit !== lit) {
            _fsDotsLit = lit;
            LY._dotElFs.querySelectorAll('.np-fs-dot').forEach((dot, i) => {
                if (i < lit) dot.classList.add('on');
                else dot.classList.remove('on');
            });
        }
        return;
    }

    // 첫 가사 이후: dot 줄의 점 모두 끄기 (이미 가사 슬롯으로 밀려남)
    if (isFullscreen && LY._dotElFs && _fsDotsLit !== -1) {
        _fsDotsLit = -1;
        LY._dotElFs.querySelectorAll('.np-fs-dot').forEach(d => d.classList.remove('on'));
    }

    // start <= cur < end 인 줄 찾기
    // 없으면 -1 (반주 구간 → 아무것도 active 안 함)
    let found = -1;
    for (let i = LY.lines.length - 1; i >= 0; i--) {
        if (cur >= LY.lines[i].start) {
            // end 체크: 현재 시간이 end를 넘으면 반주 구간
            if (cur < LY.lines[i].end) found = i;
            break;
        }
    }

    if (found === LY.curIdx) return;
    LY.curIdx = found;
    _highlightLine(found);
}

/* ── 전체화면 •••  카운트다운 UI ─────────────────────────────────────
   #np-fs-dots: 컨테이너, 3개의 span.np-fs-dot
   lit: 켜진 점 개수(0~3) — 순서대로 점등
   각 점은 CSS transition으로 opacity+glow가 페이드인됨
──────────────────────────────────────────────────────────────────── */
let _fsDotsLit = -1;  // 마지막으로 세팅한 lit 값 캐시 (불필요한 DOM 접근 방지)

function _ensureFsDotsEl() {
    const np = document.getElementById('np');
    if (!np) return null;
    let el = document.getElementById('np-fs-dots');
    if (!el) {
        el = document.createElement('div');
        el.id = 'np-fs-dots';
        // 점 3개 + 각 점에 개별 transition-delay로 순차 점등 느낌 보강
        el.innerHTML =
            '<span class="np-fs-dot" style="transition-delay:0s"></span>' +
            '<span class="np-fs-dot" style="transition-delay:0.06s"></span>' +
            '<span class="np-fs-dot" style="transition-delay:0.12s"></span>';
        // #np 직하위에 추가 — CSS: #np.fullscreen #np-fs-dots 셀렉터에 매칭
        np.appendChild(el);
    }
    return el;
}

function _showFsDots(lit) {
    const el = _ensureFsDotsEl();
    if (!el) return;
    // 처음 표시할 때만 display + visible 처리
    if (_fsDotsLit === -1) {
        el.style.display = 'flex';
        void el.offsetHeight;
        el.classList.add('visible');
    }
    // lit이 같으면 DOM 건드리지 않음
    if (_fsDotsLit === lit) return;
    _fsDotsLit = lit;
    const dots = el.querySelectorAll('.np-fs-dot');
    dots.forEach((dot, i) => {
        if (i < lit) dot.classList.add('on');
        else dot.classList.remove('on');
    });
}

function _hideFsDots() {
    if (_fsDotsLit === -1) return;
    _fsDotsLit = -1;
    const el = document.getElementById('np-fs-dots');
    if (!el) return;
    el.classList.remove('visible');
    // transition 끝나면 display:none
    const onEnd = () => { el.style.display = 'none'; el.removeEventListener('transitionend', onEnd); };
    el.addEventListener('transitionend', onEnd);
}

function _highlightLine(idx, instant) {
    if (document.getElementById('np')?.classList.contains('fullscreen')) {
        _highlightFsLine(idx);
        return;
    }
    LY.lines.forEach((line, i) => {
        if (!line.el) return;
        line.el.classList.remove('active', 'prev', 'near');
        if (idx < 0) return;
        const d = i - idx;
        if (d === 0) line.el.classList.add('active');
        else if (d === -1) line.el.classList.add('prev');
        else if (d >= 1 && d <= 3) line.el.classList.add('near');
    });
    if (idx >= 0 && LY.lines[idx]?.el) {
        const el = LY.lines[idx].el;
        const scroll = document.getElementById('np-lyrics-scroll');
        if (!scroll) return;
        const target = el.offsetTop - scroll.clientHeight / 2 + el.offsetHeight / 2;
        /* [FIX] 전체화면 복원 시(instant=true) 즉시 스크롤 — smooth 없이
           해제 직후 첫 tick 전까지 엉뚱한 위치가 보이는 문제 제거 */
        scroll.scrollTo({ top: target, behavior: instant ? 'instant' : 'smooth' });
    }
}

/* ════════════════════════════════════════════
   INIT
════════════════════════════════════════════ */
function setGreet() {
    const h = new Date().getHours();
    document.getElementById('greet-h').textContent =
        h < 6 ? '좋은 새벽이에요 🌙' : h < 12 ? '좋은 아침이에요 ☀️' : h < 18 ? '좋은 오후예요 🎵' : h < 22 ? '좋은 저녁이에요 🌆' : '좋은 밤이에요 🌙';
}
setGreet();
updateBarVisibility();
renderFavSide();
setTimeout(() => { loadRec('pop music 2024 official', 'rec-row'); loadRec('kpop 2024 mv official', 'hot-row'); }, 700);
setTimeout(() => toast('✦ SYNC에 오신 걸 환영해요'), 1000);