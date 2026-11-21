const vertexSource = `#version 300 es
layout(location = 0) in vec3 point;
layout(location = 1) in vec3 normal;
layout(location = 2) in vec3 offset;
layout(location = 3) in vec3 size;
layout(location = 4) in vec2 angles;
layout(location = 5) in vec4 pigment;
layout(location = 6) in vec2 surface;
uniform mat4 viewProjection;
uniform vec3 camera;
out vec3 world;
out vec3 direction;
out vec4 color;
out vec2 material;
out float distanceToEye;
mat3 orient() {
  float c = cos(angles.x), s = sin(angles.x);
  float cr = cos(angles.y), sr = sin(angles.y);
  mat3 tilt = mat3(cr, sr, 0., -sr, cr, 0., 0., 0., 1.);
  return mat3(c, 0., -s, 0., 1., 0., s, 0., c) * tilt;
}
void main() {
  mat3 rotation = orient();
  world = rotation * (point * size) + offset;
  direction = normalize(rotation * (normal / max(size, vec3(.0001))));
  color = pigment;
  material = surface;
  distanceToEye = length(camera - world);
  gl_Position = viewProjection * vec4(world, 1.);
}`;

const fragmentSource = `#version 300 es
precision highp float;
in vec3 world;
in vec3 direction;
in vec4 color;
in vec2 material;
in float distanceToEye;
uniform float time;
uniform float ambient;
uniform vec3 fogTint;
uniform vec3 waveTint;
out vec4 outputColor;
void main() {
  vec3 normal = normalize(direction);
  float light = clamp(.23 + ambient + .30 * max(0., dot(normal, normalize(vec3(-.52,.9,.42)))), 0., 1.);
  vec3 tint = color.rgb;
  if (material.y > 1.5) {
    float wave = sin(world.x*.78 + world.z*1.4 + time*1.3) + sin(world.z*2.4 - world.x*.2 - time*.65);
    float ripple = pow(clamp(.47*wave,0.,1.),12.);
    tint = mix(tint, waveTint, .14 * ripple);
    tint += .035 * sin(world.z*.14 + world.x*.11);
  } else if (material.y > .5) {
    float marbled = sin(world.x*.53 + world.z*.87) * cos(world.z*.41 - world.x*.4);
    tint += marbled * .016;
  }
  tint *= mix(light, 1., material.x);
  float haze = smoothstep(19., 83., distanceToEye);
  tint = mix(tint, fogTint, haze*.81);
  outputColor = vec4(tint, color.a);
}`;

const skyVertex = `#version 300 es
out vec2 uv;
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  uv = p;
  gl_Position = vec4(p*2.-1., 0., 1.);
}`;

const skyFragment = `#version 300 es
precision highp float;
in vec2 uv;
uniform float aspect;
uniform vec3 skyTint;
uniform vec3 skyHorizon;
uniform vec3 sunTint;
out vec4 outputColor;
void main() {
  vec3 base = mix(skyHorizon, skyTint, smoothstep(.76,1.,uv.y));
  vec2 delta = vec2((uv.x-.69)*aspect, uv.y-.947);
  float sun = length(delta);
  base += exp(-10.*sun) * .26*sunTint;
  base = mix(base, sunTint, .96*(1.-smoothstep(.027,.029,sun)));
  outputColor = vec4(base,1.);
}`;

const stride = 14;
const geometryAttributes = [3, 3];
const instanceAttributes = [3, 3, 2, 4, 2];

function link(gl, vertex, fragment) {
  function compile(kind, source) {
    const shader = gl.createShader(kind);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
    return shader;
  }
  const vs = compile(gl.VERTEX_SHADER, vertex);
  const fs = compile(gl.FRAGMENT_SHADER, fragment);
  const program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
  return program;
}

const normalize = (values) => {
  const length = Math.hypot(...values) || 1;
  return values.map((value) => value / length);
};
const cross = (a, b) => [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
const dot = (a, b) => a[0]*b[0]+a[1]*b[1]+a[2]*b[2];

function projectionView(aspect, eye, target) {
  const back = normalize(eye.map((value, axis) => value - target[axis]));
  const right = normalize(cross(back, [0, 1, 0]));
  const up = cross(right, back);
  const view = [
    right[0], up[0], back[0], 0,
    right[1], up[1], back[1], 0,
    right[2], up[2], back[2], 0,
    -dot(right, eye), -dot(up, eye), -dot(back, eye), 1,
  ];
  const near = .1;
  const far = 180;
  const spread = 1 / Math.tan(Math.PI * 52 / 360);
  const projection = [spread/aspect, 0, 0, 0, 0, spread, 0, 0, 0, 0,
    (far+near)/(near-far), -1, 0, 0, 2*far*near/(near-far), 0];
  const result = new Float32Array(16);
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      for (let k = 0; k < 4; k++) result[col*4+row] += projection[k*4+row]*view[col*4+k];
    }
  }
  return result;
}

