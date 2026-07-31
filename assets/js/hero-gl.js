/* VALLORA . hero shader
   ---------------------------------------------------------------
   Renders the hero frame through a fragment shader: a slow flowing
   displacement, a pointer driven ripple, chromatic split that tracks the
   displacement magnitude, and a vignette. Raw WebGL1, no library.

   The <img> underneath is the fallback and is only faded out once the first
   frame has actually rendered, so any failure here leaves the original hero
   exactly as it was. */

(function () {
  'use strict';

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var media = document.querySelector('.hero__media');
  var img = media && media.querySelector('img');
  var canvas = document.querySelector('.hero__gl');
  if (!media || !img || !canvas) return;

  var gl = canvas.getContext('webgl', {
    alpha: true, antialias: false, premultipliedAlpha: false,
    powerPreference: 'high-performance'
  }) || canvas.getContext('experimental-webgl');
  if (!gl) return;

  var VERT = [
    'attribute vec2 aPos;',
    'varying vec2 vUv;',
    'void main(){',
    '  vUv = aPos * 0.5 + 0.5;',
    '  gl_Position = vec4(aPos, 0.0, 1.0);',
    '}'
  ].join('\n');

  var FRAG = [
    'precision highp float;',
    'varying vec2 vUv;',
    'uniform sampler2D uTex;',
    'uniform vec2  uRes;',
    'uniform vec2  uTexSize;',
    'uniform float uTime;',
    'uniform vec2  uMouse;',
    'uniform float uHover;',
    'uniform float uScroll;',

    'float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }',

    'float vnoise(vec2 p){',
    '  vec2 i = floor(p), f = fract(p);',
    '  vec2 u = f * f * (3.0 - 2.0 * f);',
    '  return mix(mix(hash(i), hash(i + vec2(1.0,0.0)), u.x),',
    '             mix(hash(i + vec2(0.0,1.0)), hash(i + vec2(1.0,1.0)), u.x), u.y);',
    '}',

    // object-fit: cover, done in UV space
    'vec2 coverUv(vec2 uv, vec2 plane, vec2 tex){',
    '  vec2 r = vec2(',
    '    min((plane.x / plane.y) / (tex.x / tex.y), 1.0),',
    '    min((plane.y / plane.x) / (tex.y / tex.x), 1.0)',
    '  );',
    '  return vec2(uv.x * r.x + (1.0 - r.x) * 0.5,',
    '              uv.y * r.y + (1.0 - r.y) * 0.5);',
    '}',

    'void main(){',
    '  vec2 uv = vUv;',
    '  float agp = uRes.x / uRes.y;',

    // slow drifting flow
    '  float n1 = vnoise(uv * 2.6 + vec2(uTime * 0.045, uTime * 0.028));',
    '  float n2 = vnoise(uv * 5.1 - vec2(uTime * 0.031, uTime * 0.052));',
    '  vec2 disp = vec2(n1 - 0.5, n2 - 0.5) * 0.009;',

    // pointer ripple, aspect corrected so it stays circular
    '  vec2 ap = vec2(uv.x * agp, uv.y);',
    '  vec2 am = vec2(uMouse.x * agp, uMouse.y);',
    '  float d = distance(ap, am);',
    '  float ring = smoothstep(0.5, 0.0, d) * uHover;',
    '  vec2 dir = normalize(ap - am + vec2(0.0001));',
    '  disp += dir * ring * 0.026 * sin(d * 18.0 - uTime * 2.4);',

    // settles downward as the hero leaves
    '  disp.y += uScroll * 0.045;',

    '  vec2 base = coverUv(uv, uRes, uTexSize) + disp;',
    // kept low on purpose: this should read as a lens, not as a glitch
    '  float amt = length(disp) * 0.22 + ring * 0.006;',

    '  vec3 col;',
    '  col.r = texture2D(uTex, base + vec2(amt,  amt * 0.35)).r;',
    '  col.g = texture2D(uTex, base).g;',
    '  col.b = texture2D(uTex, base - vec2(amt,  amt * 0.35)).b;',

    // the ripple lifts the highlights slightly, like light catching cloth
    '  col += vec3(0.16, 0.11, 0.07) * ring * 0.5;',

    '  float vig = smoothstep(1.25, 0.30, length(vUv - 0.5));',
    '  col *= mix(0.58, 1.0, vig);',

    '  float g = hash(vUv * uRes + fract(uTime) * 137.0);',
    '  col += (g - 0.5) * 0.035;',

    '  gl_FragColor = vec4(col, 1.0);',
    '}'
  ].join('\n');

  function compile(type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      if (window.console) console.warn('[vallora] shader:', gl.getShaderInfoLog(s));
      return null;
    }
    return s;
  }

  var vs = compile(gl.VERTEX_SHADER, VERT);
  var fs = compile(gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return;

  var prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    if (window.console) console.warn('[vallora] link:', gl.getProgramInfoLog(prog));
    return;
  }
  gl.useProgram(prog);

  var buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  var aPos = gl.getAttribLocation(prog, 'aPos');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  var U = {};
  ['uTex', 'uRes', 'uTexSize', 'uTime', 'uMouse', 'uHover', 'uScroll']
    .forEach(function (n) { U[n] = gl.getUniformLocation(prog, n); });

  var tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  // the source is not power-of-two, so no mipmaps and clamp on both axes
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

  var mx = 0.5, my = 0.45, tmx = 0.5, tmy = 0.45;
  var hover = 0, tHover = 0;
  var scroll = 0;
  var inView = true;
  var started = false;
  var raf = 0;

  function size() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = Math.round(media.clientWidth * dpr);
    var h = Math.round(media.clientHeight * dpr);
    if (canvas.width === w && canvas.height === h) return;
    canvas.width = w;
    canvas.height = h;
    gl.viewport(0, 0, w, h);
    gl.uniform2f(U.uRes, w, h);
  }

  function draw(t) {
    raf = requestAnimationFrame(draw);
    if (!inView) return;

    // ease the pointer so the ripple trails rather than snaps
    mx += (tmx - mx) * 0.07;
    my += (tmy - my) * 0.07;
    hover += (tHover - hover) * 0.06;

    gl.uniform1f(U.uTime, t * 0.001);
    gl.uniform2f(U.uMouse, mx, my);
    gl.uniform1f(U.uHover, hover);
    gl.uniform1f(U.uScroll, scroll);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    if (!started) {
      started = true;
      canvas.classList.add('is-on');
      media.classList.add('gl-on');
    }
  }

  function begin() {
    if (!img.naturalWidth) return;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
    gl.uniform1i(U.uTex, 0);
    gl.uniform2f(U.uTexSize, img.naturalWidth, img.naturalHeight);
    size();
    raf = requestAnimationFrame(draw);
  }

  if (img.complete && img.naturalWidth) begin();
  else img.addEventListener('load', begin, { once: true });

  window.addEventListener('resize', size, { passive: true });

  window.addEventListener('pointermove', function (e) {
    var r = media.getBoundingClientRect();
    tmx = (e.clientX - r.left) / r.width;
    tmy = 1.0 - (e.clientY - r.top) / r.height;   // GL origin is bottom left
    tHover = (e.clientY < r.bottom && e.clientY > r.top) ? 1 : 0;
  }, { passive: true });

  window.addEventListener('scroll', function () {
    var r = media.getBoundingClientRect();
    scroll = Math.min(1, Math.max(0, -r.top / Math.max(1, r.height)));
    inView = r.bottom > 0 && r.top < window.innerHeight;
    if (r.bottom < 0) tHover = 0;
  }, { passive: true });

  // a lost context must not leave a dead black canvas over the hero
  canvas.addEventListener('webglcontextlost', function (e) {
    e.preventDefault();
    cancelAnimationFrame(raf);
    canvas.classList.remove('is-on');
    media.classList.remove('gl-on');
  });
})();
