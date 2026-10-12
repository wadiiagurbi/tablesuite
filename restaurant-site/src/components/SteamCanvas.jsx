import { useEffect, useRef } from "react";
import { useReducedMotion } from "motion/react";

// Whisper-light rising steam wisps over the hero. Raw WebGL, one quad, fbm
// noise at ~8% alpha in the brand gold — atmosphere, not a screensaver.
// Perf guards: capped at dpr 1, rAF pauses when the hero leaves the viewport,
// never mounted under prefers-reduced-motion.
const FRAG = `
precision mediump float;
uniform vec2 u_res;
uniform float u_time;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p *= 2.03;
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_res;
  // Drift upward slowly; stretch horizontally so wisps read as steam columns.
  float w = fbm(vec2(uv.x * 4.0, uv.y * 2.0 - u_time * 0.06));
  float w2 = fbm(vec2(uv.x * 7.0 + 13.7, uv.y * 3.0 - u_time * 0.09));
  float steam = smoothstep(0.52, 0.95, w * 0.65 + w2 * 0.35);
  // Keep it low over text zones: strongest near the bottom, gone at the top.
  float mask = smoothstep(0.05, 0.55, uv.y) * (1.0 - smoothstep(0.75, 1.0, uv.y));
  float a = steam * mask * 0.09;
  gl_FragColor = vec4(0.706, 0.325, 0.122, a);
}
`;

const VERT = `
attribute vec2 p;
void main() { gl_Position = vec4(p, 0.0, 1.0); }
`;

export default function SteamCanvas({ className }) {
  const reduce = useReducedMotion();
  const canvasRef = useRef(null);

  useEffect(() => {
    if (reduce) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl", { alpha: true, antialias: false });
    if (!gl) return;

    const compile = (type, src) => {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, src);
      gl.compileShader(shader);
      return shader;
    };
    const program = gl.createProgram();
    gl.attachShader(program, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW
    );
    const loc = gl.getAttribLocation(program, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const uRes = gl.getUniformLocation(program, "u_res");
    const uTime = gl.getUniformLocation(program, "u_time");

    let raf = 0;
    let visible = true;
    const start = performance.now();

    const size = () => {
      // dpr 1 on purpose: soft wisps don't need retina resolution.
      const w = Math.max(2, Math.floor(canvas.clientWidth));
      const h = Math.max(2, Math.floor(canvas.clientHeight));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
      return [w, h];
    };

    const frame = (now) => {
      raf = 0;
      if (!visible) return;
      const [w, h] = size();
      gl.uniform2f(uRes, w, h);
      gl.uniform1f(uTime, (now - start) / 1000);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      raf = requestAnimationFrame(frame);
    };

    const kick = () => {
      if (!raf && visible) raf = requestAnimationFrame(frame);
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (visible) kick();
        else if (raf) {
          cancelAnimationFrame(raf);
          raf = 0;
        }
      },
      { threshold: 0 }
    );
    observer.observe(canvas);
    window.addEventListener("resize", kick);
    kick();

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", kick);
      if (raf) cancelAnimationFrame(raf);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, [reduce]);

  if (reduce) return null;
  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 w-full h-full ${className ?? ""}`}
    />
  );
}
