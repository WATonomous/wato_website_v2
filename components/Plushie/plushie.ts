// The Pioneer plushie, sculpted in code: every part is a "superellipsoid" (a sphere that can be
// squared off, which reads as a stuffed fleece pillow), dressed in a fleece material (sheen plus a
// fine pile normal map) and posed on pivots so it can breathe, look at the cursor, hop and wave.
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

const sgnPow = (v: number, e: number) => Math.sign(v) * Math.pow(Math.abs(v), e);

/**
 * Superellipsoid with radii (a, b, c) along x, y (up), z. e1 squares it top to bottom, e2 round
 * the waist: 1 is an ellipsoid, ~0.4 a soft cushion. Normals are analytic, so no seam shading.
 */
function pillow(a: number, b: number, c: number, e1 = 0.6, e2 = 0.6, seg = 40) {
    const pos: number[] = [];
    const nrm: number[] = [];
    const uv: number[] = [];
    const idx: number[] = [];
    const rows = Math.round(seg * 0.6);
    for (let i = 0; i <= rows; i++) {
        const v = -Math.PI / 2 + (Math.PI * i) / rows;
        const cv = Math.cos(v), sv = Math.sin(v);
        for (let j = 0; j <= seg; j++) {
            const u = -Math.PI + (2 * Math.PI * j) / seg;
            const cu = Math.cos(u), su = Math.sin(u);
            pos.push(
                a * sgnPow(cv, e1) * sgnPow(cu, e2),
                b * sgnPow(sv, e1),
                c * sgnPow(cv, e1) * sgnPow(su, e2)
            );
            const n = new THREE.Vector3(
                (sgnPow(cv, 2 - e1) * sgnPow(cu, 2 - e2)) / a,
                sgnPow(sv, 2 - e1) / b,
                (sgnPow(cv, 2 - e1) * sgnPow(su, 2 - e2)) / c
            );
            if (n.lengthSq() < 1e-12) n.set(0, Math.sign(sv) || 1, 0);
            n.normalize();
            nrm.push(n.x, n.y, n.z);
            uv.push((j / seg) * 3, (i / rows) * 2);
        }
    }
    const w = seg + 1;
    for (let i = 0; i < rows; i++)
        for (let j = 0; j < seg; j++) {
            const p = i * w + j;
            idx.push(p, p + w, p + 1, p + 1, p + w, p + w + 1);
        }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(nrm, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    return g;
}

/** z of the front of an axis-aligned superellipsoid (e1 = e2 = e) at (x, y), or null if outside. */
function frontZ(
    x: number, y: number,
    c: THREE.Vector3, a: number, b: number, cz: number, e: number
) {
    const t = 1 - Math.pow(Math.abs((y - c.y) / b), 2 / e);
    if (t <= 0) return null;
    const r = Math.pow(t, 1) - Math.pow(Math.abs((x - c.x) / a), 2 / e);
    if (r <= 0) return null;
    return c.z + cz * Math.pow(r, e / 2);
}

/** Fleece pile as a tiling normal map: soft random tufts turned into a height field. */
function fleeceNormalMap(size = 256, tufts = 9000, seed = 7) {
    let s = seed;
    const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    const h = new Float32Array(size * size);
    for (let k = 0; k < tufts; k++) {
        const cx = rnd() * size, cy = rnd() * size;
        const r = 1.2 + rnd() * 1.8, amp = 0.5 + rnd() * 0.5;
        for (let dy = -Math.ceil(r); dy <= r; dy++)
            for (let dx = -Math.ceil(r); dx <= r; dx++) {
                const d = Math.hypot(dx, dy) / r;
                if (d > 1) continue;
                const x = (Math.floor(cx + dx) + size) % size;
                const y = (Math.floor(cy + dy) + size) % size;
                h[y * size + x] += amp * (1 - d * d);
            }
    }
    const data = new Uint8Array(size * size * 4);
    const H = (x: number, y: number) => h[((y + size) % size) * size + ((x + size) % size)];
    for (let y = 0; y < size; y++)
        for (let x = 0; x < size; x++) {
            const nx = Math.tanh((H(x - 1, y) - H(x + 1, y)) * 0.8);
            const ny = Math.tanh((H(x, y - 1) - H(x, y + 1)) * 0.8);
            const n = new THREE.Vector3(nx, ny, 1).normalize();
            const o = (y * size + x) * 4;
            data[o] = (n.x * 0.5 + 0.5) * 255;
            data[o + 1] = (n.y * 0.5 + 0.5) * 255;
            data[o + 2] = (n.z * 0.5 + 0.5) * 255;
            data[o + 3] = 255;
        }
    const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(5, 5);
    tex.generateMipmaps = true;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.needsUpdate = true;
    return tex;
}

const COLORS = {
    white: 0xf3efe7,
    grey: 0x4a4b50,
    visor: 0x161619,
    stitch: 0x9a9ca2,
    orange: 0xff7a1c,
};

export interface PlushieCallbacks {
    onReady?: () => void;
}

export class Plushie {
    private renderer: THREE.WebGLRenderer;
    private scene = new THREE.Scene();
    private camera = new THREE.PerspectiveCamera(26, 1, 0.1, 50);
    private root = new THREE.Group(); // turntable
    private body = new THREE.Group(); // hop + squash
    private head = new THREE.Group();
    private torso = new THREE.Group();
    private arms: THREE.Group[] = [];
    private elbows: THREE.Group[] = [];
    private legs: THREE.Group[] = [];
    private disposables: { dispose(): void }[] = [];
    private raf = 0;
    private running = false;
    private clock = new THREE.Clock();
    private t = 0;
    private reducedMotion: boolean;

    // interaction state
    private look = new THREE.Vector2(); // target, -1..1
    private lookNow = new THREE.Vector2();
    private yaw = -0.25;
    private yawVel = 0;
    private dragging = false;
    private lastX = 0;
    private boopAt = -10;
    private waveAt = -10;
    private idleSpin = true;

    constructor(private canvas: HTMLCanvasElement, private cb: PlushieCallbacks = {}) {
        this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setClearColor(0x000000, 0);
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.05;
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.reducedMotion =
            window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

        const pmrem = new THREE.PMREMGenerator(this.renderer);
        const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
        this.scene.environment = env;
        this.scene.environmentIntensity = 0.55;
        pmrem.dispose();
        this.disposables.push(env);

        // Cozy studio: warm key, cool teal rim (the site's accent), soft sky fill.
        const key = new THREE.DirectionalLight(0xffe2c4, 2.4);
        key.position.set(1.6, 5, 2.6);
        key.castShadow = true;
        key.shadow.mapSize.set(1024, 1024);
        key.shadow.radius = 6;
        key.shadow.bias = -0.0005;
        Object.assign(key.shadow.camera, { left: -1.4, right: 1.4, top: 2.4, bottom: -0.4, near: 0.5, far: 10 });
        this.scene.add(key);
        const rim = new THREE.DirectionalLight(0x66ddc8, 1.6);
        rim.position.set(-2.5, 2.2, -2.5);
        this.scene.add(rim);
        this.scene.add(new THREE.HemisphereLight(0xfff4e8, 0x3a3430, 0.9));

        const groundMat = new THREE.ShadowMaterial({ opacity: 0.35 });
        const ground = new THREE.Mesh(new THREE.CircleGeometry(3, 48), groundMat);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);
        this.disposables.push(ground.geometry, groundMat);

        // soft contact shadow under the feet (a radial gradient decal)
        const c = document.createElement("canvas");
        c.width = c.height = 128;
        const g2 = c.getContext("2d")!;
        const grad = g2.createRadialGradient(64, 64, 0, 64, 64, 64);
        grad.addColorStop(0, "rgba(0,0,0,0.55)");
        grad.addColorStop(1, "rgba(0,0,0,0)");
        g2.fillStyle = grad;
        g2.fillRect(0, 0, 128, 128);
        const blobTex = new THREE.CanvasTexture(c);
        const blobMat = new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false });
        const blob = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.8), blobMat);
        blob.rotation.x = -Math.PI / 2;
        blob.position.y = 0.002;
        this.root.add(blob);
        this.disposables.push(blobTex, blobMat, blob.geometry);

        this.camera.position.set(0, 1.2, 6.0);
        this.camera.lookAt(0, 0.92, 0);

        this.root.add(this.body);
        this.scene.add(this.root);
        this.build();
    }

    // ------------------------------------------------------------------ sculpt
    private build() {
        const normalMap = fleeceNormalMap();
        this.disposables.push(normalMap);
        const fleece = (color: number, sheen: number, normal = 0.45) => {
            const m = new THREE.MeshPhysicalMaterial({
                color,
                roughness: 0.95,
                sheen: 1,
                sheenRoughness: 0.55,
                sheenColor: new THREE.Color(sheen),
                normalMap,
                normalScale: new THREE.Vector2(normal, normal),
            });
            this.disposables.push(m);
            return m;
        };
        const white = fleece(COLORS.white, 0xffffff);
        const grey = fleece(COLORS.grey, 0x9aa0a8);
        const visor = fleece(COLORS.visor, 0x5a5a66, 0.8);
        const stitch = fleece(COLORS.stitch, 0xd0d0d0, 0.3);
        const orange = new THREE.MeshPhysicalMaterial({
            color: COLORS.orange,
            roughness: 0.8,
            sheen: 1,
            sheenColor: new THREE.Color(0xffb070),
            emissive: new THREE.Color(0xff5a00),
            emissiveIntensity: 0.25,
            normalMap,
        });
        this.disposables.push(orange);

        const add = (
            parent: THREE.Object3D,
            geo: THREE.BufferGeometry,
            mat: THREE.Material,
            x = 0, y = 0, z = 0
        ) => {
            const m = new THREE.Mesh(geo, mat);
            m.position.set(x, y, z);
            m.castShadow = true;
            m.receiveShadow = true;
            parent.add(m);
            this.disposables.push(geo);
            return m;
        };

        // ---- legs (hip pivots), feet on the floor at y = 0
        const hipY = 0.72;
        for (const s of [-1, 1]) {
            const hip = new THREE.Group();
            hip.position.set(s * 0.135, hipY, 0);
            this.body.add(hip);
            this.legs.push(hip);
            add(hip, pillow(0.135, 0.12, 0.14, 0.55, 0.7), white, 0, -0.09, 0);
            add(hip, pillow(0.128, 0.045, 0.133, 0.5, 0.75), grey, 0, -0.225, 0);
            add(hip, pillow(0.142, 0.135, 0.148, 0.55, 0.7), white, 0, -0.38, 0.005);
            add(hip, pillow(0.138, 0.04, 0.148, 0.5, 0.75), grey, 0, -0.52, 0.01);
            // boot: a puffy white toe with a grey sole
            add(hip, pillow(0.15, 0.085, 0.215, 0.5, 0.7), white, s * 0.008, -0.61, 0.06);
            add(hip, pillow(0.152, 0.03, 0.218, 0.45, 0.7), grey, s * 0.008, -0.69, 0.06);
        }

        // ---- pelvis + torso
        this.torso.position.set(0, 0.78, 0);
        this.body.add(this.torso);
        add(this.body, pillow(0.255, 0.11, 0.18, 0.5, 0.55), white, 0, 0.76, 0);
        add(this.torso, pillow(0.24, 0.025, 0.17, 0.5, 0.55), grey, 0, 0.06, 0); // waist seam
        add(this.torso, pillow(0.305, 0.25, 0.205, 0.42, 0.45), white, 0, 0.3, 0);
        // dark side straps between chest and shoulders
        for (const s of [-1, 1])
            add(this.torso, pillow(0.05, 0.12, 0.17, 0.5, 0.5), grey, s * 0.285, 0.4, 0);
        // chest panel with three orange lights
        add(this.torso, pillow(0.15, 0.07, 0.035, 0.35, 0.35), white, 0, 0.36, 0.195);
        for (const x of [-0.075, 0, 0.075])
            add(this.torso, pillow(0.026, 0.026, 0.014, 1, 1, 20), orange, x, 0.36, 0.228);
        // backpack
        add(this.torso, pillow(0.18, 0.17, 0.06, 0.35, 0.35), white, 0, 0.3, -0.2);
        // collar
        add(this.torso, pillow(0.175, 0.05, 0.15, 0.5, 0.8), grey, 0, 0.56, 0);

        // ---- arms (shoulder pivots) with elbows
        for (const s of [-1, 1]) {
            const sh = new THREE.Group();
            sh.position.set(s * 0.39, 0.46, 0);
            sh.rotation.z = s * 0.12;
            this.torso.add(sh);
            this.arms.push(sh);
            add(sh, pillow(0.135, 0.125, 0.145, 0.6, 0.6), white, s * 0.01, 0, 0); // shoulder pad
            add(sh, pillow(0.118, 0.11, 0.12, 0.55, 0.7), white, 0, -0.15, 0);
            add(sh, pillow(0.112, 0.035, 0.117, 0.5, 0.75), grey, 0, -0.27, 0);
            const el = new THREE.Group();
            el.position.set(0, -0.29, 0);
            el.rotation.x = -0.2;
            sh.add(el);
            this.elbows.push(el);
            add(el, pillow(0.13, 0.13, 0.13, 0.55, 0.65), white, 0, -0.12, 0);
            add(el, pillow(0.118, 0.035, 0.122, 0.5, 0.75), grey, 0, -0.25, 0);
            // mitten hand + thumb
            add(el, pillow(0.09, 0.095, 0.105, 0.7, 0.7), grey, 0, -0.33, 0.01);
            const thumb = add(el, pillow(0.04, 0.06, 0.04, 0.8, 0.8, 20), grey, -s * 0.075, -0.31, 0.065);
            thumb.rotation.z = -s * 0.5;
        }

        // ---- head (neck pivot)
        this.head.position.set(0, 0.6, 0);
        this.torso.add(this.head);
        add(this.head, pillow(0.13, 0.06, 0.12, 0.6, 0.8), grey, 0, 0.02, 0); // neck
        const hc = new THREE.Vector3(0, 0.37, 0);
        const ha = 0.37, hb = 0.355, hcz = 0.35, he = 0.85;
        add(this.head, pillow(ha, hb, hcz, he, he, 64), white, hc.x, hc.y, hc.z);

        // visor: a dark dome pushed out through the face; the white rim follows where it meets the shell
        const vc = new THREE.Vector3(0, hc.y - 0.04, 0.12);
        const va = 0.3, vb = 0.27, vcz = 0.27, ve = 0.7;
        add(this.head, pillow(va, vb, vcz, ve, ve, 64), visor, vc.x, vc.y, vc.z);
        const headZ = (x: number, y: number) => frontZ(x, y, hc, ha, hb, hcz, he);
        const visorZ = (x: number, y: number) => frontZ(x, y, vc, va, vb, vcz, ve);
        const rimPts: THREE.Vector3[] = [];
        for (let k = 0; k < 72; k++) {
            const th = (k / 72) * Math.PI * 2;
            let lo = 0.2, hi = 1;
            for (let it = 0; it < 30; it++) {
                const m = (lo + hi) / 2;
                const x = vc.x + m * va * Math.cos(th), y = vc.y + m * vb * Math.sin(th);
                const hz = headZ(x, y), vz = visorZ(x, y);
                if (vz !== null && hz !== null && vz > hz) lo = m;
                else hi = m;
            }
            const x = vc.x + lo * va * Math.cos(th), y = vc.y + lo * vb * Math.sin(th);
            rimPts.push(new THREE.Vector3(x, y, (headZ(x, y) ?? 0) + 0.004));
        }
        const rimCurve = new THREE.CatmullRomCurve3(rimPts, true);
        add(this.head, new THREE.TubeGeometry(rimCurve, 160, 0.034, 16, true), white);

        // embroidered tick on the forehead
        const tick = [
            [-0.1, 0.035], [-0.06, 0.0], [-0.025, -0.025], [0.04, -0.005], [0.13, 0.035],
        ].map(([x, dy]) => {
            const y = hc.y + 0.24 + dy;
            return new THREE.Vector3(x, y, (headZ(x, y) ?? 0) - 0.004);
        });
        add(this.head, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(tick), 48, 0.011, 8), stitch);

        // stitched glint on the visor's left
        const glint: THREE.Vector3[] = [];
        for (let k = 0; k < 40; k++) {
            const th = (k / 40) * Math.PI * 2;
            const x = vc.x - 0.17 + 0.026 * Math.cos(th), y = vc.y + 0.05 + 0.08 * Math.sin(th);
            glint.push(new THREE.Vector3(x, y, (visorZ(x, y) ?? 0) + 0.002));
        }
        add(this.head, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(glint, true), 60, 0.009, 8, true), stitch);
        const gl = add(this.head, pillow(0.02, 0.07, 0.01, 1, 1, 20), stitch, vc.x - 0.17, vc.y + 0.05, (visorZ(vc.x - 0.17, vc.y + 0.05) ?? 0) - 0.003);
        gl.rotation.y = -0.45;

        // ear discs
        for (const s of [-1, 1]) {
            const ear = add(this.head, pillow(0.03, 0.075, 0.075, 1, 0.35, 32), white, s * (ha - 0.005), hc.y - 0.02, 0.02);
            ear.rotation.y = s * 0.08;
        }
        // seam down the back of the helmet
        const seam: THREE.Vector3[] = [];
        for (let k = 0; k <= 30; k++) {
            const a = -0.2 + (k / 30) * 1.75;
            seam.push(new THREE.Vector3(0, hc.y + Math.sin(a) * hb * 1.002, -Math.cos(a) * hcz * 1.002));
        }
        add(this.head, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(seam), 60, 0.006, 6), stitch);
    }

    // ------------------------------------------------------------------ interaction
    setSize(w: number, h: number) {
        this.renderer.setSize(w, h, false);
        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();
    }

    /** Cursor in -1..1 over the canvas (or null when it leaves). */
    lookAt(p: { x: number; y: number } | null) {
        if (p) this.look.set(p.x, p.y);
        else this.look.set(0, 0);
    }

    dragStart(x: number) {
        this.dragging = true;
        this.idleSpin = false;
        this.lastX = x;
        this.yawVel = 0;
    }
    dragMove(x: number) {
        if (!this.dragging) return;
        const dx = x - this.lastX;
        this.lastX = x;
        this.yaw += dx * 0.012;
        this.yawVel = dx * 0.012;
    }
    dragEnd() {
        this.dragging = false;
    }

    /** A squeeze: squash, hop and a wave. */
    boop() {
        this.boopAt = this.t;
        this.waveAt = this.t + 0.25;
    }

    // ------------------------------------------------------------------ loop
    start() {
        if (this.running) return;
        this.running = true;
        this.clock.getDelta();
        const loop = () => {
            if (!this.running) return;
            this.raf = requestAnimationFrame(loop);
            this.frame(Math.min(this.clock.getDelta(), 0.05));
        };
        loop();
    }
    stop() {
        this.running = false;
        cancelAnimationFrame(this.raf);
    }

    /** One frame at time t (for stills: pose then render). */
    frame(dt: number) {
        this.t += dt;
        const t = this.t;
        const calm = this.reducedMotion ? 0 : 1;

        // turntable: drift slowly back toward a 3/4 view, with fling inertia
        if (!this.dragging) {
            this.yaw += this.yawVel;
            this.yawVel *= 0.92;
            if (Math.abs(this.yawVel) < 0.002) {
                const rest = -0.25;
                const d = Math.atan2(Math.sin(rest - this.yaw), Math.cos(rest - this.yaw));
                this.yaw += d * (this.idleSpin ? 0.02 : 0.01);
            }
        }
        this.root.rotation.y = this.yaw;

        // breathing + gentle sway
        const breathe = Math.sin(t * 2.1) * 0.012 * calm;
        this.torso.scale.set(1 + breathe * 0.5, 1 + breathe, 1 + breathe * 0.5);
        this.body.rotation.z = Math.sin(t * 0.9) * 0.025 * calm;

        // squeeze: squash, hop, settle
        const b = t - this.boopAt;
        let sy = 1, hop = 0;
        if (b >= 0 && b < 1.1 && calm) {
            if (b < 0.14) sy = 1 - 0.14 * (b / 0.14);
            else if (b < 0.6) {
                const u = (b - 0.14) / 0.46;
                hop = Math.sin(u * Math.PI) * 0.16;
                sy = 0.86 + 0.24 * Math.sin(Math.min(u * 2, 1) * Math.PI * 0.5) - 0.1 * u;
            } else {
                const u = (b - 0.6) / 0.5;
                sy = 1 + Math.sin(u * Math.PI * 2) * 0.05 * (1 - u);
            }
        }
        this.body.position.y = hop;
        this.body.scale.set(1 + (1 - sy) * 0.6, sy, 1 + (1 - sy) * 0.6);

        // head follows the cursor
        this.lookNow.lerp(this.look, 0.08);
        this.head.rotation.y = this.lookNow.x * 0.45;
        this.head.rotation.x = -this.lookNow.y * 0.25 + Math.sin(t * 1.3) * 0.02 * calm;
        this.head.rotation.z = Math.sin(t * 0.7) * 0.04 * calm - this.lookNow.x * 0.06;

        // arms hang with a little swing; the right arm waves after a squeeze
        const w = t - this.waveAt;
        const waving = w >= 0 && w < 1.8 && calm;
        for (let i = 0; i < 2; i++) {
            const s = i === 0 ? -1 : 1;
            const sh = this.arms[i];
            const el = this.elbows[i];
            const swing = Math.sin(t * 1.4 + i * 1.7) * 0.04 * calm;
            const x = swing;
            let z = s * 0.12, ex = -0.2;
            if (waving && s === 1) {
                const env = Math.min(w / 0.25, 1) * Math.min((1.8 - w) / 0.3, 1);
                z = s * (0.12 + 2.3 * env);
                ex = -0.2 - 0.6 * env;
                el.rotation.z = env * Math.sin(w * 14) * 0.45;
            } else el.rotation.z *= 0.85;
            sh.rotation.z += (z - sh.rotation.z) * 0.25;
            sh.rotation.x += (x - sh.rotation.x) * 0.25;
            el.rotation.x += (ex - el.rotation.x) * 0.25;
        }
        for (let i = 0; i < 2; i++)
            this.legs[i].rotation.z = (i === 0 ? -1 : 1) * 0.02;

        this.renderer.render(this.scene, this.camera);
    }

    async warm() {
        await this.renderer.compileAsync(this.scene, this.camera);
        this.frame(0);
        this.cb.onReady?.();
    }

    /** Set the turntable angle directly (stills). */
    setYaw(y: number) {
        this.yaw = y;
        this.yawVel = 0;
        this.idleSpin = false;
    }

    dispose() {
        this.stop();
        this.disposables.forEach((d) => d.dispose());
        this.scene.environment = null;
        this.renderer.dispose();
    }
}
