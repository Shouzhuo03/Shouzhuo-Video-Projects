const svgImage = (viewBox, contents) => 'data:image/svg+xml;charset=utf-8,' +
  encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + viewBox + '">' + contents + '</svg>');

function placeholder(label, background, accent) {
  const text = label.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
  return svgImage('0 0 640 480',
    '<rect width="640" height="480" fill="' + background + '"/>' +
    '<rect x="24" y="24" width="592" height="432" rx="18" fill="none" stroke="' + accent + '" opacity=".4"/>' +
    '<path d="M78 392h484" stroke="' + accent + '" opacity=".4"/>' +
    '<text x="320" y="285" text-anchor="middle" font-family="sans-serif" font-size="36" font-weight="700" fill="#fff">' + text + '</text>' +
    '<text x="320" y="325" text-anchor="middle" font-family="sans-serif" font-size="16" letter-spacing="4" fill="' + accent + '">VIDEO PLACEHOLDER</text>');
}

const VIDEO_PLACEHOLDERS = {
  en: placeholder(FilmCopy.videoLabels.en, '#253349', '#a8c5ed'),
  zh: placeholder(FilmCopy.videoLabels.zh, '#472c2d', '#f1bca5')
};
const AVATAR = svgImage('0 0 48 48',
  '<rect width="48" height="48" fill="#365d79"/><circle cx="24" cy="18" r="8" fill="#e8f2f7"/><path d="M8 44a16 16 0 0 1 32 0" fill="#e8f2f7"/>');

const sizes = {
  book: [400, 224], camera: [384, 256], cap: [320, 240], cash: [384, 256], cat: [288, 288],
  clapper: [288, 304], coin: [256, 320], gamepad: [352, 240], heart: [256, 208],
  plant: [256, 336], record: [320, 320], skateboard: [384, 256],
};
const propAspect = name => sizes[name][0] / sizes[name][1];

const propImage = name => `assets/props/${name}.png`;
