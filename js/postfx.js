// ============================================================
// postfx.js — WebGL post-processing over the Canvas 2D frame
// ============================================================
// The game keeps drawing with Canvas 2D. Each frame this module uploads that
// canvas as a texture and composites it through a small shader chain onto a
// WebGL canvas stacked on top: bright-pass → two-scale separable blur (a tight
// glow plus a wide halo), then chromatic aberration, a filmic shoulder and
// colour grade, vignette, scanlines and film grain.
//
// The 2D canvas stays visible underneath (the opaque overlay covers it) so its
// touch/click listeners keep working — the overlay has pointer-events: none.
// Don't hide the source with opacity/visibility/offscreen tricks: Chrome then
// stops presenting it on the compositor schedule and every texImage2D upload
// stalls, halving the frame rate (measured: p95 frame 50ms vs 17ms).

import { setShadowBlurEnabled } from './constants.js';

const STORAGE_KEY = 'nin-defender-postfx';
const BLOOM_THRESHOLD = 0.5;
const GLOW_STRENGTH = 0.6;   // tight glow, quarter resolution
const HALO_STRENGTH = 0.55;  // wide halo, eighth resolution
const BLUR_PASSES = 2;
const SHAKE_FOR_FULL_ABERRATION = 20;

const VERTEX_SHADER = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
    vUv = aPos * 0.5 + 0.5;
    gl_Position = vec4(aPos, 0.0, 1.0);
}`;

const BRIGHT_PASS_SHADER = `
precision mediump float;
varying vec2 vUv;
uniform sampler2D uScene;
uniform vec2 uTexel;
uniform float uThreshold;
void main() {
    // 4-tap box downsample so thin bullets survive the resolution drop
    vec3 c = texture2D(uScene, vUv + uTexel * vec2(-1.0, -1.0)).rgb
           + texture2D(uScene, vUv + uTexel * vec2( 1.0, -1.0)).rgb
           + texture2D(uScene, vUv + uTexel * vec2(-1.0,  1.0)).rgb
           + texture2D(uScene, vUv + uTexel * vec2( 1.0,  1.0)).rgb;
    c *= 0.25;
    float peak = max(c.r, max(c.g, c.b));
    float weight = smoothstep(uThreshold, uThreshold + 0.25, peak);
    gl_FragColor = vec4(c * weight, 1.0);
}`;

const BLUR_SHADER = `
precision mediump float;
varying vec2 vUv;
uniform sampler2D uSource;
uniform vec2 uStep;
void main() {
    vec3 c = texture2D(uSource, vUv).rgb * 0.2270270270;
    c += texture2D(uSource, vUv + uStep * 1.3846153846).rgb * 0.3162162162;
    c += texture2D(uSource, vUv - uStep * 1.3846153846).rgb * 0.3162162162;
    c += texture2D(uSource, vUv + uStep * 3.2307692308).rgb * 0.0702702703;
    c += texture2D(uSource, vUv - uStep * 3.2307692308).rgb * 0.0702702703;
    gl_FragColor = vec4(c, 1.0);
}`;

const COMPOSITE_SHADER = `
precision mediump float;
varying vec2 vUv;
uniform sampler2D uScene;
uniform sampler2D uGlow;
uniform sampler2D uHalo;
uniform float uGlowStrength;
uniform float uHaloStrength;
uniform float uAberration;
uniform float uTime;
uniform float uPixelRatio;

