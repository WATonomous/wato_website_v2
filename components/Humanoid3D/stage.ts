import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { PioneerRobot, Joint, prettyJoint } from "./robot";
import { MOVE_BY_ID, Move, Pose, REST } from "./moves";

export const TEAL = new THREE.Color("#66DDC8");

export interface HoverInfo {
    joint: string;
    label: string;
    value: number;
    lower: number;
    upper: number;
    x: number;
    y: number;
    dragging: boolean;
}

export type RenderMode = "studio" | "hologram";

interface StageCallbacks {
    onProgress?: (p: number) => void;
    onReady?: (robot: PioneerRobot) => void;
    onHover?: (info: HoverInfo | null) => void;
    onMoveEnd?: (id: string) => void;
    onError?: (err: unknown) => void;
}

const FLOOR_VERT = /* glsl */ `
varying vec2 vUv;
void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const FLOOR_FRAG = /* glsl */ `
uniform float uTime;
uniform vec3 uColor;
uniform float uPulse;
varying vec2 vUv;
float gridLine(vec2 p, float scale) {
    vec2 g = abs(fract(p * scale - 0.5) - 0.5) / fwidth(p * scale);
    return 1.0 - min(min(g.x, g.y), 1.0);
}
void main() {
    vec2 p = (vUv - 0.5) * 2.0;
    float r = length(p);
    float fade = smoothstep(1.0, 0.15, r);
    float grid = gridLine(p * 6.0, 1.0) * 0.35 + gridLine(p * 6.0, 4.0) * 0.08;
    float ring = smoothstep(0.012, 0.0, abs(r - 0.16)) * 0.6;
    float ring2 = smoothstep(0.006, 0.0, abs(r - 0.21)) * 0.5;
    float wave = fract(uTime * 0.25);
    float sweep = smoothstep(0.03, 0.0, abs(r - wave)) * (1.0 - wave) * 0.6;
    float pulse = smoothstep(0.05, 0.0, abs(r - uPulse)) * (1.0 - uPulse) * step(0.0, uPulse) * 0.8;
    float glow = smoothstep(0.35, 0.0, r) * 0.18;
    float a = (grid + ring + ring2 + sweep + pulse) * fade + glow;
    gl_FragColor = vec4(uColor * a, a);
}`;

const HOLO_VERT = /* glsl */ `
varying vec3 vN;
varying vec3 vV;
varying float vY;
void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vY = wp.y;
    vN = normalize(mat3(modelMatrix) * normal);
    vV = normalize(cameraPosition - wp.xyz);
    gl_Position = projectionMatrix * viewMatrix * wp;
}`;

const HOLO_FRAG = /* glsl */ `
uniform vec3 uColor;
uniform float uTime;
varying vec3 vN;
varying vec3 vV;
varying float vY;
void main() {
    float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.2);
    float scan = 0.5 + 0.5 * sin(vY * 140.0 - uTime * 6.0);
    float band = smoothstep(0.04, 0.0, abs(fract(vY * 0.6 - uTime * 0.35) - 0.5));
    float a = f * 0.9 + scan * 0.05 + band * 0.35 + 0.03;
    gl_FragColor = vec4(uColor * (0.6 + f + band), a);
}`;

export class Stage {
    renderer: THREE.WebGLRenderer;
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(30, 1, 0.05, 50);
    controls: OrbitControls;
    robot?: PioneerRobot;

    // pose state
    private manual: Pose = {};
    private move?: Move;
    private moveT = 0;
    private lookTarget = new THREE.Vector2();
    private look = new THREE.Vector2();
    private external: Pose | null = null; // e.g. webcam teleop
    followCursor = true;

    // view state
    private heroOffset = 0; // 0 = centered, 1 = robot pushed right for the hero layout
    private heroOffsetTarget = 0;
    private explode = 0;
    explodeTarget = 0;
    private mode: RenderMode = "studio";
    private studioMats = new Map<THREE.Mesh, THREE.Material>();
    private holoMat: THREE.ShaderMaterial;
    private glowMat: THREE.MeshStandardMaterial;
    private floorMat: THREE.ShaderMaterial;
    private dust: THREE.Points;
    private keyLight: THREE.DirectionalLight;
    private discoLights: THREE.PointLight[] = [];
    private disco = 0;

    // interaction
    private raycaster = new THREE.Raycaster();
    private pointer = new THREE.Vector2();
    private hovered?: Joint;
    private drag?: {
        joint: Joint;
        local: THREE.Vector3; // grabbed point in the child link frame
        lastX: number;
        lastY: number;
        pointerId: number;
    };
    interactive = true;
    // camera director: glide in on a move's focus links, then back to where the visitor left it
    private savedView?: { target: THREE.Vector3; dist: number };
    private viewGoal?: { target: THREE.Vector3; dist: number };

    private clock = new THREE.Clock();
    private raf = 0;
    private running = false;
    private visible = true;
    private disposed = false;
    private reducedMotion = false;
    private resizeObs: ResizeObserver;
    private highlightCache = new Map<Joint, THREE.Mesh[]>();

    constructor(
        private canvas: HTMLCanvasElement,
        private host: HTMLElement,
        private cb: StageCallbacks = {}
    ) {
        this.renderer = new THREE.WebGLRenderer({
            canvas,
            antialias: true,
            alpha: true,
            powerPreference: "high-performance",
        });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 0.9;
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.reducedMotion =
            window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ??
            false;

        const pmrem = new THREE.PMREMGenerator(this.renderer);
        this.scene.environment = pmrem.fromScene(
            new RoomEnvironment(),
            0.04
        ).texture;
        this.scene.environmentIntensity = 0.3;
        pmrem.dispose();

        this.camera.position.set(1.1, 1.35, 5.6);
        this.controls = new OrbitControls(this.camera, canvas);
        this.controls.target.set(0, 0.86, 0);
        this.controls.enableDamping = true;
        this.controls.enablePan = false;
        this.controls.minDistance = 1.2;
        this.controls.maxDistance = 7;
        this.controls.minPolarAngle = 0.25;
        this.controls.maxPolarAngle = Math.PI / 2 + 0.05;
        this.controls.enableZoom = false;
        this.controls.update();

        // Lights: warm key with shadows, teal rim from behind, WATO-blue fill.
        this.keyLight = new THREE.DirectionalLight(0xfff4e8, 1.7);
        this.keyLight.position.set(2.2, 4, 3);
        this.keyLight.castShadow = true;
        this.keyLight.shadow.mapSize.set(2048, 2048);
        const sc = this.keyLight.shadow.camera;
        sc.left = -1.2;
        sc.right = 1.2;
        sc.top = 2.2;
        sc.bottom = -0.4;
        sc.near = 1;
        sc.far = 10;
        this.keyLight.shadow.bias = -0.0004;
        this.keyLight.shadow.normalBias = 0.02;
        this.scene.add(this.keyLight);
        const rim = new THREE.DirectionalLight(TEAL, 6);
        rim.position.set(-2.5, 2.5, -3);
        this.scene.add(rim);
        const rim2 = new THREE.DirectionalLight(0x4a7eb3, 4);
        rim2.position.set(3, 1.5, -2.5);
        this.scene.add(rim2);
        this.scene.add(new THREE.HemisphereLight(0x9fb8d0, 0x101418, 0.35));

        for (const c of [0xff3fa4, 0x66ddc8, 0x5b7cff, 0xffc94a]) {
            const l = new THREE.PointLight(c, 0, 4, 1.5);
            this.discoLights.push(l);
            this.scene.add(l);
        }

        // Floor: glowing grid disc + a shadow catcher.
        this.floorMat = new THREE.ShaderMaterial({
            vertexShader: FLOOR_VERT,
            fragmentShader: FLOOR_FRAG,
            uniforms: {
                uTime: { value: 0 },
                uColor: { value: TEAL.clone() },
                uPulse: { value: -1 },
            },
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
        });
        const floor = new THREE.Mesh(
            new THREE.PlaneGeometry(8, 8),
            this.floorMat
        );
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = 0.001;
        this.scene.add(floor);
        const shadow = new THREE.Mesh(
            new THREE.CircleGeometry(2.5, 64),
            new THREE.ShadowMaterial({ opacity: 0.45 })
        );
        shadow.rotation.x = -Math.PI / 2;
        shadow.receiveShadow = true;
        this.scene.add(shadow);

        // Floating dust motes.
        const n = 260;
        const pos = new Float32Array(n * 3);
        for (let i = 0; i < n; i++) {
            const r = 0.6 + Math.random() * 2.6;
            const a = Math.random() * Math.PI * 2;
            pos.set(
                [Math.cos(a) * r, Math.random() * 2.6, Math.sin(a) * r - 0.4],
                i * 3
            );
        }
        const dg = new THREE.BufferGeometry();
        dg.setAttribute("position", new THREE.BufferAttribute(pos, 3));
        this.dust = new THREE.Points(
            dg,
            new THREE.PointsMaterial({
                color: TEAL,
                size: 0.012,
                transparent: true,
                opacity: 0.55,
                depthWrite: false,
                blending: THREE.AdditiveBlending,
            })
        );
        this.scene.add(this.dust);

        this.holoMat = new THREE.ShaderMaterial({
            vertexShader: HOLO_VERT,
            fragmentShader: HOLO_FRAG,
            uniforms: { uColor: { value: TEAL.clone() }, uTime: { value: 0 } },
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            side: THREE.DoubleSide,
        });
        this.glowMat = new THREE.MeshStandardMaterial({
            color: 0x0b1d1a,
            emissive: TEAL,
            emissiveIntensity: 2.2,
            roughness: 0.2,
        });

        canvas.addEventListener("pointermove", this.onPointerMove);
        canvas.addEventListener("pointerdown", this.onPointerDown, {
            capture: true,
        });
        window.addEventListener("pointerup", this.onPointerUp);
        canvas.addEventListener("pointerleave", this.onPointerLeave);
        window.addEventListener("pointermove", this.onWindowPointer, {
            passive: true,
        });
        document.addEventListener("visibilitychange", this.onVisibility);

        this.resizeObs = new ResizeObserver(() => this.resize());
        this.resizeObs.observe(host);
        this.resize();
    }

    async load(url: string) {
        try {
            const robot = await PioneerRobot.load(url, this.cb.onProgress);
            if (this.disposed) return;
            this.robot = robot;
            const base = new THREE.MeshStandardMaterial({
                vertexColors: true,
                metalness: 0.45,
                roughness: 0.42,
                envMapIntensity: 1,
            });
            for (const m of robot.meshes) {
                const mat = base.clone();
                m.material = mat;
                this.studioMats.set(m, mat);
            }
            for (const m of robot.glowMeshes) {
                m.material = this.glowMat;
                m.castShadow = false;
            }
            for (const [k, v] of Object.entries(REST)) robot.set(k, v);
            robot.ground();
            this.scene.add(robot.hips);
            this.pulse();
            this.cb.onReady?.(robot);
        } catch (e) {
            this.cb.onError?.(e);
        }
    }

    start() {
        if (this.running) return;
        this.running = true;
        this.clock.getDelta();
        const loop = () => {
            if (!this.running) return;
            this.raf = requestAnimationFrame(loop);
            if (this.visible && !document.hidden) this.tick();
        };
        loop();
    }

    setVisible(v: boolean) {
        this.visible = v;
    }

    dispose() {
        this.disposed = true;
        this.running = false;
        cancelAnimationFrame(this.raf);
        this.resizeObs.disconnect();
        this.canvas.removeEventListener("pointermove", this.onPointerMove);
        this.canvas.removeEventListener("pointerdown", this.onPointerDown, {
            capture: true,
        } as any);
        window.removeEventListener("pointerup", this.onPointerUp);
        this.canvas.removeEventListener("pointerleave", this.onPointerLeave);
        window.removeEventListener("pointermove", this.onWindowPointer);
        document.removeEventListener("visibilitychange", this.onVisibility);
        this.controls.dispose();
        this.scene.traverse((o) => {
            const m = o as THREE.Mesh;
            if (m.geometry) m.geometry.dispose();
        });
        this.studioMats.forEach((m) => m.dispose());
        this.holoMat.dispose();
        this.glowMat.dispose();
        this.floorMat.dispose();
        this.scene.environment?.dispose();
        this.renderer.dispose();
    }

    // ---------------------------------------------------------------- public controls

    play(id: string) {
        const m = MOVE_BY_ID[id];
        if (!m) return;
        this.move = m;
        this.moveT = 0;
        this.pulse();
    }

    stopMove() {
        const id = this.move?.id;
        this.move = undefined;
        if (id) this.cb.onMoveEnd?.(id);
    }

    get activeMove() {
        return this.move?.id;
    }

    resetPose() {
        this.manual = {};
        this.stopMove();
        this.explodeTarget = 0;
        this.pulse();
    }

    setExternalPose(p: Pose | null) {
        this.external = p;
    }

    setHeroLayout(hero: boolean) {
        this.heroOffsetTarget = hero ? 1 : 0;
    }

    setZoom(enabled: boolean) {
        this.controls.enableZoom = enabled;
    }

    setDisco(on: boolean) {
        this.disco = on ? 1 : 0;
    }

    setMode(mode: RenderMode) {
        if (!this.robot || mode === this.mode) return;
        this.mode = mode;
        for (const m of this.robot.meshes) {
            m.material =
                mode === "hologram" ? this.holoMat : this.studioMats.get(m)!;
            m.castShadow = mode === "studio";
        }
        this.keyLight.castShadow = mode === "studio";
        this.pulse();
    }

    pulse() {
        (this.floorMat.uniforms.uPulse as { value: number }).value = 0;
    }

    // ---------------------------------------------------------------- frame

    private tmpV = new THREE.Vector3();
    private tmpV2 = new THREE.Vector3();

    private tick() {
        const dt = Math.min(this.clock.getDelta(), 0.1);
        const t = this.clock.elapsedTime;
        const robot = this.robot;

        this.floorMat.uniforms.uTime.value = t;
        const pu = this.floorMat.uniforms.uPulse as { value: number };
        if (pu.value >= 0) pu.value = pu.value > 1 ? -1 : pu.value + dt * 0.9;
        this.holoMat.uniforms.uTime.value = t;
        this.dust.rotation.y = t * 0.02;
        this.glowMat.emissiveIntensity =
            1.8 + 0.5 * Math.sin(t * 2.2) + (this.drag ? 1 : 0);

        // Disco lights orbit when dancing.
        const discoOn = this.disco || this.move?.id === "dance" ? 1 : 0;
        this.discoLights.forEach((l, i) => {
            const a = t * 1.7 + (i * Math.PI) / 2;
            l.position.set(
                Math.cos(a) * 1.4,
                1.2 + 0.6 * Math.sin(t * 2.3 + i),
                Math.sin(a) * 1.4
            );
            l.intensity += (discoOn * 6 - l.intensity) * Math.min(1, dt * 3);
        });

        this.heroOffset +=
            (this.heroOffsetTarget - this.heroOffset) * Math.min(1, dt * 3);
        // Hero framing: robot to the right of the copy on desktop, above it on phones.
        const w = this.host.clientWidth;
        const h = this.host.clientHeight;
        const wide = w > 1024;
        this.camera.setViewOffset(
            w,
            h,
            (wide ? -0.2 * w : 0) * this.heroOffset,
            (wide ? 0 : 0.21 * h) * this.heroOffset,
            w,
            h
        );

        if (robot) {
            if (this.move) {
                this.moveT += dt;
                if (
                    this.move.duration !== undefined &&
                    this.moveT > this.move.duration
                )
                    this.stopMove();
            }
            const target: Pose = { ...REST, ...this.manual };
            const moving = this.move;
            if (moving) Object.assign(target, moving.pose(this.moveT));
            if (this.external) Object.assign(target, this.external);

            // Idle life: breathing + head follows the cursor.
            if (!this.reducedMotion) {
                target.waist_yaw =
                    (target.waist_yaw ?? 0) + 0.025 * Math.sin(t * 0.7);
                target.r_shoulder_roll =
                    (target.r_shoulder_roll ?? 0) + 0.015 * Math.sin(t * 1.3);
                target.l_shoulder_roll =
                    (target.l_shoulder_roll ?? 0) +
                    0.015 * Math.sin(t * 1.3 + 1);
            }
            this.look.lerp(this.lookTarget, Math.min(1, dt * 4));
            const headFree =
                this.followCursor &&
                !(moving && moving.ownsHead) &&
                !("neck_yaw" in this.manual);
            if (headFree) {
                target.neck_yaw = (target.neck_yaw ?? 0) + this.look.x * 0.9;
                target.neck_pitch =
                    (target.neck_pitch ?? 0) - this.look.y * 0.32;
                if (!moving)
                    target.waist_yaw =
                        (target.waist_yaw ?? 0) + this.look.x * 0.18;
            }

            const fast = moving || this.external ? 16 : 7;
            const k = 1 - Math.exp(-dt * fast);
            robot.joints.forEach((j, name) => {
                if (this.drag?.joint === j) return;
                const goal = target[name] ?? 0;
                if (Math.abs(goal - j.value) > 1e-5)
                    robot.set(name, j.value + (goal - j.value) * k);
            });

            this.explode +=
                (this.explodeTarget - this.explode) * Math.min(1, dt * 4);
            robot.setExplode(this.explode);
            robot.hips.position.y = this.explode * 0.12;
            if (this.explode < 0.01) robot.ground();

            this.direct(dt);

            if (this.drag)
                this.emitHover(
                    this.drag.joint,
                    this.drag.lastX,
                    this.drag.lastY,
                    true
                );
        }

        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }

    private direct(dt: number) {
        const robot = this.robot!;
        const focus =
            this.heroOffsetTarget === 0 && this.explode < 0.05
                ? this.move?.focus
                : undefined;
        const dist = () =>
            this.camera.position.distanceTo(this.controls.target);
        if (focus) {
            if (!this.savedView)
                this.savedView = {
                    target: this.controls.target.clone(),
                    dist: dist(),
                };
            const c = new THREE.Vector3();
            for (const l of focus)
                c.add(robot.links.get(l)!.getWorldPosition(this.tmpV));
            this.viewGoal = {
                target: c.divideScalar(focus.length),
                dist: focus.length > 1 ? 2.1 : 1.7,
            };
        } else if (this.savedView) {
            this.viewGoal = this.savedView;
            this.savedView = undefined;
        }
        const goal = this.viewGoal;
        if (!goal) return;
        const k = Math.min(1, dt * 2.5);
        const offset = this.camera.position.clone().sub(this.controls.target);
        this.controls.target.lerp(goal.target, k);
        const d = THREE.MathUtils.lerp(offset.length(), goal.dist, k);
        this.camera.position
            .copy(this.controls.target)
            .add(offset.setLength(d));
        if (
            !focus &&
            this.controls.target.distanceTo(goal.target) < 0.005 &&
            Math.abs(d - goal.dist) < 0.01
        ) {
            this.viewGoal = undefined;
        }
    }

    private resize() {
        const w = this.host.clientWidth;
        const h = this.host.clientHeight;
        if (!w || !h) return;
        this.renderer.setSize(w, h, false);
        this.camera.aspect = w / h;
        // Keep the whole robot in frame on tall/narrow screens.
        this.camera.fov = w / h < 0.8 ? 42 : 30;
        this.camera.updateProjectionMatrix();
    }

    // ---------------------------------------------------------------- picking + posing

    private setPointer(e: PointerEvent) {
        const r = this.canvas.getBoundingClientRect();
        this.pointer.set(
            ((e.clientX - r.left) / r.width) * 2 - 1,
            -((e.clientY - r.top) / r.height) * 2 + 1
        );
    }

    private pick(): {
        joint: Joint;
        point: THREE.Vector3;
        link: string;
    } | null {
        if (!this.robot) return null;
        this.raycaster.setFromCamera(this.pointer, this.camera);
        const hits = this.raycaster.intersectObjects(this.robot.meshes, false);
        for (const h of hits) {
            const link = h.object.userData.link as string;
            const joint = this.robot.linkJoint.get(link);
            if (joint) return { joint, point: h.point, link };
        }
        return null;
    }

    private subtreeMeshes(j: Joint): THREE.Mesh[] {
        let list = this.highlightCache.get(j);
        if (!list) {
            list = [];
            j.pivot.traverse((o) => {
                if (
                    (o as THREE.Mesh).isMesh &&
                    this.studioMats.has(o as THREE.Mesh)
                )
                    list!.push(o as THREE.Mesh);
            });
            this.highlightCache.set(j, list);
        }
        return list;
    }

    private setHighlight(j?: Joint) {
        if (this.hovered === j) return;
        const paint = (jj: Joint | undefined, on: boolean) => {
            if (!jj) return;
            for (const m of this.subtreeMeshes(jj)) {
                const mat = this.studioMats.get(
                    m
                ) as THREE.MeshStandardMaterial;
                mat.emissive.copy(on ? TEAL : new THREE.Color(0));
                mat.emissiveIntensity = on ? 0.35 : 0;
            }
        };
        paint(this.hovered, false);
        paint(j, true);
        this.hovered = j;
        this.canvas.style.cursor = j ? (this.drag ? "grabbing" : "grab") : "";
    }

    private emitHover(j: Joint, x: number, y: number, dragging: boolean) {
        const r = this.canvas.getBoundingClientRect();
        this.cb.onHover?.({
            joint: j.name,
            label: prettyJoint(j.name),
            value: j.value,
            lower: j.lower,
            upper: j.upper,
            x: x - r.left,
            y: y - r.top,
            dragging,
        });
    }

    private onWindowPointer = (e: PointerEvent) => {
        if (e.pointerType === "touch") return;
        // Normalised cursor relative to the robot's head, used for gaze.
        const r = this.canvas.getBoundingClientRect();
        if (r.bottom < 0 || r.top > window.innerHeight) return;
        const head = this.headScreen();
        const x = (e.clientX - (r.left + head.x)) / (r.width * 0.5);
        const y = (e.clientY - (r.top + head.y)) / (r.height * 0.5);
        this.lookTarget.set(
            THREE.MathUtils.clamp(x, -1.2, 1.2),
            THREE.MathUtils.clamp(-y, -1, 1)
        );
    };

    private headScreen() {
        const r = this.canvas.getBoundingClientRect();
        const head = this.robot?.links.get("head");
        if (!head) return { x: r.width / 2, y: r.height * 0.3 };
        head.getWorldPosition(this.tmpV).project(this.camera);
        return {
            x: (this.tmpV.x * 0.5 + 0.5) * r.width,
            y: (-this.tmpV.y * 0.5 + 0.5) * r.height,
        };
    }

    private onPointerMove = (e: PointerEvent) => {
        if (!this.interactive || !this.robot) return;
        this.setPointer(e);
        if (this.drag && e.pointerId === this.drag.pointerId) {
            this.dragTo(e.clientX, e.clientY);
            return;
        }
        if (e.pointerType === "touch" || e.buttons) return;
        const hit = this.pick();
        this.setHighlight(hit?.joint);
        if (hit) this.emitHover(hit.joint, e.clientX, e.clientY, false);
        else this.cb.onHover?.(null);
    };

    private onPointerDown = (e: PointerEvent) => {
        if (!this.interactive || !this.robot || e.button !== 0) return;
        this.setPointer(e);
        const hit = this.pick();
        if (!hit) return; // let OrbitControls rotate the camera
        e.stopImmediatePropagation(); // don't orbit while posing
        e.preventDefault();
        this.canvas.setPointerCapture?.(e.pointerId);
        const childLink = this.robot.links.get(hit.joint.child)!;
        this.drag = {
            joint: hit.joint,
            local: childLink.worldToLocal(hit.point.clone()),
            lastX: e.clientX,
            lastY: e.clientY,
            pointerId: e.pointerId,
        };
        if (this.move) this.stopMove();
        this.setHighlight(hit.joint);
        this.canvas.style.cursor = "grabbing";
        this.emitHover(hit.joint, e.clientX, e.clientY, true);
    };

    private onPointerUp = (e: PointerEvent) => {
        if (!this.drag || e.pointerId !== this.drag.pointerId) return;
        this.manual[this.drag.joint.name] = this.drag.joint.value;
        this.drag = undefined;
        this.canvas.style.cursor = this.hovered ? "grab" : "";
        if (e.pointerType === "touch") {
            this.setHighlight(undefined);
            this.cb.onHover?.(null);
        }
    };

    private onPointerLeave = () => {
        if (this.drag) return;
        this.setHighlight(undefined);
        this.cb.onHover?.(null);
    };

    private onVisibility = () => {
        this.clock.getDelta();
    };

    /** Rotate the grabbed joint so the grabbed point follows the cursor (projected onto its arc). */
    private dragTo(cx: number, cy: number) {
        const d = this.drag!;
        const robot = this.robot!;
        const j = d.joint;
        const dx = cx - d.lastX;
        const dy = cy - d.lastY;
        d.lastX = cx;
        d.lastY = cy;
        const r = this.canvas.getBoundingClientRect();

        const pivot = new THREE.Vector3();
        const axis = new THREE.Vector3();
        robot.jointWorld(j, pivot, axis);
        const p = robot.links.get(j.child)!.localToWorld(d.local.clone());
        // Tangent of the grabbed point's arc, and where a small rotation moves it on screen.
        const tangent = this.tmpV
            .copy(axis)
            .cross(this.tmpV2.copy(p).sub(pivot));
        const eps = 0.02;
        const toScreen = (v: THREE.Vector3) => {
            const s = v.clone().project(this.camera);
            return new THREE.Vector2(
                (s.x * 0.5 + 0.5) * r.width,
                (-s.y * 0.5 + 0.5) * r.height
            );
        };
        const s0 = toScreen(p);
        const s1 = toScreen(p.clone().addScaledVector(tangent, eps));
        const sv = s1.sub(s0);
        let dTheta: number;
        if (sv.lengthSq() > 4) {
            dTheta = ((dx * sv.x + dy * sv.y) / sv.lengthSq()) * eps;
        } else {
            // Axis points at the camera: twist around the pivot's screen position instead.
            const c = toScreen(pivot);
            const a0 = Math.atan2(
                cy - dy - r.top - c.y,
                cx - dx - r.left - c.x
            );
            const a1 = Math.atan2(cy - r.top - c.y, cx - r.left - c.x);
            let da = a1 - a0;
            if (da > Math.PI) da -= Math.PI * 2;
            if (da < -Math.PI) da += Math.PI * 2;
            const toCam = this.camera.position.clone().sub(pivot).normalize();
            dTheta = -da * Math.sign(axis.dot(toCam) || 1);
        }
        dTheta = THREE.MathUtils.clamp(dTheta, -0.25, 0.25);
        robot.set(j.name, j.value + dTheta);
        this.manual[j.name] = j.value;
    }
}
