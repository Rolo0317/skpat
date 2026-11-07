/**
 * Shaders del escenario. Son GLSL cortos y sin texturas externas: el único recurso es la marca
 * pintada en un canvas (ver PantallaLed). Todos aceptan la niebla de three para fundirse con la sala.
 */

const RUIDO = /* glsl */ `
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float ruido(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }
  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 3; i++) { v += a * ruido(p); p *= 2.03; a *= 0.5; }
    return v;
  }
`

export const VERTICE_UV = /* glsl */ `
  #include <fog_pars_vertex>
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }
`

/** Pantalla LED: píxeles redondos, patrones que cambian con la frase y la marca encima. */
export const FRAGMENTO_LED = /* glsl */ `
  #include <fog_pars_fragment>
  uniform float uTiempo;
  uniform float uGolpe;
  uniform float uEnergia;
  uniform float uDestello;
  uniform float uAvanceFrase;
  uniform vec2 uPixeles;
  uniform vec3 uOro;
  uniform vec3 uAzul;
  uniform vec3 uChampan;
  uniform sampler2D uMarca;
  varying vec2 vUv;
  ${RUIDO}
  void main() {
    vec2 celda = floor(vUv * uPixeles);
    vec2 c = (celda + 0.5) / uPixeles;
    vec2 local = fract(vUv * uPixeles) - 0.5;
    float led = smoothstep(0.5, 0.18, length(local));

    float x = abs(c.x - 0.5) * 2.0;
    // Ecualizador: columnas que suben con el bombo.
    float columna = floor(c.x * 48.0);
    float alturaEq = 0.18 + 0.5 * ruido(vec2(columna * 0.7, uTiempo * 2.2)) * uEnergia + 0.32 * uGolpe * uEnergia;
    float eq = step(c.y, alturaEq) * (0.55 + 0.45 * c.y / max(alturaEq, 0.01));
    // Chevrones que salen del centro al ritmo.
    float chevron = smoothstep(0.35, 0.0, abs(fract(x * 3.0 - abs(c.y - 0.5) * 1.6 - uTiempo * 0.9) - 0.5) - 0.18);
    // Anillos desde el centro: aparecen en la subida.
    float anillos = smoothstep(0.08, 0.0, abs(fract(length((c - 0.5) * vec2(2.2, 1.0)) * 4.0 - uTiempo * 1.4) - 0.5) - 0.38);

    float mezcla = smoothstep(0.45, 0.55, fract(uAvanceFrase * 2.0));
    float patron = mix(chevron * 0.75, anillos, mezcla) * (0.35 + 0.65 * uEnergia);
    vec3 color = mix(uAzul, uOro, c.y) * patron * 0.55 + mix(uOro, uChampan, c.y) * eq * 0.8;

    float marca = texture2D(uMarca, c).r;
    color = mix(color * (1.0 - marca * 0.85), uChampan * (0.85 + 0.6 * uGolpe), marca);
    color += uChampan * uDestello * 0.55;
    // Viñeta del panel y respiración del bombo.
    color *= (0.72 + 0.28 * uGolpe) * smoothstep(1.15, 0.55, length((vUv - 0.5) * vec2(1.4, 1.0)));
    gl_FragColor = vec4(color * led * 1.6, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    #include <fog_fragment>
  }
`

/** Haz volumétrico de un cabezal móvil: brillo por la cara que mira a la cámara y caída a lo largo. */
export const VERTICE_HAZ = /* glsl */ `
  varying float vLargo;
  varying float vFrente;
  varying vec3 vMundo;
  void main() {
    vLargo = uv.y;
    vec4 mundo = modelMatrix * vec4(position, 1.0);
    vMundo = mundo.xyz;
    vec3 normalVista = normalize(normalMatrix * normal);
    vec4 vista = viewMatrix * mundo;
    vFrente = abs(dot(normalVista, normalize(-vista.xyz)));
    gl_Position = projectionMatrix * vista;
  }
`

export const FRAGMENTO_HAZ = /* glsl */ `
  uniform vec3 uColor;
  uniform float uIntensidad;
  uniform float uTiempo;
  varying float vLargo;
  varying float vFrente;
  varying vec3 vMundo;
  ${RUIDO}
  void main() {
    float cuerpo = pow(vFrente, 2.2);
    float caida = pow(vLargo, 1.6);
    float humo = 0.55 + 0.45 * fbm(vMundo.xy * 0.45 + vec2(uTiempo * 0.08, -uTiempo * 0.05));
    float alfa = cuerpo * caida * humo * uIntensidad;
    gl_FragColor = vec4(uColor * alfa, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`

/** Niebla y humo: planos con fbm que derivan despacio; se iluminan con el color del rig. */
export const FRAGMENTO_NIEBLA = /* glsl */ `
  uniform float uTiempo;
  uniform float uIntensidad;
  uniform vec3 uColor;
  uniform float uSemilla;
  uniform float uBajo;
  varying vec2 vUv;
  ${RUIDO}
  void main() {
    vec2 p = vUv * vec2(3.0, 1.6) + vec2(uTiempo * 0.025 + uSemilla, uTiempo * 0.012);
    float n = fbm(p + fbm(p * 0.7 + uSemilla));
    float bordes = smoothstep(0.0, 0.3, vUv.x) * smoothstep(1.0, 0.7, vUv.x) * smoothstep(0.0, 0.25, vUv.y) * smoothstep(1.0, 0.55, vUv.y);
    float pegadoAlPiso = mix(1.0, smoothstep(0.85, 0.0, vUv.y), uBajo);
    float alfa = smoothstep(0.35, 0.85, n) * bordes * pegadoAlPiso * uIntensidad;
    gl_FragColor = vec4(uColor * alfa, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`
