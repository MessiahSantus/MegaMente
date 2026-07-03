export class WebGLPlasma {
  constructor(width = 256, height = 256) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = width;
    this.canvas.height = height;
    this.gl = this.canvas.getContext('webgl', { alpha: true });
    
    if (!this.gl) {
      console.warn("WebGL não suportado");
      return;
    }

    this.initShader();
    this.startTime = Date.now();
  }

  initShader() {
    const gl = this.gl;

    const vsSource = `
      attribute vec2 position;
      varying vec2 vUv;
      void main() {
        vUv = position;
        gl_Position = vec4(position, 0.0, 1.0);
      }
    `;

    // Shader Profissional: 3D Fractal Brownian Motion (FBM) sobreposto em uma esfera matemática
    const fsSource = `
      precision highp float;
      uniform float uTime;
      varying vec2 vUv;

      // Hash caótico pseudo-aleatório
      vec3 hash(vec3 p) {
        p = vec3(dot(p, vec3(127.1, 311.7, 74.7)),
                 dot(p, vec3(269.5, 183.3, 246.1)),
                 dot(p, vec3(113.5, 271.9, 124.6)));
        return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
      }

      // 3D Simplex Noise Perlin
      float noise(vec3 p) {
        vec3 i = floor(p);
        vec3 f = fract(p);
        vec3 u = f * f * (3.0 - 2.0 * f);
        return mix(mix(mix(dot(hash(i + vec3(0.0,0.0,0.0)), f - vec3(0.0,0.0,0.0)), 
                           dot(hash(i + vec3(1.0,0.0,0.0)), f - vec3(1.0,0.0,0.0)), u.x),
                       mix(dot(hash(i + vec3(0.0,1.0,0.0)), f - vec3(0.0,1.0,0.0)), 
                           dot(hash(i + vec3(1.0,1.0,0.0)), f - vec3(1.0,1.0,0.0)), u.x), u.y),
                   mix(mix(dot(hash(i + vec3(0.0,0.0,1.0)), f - vec3(0.0,0.0,1.0)), 
                           dot(hash(i + vec3(1.0,0.0,1.0)), f - vec3(1.0,0.0,1.0)), u.x),
                       mix(dot(hash(i + vec3(0.0,1.0,1.0)), f - vec3(0.0,1.0,1.0)), 
                           dot(hash(i + vec3(1.0,1.0,1.0)), f - vec3(1.0,1.0,1.0)), u.x), u.y), u.z);
      }

      // Fractal Brownian Motion (Ondulações Múltiplas)
      float fbm(vec3 p) {
        float f = 0.0;
        float amp = 0.5;
        for(int i = 0; i < 5; i++) {
          f += amp * noise(p);
          p *= 2.0;
          amp *= 0.5;
        }
        return f;
      }

      void main() {
        vec2 uv = vUv;
        float d = length(uv);
        
        // Corta perfeitamente em formato de esfera
        if(d > 0.98) {
          gl_FragColor = vec4(0.0);
          return;
        }

        // Projeção 3D da esfera (z-depth)
        float z = sqrt(1.0 - d * d);
        vec3 p = vec3(uv, z);

        // Movimento do fluido: O plasma flui em Y e Z ao longo do tempo
        vec3 pos = p * 2.5 + vec3(0.0, -uTime * 0.3, uTime * 0.4);
        
        // Aplica o FBM
        float n = fbm(pos);
        
        // Criação do núcleo denso e corona translúcida
        // Faz as bordas escurecerem e o centro brilhar (Fresnel fake)
        float fresnel = pow(1.0 - d, 1.5);
        
        // Intensidade baseada no ruído + fresnel
        float intensity = (n * 0.5 + 0.5) * fresnel * 2.0;
        
        // Efeito de "ebulição" extrema no núcleo (high contrast)
        intensity = smoothstep(0.1, 0.9, intensity);
        
        // Tonalidade branca/cinza com transparência fluida
        vec3 color = vec3(1.0) * intensity;
        
        // Anti-aliasing suave na borda extrema
        float alpha = intensity * smoothstep(0.98, 0.9, d);
        
        gl_FragColor = vec4(color, alpha);
      }
    `;

    const compileShader = (type, source) => {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Shader compilation error:', gl.getShaderInfoLog(shader));
        return null;
      }
      return shader;
    };

    const vertShader = compileShader(gl.VERTEX_SHADER, vsSource);
    const fragShader = compileShader(gl.FRAGMENT_SHADER, fsSource);

    this.program = gl.createProgram();
    gl.attachShader(this.program, vertShader);
    gl.attachShader(this.program, fragShader);
    gl.linkProgram(this.program);
    gl.useProgram(this.program);

    // Quad (retângulo) que cobre toda a tela do canvas para renderizar a textura
    const vertices = new Float32Array([
      -1, -1,
       1, -1,
      -1,  1,
       1,  1,
    ]);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    const posAttrib = gl.getAttribLocation(this.program, "position");
    gl.enableVertexAttribArray(posAttrib);
    gl.vertexAttribPointer(posAttrib, 2, gl.FLOAT, false, 0, 0);

    this.timeUniform = gl.getUniformLocation(this.program, "uTime");
  }

  // Atualiza o shader e retorna o canvas para ser desenhado no grafo 2D
  render() {
    if (!this.gl) return null;
    const time = (Date.now() - this.startTime) / 1000.0;
    this.gl.uniform1f(this.timeUniform, time);
    
    // Fundo totalmente transparente
    this.gl.clearColor(0.0, 0.0, 0.0, 0.0);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);
    
    // Desenha o quadrado com o shader de plasma
    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
    
    return this.canvas;
  }
}