float hash(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
    vec2 fromCenter = vUv - 0.5;
    float dist = length(fromCenter);

    // Lens-style fringing grows toward the edges; shake pushes it further.
    vec2 fringe = fromCenter * (0.0018 + uAberration * 0.012) * dist;
    vec3 scene = vec3(
        texture2D(uScene, vUv + fringe).r,
        texture2D(uScene, vUv).g,
        texture2D(uScene, vUv - fringe).b
    );

    vec3 color = scene
        + texture2D(uGlow, vUv).rgb * uGlowStrength
        + texture2D(uHalo, vUv).rgb * uHaloStrength;

    // Filmic shoulder: highlights roll off toward white instead of clipping
    // flat, so stacked glows keep their shape and hue.
    vec3 over = max(color - 0.7, 0.0);
    color = min(color, 0.7) + over / (1.0 + over * 1.4);

    // Grade: a touch more saturation and contrast than the raw canvas.
    float luma = dot(color, vec3(0.299, 0.587, 0.114));
    color = mix(vec3(luma), color, 1.14);
    color = mix(color, color * color * (3.0 - 2.0 * color), 0.22);

    float scanline = 0.972 + 0.028 * sin(gl_FragCoord.y / uPixelRatio * 3.14159);
    color *= scanline;

    float vignette = smoothstep(1.0, 0.35, dist);
    color *= mix(0.62, 1.0, vignette);

    // Grain sits in the shadows and midtones; highlights stay clean.
    float grain = hash(gl_FragCoord.xy + fract(uTime) * 100.0) - 0.5;
    color += grain * 0.035 * (1.0 - luma * 0.7);

    gl_FragColor = vec4(color, 1.0);
}`;

export function aberrationFromShake(shakeMagnitude) {
    return Math.min(1, Math.max(0, shakeMagnitude / SHAKE_FOR_FULL_ABERRATION));
}

export function loadEnabledPreference(storage) {
    try {
        return storage.getItem(STORAGE_KEY) !== 'off';
    } catch {
        return true;
    }
}

export function saveEnabledPreference(storage, enabled) {
    try {
        storage.setItem(STORAGE_KEY, enabled ? 'on' : 'off');
    } catch {
        // Private mode / blocked storage — the toggle still works for this session.
    }
}

export class PostFX {
    constructor(sourceCanvas) {
        this.source = sourceCanvas;
        this.overlay = createOverlayCanvas(sourceCanvas);
        this.gl = this.overlay.getContext('webgl', {
            alpha: false, antialias: false, depth: false, stencil: false,
            preserveDrawingBuffer: false,
        });
        this.supported = Boolean(this.gl);
        if (!this.supported) {
            this.overlay.remove();
            this.enabled = false;
            return;
        }
        this.initPipeline();
        this.setEnabled(loadEnabledPreference(window.localStorage));
    }

    toggle() {
        this.setEnabled(!this.enabled);
        saveEnabledPreference(window.localStorage, this.enabled);
    }

    setEnabled(enabled) {
        this.enabled = this.supported && enabled;
        setShadowBlurEnabled(!this.enabled);
        if (!this.supported) return;
        this.overlay.style.display = this.enabled ? 'block' : 'none';
    }

    render({ time, shakeMagnitude }) {
        if (!this.enabled) return;
        this.syncSize();
        this.uploadScene();
        this.runBloom();
        this.composite(time, aberrationFromShake(shakeMagnitude));
    }

    // ---- Pipeline setup ----

    initPipeline() {
        const gl = this.gl;
        this.quad = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.quad);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

        this.brightProgram = this.buildProgram(BRIGHT_PASS_SHADER);
        this.blurProgram = this.buildProgram(BLUR_SHADER);
        this.compositeProgram = this.buildProgram(COMPOSITE_SHADER);

        this.sceneTexture = this.createTexture();
        this.bloomTargets = [this.createRenderTarget(), this.createRenderTarget()];
        this.haloTargets = [this.createRenderTarget(), this.createRenderTarget()];
        this.width = 0;
        this.height = 0;
    }

    buildProgram(fragmentSource) {
        const gl = this.gl;
        const program = gl.createProgram();
        gl.attachShader(program, this.compileShader(gl.VERTEX_SHADER, VERTEX_SHADER));
        gl.attachShader(program, this.compileShader(gl.FRAGMENT_SHADER, fragmentSource));
        gl.bindAttribLocation(program, 0, 'aPos');
        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            throw new Error('PostFX link failed: ' + gl.getProgramInfoLog(program));
        }
        return program;
    }

    compileShader(type, source) {
        const gl = this.gl;
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            throw new Error('PostFX shader compile failed: ' + gl.getShaderInfoLog(shader));
        }
        return shader;
    }

    createTexture() {
        const gl = this.gl;
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        return texture;
    }

    createRenderTarget() {
        const gl = this.gl;
        return { texture: this.createTexture(), framebuffer: gl.createFramebuffer() };
    }

    // ---- Per-frame work ----

    syncSize() {
        const { width, height } = this.source;
        if (width === this.width && height === this.height) return;
        this.width = width;
        this.height = height;
        this.overlay.width = width;
        this.overlay.height = height;
        this.bloomWidth = Math.max(1, Math.floor(width / 4));
        this.bloomHeight = Math.max(1, Math.floor(height / 4));
        this.haloWidth = Math.max(1, Math.floor(width / 8));
        this.haloHeight = Math.max(1, Math.floor(height / 8));
        for (const target of this.bloomTargets) this.allocateTarget(target, this.bloomWidth, this.bloomHeight);
        for (const target of this.haloTargets) this.allocateTarget(target, this.haloWidth, this.haloHeight);
    }

    allocateTarget(target, width, height) {
        const gl = this.gl;
        gl.bindTexture(gl.TEXTURE_2D, target.texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, width, height, 0, gl.RGB, gl.UNSIGNED_BYTE, null);
        gl.bindFramebuffer(gl.FRAMEBUFFER, target.framebuffer);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, target.texture, 0);
    }

    uploadScene() {
        const gl = this.gl;
        gl.bindTexture(gl.TEXTURE_2D, this.sceneTexture);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, this.source);
    }

    runBloom() {
        const gl = this.gl;
        const [first, second] = this.bloomTargets;

        this.useProgram(this.brightProgram, first, this.bloomWidth, this.bloomHeight);
        this.bindTexture(this.sceneTexture, 0, this.brightProgram, 'uScene');
        gl.uniform2f(this.uniform(this.brightProgram, 'uTexel'), 1 / this.width, 1 / this.height);
        gl.uniform1f(this.uniform(this.brightProgram, 'uThreshold'), BLOOM_THRESHOLD);
        this.drawQuad();

        const size = { width: this.bloomWidth, height: this.bloomHeight };
        for (let pass = 0; pass < BLUR_PASSES; pass++) {
            const spread = pass + 1;
            this.blur(first, second, spread / size.width, 0, size);
            this.blur(second, first, 0, spread / size.height, size);
        }

        // Wide halo: the blurred glow, downsampled again and blurred further.
        const [haloFirst, haloSecond] = this.haloTargets;
        const haloSize = { width: this.haloWidth, height: this.haloHeight };
        this.blur(first, haloFirst, 1 / size.width, 0, haloSize);
        for (let pass = 0; pass < BLUR_PASSES; pass++) {
            const spread = pass + 1;
            this.blur(haloFirst, haloSecond, 0, spread / haloSize.height, haloSize);
            this.blur(haloSecond, haloFirst, spread / haloSize.width, 0, haloSize);
        }
    }

    blur(from, to, stepX, stepY, size) {
        this.useProgram(this.blurProgram, to, size.width, size.height);
        this.bindTexture(from.texture, 0, this.blurProgram, 'uSource');
        this.gl.uniform2f(this.uniform(this.blurProgram, 'uStep'), stepX, stepY);
        this.drawQuad();
    }

    composite(time, aberration) {
        const gl = this.gl;
        const program = this.compositeProgram;
        this.useProgram(program, null, this.width, this.height);
        this.bindTexture(this.sceneTexture, 0, program, 'uScene');
        this.bindTexture(this.bloomTargets[0].texture, 1, program, 'uGlow');
        this.bindTexture(this.haloTargets[0].texture, 2, program, 'uHalo');
        gl.uniform1f(this.uniform(program, 'uGlowStrength'), GLOW_STRENGTH);
        gl.uniform1f(this.uniform(program, 'uHaloStrength'), HALO_STRENGTH);
        gl.uniform1f(this.uniform(program, 'uAberration'), aberration);
        gl.uniform1f(this.uniform(program, 'uTime'), time);
        gl.uniform1f(this.uniform(program, 'uPixelRatio'), this.width / this.source.clientWidth || 1);
        this.drawQuad();
    }

    // ---- GL helpers ----

    useProgram(program, target, width, height) {
        const gl = this.gl;
        gl.useProgram(program);
        gl.bindFramebuffer(gl.FRAMEBUFFER, target ? target.framebuffer : null);
        gl.viewport(0, 0, width, height);
    }

    bindTexture(texture, unit, program, name) {
        const gl = this.gl;
        gl.activeTexture(gl.TEXTURE0 + unit);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.uniform1i(this.uniform(program, name), unit);
    }

    uniform(program, name) {
        program.locations ??= {};
        program.locations[name] ??= this.gl.getUniformLocation(program, name);
        return program.locations[name];
    }

    drawQuad() {
        const gl = this.gl;
        gl.bindBuffer(gl.ARRAY_BUFFER, this.quad);
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
}

function createOverlayCanvas(sourceCanvas) {
    const overlay = document.createElement('canvas');
    overlay.id = 'fxCanvas';
    sourceCanvas.insertAdjacentElement('afterend', overlay);
    return overlay;
}
