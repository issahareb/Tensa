// Separable Gaussian bloom. Mask the source with the garment before blurring,
// so concealed sections cannot shine through the hoodie.
export function createRingBloom(gl) {
  const compile=(type,source)=>{const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error('Bloom shader failed');return s};
  const program=gl.createProgram();
  gl.attachShader(program,compile(gl.VERTEX_SHADER,`attribute vec2 position;varying vec2 uv;void main(){uv=position*.5+.5;gl_Position=vec4(position,0.,1.);}`));
  gl.attachShader(program,compile(gl.FRAGMENT_SHADER,`
    precision mediump float;
    varying vec2 uv;uniform sampler2D source;uniform sampler2D garment;
    uniform vec2 direction;uniform float maskSource;
    float readLight(vec2 p){return texture2D(source,p).r*(1.-maskSource*texture2D(garment,p).a);}
    void main(){
      float glow=0.;float weightSum=0.;
      for(int i=-12;i<=12;i++){
        float weight=exp(-float(i*i)/32.);
        glow+=readLight(uv+direction*float(i))*weight;
        weightSum+=weight;
      }
      glow/=weightSum;
      gl_FragColor=vec4(vec3(glow),1.);
    }`));
  gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error('Bloom link failed');
  const position=gl.getAttribLocation(program,'position'),direction=gl.getUniformLocation(program,'direction'),mask=gl.getUniformLocation(program,'maskSource');
  const quad=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,quad);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
  const targets=[0,1].map(()=>({texture:gl.createTexture(),framebuffer:gl.createFramebuffer()}));
  let size=0;
  return {
    texture:targets[1].texture,
    render(width,ringTexture,garmentTexture){
      // Half resolution keeps the glow smooth and inexpensive on touch devices.
      const next=Math.max(1,Math.round(width/2));
      gl.activeTexture(gl.TEXTURE2);
      if(size!==next){size=next;for(const t of targets){
        gl.bindTexture(gl.TEXTURE_2D,t.texture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,size,size,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
        gl.bindFramebuffer(gl.FRAMEBUFFER,t.framebuffer);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,t.texture,0);
        if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)throw Error('Bloom framebuffer failed');
      }}
      gl.useProgram(program);gl.viewport(0,0,size,size);gl.bindBuffer(gl.ARRAY_BUFFER,quad);gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
      gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,garmentTexture);gl.uniform1i(gl.getUniformLocation(program,'garment'),0);
      gl.uniform1i(gl.getUniformLocation(program,'source'),1);
      for(let pass=0;pass<2;pass++){
        gl.bindFramebuffer(gl.FRAMEBUFFER,targets[pass].framebuffer);
        gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,pass===0?ringTexture:targets[0].texture);
        gl.uniform1f(mask,pass===0?1:0);gl.uniform2f(direction,pass===0?.0018:0,pass===1?.0018:0);gl.drawArrays(gl.TRIANGLES,0,6);
      }
      gl.disableVertexAttribArray(position);gl.bindFramebuffer(gl.FRAMEBUFFER,null);
    }
  };
}
