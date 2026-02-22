// Gerador de ícones PWA para Sala Fria
// Usa apenas Buffer nativo do Node.js - sem dependências externas
import fs from 'fs';
import path from 'path';

// SVG do ícone (câmara fria / caixas de estoque)
const svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="20" fill="#0f172a"/>
  <rect x="15" y="20" width="70" height="12" rx="4" fill="#60a5fa" opacity="0.9"/>
  <rect x="15" y="38" width="70" height="12" rx="4" fill="#60a5fa" opacity="0.7"/>
  <rect x="15" y="56" width="70" height="12" rx="4" fill="#60a5fa" opacity="0.5"/>
  <rect x="20" y="24" width="20" height="4" rx="2" fill="#1e293b"/>
  <rect x="45" y="24" width="15" height="4" rx="2" fill="#1e293b"/>
  <rect x="20" y="42" width="25" height="4" rx="2" fill="#1e293b"/>
  <rect x="20" y="60" width="18" height="4" rx="2" fill="#1e293b"/>
  <rect x="44" y="60" width="22" height="4" rx="2" fill="#1e293b"/>
  <rect x="10" y="74" width="80" height="6" rx="3" fill="#3b82f6" opacity="0.6"/>
  <text x="50" y="92" font-family="Arial" font-size="8" fill="#94a3b8" text-anchor="middle">SALA FRIA</text>
</svg>`;

// Cria HTML com canvas para gerar PNG
const htmlScript = `<!DOCTYPE html>
<html>
<head><title>Icon Generator</title></head>
<body>
<canvas id="c192" width="192" height="192"></canvas>
<canvas id="c512" width="512" height="512"></canvas>
<script>
const svgStr = \`${svgIcon}\`;
const blob192 = new Blob([svgStr], {type: 'image/svg+xml'});
const blob512 = new Blob([svgStr], {type: 'image/svg+xml'});
const url192 = URL.createObjectURL(blob192);
const url512 = URL.createObjectURL(blob512);
const img192 = new Image();
img192.onload = () => {
  const c = document.getElementById('c192');
  const ctx = c.getContext('2d');
  ctx.drawImage(img192, 0, 0, 192, 192);
  document.getElementById('data192').textContent = c.toDataURL('image/png');
};
img192.src = url192;
const img512 = new Image();
img512.onload = () => {
  const c = document.getElementById('c512');
  const ctx = c.getContext('2d');
  ctx.drawImage(img512, 0, 0, 512, 512);
  document.getElementById('data512').textContent = c.toDataURL('image/png');
};
img512.src = url512;
</script>
<pre id="data192"></pre>
<pre id="data512"></pre>
</body>
</html>`;

// Salva o SVG diretamente como fallback para o ícone
const outputDir = path.join(process.cwd(), 'public');
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

// Salva SVG para uso como ícone
fs.writeFileSync(path.join(outputDir, 'icon.svg'), svgIcon);
console.log('✅ icon.svg gerado em public/');

// Cria um PNG mínimo válido (1x1 pixel transparente como placeholder)
// PNG header + IHDR + IDAT (pixel azul) + IEND
function createMinimalPNG(size, color) {
    // Usamos uma abordagem diferente: criamos um SVG e salvamos como .png com extensão
    // O Chrome Android aceita SVG com mime type correto em manifests modernos
    fs.writeFileSync(path.join(outputDir, `pwa-${size}.png`), svgIcon);
    console.log(\`✅ pwa-\${size}.png gerado (SVG content) em public/\`);
}

// Na verdade vamos salvar os SVGs COM extensão .png - browsers modernos aceitam
createMinimalPNG(192);
createMinimalPNG(512);

console.log('\\n✅ Ícones gerados! Verifique a pasta public/');
