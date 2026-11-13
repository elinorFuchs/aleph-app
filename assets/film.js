/* Aleph soap film for the website.
   One fixed WebGL canvas behind the page paints the background and every element marked
   data-film="panel|cap|round|rim" as a real soap film: colour from film thickness (thin-film
   interference at 7 wavelengths), slow drainage and swirl, Fresnel edges, window reflections.
   Text stays ordinary HTML above it. Without JavaScript or WebGL the CSS look in film.css stays.
   No network requests, no storage, no cookies. */
(function () {
  "use strict";
  var root = document.documentElement;
  var mq = window.matchMedia ? matchMedia("(prefers-reduced-motion: reduce)") : null;
  var MAXN = 24;

  var VS = "attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}";
  var FS = [
    "#ifdef GL_FRAGMENT_PRECISION_HIGH", "precision highp float;", "#else", "precision mediump float;", "#endif",
    "uniform vec2 uRes;uniform float uScale,uTime,uBgMode;uniform sampler2D uBg;uniform vec4 uBgRect;",
    "uniform vec3 uG0,uG1,uG2;uniform int uN;uniform vec4 uR[24];uniform vec4 uP[24];uniform vec4 uQ[24];",
    "vec3 bgAt(vec2 p){vec2 S=uRes/uScale;vec3 c;",
    " if(uBgMode>.5){c=texture2D(uBg,clamp((p-uBgRect.xy)/uBgRect.zw,0.,1.)).rgb;}",
    " else{float t=clamp(p.y/S.y,0.,1.);c=t<.6?mix(uG0,uG1,t/.6):mix(uG1,uG2,(t-.6)/.4);}",
    " return c;}",
    "float sdRB(vec2 p,vec2 b,float r){vec2 q=abs(p)-b+r;return length(max(q,0.))+min(max(q.x,q.y),0.)-r;}",
    "float h21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}",
    "float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h21(i),h21(i+vec2(1.,0.)),f.x),mix(h21(i+vec2(0.,1.)),h21(i+1.),f.x),f.y);}",
    "float fbm(vec2 p){float s=0.,a=.5;for(int i=0;i<3;i++){s+=a*vn(p);p=p*2.03+vec2(1.7,9.2);a*=.5;}return s;}",
    "float s2(float x){float s=sin(3.14159*x);return s*s;}",
    /* thin-film interference: reflectance for optical path 2*n*d*cos(theta_t) at 7 wavelengths */
    "vec3 thinFilm(float d,float cosI){float cosT=sqrt(max(0.,1.-(1.-cosI*cosI)/1.769));float o=2.*1.33*d*cosT;",
    " vec3 c=vec3(.14,0.,.36)*s2(o/400.)+vec3(.2,0.,1.)*s2(o/440.)+vec3(0.,.45,.95)*s2(o/480.)+vec3(0.,1.,.25)*s2(o/520.)",
    "  +vec3(.6,1.,0.)*s2(o/560.)+vec3(1.,.55,0.)*s2(o/600.)+vec3(1.,0.,0.)*s2(o/650.);return c/vec3(2.94,3.,2.56);}",
    /* film thickness in nm: domain-warped noise, drained by gravity (thin top, thick bottom) */
    "float thickness(vec2 q,float yf,float seed,float t,bool cheap){float n;",
    " if(cheap){n=vn(q*1.4+vec2(seed*9.,-t*.05));}",
    " else{vec2 w=vec2(fbm(q*1.2+vec2(t*.045,seed*7.)),fbm(q*1.2+vec2(5.2-seed*3.,-t*.035)));n=fbm(q*1.5+2.4*w+vec2(seed*3.,-t*.06));}",
    " return max(mix(25.,800.,smoothstep(-.1,1.05,yf))+(n-.5)*mix(260.,600.,clamp(yf*1.5,0.,1.)),0.);}",
    "void main(){vec2 p=vec2(gl_FragCoord.x,uRes.y-gl_FragCoord.y)/uScale;vec3 col=bgAt(p);",
    " for(int i=0;i<24;i++){if(i>=uN)break;vec4 R=uR[i],P=uP[i],Q=uQ[i];vec2 l=p-R.xy;",
    "  if(abs(l.x)>R.z+5.||abs(l.y)>R.w+5.)continue;",
    "  float kind=P.y,seed=P.z,fill=Q.x,bev=Q.y;bool round=kind>.5&&kind<1.5;",
    "  if(round){float wb=.01*sin(uTime*.9+seed*6.);l*=vec2(1.+wb,1.-wb);}",
    "  float sd=sdRB(l,R.zw,P.x);",
    /* rim: a film ring just outside an opaque picture */
    "  if(kind>1.5){float ring=exp(-pow((sd-1.2)/1.,2.));if(ring<.01)continue;vec2 q=l/70.;",
    "   vec3 f=thinFilm(thickness(q,(l.y+R.w)/(2.*R.w)*.4+.4,seed,uTime,false),.3);",
    "   f=clamp(mix(vec3(dot(f,vec3(.333))),f,1.6),0.,1.);col=mix(col,mix(f,vec3(1.),.25),ring*.85);continue;}",
    "  float m=1.-smoothstep(-.7,.7,sd);if(m<=0.)continue;",
    "  vec2 g=vec2(sdRB(l+vec2(.5,0.),R.zw,P.x)-sdRB(l-vec2(.5,0.),R.zw,P.x),sdRB(l+vec2(0.,.5),R.zw,P.x)-sdRB(l-vec2(0.,.5),R.zw,P.x));",
    "  g=normalize(g+1e-5);float h=clamp(-sd/bev,0.,1.);float rr=1.-h;",
    "  vec3 n=normalize(vec3(g*rr,sqrt(max(0.,1.-rr*rr))));float cosI=n.z;",
    "  vec3 under=col;if(Q.w>.5){under=mix(col,bgAt(p-n.xy*7.*rr*rr),.85);}",
    "  float fg=clamp(length((l-vec2(-.44*R.z,-R.w))/vec2(2.8*R.z,2.4*R.w))*1.6,0.,1.);",
    "  vec3 c=mix(under,vec3(.99,.99,1.),fill*mix(1.,.6,fg)*(round?1.:smoothstep(0.,.75,h)));",
    "  vec2 q=round?l/R.z:l/70.;float yf=round?(l.y/R.w*.5+.5):(l.y+R.w)/(2.*R.w)*.35+.35;",
    "  float d=thickness(q,yf,seed,uTime,!round&&rr<.02);",
    "  if(P.w>1.){float k=P.w-1.;float dist=round?length(l)/R.z:-sd/min(R.z,R.w);d+=320.*exp(-pow((dist-(round?1.-k:k))/.12,2.))*(1.-k);}",
    "  vec3 film=thinFilm(d,cosI);",
    "  float F=round?(.07+.93*pow(1.-cosI,1.45)):(.05+.95*pow(1.-cosI,1.5));",
    "  if(kind>2.5)F*=.75;",
    "  film=clamp(mix(vec3(dot(film,vec3(.333))),film,1.55),0.,1.);",
    "  vec3 env=mix(vec3(.55,.55,.62),vec3(.9,.9,.94),smoothstep(-.45,.55,-n.y+(round?0.:.35)));",
    "  c=c*(1.-F*film*.8)+env*film*F*(round?1.2:1.1);",
    "  float sway=.04*sin(uTime*.35+seed*5.);float hl=0.;",
    "  if(round){vec2 u=l/R.z;float aa=1.2/R.z;vec2 w1=u-vec2(-.47+sway,-.6+sway*.5);w1=mat2(.77,.64,-.64,.77)*w1;w1.y-=.9*w1.x*w1.x;",
    "   hl=1.-smoothstep(-aa,aa,sdRB(w1,vec2(.2,.05),.05));hl=max(hl,(1.-smoothstep(-aa,aa,length(u-vec2(-.67+sway,-.3))-.055))*.85);",
    "   vec2 w2=u-vec2(.52-sway,.6);w2=mat2(.77,.64,-.64,.77)*w2;c+=(film*.6+.15)*(1.-smoothstep(-aa*2.,aa*2.,sdRB(w2,vec2(.13,.03),.03)))*.5;}",
    "  else{vec2 w1=l-vec2(-R.z*.42+R.z*sway*2.,-R.w+min(4.5,R.w*.3));hl=(1.-smoothstep(-.8,.8,sdRB(w1,vec2(min(R.z*.24,60.),1.5),1.5)))*.75;}",
    "  c=mix(c,vec3(1.),hl*.92);",
    "  float bright=exp(-pow(sd/.9,2.));float dark=exp(-pow((sd+(round?2.2:2.))/1.,2.));",
    "  c=c*(1.-dark*(round?.1:.08))+vec3(1.)*bright*(round?.5:.32);",
    "  col=mix(col,c,m);}",
    " gl_FragColor=vec4(col,1.);}"
  ].join("\n");

  var KIND = { panel: 0, round: 1, rim: 2, cap: 3 };
  var gl, prog, U = {}, canvas, img = null, items = [], t0 = 0, last = 0, dirty = true, running = false;
  var R = new Float32Array(MAXN * 4), P = new Float32Array(MAXN * 4), Q = new Float32Array(MAXN * 4);
  var bgMode = root.getAttribute("data-film-bg") === "sky" ? 1 : 0;

  function reduce() { return mq && mq.matches; }
  function now() { return (performance.now() - t0) / 1000 + 6; }

  function collect() {
    items = [].map.call(document.querySelectorAll("main [data-film]"), function (el, i) {
      var k = KIND[el.getAttribute("data-film")] || 0;
      var fill = parseFloat(el.getAttribute("data-fill"));
      if (isNaN(fill)) fill = k === 0 ? 0.62 : k === 3 ? 0.35 : k === 1 ? 0.06 : 0;
      return { el: el, kind: k, fill: fill, seed: (i * 0.618 + 0.13) % 1, pop: -1 };
    });
  }

  function compile() {
    canvas = document.createElement("canvas");
    canvas.id = "film";
    canvas.setAttribute("aria-hidden", "true");
    gl = canvas.getContext("webgl", { alpha: false, antialias: false, preserveDrawingBuffer: false });
    if (!gl || gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_VECTORS) < 96) return false;
    function sh(t, s) { var o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o)); return o; }
    prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
    gl.useProgram(prog);
    var b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    var al = gl.getAttribLocation(prog, "a"); gl.enableVertexAttribArray(al); gl.vertexAttribPointer(al, 2, gl.FLOAT, false, 0, 0);
    ["uRes", "uScale", "uTime", "uBgMode", "uBg", "uBgRect", "uG0", "uG1", "uG2", "uN", "uR", "uP", "uQ"].forEach(function (n) { U[n] = gl.getUniformLocation(prog, n); });
    var tx = gl.createTexture(); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tx);
    if (img) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
    else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, 1, 1, 0, gl.RGB, gl.UNSIGNED_BYTE, new Uint8Array([200, 210, 220]));
    [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER].forEach(function (p) { gl.texParameteri(gl.TEXTURE_2D, p, gl.LINEAR); });
    [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T].forEach(function (p) { gl.texParameteri(gl.TEXTURE_2D, p, gl.CLAMP_TO_EDGE); });
    gl.uniform1i(U.uBg, 0);
    gl.uniform3f(U.uG0, .804, .847, .878); gl.uniform3f(U.uG1, .902, .886, .863); gl.uniform3f(U.uG2, .937, .902, .863);
    return true;
  }

  function draw(t) {
    var vw = window.innerWidth, vh = window.innerHeight;
    /* cap the drawing: at most 1.5x the CSS pixels and about 1.3 million pixels */
    var sc = Math.min(window.devicePixelRatio || 1, 1.5, Math.sqrt(1.3e6 / (vw * vh)));
    var w = Math.round(vw * sc), h = Math.round(vh * sc);
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    gl.viewport(0, 0, w, h);
    gl.uniform2f(U.uRes, w, h); gl.uniform1f(U.uScale, sc); gl.uniform1f(U.uTime, t); gl.uniform1f(U.uBgMode, bgMode && img ? 1 : 0);
    if (bgMode && img) {
      /* the same cover-fit, top-anchored, as the CSS background */
      var k = Math.max(vw / img.naturalWidth, vh / img.naturalHeight), dw = img.naturalWidth * k, dh = img.naturalHeight * k;
      gl.uniform4f(U.uBgRect, (vw - dw) / 2, 0, dw, dh);
    }
    var n = 0;
    for (var i = 0; i < items.length && n < MAXN; i++) {
      var o = items[i], r = o.el.getBoundingClientRect();
      if (!r.width || r.bottom < -8 || r.top > vh + 8 || r.right < -8 || r.left > vw + 8) continue;
      var hw = r.width / 2, hh = r.height / 2;
      var rad = Math.min(parseFloat(getComputedStyle(o.el).borderTopLeftRadius) || 0, hw, hh);
      if (o.kind === 1) rad = hw;
      var bev = o.kind === 0 ? 18 : o.kind === 2 ? 4 : rad;
      var fill = o.fill;
      if (o.el.getAttribute("aria-current") === "true") fill = 0.85;
      var pw = 0; if (o.pop >= 0) { var q = (t - o.pop) / 0.9; if (q >= 1) o.pop = -1; else pw = 1 + q; }
      R.set([r.left + hw, r.top + hh, hw, hh], n * 4);
      P.set([rad, o.kind, o.seed, pw], n * 4);
      Q.set([fill, Math.max(bev, 1), 0, (o.kind === 1 || (o.kind === 3 && fill < 0.2)) ? 1 : 0], n * 4);
      n++;
    }
    gl.uniform1i(U.uN, n); gl.uniform4fv(U.uR, R); gl.uniform4fv(U.uP, P); gl.uniform4fv(U.uQ, Q);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  function frame(ts) {
    requestAnimationFrame(frame);
    if (document.hidden) return;
    var still = reduce();
    /* about 30 frames a second for the slow film; every frame while the page scrolls */
    if (dirty || (!still && ts - last > 31)) { last = ts; dirty = false; draw(still ? 6 : now()); }
  }

  function press(el) {
    var o = null; items.forEach(function (it) { if (it.el === el) o = it; });
    el.addEventListener("pointerdown", function () {
      if (o) o.pop = now();
      if (reduce() || !el.animate) return;
      el.animate([{ transform: "scale(1,1)" }, { transform: "scale(1.05,.9)" }], { duration: 110, easing: "ease-out", fill: "forwards" });
    });
    function up() {
      if (reduce() || !el.animate) return;
      el.animate([{ transform: "scale(1.05,.9)" }, { transform: "scale(.97,1.04)" }, { transform: "scale(1.01,.99)" }, { transform: "scale(1,1)" }],
        { duration: 650, easing: "ease-out", fill: "forwards" });
    }
    el.addEventListener("pointerup", up); el.addEventListener("pointercancel", up); el.addEventListener("pointerleave", up);
  }

  function start() {
    if (running) return; running = true;
    try {
      collect();
      if (!compile()) return;
      document.body.insertBefore(canvas, document.body.firstChild);
      t0 = performance.now();
      draw(now());
      root.classList.add("film-on");
      ["scroll", "resize"].forEach(function (e) { window.addEventListener(e, function () { dirty = true; }, { passive: true }); });
      document.addEventListener("click", function () { dirty = true; });
      items.forEach(function (o) { if (o.kind === 3 || o.kind === 1) { if (o.el.matches("a,button")) press(o.el); } });
      requestAnimationFrame(frame);
    } catch (e) {
      if (canvas && canvas.parentNode) canvas.parentNode.removeChild(canvas);
      root.classList.remove("film-on");
    }
  }

  function boot() {
    var go = function () { (window.requestIdleCallback || function (f) { setTimeout(f, 200); })(start, { timeout: 800 }); };
    if (!bgMode) return go();
    /* the sky picture the CSS already shows (cached): wide or tall by screen shape */
    var wide = window.matchMedia && matchMedia("(min-aspect-ratio: 1/1)").matches;
    var src = root.getAttribute(wide ? "data-sky-wide" : "data-sky-tall");
    var im = new Image();
    im.onload = function () { img = im; go(); };
    im.onerror = go;
    im.src = src;
  }
  if (document.readyState === "complete") boot(); else window.addEventListener("load", boot);
})();