export function makeRenderer(canvas) {
  const gl = canvas.getContext('webgl2', { alpha: false, antialias: true });
  if (!gl) throw new Error('Trình duyệt cần hỗ trợ WebGL 2 để chơi game.');
  const objects = link(gl, vertexSource, fragmentSource);
  const sky = link(gl, skyVertex, skyFragment);
  const skyVAO = gl.createVertexArray();
  const cameraUniform = gl.getUniformLocation(objects, 'camera');
  const viewUniform = gl.getUniformLocation(objects, 'viewProjection');
  const timeUniform = gl.getUniformLocation(objects, 'time');
  const aspectUniform = gl.getUniformLocation(sky, 'aspect');
  const weatherUniforms = [
    [objects, 'ambient'], [objects, 'fogTint'], [objects, 'waveTint'],
    [sky, 'skyTint'], [sky, 'skyHorizon'], [sky, 'sunTint'],
  ].map(([program, key]) => [key, gl.getUniformLocation(program, key)]);
  const weather = Object.fromEntries(weatherUniforms);
  let viewMatrix;
  const shapes = [];

  function register(vertices) {
    const vao = gl.createVertexArray();
    const geometry = gl.createBuffer();
    const instances = gl.createBuffer();
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, geometry);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    let offset = 0;
    for (const [index, length] of geometryAttributes.entries()) {
      gl.enableVertexAttribArray(index);
      gl.vertexAttribPointer(index, length, gl.FLOAT, false, 6*4, offset*4);
      offset += length;
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, instances);
    offset = 0;
    for (const [index, length] of instanceAttributes.entries()) {
      const location = index + geometryAttributes.length;
      gl.enableVertexAttribArray(location);
      gl.vertexAttribPointer(location, length, gl.FLOAT, false, stride*4, offset*4);
      gl.vertexAttribDivisor(location, 1);
      offset += length;
    }
    const shape = { vao, instances, count: vertices.length/6, opaque: [], translucent: [] };
    shapes.push(shape);
    return shape;
  }

  function draw(shape, position, size, color, { yaw = 0, roll = 0, glow = 0, surface = 0 } = {}) {
    const batch = color[3] < 1 ? shape.translucent : shape.opaque;
    batch.push(...position, ...size, yaw, roll, ...color, glow, surface);
  }

  function render(eye, target, time, style) {
    const scale = Math.min(1.65, window.devicePixelRatio || 1);
    const width = Math.max(1, Math.round(canvas.clientWidth * scale));
    const height = Math.max(1, Math.round(canvas.clientHeight * scale));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    const aspect = width / height;
    gl.viewport(0, 0, width, height);
    gl.clear(gl.DEPTH_BUFFER_BIT);
    gl.disable(gl.DEPTH_TEST);
    gl.useProgram(sky);
    gl.uniform1f(aspectUniform, aspect);
    gl.uniform3fv(weather.skyTint, style.sky);
    gl.uniform3fv(weather.skyHorizon, style.horizon);
    gl.uniform3fv(weather.sunTint, style.sun);
    gl.bindVertexArray(skyVAO);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.enable(gl.DEPTH_TEST);
    gl.useProgram(objects);
    viewMatrix = projectionView(aspect, eye, target);
    gl.uniformMatrix4fv(viewUniform, false, viewMatrix);
    gl.uniform1f(weather.ambient, style.ambient);
    gl.uniform3fv(weather.fogTint, style.fog);
    gl.uniform3fv(weather.waveTint, style.wave);
    gl.uniform3fv(cameraUniform, eye);
    gl.uniform1f(timeUniform, time);

    function flush(pass) {
      for (const shape of shapes) {
        const batch = shape[pass];
        if (!batch.length) continue;
        gl.bindVertexArray(shape.vao);
        gl.bindBuffer(gl.ARRAY_BUFFER, shape.instances);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(batch), gl.DYNAMIC_DRAW);
        gl.drawArraysInstanced(gl.TRIANGLES, 0, shape.count, batch.length/stride);
        batch.length = 0;
      }
    }

    flush('opaque');
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.depthMask(false);
    flush('translucent');
    gl.depthMask(true);
    gl.disable(gl.BLEND);
  }

  function project(x, y, z) {
    if (!viewMatrix) return null;
    const clip = [0, 1, 2, 3].map((i) => viewMatrix[i]*x + viewMatrix[4+i]*y + viewMatrix[8+i]*z + viewMatrix[12+i]);
    const w = Math.max(Math.abs(clip[3]), .001);
    const sx = clip[0] / w;
    const sy = clip[1] / w;
    return { x: sx, y: -sy, behind: clip[3] < 0, visible: clip[3] > 0 && Math.abs(sx) < .93 && Math.abs(sy) < .91 };
  }
  return { register, draw, render, project };
}

