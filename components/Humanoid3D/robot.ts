import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import kinematics from "./kinematics.json";
export { prettyJoint, jointGroup } from "./names";

export interface JointSpec {
    name: string;
    type: string;
    parent: string;
    child: string;
    xyz: number[];
    rpy: number[];
    axis: number[];
    lower: number;
    upper: number;
}

export interface Joint extends JointSpec {
    pivot: THREE.Object3D; // rotates about `axisVec` (in the parent link frame)
    axisVec: THREE.Vector3;
    value: number;
}

const SPEC = kinematics as {
    root: string;
    links: string[];
    joints: JointSpec[];
};

export const JOINT_SPECS = SPEC.joints;

export class PioneerRobot {
    /** Y-up root; the URDF is Z-up so we rotate it in here. */
    root = new THREE.Group();
    /** Moves the whole robot vertically so the feet stay planted. */
    hips = new THREE.Group();
    joints = new Map<string, Joint>();
    links = new Map<string, THREE.Group>();
    /** link name -> joint driving it (undefined for the base) */
    linkJoint = new Map<string, Joint>();
    meshes: THREE.Mesh[] = [];
    glowMeshes: THREE.Mesh[] = [];
    /** rest offset of every link group in its parent, for the exploded view */
    private restPos = new Map<THREE.Object3D, THREE.Vector3>();
    /** per joint origin: offset (in its parent frame) applied at full explosion */
    private explodeDir = new Map<THREE.Object3D, THREE.Vector3>();
    private footRest = 0;
    height = 0;

    private tmpQ = new THREE.Quaternion();

    static async load(
        url: string,
        onProgress?: (p: number) => void
    ): Promise<PioneerRobot> {
        const loader = new GLTFLoader();
        loader.setMeshoptDecoder(MeshoptDecoder);
        const gltf = await loader.loadAsync(url, (e) => {
            if (onProgress && e.total) onProgress(e.loaded / e.total);
        });
        return PioneerRobot.fromScene(gltf.scene);
    }

    /** Load the model once, e.g. to build several robots from `scene.clone()`. */
    static async loadScene(url: string): Promise<THREE.Object3D> {
        const loader = new GLTFLoader();
        loader.setMeshoptDecoder(MeshoptDecoder);
        return (await loader.loadAsync(url)).scene;
    }

    /** Build from an already-loaded model (pass `scene.clone()` for a second robot sharing its meshes). */
    static fromScene(scene: THREE.Object3D): PioneerRobot {
        const robot = new PioneerRobot();
        robot.build(scene);
        return robot;
    }

    private build(scene: THREE.Object3D) {
        this.root.rotation.x = -Math.PI / 2;
        this.hips.add(this.root);

        for (const name of SPEC.links) {
            const g = new THREE.Group();
            g.name = name;
            this.links.set(name, g);
        }
        this.root.add(this.links.get(SPEC.root)!);

        for (const spec of SPEC.joints) {
            const parent = this.links.get(spec.parent)!;
            const child = this.links.get(spec.child)!;
            const origin = new THREE.Group();
            origin.position.fromArray(spec.xyz);
            origin.rotation.set(spec.rpy[0], spec.rpy[1], spec.rpy[2], "ZYX");
            const pivot = new THREE.Group();
            origin.add(pivot);
            pivot.add(child);
            parent.add(origin);
            this.restPos.set(origin, origin.position.clone());
            const joint: Joint = {
                ...spec,
                pivot,
                axisVec: new THREE.Vector3().fromArray(spec.axis).normalize(),
                value: 0,
            };
            this.joints.set(spec.name, joint);
            this.linkJoint.set(spec.child, joint);
        }

        // Meshes are exported in their link frame, so just reparent them (keeping any
        // transform the compressor baked into the node, e.g. dequantization).
        scene.updateMatrixWorld(true);
        const found: THREE.Mesh[] = [];
        scene.traverse((o) => {
            if ((o as THREE.Mesh).isMesh) found.push(o as THREE.Mesh);
        });
        for (const mesh of found) {
            let n: THREE.Object3D | null = mesh;
            let linkName = "";
            while (n) {
                const base = n.name.replace(/__glow$/, "");
                if (this.links.has(base)) {
                    linkName = base;
                    break;
                }
                n = n.parent;
            }
            if (!linkName) continue;
            const glow = /__glow$/.test(n!.name);
            mesh.matrixWorld.decompose(
                mesh.position,
                mesh.quaternion,
                mesh.scale
            );
            mesh.userData.link = linkName;
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            this.links.get(linkName)!.add(mesh);
            (glow ? this.glowMeshes : this.meshes).push(mesh);
        }

        this.hips.updateMatrixWorld(true);
        // Exploded view: push each joint radially away from the robot's centre, by a gap that
        // scales with the joint's own offset (fingers barely separate, the waist a lot more).
        const centre = new THREE.Vector3(0, 0.9, 0);
        const q = new THREE.Quaternion();
        const p = new THREE.Vector3();
        this.restPos.forEach((rest, origin) => {
            origin.getWorldPosition(p);
            const dir = p.sub(centre);
            if (dir.lengthSq() < 1e-6) dir.set(0, 1, 0);
            dir.normalize();
            origin.parent!.getWorldQuaternion(q);
            dir.applyQuaternion(q.invert());
            const gap = Math.min(0.16, 0.6 * rest.length() + 0.01);
            this.explodeDir.set(origin, dir.multiplyScalar(gap));
        });
        const box = new THREE.Box3().setFromObject(this.hips);
        this.height = box.max.y - box.min.y;
        this.footRest = this.lowestFoot();
    }

    get(name: string) {
        return this.joints.get(name)?.value ?? 0;
    }

    set(name: string, value: number) {
        const j = this.joints.get(name);
        if (!j) return;
        j.value = THREE.MathUtils.clamp(value, j.lower, j.upper);
        j.pivot.quaternion.setFromAxisAngle(j.axisVec, j.value);
    }

    /** Explode every joint origin away from its parent; t in [0,1]. */
    setExplode(t: number) {
        this.restPos.forEach((rest, obj) => {
            obj.position
                .copy(rest)
                .addScaledVector(this.explodeDir.get(obj)!, t);
        });
    }

    private footTmp = new THREE.Vector3();
    private lowestFoot() {
        let min = Infinity;
        for (const name of ["l_foot", "r_foot"]) {
            const f = this.links.get(name);
            if (!f) continue;
            f.getWorldPosition(this.footTmp);
            min = Math.min(min, this.footTmp.y);
        }
        return min;
    }

    /** Shift the robot so its lowest foot sits where it does at rest. */
    ground() {
        this.hips.updateMatrixWorld(true);
        const drop = this.lowestFoot() - this.footRest;
        this.hips.position.y -= drop;
    }

    /** World-space position of a joint's pivot and its world-space axis. */
    jointWorld(j: Joint, pos: THREE.Vector3, axis: THREE.Vector3) {
        j.pivot.parent!.getWorldPosition(pos);
        j.pivot.parent!.getWorldQuaternion(this.tmpQ);
        axis.copy(j.axisVec).applyQuaternion(this.tmpQ);
    }
}
