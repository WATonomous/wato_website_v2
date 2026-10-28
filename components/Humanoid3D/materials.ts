// Stylised renderers for Pioneer: comic-book toon shading (cel bands, halftone dots, ink lines)
// and a blueprint line drawing. Shared by the playground and the landing-page cameo.
import * as THREE from "three";

/** Cel shading with three hard bands. */
function toonRamp() {
    const data = new Uint8Array([70, 150, 215, 255]);
    const tex = new THREE.DataTexture(data, data.length, 1, THREE.RedFormat);
    tex.minFilter = THREE.NearestFilter;
    tex.magFilter = THREE.NearestFilter;
    tex.generateMipmaps = false;
    tex.needsUpdate = true;
    return tex;
}

export interface ComicUniforms {
    uInk: { value: THREE.Color };
    uDot: { value: number };
}

/** Toon material that prints halftone dots into its darker bands, like a comic panel. */
export function makeComicMaterial(uniforms: ComicUniforms) {
    const mat = new THREE.MeshToonMaterial({
        vertexColors: true,
        gradientMap: toonRamp(),
    });
    mat.onBeforeCompile = (shader) => {
        shader.uniforms.uInk = uniforms.uInk;
        shader.uniforms.uDot = uniforms.uDot;
        shader.fragmentShader = shader.fragmentShader
            .replace(
                "#include <common>",
                "#include <common>\nuniform vec3 uInk;\nuniform float uDot;"
            )
            .replace(
                "#include <opaque_fragment>",
                /* glsl */ `
                {
                    float lum = dot(outgoingLight, vec3(0.299, 0.587, 0.114));
                    float base = max(dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114)), 0.08);
                    float shade = clamp(1.0 - lum / base, 0.0, 1.0); // 0 lit .. 1 in shadow
                    vec2 p = mat2(0.7071, -0.7071, 0.7071, 0.7071) * gl_FragCoord.xy / uDot;
                    float d = length(fract(p) - 0.5);
                    float r = smoothstep(0.4, 0.95, shade) * 0.5;
                    float dotInk = 1.0 - smoothstep(r - 0.06, r + 0.06, d);
                    outgoingLight = mix(outgoingLight, uInk, dotInk * 0.8);
                }
                #include <opaque_fragment>`
            );
    };
    mat.customProgramCacheKey = () => "pioneer-comic";
    return mat;
}

const OUTLINE_VERT = /* glsl */ `
uniform float uWidth;
void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vec3 n = normalize(normalMatrix * normal);
    mv.xyz += n * uWidth * -mv.z; // constant width on screen
    gl_Position = projectionMatrix * mv;
}`;

const OUTLINE_FRAG = /* glsl */ `
uniform vec3 uColor;
uniform float uOpacity;
void main() { gl_FragColor = vec4(uColor, uOpacity); }`;

/** Inverted-hull silhouette: back faces pushed out along their normals. */
export function makeOutlineMaterial() {
    return new THREE.ShaderMaterial({
        vertexShader: OUTLINE_VERT,
        fragmentShader: OUTLINE_FRAG,
        uniforms: {
            uWidth: { value: 0.0015 },
            uColor: { value: new THREE.Color(0x0b0d10) },
            uOpacity: { value: 1 },
        },
        side: THREE.BackSide,
        transparent: true,
    });
}

/**
 * Ink lines along the creases of every mesh (where faces meet at more than `angle` degrees).
 * Built lazily because EdgesGeometry walks every triangle.
 */
export function buildCreases(
    meshes: THREE.Mesh[],
    material: THREE.LineBasicMaterial,
    angle = 40
) {
    const lines: THREE.LineSegments[] = [];
    for (const m of meshes) {
        const l = new THREE.LineSegments(
            new THREE.EdgesGeometry(m.geometry, angle),
            material
        );
        l.raycast = () => undefined;
        m.add(l);
        lines.push(l);
    }
    return lines;
}

export function buildHulls(
    meshes: THREE.Mesh[],
    material: THREE.ShaderMaterial
) {
    const hulls: THREE.Mesh[] = [];
    for (const m of meshes) {
        const h = new THREE.Mesh(m.geometry, material);
        h.raycast = () => undefined;
        h.castShadow = false;
        m.add(h);
        hulls.push(h);
    }
    return hulls;
}

/** Outline width as a fraction of depth, for `px` CSS pixels on screen. */
export function outlineWidth(
    camera: THREE.PerspectiveCamera,
    viewHeight: number,
    px: number
) {
    const focal =
        viewHeight /
        (2 * Math.tan(THREE.MathUtils.degToRad(camera.getEffectiveFOV() / 2)));
    return px / focal;
}
