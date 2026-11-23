// Genera los PDF (tapa + índice con páginas + cuerpo numerado desde la introducción).
// Uso: node build.mjs   (requiere marked, puppeteer-core, pdftotext y pypdf)
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';
const require = createRequire('/opt/npm-tools/node_modules/');
const { marked } = require('marked');
const puppeteer = require('puppeteer-core');
const CHROME = process.env.CHROME ?? '/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell';

const COMUN = {
  equipo: 'Equipo JunaMap',
  integrantes: ['Lara, Cristóbal', 'Oliva, Benjamín'],
  fecha: 'noviembre de 2026',
};
const DOCS = [
  { src: 'hito2.md', out: 'Hito2_Documento_Tecnico.pdf', subtitulo: 'Documento técnico del back end · Hito 2', usaApi: true },
  { src: 'hito3.md', out: 'Hito3_Documentacion_Final.pdf', subtitulo: 'Documentación final · Hito 3' },
];
const CSS = `
@page { size: Letter; margin: 2.5cm; }
body { font-family: 'Lato','Helvetica Neue',Arial,sans-serif; font-size: 11pt; line-height: 1.15; color: #1b2a2f; }
h1,h2,h3 { color: #004E64; font-family: Georgia,'Times New Roman',serif; }
h2 { font-size: 16pt; margin: 1.2em 0 .4em; page-break-after: avoid; border-bottom: 2px solid #FF6B35; padding-bottom: 4px; }
h3 { font-size: 12.5pt; page-break-after: avoid; }
table { border-collapse: collapse; width: 100%; font-size: 8.8pt; margin: .6em 0 1em; page-break-inside: auto; }
tr { page-break-inside: avoid; }
th { background: #004E64; color: #fff; text-align: left; padding: 5px 6px; }
td { border-bottom: 1px solid #d6e0e2; padding: 5px 6px; vertical-align: top; }
code { font-family: Consolas,monospace; font-size: 9pt; background: #f1f4f4; padding: 0 2px; }
pre { background: #f1f4f4; padding: 8px; font-size: 8.5pt; white-space: pre-wrap; page-break-inside: avoid; }
pre code { background: none; }
img { max-width: 100%; display: block; margin: .6em auto; max-height: 14cm; }
p, li { text-align: left; }
.cover { background: #00323f; color: #fff; padding: 2.2cm 1.6cm; margin-top: 1cm; }
.cover .t { font-family: Georgia,serif; font-size: 44pt; font-weight: bold; } .cover .t span { color: #FFC9B3; }
.cover .s { color: #FFC857; font-style: italic; font-size: 14pt; margin: 6px 0 16px; } .cover .d { font-size: 12pt; }
.meta { display: flex; gap: 1.2cm; margin-top: 1.4cm; font-size: 10.5pt; } .meta > div { flex: 1; }
.meta small { letter-spacing: 2px; color: #777; font-weight: bold; } .meta h4 { margin: 4px 0; color: #004E64; font-size: 13pt; }
.toc div { display: flex; gap: 6px; margin: 4px 0; } .toc .dots { flex: 1; border-bottom: 1px dotted #888; transform: translateY(-4px); }
.sub { margin-left: 1em; font-size: 10pt; }
`;
const slug = (s) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-');
const limpio = (s) => s.replace(/<[^>]+>/g, '');

async function pdf(browser, html, path, footer) {
  const page = await browser.newPage();
  const tmp = `${process.cwd()}/_tmp_${Math.random().toString(36).slice(2)}.html`;
  writeFileSync(tmp, html);
  await page.goto('file://' + tmp, { waitUntil: 'networkidle0' });
  unlinkSync(tmp);
  await page.pdf({
    path, format: 'Letter', printBackground: true, margin: { top: '2.5cm', bottom: '2.5cm', left: '2.5cm', right: '2.5cm' },
    displayHeaderFooter: footer, headerTemplate: '<span></span>',
    footerTemplate: '<div style="font-size:9px;width:100%;text-align:center;color:#555"><span class="pageNumber"></span></div>',
  });
  await page.close();
}

const browser = await puppeteer.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
for (const d of DOCS) {
  let md = readFileSync(d.src, 'utf8');
  if (d.usaApi) md = md.replace('{{api}}', readFileSync('api.md', 'utf8'));
  let cuerpo = marked.parse(md);
  cuerpo = cuerpo.replace(/<h([23]) id="[^"]*">/g, '<h$1>').replace(/<h([23])>/g, (_, n) => `<h${n}>`);
  const heads = [...cuerpo.matchAll(/<h([23])>(.*?)<\/h\1>/g)].map((m) => ({ nivel: +m[1], texto: limpio(m[2]) }));
  heads.forEach((h) => { cuerpo = cuerpo.replace(`<h${h.nivel}>${h.texto}</h${h.nivel}>`, `<h${h.nivel}>${h.texto}</h${h.nivel}>`); });
  const base = (inner) => `<html><head><meta charset="utf-8"><base href="file://${process.cwd()}/"><style>${CSS}</style></head><body>${inner}</body></html>`;
  await pdf(browser, base(cuerpo), '/tmp/cuerpo.pdf', true);
  // Página de cada encabezado, a partir del texto de cada página del cuerpo
  const n = +execSync("python3 -c \"from pypdf import PdfReader;print(len(PdfReader('/tmp/cuerpo.pdf').pages))\"").toString();
  const paginas = Array.from({ length: n }, (_, i) => execSync(`pdftotext -f ${i + 1} -l ${i + 1} /tmp/cuerpo.pdf -`).toString().replace(/\s+/g, ' '));
  let desde = 0;
  const toc = heads.map((h) => {
    const clave = h.texto.replace(/\s+/g, ' ');
    let p = paginas.findIndex((t, i) => i >= desde && t.includes(clave));
    if (p < 0) p = desde;
    desde = p;
    return { ...h, pag: p + 1 };
  });
  const indice = `<h2 style="border:0">Índice</h2><div class="toc">${toc.map((t) => `<div class="${t.nivel === 3 ? 'sub' : ''}"><span>${t.texto}</span><span class="dots"></span><span>${t.pag}</span></div>`).join('')}</div>`;
  const portada = `
    <div class="cover"><div class="t">Juna<span>Map</span></div><div class="s">Tu beca, tu mapa, tu próxima comida.</div><div class="d">${d.subtitulo}</div></div>
    <div class="meta"><div><small>INSTITUCIÓN ACADÉMICA</small><h4>UNIVERSIDAD MAYOR</h4>Facultad de Ciencias, Ingeniería y Tecnología<br>Escuela de Ingeniería Civil<br>INGT1003 · Arquitectura de Desarrollo (Móvil y Web)<br><br>Santiago, Chile · ${COMUN.fecha}</div>
    <div><small>EQUIPO DE PROYECTO</small><h4>${COMUN.equipo}</h4>Integrantes (orden alfabético por apellido):<br>${COMUN.integrantes.join('<br>')}<br><br>Docente: Carlos Muñoz S.</div></div>
    <div style="page-break-after:always"></div>${indice}`;
  await pdf(browser, base(portada), '/tmp/frente.pdf', false);
  execSync(`python3 -c "
from pypdf import PdfReader, PdfWriter
w = PdfWriter()
for f in ('/tmp/frente.pdf','/tmp/cuerpo.pdf'):
    for p in PdfReader(f).pages: w.add_page(p)
w.write('${d.out}')"`);
  console.log(d.out, 'cuerpo:', n, 'págs');
}
await browser.close();
