(function () {
  const M = window.DeskMotion, L = M.layout, SH = window.DeskShots.list;
  const KIND = {
    wide: { tilt: [4, -6], dof: 0.25 },
    medium: { tilt: [9, -12], dof: 0.6 },
    close: { tilt: [14, -16], dof: 1 },
    title: { tilt: [0, 0], dof: 0 },
  };
  const OS = 1.35;
  const DIST = 3.2;
  const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  SH.forEach((s, i) => { s.end = i + 1 < SH.length ? SH[i + 1].t : Infinity; });

  function hs(t, t0, t1, a, b, v0, v1) {
    if (t <= t0) return a + v0 * (t - t0);
    if (t >= t1) return b + v1 * (t - t1);
    const h = t1 - t0, s = (t - t0) / h, s2 = s * s, s3 = s2 * s;
    return (2 * s3 - 3 * s2 + 1) * a + (s3 - 2 * s2 + s) * h * v0 + (-2 * s3 + 3 * s2) * b + (s3 - s2) * h * v1;
  }
  function hk(t, keys) {
    if (t <= keys[0][0]) return keys[0][1] + keys[0][2] * (t - keys[0][0]);
    for (let i = 0; i < keys.length - 1; i++) {
      const [t0, a, v0] = keys[i], [t1, b, v1] = keys[i + 1];
      if (t <= t1) return hs(t, t0, t1, a, b, v0, v1);
    }
    const k = keys[keys.length - 1];
    return k[1] + k[2] * (t - k[0]);
  }

  const lnKeys = s => s.z.map(([t, w, v]) => [t, Math.log(w), v]);
  const ease = u => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);

  const GLIDE = 0.45;
  function one(tg, t) {
    if (Array.isArray(tg) && typeof tg[0] === 'number') return tg;
    if (Array.isArray(tg)) { const a = M.where(tg[1], t), b = M.where(tg[2], t); return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; }
    return M.where(tg, t);
  }
  function pos(tg, t) {
    let x = 0, y = 0;
    for (let i = 0; i < 4; i++) { const p = one(tg, t - 0.05 * i); x += p[0] / 4; y += p[1] / 4; }
    return [x, y];
  }
  function base(s, t) {
    const tr = s.track;
    let i = 0;
    while (i + 1 < tr.length && tr[i + 1][0] <= t) i++;
    const cur = pos(tr[i][1], t);
    if (i === 0 || t - tr[i][0] >= GLIDE) return cur;
    const prev = pos(tr[i - 1][1], t), u = ease((t - tr[i][0]) / GLIDE);
    return [prev[0] + (cur[0] - prev[0]) * u, prev[1] + (cur[1] - prev[1]) * u];
  }

  const CORNER = 0.4;
  function pathTangents(s) {
    if (s._pv) return s._pv;
    const P = s.path, n = P.length, V = [];
    const seg = i => { const d = [P[i + 1][1] - P[i][1], P[i + 1][2] - P[i][2]], len = Math.hypot(d[0], d[1]);
                       return { dir: len ? [d[0] / len, d[1] / len] : [0, 0], speed: len / (P[i + 1][0] - P[i][0]) }; };
    for (let i = 0; i < n; i++) {
      const a = i > 0 ? seg(i - 1) : null, b = i < n - 1 ? seg(i) : null;
      if (!a || !b || !a.speed || !b.speed) { V.push([0, 0]); continue; }
      const cos = a.dir[0] * b.dir[0] + a.dir[1] * b.dir[1];
      if (cos < 0) { V.push([0, 0]); continue; }
      if (cos > 0.6) {
        const h = P[i + 1][0] - P[i - 1][0];
        V.push([(P[i + 1][1] - P[i - 1][1]) / h, (P[i + 1][2] - P[i - 1][2]) / h]);
        continue;
      }
      const bx = a.dir[0] + b.dir[0], by = a.dir[1] + b.dir[1], bl = Math.hypot(bx, by) || 1, sp = CORNER * Math.min(a.speed, b.speed);
      V.push([bx / bl * sp, by / bl * sp]);
    }
    return (s._pv = V);
  }
  function pathAt(s, t) {
    const P = s.path, V = pathTangents(s), n = P.length;
    if (t <= P[0][0]) return [P[0][1], P[0][2]];
    if (t >= P[n - 1][0]) return [P[n - 1][1], P[n - 1][2]];
    let i = 0;
    while (P[i + 1][0] <= t) i++;
    const [t0, x0, y0] = P[i], [t1, x1, y1] = P[i + 1];
    return [hs(t, t0, t1, x0, x1, V[i][0], V[i + 1][0]), hs(t, t0, t1, y0, y1, V[i][1], V[i + 1][1])];
  }

  function framing(s, t) {
    const k = KIND[s.kind];
    if (s.kind === 'title') return { cx: L.W / 2, cy: L.H / 2, w: L.W, rx: 0, ry: 0, dof: 0 };
    const keys = s._ln || (s._ln = lnKeys(s)), lw = hk(t, keys);
    let w = Math.exp(lw), h = w * L.H / L.W, cx, cy;
    if (s.path) {
      [cx, cy] = pathAt(s, t);
    } else if (s.track) {

      const b = base(s, t), b0 = base(s, t - 0.3), lead = s.lead ?? 0.3;
      const lx = clamp((b[0] - b0[0]) / 0.3 * lead, -0.2 * w, 0.2 * w), ly = clamp((b[1] - b0[1]) / 0.3 * lead, -0.18 * h, 0.18 * h);
      cx = b[0] + lx; cy = b[1] + ly - (s.bias ?? 0.12) * h;
    } else [cx, cy] = s.c;
    if (s.cy) {
      const a = keys[0][1], b = keys[keys.length - 1][1];
      cy = s.cy[0] + (s.cy[1] - s.cy[0]) * clamp((lw - a) / (b - a));
    }
    if (s.pan) cy = hk(t, s.pan);
    if (s.shake) { cx += s.shake * Math.sin(t * 37.1); cy += s.shake * Math.sin(t * 29.3 + 1); }
    const tilt = s.tilt || k.tilt;
    return { cx, cy, w, rx: tilt[0], ry: tilt[1], dof: s.dof ?? k.dof };
  }

  function shotAt(t) {
    let i = 0;
    while (i + 1 < SH.length && SH[i + 1].t <= t) i++;
    return SH[i];
  }
  const at = t => framing(shotAt(t), t);

  function rot(rx, ry) {
    const a = rx * Math.PI / 180, b = ry * Math.PI / 180, ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(b), sb = Math.sin(b);
    return [cb, 0, sb, sa * sb, ca, -sa * cb, -ca * sb, sa, ca * cb];
  }

  function project(p, cam) {
    const X = 2 * (p[0] - cam.cx) / cam.w, Y = -2 * (p[1] - cam.cy) / cam.w, R = rot(cam.rx, cam.ry);
    const x = R[0] * X + R[1] * Y, y = R[3] * X + R[4] * Y, z = R[6] * X + R[7] * Y;
    const zc = DIST - z;
    return [(x * DIST / zc + 1) / 2 * L.W, (1 - y * DIST / zc / (L.H / L.W)) / 2 * L.H];
  }

  function titleAt(t, t0) {
    const pre = t0 - 1e-3, dt = 1 / 30;
    const a = project(M.where('me', pre - dt), at(pre - dt)), b = project(M.where('me', pre), at(pre));
    const v = [(b[0] - a[0]) / dt, (b[1] - a[1]) / dt], T = 0.9, k = Math.pow(1 - clamp((t - t0) / T), 3) * T / 3;
    return [L.W / 2 - v[0] * k, L.H / 2 - v[1] * k];
  }

  let gl, prog, texSharp, texSoft, soft, sctx;
  function init(out) {
    gl = out.getContext('webgl2', { preserveDrawingBuffer: true, antialias: true });
    const vs = `#version 300 es
      in vec2 a; uniform float os, dist, aspect; uniform mat3 R;
      out vec2 uv; out float depth;
      void main() {
        vec3 p = R * vec3(a.x * os, a.y * os * aspect, 0.0);
        depth = p.z;
        uv = vec2(a.x * 0.5 + 0.5, 0.5 - a.y * 0.5);
        gl_Position = vec4(p.x * dist, p.y * dist / aspect, 0.0, dist - p.z);
      }`;
    const fs = `#version 300 es
      precision highp float;
      in vec2 uv; in float depth;
      uniform sampler2D sharp, soft; uniform float dof; uniform vec2 res;
      out vec4 o;
      void main() {
        float b = smoothstep(0.02, 0.32, abs(depth)) * dof;
        vec3 c = mix(texture(sharp, uv).rgb, texture(soft, uv).rgb, clamp(b, 0.0, 1.0));
        vec2 q = gl_FragCoord.xy / res - 0.5;
        c *= 1.0 - 0.22 * dot(q, q) * 2.0;
        o = vec4(c, 1.0);
      }`;
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
    prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, vs));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(prog);
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'a');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const tex = unit => { const t = gl.createTexture(); gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); return t; };
    texSharp = tex(0); texSoft = tex(1);
    gl.uniform1i(gl.getUniformLocation(prog, 'sharp'), 0);
    gl.uniform1i(gl.getUniformLocation(prog, 'soft'), 1);
    soft = document.createElement('canvas');
    sctx = soft.getContext('2d');
  }

  let crt;
  function initCRT(out) {
    if (!gl.getExtension('EXT_color_buffer_float')) throw new Error('CRT requires EXT_color_buffer_float');
    const vertex = `#version 300 es
      in vec2 a; void main() { gl_Position = vec4(a, 0., 1.); }`;
    const raw = `#version 300 es
      precision highp float;
      uniform sampler2D sharp, soft;
      uniform vec2 res, centre; uniform float width, aspect, dist, os, dof, px;
      uniform vec3 openCam, closeCam; uniform mat3 invR, invOpen, invClose;
      uniform float moire, glow, scan, grid, mtf, pitch; uniform vec2 temporalSigma;
      uniform int steps, regionCount, excludeCount;
      uniform vec4 regions[8], outers[8], excludes[8];
      out vec4 o;
      const float PI = 3.141592653589793;
      vec3 linearRGB(vec3 c) { return pow(max(c, vec3(0.)), vec3(2.2)); }
      vec3 hit(vec2 p, mat3 ir) {
        vec3 eye = ir * vec3(0., 0., dist);
        vec3 ray = ir * vec3((p / res * 2. - 1.) * vec2(1., aspect) / dist, -1.);
        return eye - ray * (eye.z / ray.z);
      }
      vec2 sourceUV(vec2 p) { return .5 + (p - centre) / (width * os * vec2(1., aspect)); }
      bool inside(vec2 p, vec4 r) { return all(greaterThanEqual(p, r.xy)) && all(lessThan(p, r.xy + r.zw)); }
      vec3 emission(vec2 p, float blur) {
        bool quantize = false;
        if (grid > .5) {
          for (int i = 0; i < 8; i++) { if (i >= regionCount) break; if (inside(p, outers[i])) quantize = inside(p, regions[i]); }
          for (int i = 0; i < 8; i++) { if (i >= excludeCount) break; if (inside(p, excludes[i])) quantize = false; }
        }
        vec2 q = quantize ? (floor(p / px) + .5) * px : p;
        vec2 u = sourceUV(q), d = vec2(.22 * px / (width * os), 0.);
        vec2 conv = (p - vec2(720., 540.)) / vec2(1440., 1080.) * px * .045 / (width * os);
        vec3 c = linearRGB(texture(sharp, u).rgb) * .5;
        c += linearRGB(texture(sharp, u + d).rgb) * .125;
        c += linearRGB(texture(sharp, u - d).rgb) * .125;
        c += linearRGB(texture(sharp, u + d.yx).rgb) * .125;
        c += linearRGB(texture(sharp, u - d.yx).rgb) * .125;
        c.r = mix(c.r, linearRGB(texture(sharp, u + conv).rgb).r, .22);
        c.b = mix(c.b, linearRGB(texture(sharp, u - conv).rgb).b, .22);
        vec3 halo = linearRGB(texture(soft, u).rgb);
        c = mix(c, halo, clamp(blur, 0., 1.));
        c += glow * halo * halo * .45;
        c = mat3(.90,.025,.012, .055,.93,.045, .025,.045,.86) * c;
        c = c * vec3(.98, 1., 1.015) + vec3(.0045,.006,.009);
        return c * .87;
      }
      void main() {
        vec2 sensor = gl_FragCoord.xy;
        vec3 h = hit(sensor, invR);
        vec2 p = centre + h.xy * vec2(1., -1.) * width * .5;
        vec3 plane = transpose(invR) * h;
        float blur = smoothstep(.02, .32, abs(plane.z)) * dof;
        vec3 base = emission(p, blur);
        float luma = dot(base, vec3(.2126,.7152,.0722));
        vec3 modulation = vec3(0.);
        for (int k = 0; k < 64; k++) {
          if (k >= steps) break;
          float t = (float(k) + .5) / float(steps);
          mat3 ir = mat3(mix(invOpen[0], invClose[0], t), mix(invOpen[1], invClose[1], t), mix(invOpen[2], invClose[2], t));
          vec3 cam = mix(openCam, closeCam, t);
          for (int a = 0; a < 4; a++) {
            vec2 delta = vec2((a % 2 == 0) ? -.288675 : .288675, (a < 2) ? -.288675 : .288675);
            vec3 local = hit(sensor + delta, ir);
            vec2 point = cam.xy + local.xy * vec2(1., -1.) * cam.z * .5;
            vec2 dx = (hit(sensor + delta + vec2(1.,0.), ir).xy - local.xy) * cam.z * .5;
            vec2 dy = (hit(sensor + delta + vec2(0.,1.), ir).xy - local.xy) * cam.z * .5;
            float sigma = sqrt(mtf * mtf + blur * 144.);
            vec2 variance = (dx * dx + dy * dy) * sigma * sigma + vec2(pow(.055 * px, 2.)) + temporalSigma * temporalSigma;
            float fx = 2. * PI * pitch / px, fy = 2. * PI / px;
            float ax = exp(-.5 * fx * fx * variance.x);
            float ay = exp(-.5 * fy * fy * variance.y);
            vec3 phase = vec3(point.x * fx) + vec3(0., -2.0943951, 2.0943951);
            vec3 grille = ax * cos(phase) + .62 * pow(ax,4.) * cos(phase*2.) + .20 * pow(ax,9.) * cos(phase*3.);
            float line = cos(point.y * fy - PI);
            float rows = 1. - scan * (.65 - .35 * sqrt(clamp(luma, 0., 1.))) * ay * line;
            modulation += (vec3(1.) + moire * grille) * rows;
          }
        }
        vec3 light = base * modulation / (float(steps) * 4.);
        vec2 v = sensor / res - .5; light *= 1. - .22 * dot(v,v) * 2.;
        ivec2 b = ivec2(floor(sensor)) % 2;
        float cfa = (b.y == 0) ? ((b.x == 0) ? light.r : light.g) : ((b.x == 0) ? light.g : light.b);
        o = vec4(cfa, 0., 0., 1.);
      }`;
    const develop = `#version 300 es
      precision highp float; uniform sampler2D sensor; uniform vec2 res; uniform float sharpen;
      out vec4 o;
      float raw(ivec2 p) { return texelFetch(sensor, clamp(p, ivec2(0), ivec2(res)-1), 0).r; }
      void main() {
        ivec2 p = ivec2(gl_FragCoord.xy), b = p % 2;
        float c = raw(p), n = raw(p+ivec2(0,1)), s = raw(p-ivec2(0,1));
        float e = raw(p+ivec2(1,0)), w = raw(p-ivec2(1,0));
        float diag = (raw(p+ivec2(1,1))+raw(p+ivec2(-1,1))+raw(p+ivec2(1,-1))+raw(p-ivec2(1,1))) * .25;
        vec3 rgb;
        if (b.y == 0 && b.x == 0) rgb = vec3(c, (n+s+e+w)*.25, diag);
        else if (b.y == 1 && b.x == 1) rgb = vec3(diag, (n+s+e+w)*.25, c);
        else if (b.y == 0) rgb = vec3((e+w)*.5, c, (n+s)*.5);
        else rgb = vec3((n+s)*.5, c, (e+w)*.5);
        float lum = dot(rgb, vec3(.2126,.7152,.0722));
        float nearLum = (raw(p+ivec2(2,0))+raw(p-ivec2(2,0))+raw(p+ivec2(0,2))+raw(p-ivec2(0,2))) * .25;
        rgb += vec3(clamp(lum-nearLum, -.08, .08) * sharpen);
        o = vec4(pow(clamp(rgb, 0., 1.), vec3(1./2.2)), 1.);
      }`;
    function program(fs) {
      const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
      const p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, vertex)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
      const vao = gl.createVertexArray(); gl.bindVertexArray(vao);
      const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,1,1]), gl.STATIC_DRAW);
      const a = gl.getAttribLocation(p, 'a'); gl.enableVertexAttribArray(a); gl.vertexAttribPointer(a,2,gl.FLOAT,false,0,0);
      return { p, vao, loc: name => gl.getUniformLocation(p, name) };
    }
    const texture = gl.createTexture(); gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    crt = { raw: program(raw), develop: program(develop), texture, fbo: gl.createFramebuffer(), w:0, h:0 };
    gl.bindVertexArray(null);
  }

  function crtLens(out, cam, exposure) {
    if (!crt) initCRT(out);
    const C = DeskScreen.config, r = crt.raw, d = crt.develop;
    if (crt.w !== out.width || crt.h !== out.height) {
      crt.w = out.width; crt.h = out.height;
      gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, crt.texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, out.width, out.height, 0, gl.RGBA, gl.HALF_FLOAT, null);
      gl.bindFramebuffer(gl.FRAMEBUFFER, crt.fbo); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, crt.texture, 0);
      if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) throw new Error('Incomplete CRT sensor framebuffer');
    }
    gl.viewport(0,0,out.width,out.height); gl.bindFramebuffer(gl.FRAMEBUFFER, crt.fbo); gl.useProgram(r.p); gl.bindVertexArray(r.vao);
    const f = (n,v) => gl.uniform1f(r.loc(n),v), v2 = (n,x,y) => gl.uniform2f(r.loc(n),x,y);
    const start = exposure ? exposure.open : cam, end = exposure ? exposure.close : cam;
    gl.uniform1i(r.loc('sharp'),0); gl.uniform1i(r.loc('soft'),1);
    v2('res',out.width,out.height); v2('centre',cam.cx,cam.cy);
    f('width',cam.w); f('aspect',L.H/L.W); f('dist',DIST); f('os',OS); f('dof',cam.dof); f('px',DeskScreen.PX);
    for (const [name,value] of Object.entries({ moire:C.moire,glow:C.halation,scan:C.scan,grid:C.grid,mtf:C.mtf,pitch:C.pitch })) f(name,value);
    const inverse = c => { const a=rot(c.rx,c.ry); return new Float32Array(a); };
    gl.uniformMatrix3fv(r.loc('invR'),false,inverse(cam)); gl.uniformMatrix3fv(r.loc('invOpen'),false,inverse(start)); gl.uniformMatrix3fv(r.loc('invClose'),false,inverse(end));
    gl.uniform3f(r.loc('openCam'),start.cx,start.cy,start.w); gl.uniform3f(r.loc('closeCam'),end.cx,end.cy,end.w);

    const travel = Math.hypot(end.cx-start.cx,end.cy-start.cy) + Math.abs(end.w-start.w) * .9;
    const steps = Math.min(64,Math.max(8,Math.ceil(travel / DeskScreen.PX * C.pitch * 5)));
    gl.uniform1i(r.loc('steps'),steps);
    v2('temporalSigma', (Math.abs(end.cx-start.cx)+Math.abs(end.w-start.w)*.85)/steps/Math.sqrt(12),
      (Math.abs(end.cy-start.cy)+Math.abs(end.w-start.w)*.65)/steps/Math.sqrt(12));
    const {rects,outers,exclude} = DeskScreen.regions();
    gl.uniform1i(r.loc('regionCount'),rects.length); gl.uniform1i(r.loc('excludeCount'),exclude.length);
    const padded = a => new Float32Array(a.flat().concat(new Array((8-a.length)*4).fill(0)));
    gl.uniform4fv(r.loc('regions[0]'),padded(rects)); gl.uniform4fv(r.loc('outers[0]'),padded(outers)); gl.uniform4fv(r.loc('excludes[0]'),padded(exclude));
    gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
    gl.bindFramebuffer(gl.FRAMEBUFFER,null); gl.useProgram(d.p); gl.bindVertexArray(d.vao);
    gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D,crt.texture);
    gl.uniform1i(d.loc('sensor'),2); gl.uniform2f(d.loc('res'),out.width,out.height); gl.uniform1f(d.loc('sharpen'),C.sharpen);
    gl.drawArrays(gl.TRIANGLE_STRIP,0,4); gl.bindVertexArray(null);

    DeskScreen.diagnostics = { steps, travel, sensor:[out.width,out.height], error:gl.getError() };
  }

  function lens(src, out, cam, exposure) {
    if (!gl) init(out);

    soft.width = Math.round(src.width / 3); soft.height = Math.round(src.height / 3);
    sctx.filter = `blur(${Math.max(1, soft.width / 160)}px)`;
    sctx.drawImage(src, 0, 0, soft.width, soft.height);
    const up = (unit, t, img) => { gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img); gl.generateMipmap(gl.TEXTURE_2D); };
    up(0, texSharp, src);
    up(1, texSoft, soft);
    if (window.DeskScreen && DeskScreen.config.enabled) { crtLens(out, cam, exposure); return; }
    gl.useProgram(prog);
    gl.viewport(0, 0, out.width, out.height);
    gl.uniform1f(gl.getUniformLocation(prog, 'os'), OS);
    gl.uniform1f(gl.getUniformLocation(prog, 'dist'), DIST);
    gl.uniform1f(gl.getUniformLocation(prog, 'aspect'), L.H / L.W);
    gl.uniform1f(gl.getUniformLocation(prog, 'dof'), cam.dof);
    gl.uniform2f(gl.getUniformLocation(prog, 'res'), out.width, out.height);
    gl.uniformMatrix3fv(gl.getUniformLocation(prog, 'R'), true, new Float32Array(rot(cam.rx, cam.ry)));
    gl.clearColor(0.05, 0.05, 0.06, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  const span = t => { const s = shotAt(t); return [s.t, s.end]; };

  window.DeskCamera = { at, lens, project, titleAt, OS, span };
})();
