// Tripo-generated 3D ring, normalized for the browser.
// White emission is composited with an occlusion-aware bloom in light-gate.js.
export function createRingRenderer(gl, buffer) {
  const view = new DataView(buffer);
  if (view.getUint32(0, true) !== 0x46546c67) throw Error('Invalid ring model');
  const jsonSize = view.getUint32(12, true);
  const model = JSON.parse(new TextDecoder().decode(new Uint8Array(buffer, 20, jsonSize)));
  const binaryOffset = 20 + jsonSize + 8;
  const accessor = index => {
    const a = model.accessors[index], b = model.bufferViews[a.bufferView];
    const Type = a.componentType === 5126 ? Float32Array : Uint16Array;
    return new Type(buffer, binaryOffset + (b.byteOffset || 0) + (a.byteOffset || 0), a.count * (a.type === 'VEC3' ? 3 : 1));
  };
  const compile = (type, source) => {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source); gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw Error('Ring shader failed');
    return shader;
  };
  const program = gl.createProgram();
  gl.attachShader(program, compile(gl.VERTEX_SHADER, `
    attribute vec3 position; attribute vec3 normal;
    uniform vec2 pointer; varying vec3 surface;
    void main(){
      float angle=-pointer.x*.82;
      float c=cos(angle),s=sin(angle);
      mat3 rotation=mat3(c,0.,-s,0.,1.,0.,s,0.,c);
      vec3 p=rotation*position*.59;
      surface=rotation*normal;
      vec2 center=vec2(-.08+pointer.x*.35,.16-pointer.y*.05);
      float cameraZ=p.z-2.8;
      gl_Position=vec4((p.xy+center)*2.8,-1.020202*cameraZ-.20202,-cameraZ);
    }`));
  gl.attachShader(program, compile(gl.FRAGMENT_SHADER, `
    precision mediump float; varying vec3 surface;
    void main(){float light=.999+.001*abs(normalize(surface).z);gl_FragColor=vec4(vec3(light),1.);}`));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw Error('Ring program failed');
  const positions = gl.createBuffer(), normals = gl.createBuffer(), indices = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positions); gl.bufferData(gl.ARRAY_BUFFER, accessor(0), gl.STATIC_DRAW);
  gl.bindBuffer(gl.ARRAY_BUFFER, normals); gl.bufferData(gl.ARRAY_BUFFER, accessor(1), gl.STATIC_DRAW);
  const triangles = accessor(2);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indices); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, triangles, gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, 'position'), normal = gl.getAttribLocation(program, 'normal');
  const pointer = gl.getUniformLocation(program, 'pointer');
  const texture = gl.createTexture(); gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  const framebuffer = gl.createFramebuffer(), depth = gl.createRenderbuffer();
  let size = 0;
  return {
    texture,
    render(width, x, y) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
      if (size !== width) {
        size = width;
        gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, size, size, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
        gl.bindRenderbuffer(gl.RENDERBUFFER, depth); gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, size, size);
        gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depth);
        if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) throw Error('Ring framebuffer failed');
      }
      gl.viewport(0, 0, size, size); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.enable(gl.DEPTH_TEST); gl.useProgram(program);
      gl.bindBuffer(gl.ARRAY_BUFFER, positions); gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position, 3, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, normals); gl.enableVertexAttribArray(normal); gl.vertexAttribPointer(normal, 3, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indices); gl.uniform2f(pointer, x, y);
      gl.drawElements(gl.TRIANGLES, triangles.length, gl.UNSIGNED_SHORT, 0);
      gl.disableVertexAttribArray(position); gl.disableVertexAttribArray(normal); gl.disable(gl.DEPTH_TEST);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }
  };
}