const tau = Math.PI * 2;
function vertex(values, point, normal) {
  values.push(...point, ...normal);
}

export function sphereGeometry(latitudes = 10, longitudes = 16) {
  const vertices = [];
  function at(i, j) {
    const theta = i*Math.PI/latitudes;
    const phi = j*tau/longitudes;
    return [Math.sin(theta)*Math.cos(phi), Math.cos(theta), Math.sin(theta)*Math.sin(phi)];
  }
  for (let i = 0; i < latitudes; i++) {
    for (let j = 0; j < longitudes; j++) {
      const a = at(i,j), b = at(i+1,j), c = at(i+1,j+1), d = at(i,j+1);
      for (const point of [a,b,c,a,c,d]) vertex(vertices, point, point);
    }
  }
  return vertices;
}

export function cylinderGeometry(top = 1, bottom = 1, sides = 16) {
  const vertices = [];
  function at(i, radius, y) {
    const angle = i*tau/sides;
    return [radius*Math.cos(angle), y, radius*Math.sin(angle)];
  }
  for (let i = 0; i < sides; i++) {
    const a = at(i,bottom,-1), b = at(i+1,bottom,-1), c = at(i+1,top,1), d = at(i,top,1);
    const n1 = normalize(at(i,1,(bottom-top)/2)), n2 = normalize(at(i+1,1,(bottom-top)/2));
    vertex(vertices,a,n1);
    vertex(vertices,b,n2);
    vertex(vertices,c,n2);
    vertex(vertices,a,n1);
    vertex(vertices,c,n2);
    vertex(vertices,d,n1);
    for (const p of [[0,1,0],c,d]) vertex(vertices,p,[0,1,0]);
    for (const p of [[0,-1,0],a,b]) vertex(vertices,p,[0,-1,0]);
  }
  return vertices;
}

export function islandGeometry(lower = false) {
  const vertices = [];
  const sides = 48;
  function at(i, size, y) {
    const angle = i*tau/sides;
    const curved = 1.035 + .032*Math.sin(5*angle+.5) + .018*Math.cos(8*angle);
    return [size*curved*Math.cos(angle), y, size*curved*Math.sin(angle)];
  }
  for (let i = 0; i < sides; i++) {
    if (!lower) {
      for (const p of [[0,0,0],at(i+1,1,0),at(i,1,0)]) vertex(vertices,p,[0,1,0]);
    } else {
      const normal = normalize(at(i+.5,1,.22));
      for (const p of [at(i,.92,-1),at(i+1,.92,-1),at(i+1,1,0),at(i,.92,-1),at(i+1,1,0),at(i,1,0)]) {
        vertex(vertices,p,normal);
      }
    }
  }
  return vertices;
}

export function ringGeometry(outer = 1, inner = .85, span = tau) {
  const vertices = [];
  for (let i = 0; i < 40; i++) {
    const angle = i*span/40;
    const next = (i+1)*span/40;
    function at(value, radius) { return [Math.cos(value)*radius, 0, Math.sin(value)*radius]; }
    const a = at(angle,inner), b = at(angle,outer), c = at(next,outer), d = at(next,inner);
    for (const point of [a,b,c,a,c,d]) vertex(vertices,point,[0,1,0]);
  }
  return vertices;
}

export function slabGeometry() {
  return [
    -1,0,-1, 0,1,0, 1,0,-1, 0,1,0, 1,0,1, 0,1,0,
    -1,0,-1, 0,1,0, 1,0,1, 0,1,0, -1,0,1, 0,1,0,
  ];
}

export function rampGeometry(bearing, inner, outer, width, fromY, toY) {
  const angle = bearing * Math.PI/180;
  const vx = Math.cos(angle);
  const vz = Math.sin(angle);
  function at(radius, side, y) {
    return [radius*vx + side*width*vz,y,radius*vz - side*width*vx];
  }
  const points = [at(inner,-1,toY),at(inner,1,toY),at(outer,1,fromY),at(outer,-1,fromY)];
  return [0,1,2,0,2,3].flatMap((i) => [...points[i],0,1,0]);
}
