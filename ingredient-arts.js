/* Illustrations d'aliments partagées par le Carnet et Maisonnée. Affichage seulement. */
(function (root) {
  'use strict';
  const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/œ/g, 'oe').replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
  const shadow = '<ellipse cx="32" cy="58" rx="15" ry="2.5" fill="#142033" opacity=".16"/>';
  const svg = body => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${shadow}${body}</svg>`;
  const g = (x, y, rx, ry, o) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="#fff" opacity="${o == null ? .38 : o}"/>`;
  const I = {};
  const put = (id, body) => { I[id] = svg(body); };

  put('brioche', `<ellipse cx="32" cy="42" rx="16" ry="11" fill="#f0b429"/><ellipse cx="32" cy="38" rx="14" ry="7" fill="#f6d36b"/>${g(26, 36, 4, 2.4)}<circle cx="32" cy="24" r="8.5" fill="#f3c14a"/><circle cx="32" cy="24" r="8.5" fill="none" stroke="#d5921c" stroke-width="1.2"/>${g(29, 21, 2.4, 1.6)}<path d="M18 41h28" stroke="#d5921c" stroke-width="1.1" opacity=".8"/>`);
  put('baguette', `<path d="M5 40c6-16 46-18 54-2 1 8-8 14-27 14S4 48 5 40z" fill="#e7b15a"/><path d="M10 36c10-8 28-10 42-4" fill="none" stroke="#f6deaa" stroke-width="2" stroke-linecap="round"/><path d="M18 34c1 8 .5 12 0 14M30 31c1 10 .4 14 0 16M42 33c.6 8 .2 12 0 14" fill="none" stroke="#c4843a" stroke-width="1.3" stroke-linecap="round"/>`);
  put('sliced-bread', `<path d="M16 18h26c4 0 6 3 6 7v22c0 3-2 5-6 5H16c-3 0-5-2-5-5V25c0-4 2-7 5-7z" fill="#f4e2c4"/><path d="M16 18c8-6 22-6 32 0v6H16z" fill="#e7c99a"/><path d="M22 30h18M22 36h18M22 42h14" stroke="#d7b488" stroke-width="1.4" stroke-linecap="round"/><rect x="38" y="28" width="10" height="18" rx="2" fill="#fff6e8" stroke="#e2c79a"/>`);
  put('country-bread', `<ellipse cx="32" cy="38" rx="20" ry="14" fill="#c9843a"/><path d="M14 36c6-12 28-14 36-2" fill="#e2a84e"/><path d="M22 30c8 10 8 10 20 2M32 26v16" fill="none" stroke="#a86428" stroke-width="1.5" stroke-linecap="round"/>${g(24, 32, 4, 2)}`);
  put('rye', `<ellipse cx="32" cy="38" rx="18" ry="13" fill="#6e4a32"/><path d="M16 36c8-10 24-12 32-2" fill="#8a6244"/><path d="M24 34h16M32 28v14" stroke="#4e3222" stroke-width="1.3" stroke-linecap="round"/>`);
  put('gingerbread', `<rect x="16" y="18" width="32" height="30" rx="4" fill="#8a4b24"/><rect x="20" y="22" width="24" height="22" rx="2" fill="#a85e30"/><circle cx="26" cy="30" r="1.4" fill="#f2d48a"/><circle cx="32" cy="34" r="1.4" fill="#f2d48a"/><circle cx="38" cy="30" r="1.4" fill="#f2d48a"/>`);
  put('walnut-bread', `<ellipse cx="32" cy="38" rx="18" ry="13" fill="#d39a58"/><path d="M16 36c8-11 26-12 34-1" fill="#e2b56e"/><circle cx="24" cy="40" r="2.2" fill="#6b4428"/><circle cx="34" cy="42" r="2" fill="#6b4428"/><circle cx="40" cy="36" r="1.8" fill="#6b4428"/>`);
  put('bread', `<path d="M12 40c0-12 8-20 20-20s20 8 20 20c0 8-8 12-20 12s-20-4-20-12z" fill="#e8b86a"/><path d="M16 36c6-8 26-8 32 0" fill="#f3d59a"/>${g(24, 32, 4, 2)}<path d="M32 24v18" stroke="#c48a3a" stroke-width="1.3" stroke-linecap="round"/>`);
  put('croissant', `<path d="M10 40c8-18 36-22 46-6-8 2-14 8-16 16-10-2-22-4-30-10z" fill="#e7b15a"/><path d="M16 36c10-8 24-8 34-2" fill="none" stroke="#f6deaa" stroke-width="2"/><path d="M18 38c8 2 16 6 22 12" fill="none" stroke="#c4843a" stroke-width="1.2"/>`);
  put('burger-bun', `<path d="M14 36c0-10 8-16 18-16s18 6 18 16v4H14z" fill="#f0c36e"/><ellipse cx="32" cy="40" rx="18" ry="5" fill="#e7b15a"/><circle cx="24" cy="30" r="1.3" fill="#f7f0dc"/><circle cx="32" cy="27" r="1.3" fill="#f7f0dc"/><circle cx="40" cy="31" r="1.3" fill="#f7f0dc"/>`);
  put('pita', `<ellipse cx="32" cy="36" rx="20" ry="12" fill="#f0d7a4"/><path d="M16 36c6-8 26-8 32 0" fill="none" stroke="#d7b888" stroke-width="1.4"/><path d="M20 38h24" stroke="#c9a56e" stroke-width="1.2" stroke-linecap="round"/>`);
  put('naan', `<path d="M12 40c4-16 18-22 28-16 10 6 14 8 12 18-8 8-32 8-40-2z" fill="#f3d7a2"/><circle cx="28" cy="36" r="2" fill="#c9843a" opacity=".7"/><circle cx="38" cy="40" r="1.6" fill="#c9843a" opacity=".7"/><circle cx="34" cy="30" r="1.4" fill="#a86830" opacity=".55"/>`);
  put('hotdog-bun', `<path d="M10 34c2-8 42-8 44 0v8c-2 6-42 6-44 0z" fill="#f0c36e"/><path d="M14 36h36" stroke="#e2b15a" stroke-width="2" stroke-linecap="round"/>`);
  put('bagel', `<circle cx="32" cy="36" r="16" fill="#e2b15a"/><circle cx="32" cy="36" r="6" fill="#f7f3ea"/><circle cx="26" cy="28" r="1.1" fill="#f4efe2"/><circle cx="36" cy="26" r="1.1" fill="#f4efe2"/><circle cx="40" cy="34" r="1.1" fill="#f4efe2"/>`);
  put('tortilla', `<ellipse cx="32" cy="36" rx="20" ry="14" fill="#f6e3b8" transform="rotate(-8 32 36)"/><ellipse cx="34" cy="38" rx="16" ry="11" fill="#f3d7a0" opacity=".9" transform="rotate(6 34 38)"/>`);
  put('chips', `<path d="M18 40c-2-8 4-16 12-14 6 2 8-4 14-2 4 2 8 10 4 16-6 4-24 6-30 0z" fill="#f0c14a"/><path d="M40 28c4 6 2 12-2 16" fill="#e2a83a"/><path d="M22 36c6 2 10 1 14-2" stroke="#d89a2e" stroke-width="1"/>`);
  put('cracker', `<rect x="16" y="24" width="32" height="22" rx="3" fill="#f0d7a0"/><circle cx="24" cy="32" r="1.2" fill="#d7b888"/><circle cx="32" cy="30" r="1.2" fill="#d7b888"/><circle cx="40" cy="34" r="1.2" fill="#d7b888"/><circle cx="28" cy="38" r="1.2" fill="#d7b888"/>`);
  put('breadcrumbs', `<circle cx="24" cy="40" r="3" fill="#e2b56a"/><circle cx="32" cy="36" r="3.4" fill="#f0c36e"/><circle cx="40" cy="41" r="2.6" fill="#d7a85a"/><circle cx="30" cy="44" r="2.2" fill="#e8c48a"/><circle cx="38" cy="34" r="2" fill="#f6d48a"/>`);
  put('crouton', `<path d="M20 26h18l8 8v14H20z" fill="#e2b15a"/><path d="M38 26v8h8" fill="none" stroke="#c48a3a"/><path d="M26 36h12M28 42h8" stroke="#c48a3a" stroke-width="1.2"/>`);
  put('blini', `<ellipse cx="32" cy="40" rx="16" ry="6" fill="#e2b15a"/><ellipse cx="32" cy="34" rx="14" ry="5" fill="#f0c36e"/><ellipse cx="32" cy="29" rx="11" ry="4" fill="#f6d48a"/>`);
  put('crepe', `<ellipse cx="32" cy="38" rx="20" ry="8" fill="#f0c36e"/><path d="M14 36c8-6 28-6 36 2" fill="none" stroke="#e2a83a" stroke-width="1.4"/><path d="M40 30c6 4 8 8 6 12" fill="#f6d48a"/>`);
  put('galette', `<ellipse cx="32" cy="38" rx="20" ry="9" fill="#8a6a3a"/><path d="M14 36c10-6 26-6 36 2" fill="#a8844a"/><path d="M20 38h24" stroke="#6e522c" stroke-width="1"/>`);
  put('pizza-dough', `<circle cx="32" cy="36" r="16" fill="#f3d7a4"/><circle cx="32" cy="36" r="16" fill="none" stroke="#e2c48a"/><path d="M22 32c6 4 14 4 20-2" fill="none" stroke="#e2c48a"/>`);
  put('brisee', `<path d="M14 40c0-12 36-16 40-2 0 8-8 12-20 12s-20-4-20-10z" fill="#f6e3b8"/><path d="M16 36c4-2 8 2 12 0s8 2 12 0 8 2 10 0" fill="none" stroke="#e2c99a" stroke-width="1.3"/>`);
  put('feuilletee', `<path d="M16 42c2-14 30-16 34-2v8H16z" fill="#f8ead0"/><path d="M16 36h34M16 32h32M18 28h28" stroke="#e6d2aa" stroke-width="1.4"/>`);
  put('sablee', `<ellipse cx="32" cy="38" rx="18" ry="10" fill="#f0d2a0"/><circle cx="24" cy="36" r="1" fill="#e2c08a"/><circle cx="32" cy="40" r="1" fill="#e2c08a"/><circle cx="40" cy="35" r="1" fill="#e2c08a"/>`);
  put('brick', `<path d="M18 22h28l-6 26H24z" fill="#f6e7c4" opacity=".95"/><path d="M22 28h20M24 36h16" stroke="#e2d0a4" stroke-width="1"/>`);
  put('volauvent', `<ellipse cx="32" cy="42" rx="16" ry="6" fill="#f0d7a4"/><ellipse cx="32" cy="30" rx="12" ry="8" fill="#f8ead0"/><ellipse cx="32" cy="30" rx="6" ry="3.5" fill="#e7c98a"/>`);
  put('panini', `<path d="M12 30h40v6c0 6-6 8-12 8H24c-6 0-12-2-12-8z" fill="#e2b15a"/><path d="M14 34h36" stroke="#c45020" stroke-width="2"/><path d="M18 38h10M30 38h12" stroke="#3f8f4e" stroke-width="2" stroke-linecap="round"/>`);
  put('gyoza', `<path d="M12 38c6-12 34-12 40 0-10 8-30 8-40 0z" fill="#f6e6c8"/><path d="M20 36c3 2 5 2 8 0M32 36c3 2 5 2 8 0" stroke="#d7b888" fill="none"/>`);
  put('ravioles', `<rect x="16" y="26" width="14" height="12" rx="2" fill="#f0d08a" stroke="#e2c07a"/><rect x="34" y="32" width="14" height="12" rx="2" fill="#f6e3b0" stroke="#e2c07a"/><path d="M20 32h6M38 38h6" stroke="#d4232a" stroke-width="1.2"/>`);
  put('snail', `<circle cx="26" cy="36" r="11" fill="#d7b06a"/><circle cx="26" cy="36" r="6" fill="#a86830"/><circle cx="26" cy="36" r="2.4" fill="#6e4420"/><path d="M34 40c8 0 14-6 12-12" stroke="#7d9a48" stroke-width="4" fill="none" stroke-linecap="round"/><circle cx="46" cy="26" r="1.3" fill="#2a241c"/>`);
  put('soy-protein', `<circle cx="22" cy="40" r="6" fill="#c9a06a"/><circle cx="34" cy="34" r="7" fill="#a87848"/><circle cx="44" cy="42" r="5" fill="#8a6238"/><circle cx="30" cy="44" r="4" fill="#b89058"/>`);

  put('egg', `<ellipse cx="24" cy="38" rx="9" ry="13" fill="#fffaf2" stroke="#ecd9b4"/><ellipse cx="40" cy="36" rx="8" ry="12" fill="#fffaf2" stroke="#ecd9b4"/>${g(21, 32, 2.4, 3.2)}${g(37, 30, 2.2, 3)}`);
  put('yolk', `<path d="M12 36c4-10 36-12 42 0 2 10-8 16-21 16S10 46 12 36z" fill="#fffaf2"/><circle cx="32" cy="36" r="8" fill="#f2c14e"/>${g(29, 33, 2.4, 1.8)}`);
  put('egg-white', `<path d="M14 34c2-8 34-10 38 2 1 10-8 14-19 14S12 44 14 34z" fill="#f7f4ee" stroke="#e4d8c4"/>${g(24, 32, 4, 2)}`);
  put('butter', `<rect x="16" y="26" width="32" height="18" rx="2" fill="#f6d56b"/><path d="M16 32h32" stroke="#e2b83a"/><rect x="34" y="22" width="12" height="8" rx="1" fill="#ffe9a0"/>`);
  put('creme-fraiche', `<path d="M20 24h24l4 22H16z" fill="#f4f1ea"/><ellipse cx="32" cy="24" rx="12" ry="4" fill="#fff"/><path d="M22 30c4 3 16 3 20 0" fill="#fff" opacity=".8"/>`);
  put('cream', `<path d="M22 18h20v6l6 22H16L22 24z" fill="#f7f4ee"/><rect x="24" y="16" width="16" height="6" rx="1" fill="#d7e6f2"/><path d="M24 34h16" stroke="#e6e0d4"/>`);
  put('milk', `<path d="M24 16h10l2 6v24c0 3-3 5-7 5s-7-2-7-5V22z" fill="#f7f4ee"/><rect x="26" y="12" width="8" height="6" rx="1" fill="#7eb6e0"/><rect x="24" y="28" width="14" height="8" fill="#d7eaf8"/>`);
  put('coconut-milk', `<path d="M24 18h16l3 24H21z" fill="#f7f4ee"/><rect x="26" y="26" width="12" height="10" fill="#7d5a3a"/><circle cx="32" cy="22" r="3" fill="#f3e6d0"/>`);
  put('yogurt', `<path d="M22 24h20l3 20H19z" fill="#fff"/><rect x="22" y="20" width="20" height="6" rx="1" fill="#f2c14e"/><path d="M26 34h12" stroke="#e6e0d4"/>`);
  put('greek-yogurt', `<path d="M18 28h28l2 16H16z" fill="#fff"/><ellipse cx="32" cy="28" rx="14" ry="4" fill="#f7f4ee"/><path d="M22 34c4 2 16 2 20 0" stroke="#e6e0d4" fill="none"/>`);
  put('parmesan', `<path d="M18 44L30 18l16 26z" fill="#f3e2b0"/><path d="M30 18l4 26" stroke="#e2c98a"/><path d="M26 28c6 2 10 8 8 14" stroke="#d7b888" fill="none"/>`);
  put('emmental', `<path d="M16 44L28 18h18v26z" fill="#f6d56b"/><circle cx="30" cy="30" r="2.2" fill="#f3e6a0"/><circle cx="38" cy="36" r="2.6" fill="#f3e6a0"/><circle cx="34" cy="40" r="1.6" fill="#f3e6a0"/>`);
  put('gruyere', `<path d="M16 44L28 20h18v24z" fill="#e2b04a"/><circle cx="36" cy="34" r="2" fill="#f0d48a"/>`);
  put('comte', `<path d="M16 42L30 18h16v24z" fill="#f0d48a"/><path d="M30 18v24" stroke="#c9843a" stroke-width="3"/>`);
  put('cheddar', `<rect x="18" y="24" width="28" height="20" rx="2" fill="#f0a202"/><path d="M18 32h28" stroke="#d4890b"/>`);
  put('feta', `<rect x="20" y="26" width="24" height="18" rx="2" fill="#f7f4ee"/><path d="M24 30l4 4M32 28l3 6M40 32l-2 5" stroke="#d7d0c4" stroke-width="1.2"/>`);
  put('mozzarella', `<circle cx="32" cy="36" r="12" fill="#fff"/><ellipse cx="32" cy="36" rx="12" ry="12" fill="none" stroke="#e6e0d4"/>${g(27, 32, 3, 2)}`);
  put('burrata', `<circle cx="32" cy="36" r="13" fill="#fff"/><path d="M26 36c2 4 10 4 12 0" fill="#f7f4ee" stroke="#e6e0d4"/>${g(26, 30, 3, 2)}`);
  put('goat-cheese', `<rect x="16" y="30" width="32" height="14" rx="7" fill="#f7f4ee"/><path d="M16 34c4 2 8-2 12 0s8 2 12 0 6-2 8 0" stroke="#e2d8c8" fill="none"/>`);
  put('fresh-cheese', `<path d="M20 30h24l2 14H18z" fill="#fff"/><ellipse cx="32" cy="30" rx="12" ry="4" fill="#f7f4ee"/>`);
  put('mascarpone', `<path d="M18 32h28c0 8-6 14-14 14s-14-6-14-14z" fill="#fff6ea"/><ellipse cx="32" cy="32" rx="14" ry="4" fill="#fff"/>`);
  put('ricotta', `<path d="M18 34c2-8 26-8 28 0 0 8-6 12-14 12s-14-4-14-12z" fill="#fff"/><circle cx="26" cy="36" r="2" fill="#f4f1ea"/><circle cx="34" cy="38" r="2.4" fill="#f4f1ea"/><circle cx="40" cy="34" r="1.6" fill="#f4f1ea"/>`);
  put('blue-cheese', `<path d="M16 44L28 18h18v26z" fill="#f3e6c8"/><path d="M30 24c4 6 2 12-2 16M36 22c2 8 0 14-2 18" stroke="#6a8f9a" stroke-width="1.4" fill="none"/>`);
  put('reblochon', `<ellipse cx="32" cy="38" rx="16" ry="10" fill="#f0c36e"/><ellipse cx="32" cy="34" rx="14" ry="7" fill="#e7a35a"/><ellipse cx="32" cy="34" rx="6" ry="3" fill="#f6d48a"/>`);
  put('raclette', `<path d="M16 40a16 16 0 0 1 32 0v6H16z" fill="#f0c36e"/><path d="M16 40h32" stroke="#e2a83a"/><path d="M32 24v16" stroke="#d4890b"/>`);
  put('beaufort', `<path d="M18 42a14 12 0 0 1 28 0v4H18z" fill="#e2b04a"/><path d="M22 36h20" stroke="#c9843a"/>`);
  put('halloumi', `<rect x="18" y="28" width="28" height="14" rx="2" fill="#fff6ea" stroke="#f0c36e"/><path d="M22 34h20" stroke="#e2b15a" stroke-width="2"/>`);
  put('pecorino', `<path d="M18 44L32 16l14 28z" fill="#f6e3b8"/><path d="M32 16v28" stroke="#d7b888"/>`);
  put('paneer', `<rect x="20" y="24" width="24" height="20" rx="2" fill="#fff"/><path d="M20 32h24M32 24v20" stroke="#e6e0d4"/>`);
  put('maroilles', `<rect x="18" y="26" width="28" height="18" rx="2" fill="#e7a35a"/><rect x="22" y="30" width="20" height="10" fill="#f0c36e"/>`);
  put('montdor', `<ellipse cx="32" cy="38" rx="16" ry="11" fill="#e2a04a"/><ellipse cx="32" cy="36" rx="8" ry="5" fill="#f6d48a"/><path d="M28 34h8" stroke="#c9843a"/>`);
  put('tomme', `<ellipse cx="32" cy="38" rx="15" ry="11" fill="#f3e2b0"/><path d="M18 38c4-8 24-8 28 0" fill="#d7c09a"/>`);
  put('cheese', `<path d="M16 44L30 18l18 26z" fill="#f6d56b"/>${g(28, 30, 3, 2)}<circle cx="36" cy="36" r="2" fill="#f3e6a0"/>`);

  put('onion', `<ellipse cx="32" cy="38" rx="14" ry="12" fill="#f3e0c0"/><path d="M32 26c-2 6-2 12 0 16M26 34c6 2 10 2 14-2" stroke="#c4a574" fill="none"/><path d="M32 20v8" stroke="#6b8f4e" stroke-width="2" stroke-linecap="round"/><path d="M28 50c2 3 6 3 8 0" stroke="#8a6a44" fill="none"/>`);
  put('red-onion', `<ellipse cx="32" cy="38" rx="14" ry="12" fill="#9b3d6b"/><path d="M32 26c-2 6-2 12 0 16M25 36c6 3 12 2 16-2" stroke="#6e2348" fill="none"/><path d="M32 20v8" stroke="#6b8f4e" stroke-width="2"/><path d="M32 22c4-2 6 0 6 2" stroke="#c46b98" fill="none"/>`);
  put('spring-onion', `<path d="M30 40c0 8 4 12 4 12s4-4 4-12c2-8-2-14-4-18-2 4-6 10-4 18z" fill="#f7f4ee"/><path d="M28 28c-6-10-4-18 2-22M36 28c6-12 4-20-2-24" fill="none" stroke="#3f8f4e" stroke-width="2" stroke-linecap="round"/>`);
  put('shallot', `<ellipse cx="30" cy="38" rx="8" ry="12" fill="#c9846a"/><ellipse cx="38" cy="40" rx="6" ry="9" fill="#e2a090"/><path d="M32 22c2 4 2 8 0 12" stroke="#a86858" fill="none"/><path d="M32 18v6" stroke="#6b8f4e" stroke-width="2"/>`);
  put('garlic', `<path d="M32 44c-8 0-12-8-8-16 2-6 6-8 8-12 2 4 6 6 8 12 4 8 0 16-8 16z" fill="#f7f4ee"/><path d="M32 20v10M28 30c2 4 6 4 8 0" stroke="#e2d4c0" fill="none"/><path d="M32 16c2-4 6-4 4 0" stroke="#6b8f4e" fill="none"/>`);
  put('potato', `<ellipse cx="32" cy="38" rx="16" ry="11" fill="#c9844a" transform="rotate(-12 32 38)"/><circle cx="26" cy="36" r="1.3" fill="#a86830"/><circle cx="36" cy="40" r="1.3" fill="#a86830"/><circle cx="34" cy="32" r="1.1" fill="#a86830"/>${g(24, 34, 3, 2)}`);
  put('fries', `<rect x="22" y="22" width="6" height="22" rx="2" fill="#f0c14a" transform="rotate(-8 25 33)"/><rect x="30" y="20" width="6" height="24" rx="2" fill="#f6d48a"/><rect x="38" y="24" width="6" height="20" rx="2" fill="#e2a83a" transform="rotate(8 41 34)"/>`);
  put('sweet-potato', `<path d="M18 40c4-14 28-16 32-2 2 10-6 16-16 16s-18-4-16-14z" fill="#e26a2c"/><path d="M24 34c8 2 16 2 22-2" stroke="#c45020" fill="none"/>`);
  put('gnocchi', `<ellipse cx="22" cy="40" rx="7" ry="5" fill="#f3e2b0"/><ellipse cx="34" cy="36" rx="7" ry="5" fill="#f6e6c0"/><ellipse cx="44" cy="42" rx="6" ry="4" fill="#e7d2a0"/><path d="M18 40h8M30 36h8" stroke="#d7c09a"/>`);
  put('carrot', `<path d="M30 18c8 6 14 20 8 32-6 2-14-4-16-16 0-8 4-14 8-16z" fill="#f26b1d"/><path d="M28 16c-4-6 2-10 4-8M34 14c4-6 8-4 6 0M32 12c2-8 8-6 6 0" fill="none" stroke="#3f8f4e" stroke-width="2" stroke-linecap="round"/>`);
  put('pepper', `<path d="M24 26c0-6 16-8 18 0 4 4 6 16 2 24-6 6-20 4-22-4-2-8 0-16 2-20z" fill="#3f8f4e"/><path d="M32 18v8" stroke="#246b34" stroke-width="2"/><path d="M30 16c4-4 8-2 6 2" fill="#246b34"/>`);
  put('pepper-red', `<path d="M24 26c0-6 16-8 18 0 4 4 6 16 2 24-6 6-20 4-22-4-2-8 0-16 2-20z" fill="#e23d32"/><path d="M32 18v8" stroke="#246b34" stroke-width="2"/><path d="M30 16c4-4 8-2 6 2" fill="#246b34"/>`);
  put('pepper-green', `<path d="M22 28c2-8 18-8 20 0 2 10 0 18-4 22-8 4-16 2-18-6-1-6 0-12 2-16z" fill="#5aaf4a"/><path d="M32 16v10" stroke="#246b34" stroke-width="2"/>`);
  put('chili', `<path d="M18 36c6-14 22-16 28-4 2 6-2 10-8 8-6 4-16 6-20-4z" fill="#d4232a"/><path d="M20 30c6-4 4-10 8-12" stroke="#246b34" stroke-width="2" fill="none"/>`);
  put('tomato', `<circle cx="32" cy="36" r="14" fill="#e23d32"/>${g(26, 30, 4, 3)}<path d="M24 24c4-6 12-6 16 0-4 2-12 2-16 0z" fill="#3f8f4e"/><path d="M32 20v6" stroke="#246b34" stroke-width="1.4"/>`);
  put('cherry-tomato', `<circle cx="24" cy="38" r="8" fill="#e23d32"/><circle cx="38" cy="36" r="9" fill="#ef4d3a"/>${g(34, 32, 2.4, 2)}<path d="M30 24c4-6 10-4 8 0" fill="#3f8f4e"/><path d="M32 22v8" stroke="#246b34"/>`);
  put('tomato-sauce', `<path d="M22 20h20v6l4 20H18L22 26z" fill="#f4f1ea"/><path d="M22 32h20c-2 8-6 12-10 12s-8-4-10-12z" fill="#d4232a"/><rect x="24" y="16" width="16" height="5" rx="1" fill="#c45040"/>`);
  put('zucchini', `<path d="M14 40c6-8 30-10 38-2 2 6-4 10-14 10-16 0-26-2-24-8z" fill="#6aaa45"/><path d="M18 38c8-2 22-2 30 2" stroke="#4e8a34" fill="none"/><circle cx="16" cy="38" r="3" fill="#8bc86a"/>`);
  put('cucumber', `<path d="M12 36c4-8 36-10 42 0 2 6-6 10-16 10-18 0-28-4-26-10z" fill="#3f8f4e"/><path d="M18 36h28" stroke="#2f6e3c"/>`);
  put('pickle', `<path d="M24 18c8 2 12 10 10 20-2 8-8 12-10 12s-6-6-4-14c1-8 0-16 4-18z" fill="#6aaa45"/><circle cx="28" cy="30" r="1" fill="#4e8a34"/><circle cx="30" cy="38" r="1" fill="#4e8a34"/>`);
  put('lettuce', `<path d="M32 44c-14 0-20-10-16-20 4 4 8 2 10-2 2 6 6 8 10 4 4 6 8 6 12 2 4 10-4 16-16 16z" fill="#7dcc6a"/><path d="M32 44c-8-4-10-12-6-18 4 4 8 2 8-2 2 6 6 6 8 2 0 8-2 14-10 18z" fill="#4eaf45"/>`);
  put('romaine', `<path d="M32 16c6 8 10 16 8 28H24c-2-12 2-20 8-28z" fill="#8ed36a"/><path d="M32 18v24" stroke="#4eaf45"/>`);
  put('rocket', `<path d="M32 44c-2-10 2-18 0-26 6 6 10 14 8 26z" fill="#3f8f4e"/><path d="M32 44c2-10-2-18 0-26-6 6-10 14-8 26z" fill="#2f6e3c"/>`);
  put('mache', `<ellipse cx="26" cy="36" rx="8" ry="5" fill="#8ed36a" transform="rotate(-30 26 36)"/><ellipse cx="36" cy="34" rx="8" ry="5" fill="#6aaa45" transform="rotate(20 36 34)"/><ellipse cx="32" cy="42" rx="8" ry="4" fill="#4eaf45"/>`);
  put('endive', `<path d="M28 16c8 4 12 16 8 30-6 2-14-2-14-12 0-8 2-14 6-18z" fill="#f3e6a8"/><path d="M30 20c4 8 4 16 2 24" stroke="#e2d48a" fill="none"/>`);
  put('spinach', `<ellipse cx="24" cy="36" rx="10" ry="6" fill="#2f6e3c" transform="rotate(-40 24 36)"/><ellipse cx="38" cy="34" rx="11" ry="6" fill="#3f8f4e" transform="rotate(30 38 34)"/><path d="M32 44V28" stroke="#246b34" stroke-width="1.4"/>`);
  put('shoots', `<path d="M22 44c0-12 4-20 10-24 6 4 10 12 10 24" fill="#8ed36a"/><path d="M28 44c2-8 4-12 8-16" fill="#c8ee9a"/>`);
  put('frisee', `<path d="M32 44c-2-6-8-8-12-6 6-2 8-8 6-14 4 4 8 4 12 0 0 6 2 10 8 12-6 0-10 4-14 8z" fill="#d4ee7a"/>`);
  put('cress', `<circle cx="24" cy="30" r="4" fill="#3f8f4e"/><circle cx="34" cy="26" r="4" fill="#5aaf4a"/><circle cx="40" cy="34" r="3.5" fill="#2f6e3c"/><path d="M28 44c2-10 8-16 12-18" stroke="#246b34" fill="none"/>`);
  put('sorrel', `<ellipse cx="28" cy="34" rx="10" ry="6" fill="#6aaa45" transform="rotate(-20 28 34)"/><path d="M24 40h16" stroke="#246b34"/>`);
  put('pakchoi', `<path d="M32 20v24" stroke="#f7f4ee" stroke-width="4"/><ellipse cx="22" cy="32" rx="8" ry="5" fill="#3f8f4e" transform="rotate(-50 22 32)"/><ellipse cx="42" cy="32" rx="8" ry="5" fill="#3f8f4e" transform="rotate(50 42 32)"/><ellipse cx="26" cy="40" rx="7" ry="4" fill="#5aaf4a" transform="rotate(-20 26 40)"/><ellipse cx="38" cy="40" rx="7" ry="4" fill="#5aaf4a" transform="rotate(20 38 40)"/>`);
  put('leek', `<path d="M28 44c-2-12 2-20 4-28 2 8 6 16 4 28z" fill="#f7f4ee"/><path d="M26 28c-4-10 2-18 6-20M38 28c4-10-2-18-6-20" stroke="#3f8f4e" stroke-width="3" fill="none" stroke-linecap="round"/>`);
  put('mushroom', `<path d="M14 34c2-12 32-14 36 0-8 4-28 4-36 0z" fill="#f3e6d0"/><rect x="28" y="32" width="8" height="14" rx="2" fill="#fff6ea"/><circle cx="24" cy="30" r="1.4" fill="#e2d4c0"/><circle cx="34" cy="28" r="1.6" fill="#e2d4c0"/>`);
  put('morel', `<ellipse cx="32" cy="28" rx="10" ry="12" fill="#6e4a32"/><circle cx="28" cy="24" r="2" fill="#4e3222"/><circle cx="35" cy="28" r="2.2" fill="#4e3222"/><circle cx="30" cy="34" r="1.8" fill="#4e3222"/><rect x="29" y="38" width="6" height="10" rx="2" fill="#f3e6d0"/>`);
  put('broccoli', `<circle cx="24" cy="30" r="7" fill="#3f8f4e"/><circle cx="36" cy="28" r="8" fill="#2f6e3c"/><circle cx="32" cy="36" r="6" fill="#4eaf45"/><path d="M32 40v10" stroke="#6b8f4e" stroke-width="3"/>`);
  put('cauliflower', `<circle cx="24" cy="34" r="7" fill="#f7f4ee"/><circle cx="36" cy="32" r="8" fill="#fff"/><circle cx="32" cy="40" r="6" fill="#f3e6d0"/><path d="M28 44h8" stroke="#d7d0c4"/>`);
  put('brussels', `<circle cx="32" cy="36" r="10" fill="#3f8f4e"/><path d="M32 26v20M24 32c8 4 12 4 16 0" stroke="#2f6e3c" fill="none"/><path d="M32 20v8" stroke="#6b8f4e" stroke-width="2"/>`);
  put('kale', `<path d="M32 46c-8-2-14-10-10-20 6 2 8-2 10-8 2 6 6 8 12 6 2 10-4 20-12 22z" fill="#2f6e3c"/><path d="M32 22v20" stroke="#1f4e2c"/>`);
  put('cabbage-green', `<circle cx="32" cy="36" r="14" fill="#7dcc6a"/><path d="M32 22c-6 8-6 16 0 28 6-12 6-20 0-28z" fill="#4eaf45"/>`);
  put('cabbage-red', `<circle cx="32" cy="36" r="14" fill="#8a3060"/><path d="M32 22c-6 8-6 16 0 28 6-12 6-20 0-28z" fill="#6e2348"/>`);
  put('cabbage-white', `<ellipse cx="32" cy="38" rx="14" ry="12" fill="#e7f0d4"/><path d="M32 26c-4 8-4 14 0 22 4-8 4-14 0-22z" fill="#f7f4ee"/>`);
  put('kohlrabi', `<circle cx="32" cy="38" r="12" fill="#c6dd8a"/><path d="M32 18v10M24 22c4 4 12 4 16 0" stroke="#3f8f4e" stroke-width="2" fill="none"/>`);
  put('sauerkraut', `<path d="M16 32h32v14H16z" fill="#f7f4ee"/><path d="M18 36c4 2 6-2 10 0s6 2 10 0 6-2 8 0" stroke="#e2d48a" fill="none"/>`);
  put('eggplant', `<path d="M28 20c10 2 16 14 12 28-6 4-16 2-18-8-2-10 0-18 6-20z" fill="#5c3d73"/><path d="M26 22c4-6 12-6 14-2" fill="#3f8f4e"/>${g(30, 30, 2, 3)}`);
  put('corn', `<path d="M32 16c8 4 10 14 8 28-6 2-12 0-14-6-2-10 0-18 6-22z" fill="#f0c14a"/><path d="M28 24h8M27 30h10M28 36h8M30 42h6" stroke="#e2a83a"/><path d="M24 20c8 6 16 8 22 4" fill="#6aaa45"/>`);
  put('peas', `<circle cx="24" cy="38" r="5" fill="#7dcc6a"/><circle cx="34" cy="36" r="5" fill="#8ed36a"/><circle cx="42" cy="40" r="4" fill="#5aaf4a"/><path d="M20 36c8-10 20-8 26 2" fill="none" stroke="#3f8f4e" stroke-width="1.4"/>`);
  put('snow-peas', `<path d="M16 40c8-14 24-16 34-4-8 2-16 6-20 10-6 0-12-2-14-6z" fill="#8ed36a"/><circle cx="28" cy="36" r="1.4" fill="#3f8f4e"/><circle cx="34" cy="34" r="1.4" fill="#3f8f4e"/>`);
  put('sprouts', `<path d="M22 42c2-10 4-14 10-18M32 24c4 6 6 12 4 18M40 42c-2-8 0-14 6-16" stroke="#f7f4ee" stroke-width="2" fill="none"/><circle cx="32" cy="22" r="3" fill="#f6d48a"/><circle cx="22" cy="28" r="2.4" fill="#8ed36a"/><circle cx="44" cy="26" r="2.4" fill="#8ed36a"/>`);
  put('green-bean', `<path d="M14 42c10-16 26-18 36-6" fill="none" stroke="#3f8f4e" stroke-width="4" stroke-linecap="round"/><path d="M18 38c8-8 20-8 28-2" fill="none" stroke="#6aaa45" stroke-width="1.2"/>`);
  put('chickpea', `<circle cx="24" cy="38" r="6" fill="#e2c07a"/><circle cx="36" cy="34" r="6.5" fill="#f0d09a"/><circle cx="42" cy="42" r="5" fill="#d7b06a"/>`);
  put('bean-red', `<ellipse cx="26" cy="38" rx="8" ry="5" fill="#c45040" transform="rotate(-20 26 38)"/><ellipse cx="40" cy="36" rx="8" ry="5" fill="#d4232a" transform="rotate(16 40 36)"/>`);
  put('bean-white', `<ellipse cx="26" cy="38" rx="8" ry="5" fill="#f7f4ee" stroke="#e2d8c8" transform="rotate(-20 26 38)"/><ellipse cx="40" cy="36" rx="8" ry="5" fill="#fff" stroke="#e2d8c8" transform="rotate(16 40 36)"/>`);
  put('bean-black', `<ellipse cx="26" cy="38" rx="8" ry="5" fill="#2a241c" transform="rotate(-20 26 38)"/><ellipse cx="40" cy="36" rx="8" ry="5" fill="#3a3228" transform="rotate(16 40 36)"/>`);
  put('flageolet', `<ellipse cx="28" cy="38" rx="9" ry="5" fill="#d7e6c4"/><ellipse cx="40" cy="36" rx="7" ry="4" fill="#e7f0d4"/>`);
  put('lentil-green', `<ellipse cx="24" cy="38" rx="7" ry="4" fill="#6a7a3a"/><ellipse cx="36" cy="34" rx="7" ry="4" fill="#4e5e28"/><ellipse cx="40" cy="42" rx="6" ry="3.4" fill="#7d8a48"/>`);
  put('lentil-coral', `<ellipse cx="24" cy="38" rx="7" ry="4" fill="#e28a62"/><ellipse cx="36" cy="34" rx="7" ry="4" fill="#f0a070"/><ellipse cx="42" cy="42" rx="5" ry="3" fill="#d47850"/>`);
  put('lentil-black', `<ellipse cx="26" cy="38" rx="7" ry="4" fill="#2a241c"/><ellipse cx="38" cy="36" rx="7" ry="4" fill="#3a3228"/>`);
  put('fava', `<ellipse cx="26" cy="38" rx="8" ry="5" fill="#8ed36a"/><ellipse cx="40" cy="36" rx="7" ry="4" fill="#6aaa45"/>`);
  put('edamame', `<path d="M16 38c8-10 24-10 32 0-8 6-24 6-32 0z" fill="#7dcc6a"/><ellipse cx="26" cy="37" rx="4" ry="2.4" fill="#c8ee9a"/><ellipse cx="36" cy="36" rx="4" ry="2.4" fill="#c8ee9a"/>`);
  put('split-pea', `<circle cx="26" cy="38" r="7" fill="#c6dd4a"/><circle cx="38" cy="36" r="7" fill="#d4ee7a"/><path d="M38 30v12" stroke="#b0c840"/>`);
  put('avocado', `<path d="M32 14c10 4 14 16 10 30-6 6-16 4-18-4-4-12 0-24 8-26z" fill="#5aaf4a"/><circle cx="32" cy="36" r="6" fill="#6b4428"/><circle cx="32" cy="36" r="3" fill="#c9844a"/>`);
  put('beet', `<circle cx="32" cy="38" r="12" fill="#8a2458"/><path d="M28 20c2 6 6 8 8 14M24 22c6 2 8 8 8 12M36 18c2 8 0 12-2 16" stroke="#3f8f4e" stroke-width="1.6" fill="none"/>`);
  put('turnip', `<path d="M22 28h20l-4 16H26z" fill="#f7f4ee"/><circle cx="32" cy="26" r="10" fill="#f3e6d0"/><path d="M30 14c2 4 4 6 2 10" stroke="#3f8f4e" stroke-width="2" fill="none"/>`);
  put('fennel', `<path d="M24 40h16l-2 8H26z" fill="#f7f4ee"/><path d="M22 40c2-10 6-16 10-20 4 4 8 10 10 20" fill="#e7f0d4"/><path d="M28 22c-4-6 0-10 4-8M36 22c4-6 0-10-4-8" stroke="#7dcc6a" fill="none"/>`);
  put('celery', `<path d="M24 44V24M32 46V18M40 44V26" stroke="#8ed36a" stroke-width="4" stroke-linecap="round"/><path d="M24 28c-4-6 0-10 2-8M40 28c4-6 0-10-2-8" stroke="#3f8f4e" stroke-width="2" fill="none"/>`);
  put('celeriac', `<circle cx="32" cy="38" r="13" fill="#e7d2a8"/><path d="M24 34c4 2 6 6 4 10M34 30c4 4 4 8 2 12" stroke="#c9b48a" fill="none"/><path d="M30 18c2 4 4 6 2 8" stroke="#6aaa45" stroke-width="2" fill="none"/>`);
  put('radish', `<circle cx="32" cy="38" r="10" fill="#e23d32"/><path d="M28 24c2-8 8-10 8-2M24 22c4-4 6 0 4 4M38 20c4-2 6 4 2 6" stroke="#3f8f4e" stroke-width="1.6" fill="none"/><path d="M32 46v6" stroke="#f7f4ee" stroke-width="2"/>`);
  put('parsnip', `<path d="M30 16c6 8 10 18 6 30-6 2-12-2-12-12 0-8 2-14 6-18z" fill="#f3e6c8"/><path d="M28 18c-4-4 2-8 4-4" stroke="#6aaa45" stroke-width="2" fill="none"/>`);
  put('artichoke', `<path d="M32 16c8 4 12 12 8 26-6 4-14 2-16-6-2-8 2-16 8-20z" fill="#6aaa45"/><path d="M26 28c6 2 10 2 14-2M26 34c6 2 10 2 14-2" stroke="#4e8a34" fill="none"/>`);
  put('asparagus', `<path d="M26 46c-2-16 2-24 4-30 2 6 6 14 4 30" fill="#8ed36a"/><path d="M34 46c2-14 6-22 4-28 4 8 2 18-4 28" fill="#6aaa45"/><path d="M22 44c-2-12 2-20 2-26 3 8 2 16-2 26" fill="#4eaf45"/>`);
  put('asparagus-white', `<path d="M28 46c-1-16 2-24 4-30 2 8 4 16 2 30z" fill="#f7f4ee"/><path d="M36 46c1-14 4-22 2-28 3 8 2 16-2 28z" fill="#f3e6d0"/>`);
  put('butternut', `<circle cx="26" cy="40" r="12" fill="#e7a35a"/><circle cx="40" cy="28" r="7" fill="#f0c36e"/><path d="M36 32c-4 4-6 6-8 8" stroke="#d4890b" fill="none"/>`);
  put('pumpkin', `<circle cx="32" cy="38" r="14" fill="#e26a2c"/><path d="M32 24v28M22 34c6 6 14 6 20 0" stroke="#c45020" fill="none"/><rect x="30" y="16" width="4" height="8" rx="1" fill="#6b8f4e"/>`);
  put('potimarron', `<circle cx="32" cy="38" r="13" fill="#d4562a"/><path d="M32 26v22" stroke="#b43e1c"/><path d="M30 16c4-4 8 0 4 4" fill="#3f8f4e"/>`);
  put('topinambour', `<ellipse cx="28" cy="38" rx="10" ry="7" fill="#c9a06a" transform="rotate(-20 28 38)"/><ellipse cx="40" cy="36" rx="8" ry="6" fill="#b89058"/>`);
  put('olive-black', `<ellipse cx="28" cy="38" rx="7" ry="9" fill="#2a241c" transform="rotate(-16 28 38)"/><ellipse cx="40" cy="36" rx="6" ry="8" fill="#3a3228" transform="rotate(12 40 36)"/>`);
  put('olive-green', `<ellipse cx="28" cy="38" rx="7" ry="9" fill="#6a8a32" transform="rotate(-16 28 38)"/><ellipse cx="40" cy="36" rx="6" ry="8" fill="#8aaa44" transform="rotate(12 40 36)"/>`);
  put('caper', `<circle cx="26" cy="38" r="4" fill="#6a8a32"/><circle cx="36" cy="34" r="3.4" fill="#8aaa44"/><circle cx="40" cy="42" r="3" fill="#4e6a28"/>`);

  put('parsley', `<path d="M32 46V30"/><path d="M32 34c-8-2-12-8-10-12 6 2 8 6 10 12 2-8 6-12 12-12-2 6-4 10-12 12z" fill="#3f8f4e" stroke="#246b34"/>`);
  put('basil', `<ellipse cx="24" cy="36" rx="10" ry="5" fill="#3f8f4e" transform="rotate(-40 24 36)"/><ellipse cx="40" cy="34" rx="10" ry="5" fill="#2f6e3c" transform="rotate(40 40 34)"/><ellipse cx="32" cy="28" rx="6" ry="8" fill="#4eaf45"/>`);
  put('mint', `<path d="M32 46V24"/><ellipse cx="24" cy="30" rx="8" ry="4" fill="#3f8f4e" transform="rotate(-50 24 30)"/><ellipse cx="40" cy="28" rx="8" ry="4" fill="#2f6e3c" transform="rotate(50 40 28)"/><path d="M28 34h8M27 38h10" stroke="#1f4e2c"/>`);
  put('dill', `<path d="M32 46V22" stroke="#6aaa45" stroke-width="1.4"/><path d="M32 26c-8 2-10 6-8 8M32 30c8 2 10 4 8 8M32 36c-6 2-8 4-6 6" stroke="#8ed36a" stroke-width="1.2" fill="none"/>`);
  put('chive', `<path d="M24 44c-2-16 2-26 2-26M32 46V18M40 44c2-18-2-24-2-24" stroke="#3f8f4e" stroke-width="2.4" fill="none" stroke-linecap="round"/>`);
  put('cilantro', `<path d="M32 46V28" stroke="#246b34"/><circle cx="24" cy="30" r="5" fill="#5aaf4a"/><circle cx="36" cy="26" r="5" fill="#3f8f4e"/><circle cx="40" cy="36" r="4" fill="#6aaa45"/>`);
  put('thyme', `<path d="M20 44c8-6 16-16 24-26" stroke="#6b8f4e" stroke-width="1.4" fill="none"/><circle cx="26" cy="38" r="2.2" fill="#3f8f4e"/><circle cx="32" cy="32" r="2.2" fill="#4eaf45"/><circle cx="38" cy="26" r="2" fill="#2f6e3c"/>`);
  put('rosemary', `<path d="M32 46V16" stroke="#4e6a38" stroke-width="1.6"/><path d="M32 20l-6 4M32 26l6 4M32 32l-6 4M32 38l6 4" stroke="#3f8f4e" stroke-width="2" stroke-linecap="round"/>`);
  put('sage', `<ellipse cx="32" cy="34" rx="12" ry="8" fill="#8a9a78"/><path d="M24 34h16M32 26v16" stroke="#6a7a58"/>`);
  put('oregano', `<circle cx="24" cy="32" r="5" fill="#4e8a34"/><circle cx="36" cy="28" r="4" fill="#3f8f4e"/><circle cx="40" cy="38" r="4" fill="#6aaa45"/><path d="M22 44c6-8 12-12 18-16" stroke="#246b34" fill="none"/>`);
  put('herbes', `<path d="M22 44c2-12 6-16 8-22M34 44c0-14 6-18 10-24" stroke="#3f8f4e" stroke-width="2" fill="none"/><circle cx="30" cy="20" r="3" fill="#6aaa45"/><circle cx="44" cy="18" r="3" fill="#4eaf45"/>`);
  put('bay', `<ellipse cx="32" cy="34" rx="8" ry="14" fill="#6a7a40"/><path d="M32 22v24" stroke="#4e5e28"/>`);
  put('lemongrass', `<path d="M26 46c2-20 4-28 8-32 2 8 4 16 2 32z" fill="#c6dd6a"/><path d="M34 44c4-16 2-26 0-32" fill="#8aaa44"/>`);
  put('ginger', `<path d="M18 38c4-4 8-2 12 2 4-6 10-6 14-2 4 2 6 6 2 10-6 2-10 0-14 2-4 4-10 2-14-2-4-4-4-8 0-10z" fill="#e2b56e"/><path d="M24 36c4 2 8 2 12 0" stroke="#c4924e" fill="none"/>`);
  put('ginger-powder', `<ellipse cx="32" cy="40" rx="14" ry="6" fill="#e7d2a8"/><path d="M20 40c4-10 20-10 24 0" fill="#f3e6c8"/><ellipse cx="32" cy="28" rx="4" ry="6" fill="#d7c09a"/>`);
  put('salt', `<path d="M22 26h20l-4 20H26z" fill="#f7f4ee"/><circle cx="28" cy="34" r="1.2" fill="#fff"/><circle cx="34" cy="38" r="1.4" fill="#fff"/><circle cx="36" cy="32" r="1" fill="#fff"/><path d="M24 24h16" stroke="#d7d0c4" stroke-width="2"/>`);
  put('peppercorn', `<circle cx="26" cy="38" r="5" fill="#3a3228"/><circle cx="36" cy="34" r="5.5" fill="#2a241c"/><circle cx="40" cy="42" r="4" fill="#4a4038"/>${g(34, 32, 1.6, 1)}`);
  put('fleur-sel', `<path d="M32 24l2 6 6 2-6 2-2 6-2-6-6-2 6-2z" fill="#f7f4ee"/><path d="M22 40l1.4 4 4 1.4-4 1.4L22 51l-1.4-4-4-1.4 4-1.4z" fill="#fff"/><path d="M44 36l1 3 3 1-3 1-1 3-1-3-3-1 3-1z" fill="#fff"/>`);
  put('salt-pepper', `<path d="M18 28h12l-2 16H20z" fill="#f7f4ee"/><circle cx="40" cy="36" r="7" fill="#2a241c"/>${g(37, 33, 2, 1.4)}`);
  put('paprika', `<ellipse cx="32" cy="40" rx="14" ry="6" fill="#f3e0c8"/><path d="M20 40c2-8 22-10 26 0" fill="#d4232a"/><ellipse cx="32" cy="36" rx="8" ry="3" fill="#ef4d3a"/>`);
  put('paprika-smoked', `<ellipse cx="32" cy="40" rx="14" ry="6" fill="#e7d2c0"/><path d="M20 40c2-8 22-10 26 0" fill="#8a3030"/><path d="M28 24c2 4 6 4 8 0" stroke="#8a8a8a" fill="none" opacity=".6"/>`);
  put('cumin', `<ellipse cx="22" cy="38" rx="6" ry="2.4" fill="#8a6a3a" transform="rotate(-30 22 38)"/><ellipse cx="34" cy="34" rx="6" ry="2.4" fill="#a8844a" transform="rotate(20 34 34)"/><ellipse cx="40" cy="42" rx="5" ry="2" fill="#6e522c" transform="rotate(-10 40 42)"/>`);
  put('curry', `<ellipse cx="32" cy="40" rx="14" ry="6" fill="#f6e6c0"/><path d="M18 40c4-10 24-10 28 0" fill="#e2a83a"/><ellipse cx="32" cy="36" rx="8" ry="3" fill="#f0c14a"/>`);
  put('curry-paste', `<path d="M24 20h16v8l4 18H20L24 28z" fill="#f4f1ea"/><path d="M24 34h16c-1 6-4 10-8 10s-7-4-8-10z" fill="#c45020"/><rect x="26" y="16" width="12" height="5" rx="1" fill="#8a3030"/>`);
  put('cinnamon', `<path d="M22 40c0-10 4-16 6-16s4 4 2 10c6-8 10-8 12-2 2 8-4 14-10 14-6 0-10-2-10-6z" fill="#a86830"/><path d="M26 36c4 2 8 2 10-2" stroke="#6e4420" fill="none"/>`);
  put('turmeric', `<path d="M16 36c6-2 8 4 14 2 4-4 10-2 14 2 2 6-4 10-10 8-4 4-12 2-16-2-2-4 0-8-2-10z" fill="#e2a020"/><path d="M24 36c6 2 12 0 16-2" stroke="#c48410" fill="none"/>`);
  put('saffron', `<path d="M24 42c2-12 4-16 8-20M30 44c4-14 8-16 12-18M36 42c2-10 8-14 10-12" stroke="#d4232a" stroke-width="1.6" fill="none" stroke-linecap="round"/><ellipse cx="32" cy="46" rx="10" ry="3" fill="#f6e6c0"/>`);
  put('nutmeg', `<circle cx="32" cy="36" r="12" fill="#8a6238"/><path d="M32 24c4 6 4 18 0 24-4-6-4-18 0-24z" fill="#c9a06a"/><path d="M22 36h20" stroke="#6e4420"/>${g(26, 30, 3, 2, .25)}`);
  put('garam', `<circle cx="24" cy="38" r="4" fill="#8a6a3a"/><circle cx="34" cy="34" r="3" fill="#c45020"/><circle cx="40" cy="42" r="3.4" fill="#6e4420"/><rect x="28" y="24" width="8" height="6" rx="1" fill="#d7b888"/>`);
  put('ras-el', `<circle cx="26" cy="40" r="5" fill="#c9843a"/><circle cx="38" cy="36" r="4" fill="#a86830"/><circle cx="36" cy="44" r="3" fill="#e2a020"/><path d="M22 28h8l-1 6h-6z" fill="#8a3030"/>`);
  put('espelette', `<path d="M30 18c4 6 6 14 4 26-4 2-8 0-8-8 0-8 2-14 4-18z" fill="#c45020"/><path d="M28 16c4-4 8 0 4 4" fill="#3f8f4e"/>`);
  put('sesame', `<ellipse cx="22" cy="38" rx="4" ry="2" fill="#f3e6c8"/><ellipse cx="32" cy="34" rx="4" ry="2" fill="#fff6ea"/><ellipse cx="40" cy="40" rx="4" ry="2" fill="#e7d2a8"/><ellipse cx="30" cy="44" rx="3" ry="1.6" fill="#f6e6c0"/>`);
  put('pumpkin-seed', `<ellipse cx="24" cy="38" rx="7" ry="3" fill="#7d9a48" transform="rotate(-24 24 38)"/><ellipse cx="38" cy="36" rx="7" ry="3" fill="#8aaa44" transform="rotate(18 38 36)"/>`);
  put('five-spice', `<circle cx="24" cy="36" r="4" fill="#6e4420"/><circle cx="34" cy="32" r="3" fill="#c45020"/><circle cx="42" cy="38" r="3" fill="#2a241c"/><path d="M20 44h16" stroke="#a86830" stroke-width="2"/>`);
  put('spice-mix', `<ellipse cx="32" cy="40" rx="14" ry="6" fill="#e7d2a8"/><circle cx="26" cy="38" r="2" fill="#c45020"/><circle cx="34" cy="36" r="2" fill="#e2a020"/><circle cx="40" cy="40" r="2" fill="#6e4420"/>`);
  put('wasabi', `<path d="M22 40c4-8 16-10 20-2 2 6-4 10-10 10s-12-2-10-8z" fill="#7dcc6a"/><path d="M28 36c4 2 8 2 10 0" stroke="#4eaf45" fill="none"/>`);
  put('vanilla', `<path d="M30 14c2 10 4 20 2 32-2-8-4-18-2-32z" fill="#4e3222"/><path d="M34 18c2 8 2 18 0 28" stroke="#6e4420" fill="none"/>`);

  put('chicken-breast', `<path d="M16 36c4-10 14-14 22-8 8 2 12 10 8 18-6 6-22 6-30-10z" fill="#f4d2b8"/><path d="M22 34c8 2 16 2 22-2" stroke="#e2b89a" fill="none"/>${g(24, 32, 3, 2)}`);
  put('chicken-leg', `<circle cx="26" cy="36" r="10" fill="#e7b89a"/><path d="M32 32c8-2 16 2 16 8" stroke="#f4d2b8" stroke-width="8" stroke-linecap="round"/><circle cx="48" cy="38" r="3" fill="#f7f4ee"/>`);
  put('whole-chicken', `<ellipse cx="32" cy="38" rx="16" ry="11" fill="#f0c8a4"/><circle cx="46" cy="30" r="6" fill="#e7b89a"/><path d="M18 40c-4 4-6 8-2 8M22 44c2 4 8 4 8 0" stroke="#e2a880" stroke-width="2" fill="none"/><circle cx="48" cy="28" r="1" fill="#2a241c"/>`);
  put('drumstick', `<circle cx="24" cy="38" r="9" fill="#e2a83a"/><path d="M30 34c10-4 16 0 16 6" stroke="#f0c36e" stroke-width="7" stroke-linecap="round"/><circle cx="46" cy="38" r="2.4" fill="#f7f4ee"/>`);
  put('chicken-mince', `<path d="M16 40c2-8 8-12 16-12s14 4 16 12c-4 6-12 8-16 8s-14-2-16-8z" fill="#f0c0a8"/><circle cx="26" cy="38" r="2" fill="#e2a890"/><circle cx="36" cy="40" r="2.4" fill="#e2a890"/>`);
  put('tenders', `<path d="M20 28c4 6 2 14-2 18M30 22c4 8 2 16-2 22M40 26c4 6 2 14-1 18" stroke="#f4d2b8" stroke-width="5" stroke-linecap="round"/>`);
  put('turkey', `<path d="M16 34c6-8 20-10 28-2 4 8-2 16-12 16-12 0-18-6-16-14z" fill="#f4d2b8"/><path d="M20 36h20" stroke="#e2b89a"/>`);
  put('turkey-roast', `<ellipse cx="32" cy="38" rx="16" ry="10" fill="#e7c2a4"/><path d="M20 36h24" stroke="#c9846a"/><path d="M32 28v16" stroke="#d7a890"/>`);
  put('beef-mince', `<path d="M14 40c2-10 10-14 18-14s16 4 18 14c-6 8-14 10-18 10s-14-2-18-10z" fill="#8e3a32"/><circle cx="26" cy="38" r="2.2" fill="#a84840"/><circle cx="36" cy="40" r="2.6" fill="#a84840"/><circle cx="32" cy="34" r="1.8" fill="#a84840"/>`);
  put('beef-stew', `<path d="M18 36h8l2 10h-8zM30 32h10l2 14H32zM22 28h8l1 8h-8z" fill="#8e3a32"/><path d="M20 26h6" stroke="#f4d2b8" stroke-width="2"/>`);
  put('steak', `<ellipse cx="32" cy="38" rx="16" ry="11" fill="#a33b32"/><path d="M20 36c6 4 16 4 24 0" stroke="#6e2420" fill="none"/><path d="M18 34c2-6 6-8 8-4" fill="#f4d2b8"/>`);
  put('entrecote', `<path d="M14 36c4-10 28-12 36-2 2 8-6 14-16 14-14 0-22-4-20-12z" fill="#8e2f2f"/><path d="M16 32c4 6 6 8 4 12" fill="#f3e6d0"/>`);
  put('beef-cheek', `<path d="M18 34c4-8 20-10 28-2 4 8 0 16-10 16-12 0-20-6-18-14z" fill="#7a3030"/><path d="M24 36c6 4 12 4 16 0" stroke="#5a2020" fill="none"/>`);
  put('pork', `<ellipse cx="32" cy="38" rx="16" ry="10" fill="#f4c2b0"/><path d="M18 36c8 4 18 4 26 0" fill="#fff" opacity=".35"/><path d="M22 40h20" stroke="#e2a898"/>`);
  put('pork-ribs', `<path d="M16 30h30M16 38h30M16 46h30" stroke="#e7c2a4" stroke-width="4"/><path d="M22 26v24M32 26v24M42 26v24" stroke="#f7f4ee" stroke-width="2"/>`);
  put('pork-filet', `<path d="M16 38c6-10 26-12 34-2 2 8-6 12-16 12S14 46 16 38z" fill="#f4c2b0"/>${g(24, 34, 4, 2)}`);
  put('pork-mince', `<path d="M16 40c2-8 10-12 16-12s14 4 16 12c-4 6-12 8-16 8s-12-2-16-8z" fill="#f0b0a0"/><circle cx="28" cy="38" r="2" fill="#e29890"/><circle cx="38" cy="40" r="2.2" fill="#e29890"/>`);
  put('lamb', `<path d="M18 40c2-12 12-16 20-12 8 2 10 10 6 16-8 4-22 4-26-4z" fill="#c4786a"/><path d="M22 28c4-6 10-6 12-2" stroke="#f4d2b8" fill="none"/>`);
  put('lamb-leg', `<path d="M20 40c4-14 16-18 22-8 4 6 2 14-4 16-10 4-20 2-18-8z" fill="#c4786a"/><circle cx="42" cy="28" r="5" fill="#f4d2b8"/>`);
  put('lamb-chop', `<ellipse cx="28" cy="40" rx="12" ry="8" fill="#c4786a"/><circle cx="44" cy="30" r="6" fill="#f7f4ee"/><path d="M36 36l6-4" stroke="#f4d2b8" stroke-width="3"/>`);
  put('veal', `<ellipse cx="32" cy="38" rx="15" ry="10" fill="#f4d2c4"/><path d="M20 36h22" stroke="#e7c2b4"/>`);
  put('veal-roast', `<ellipse cx="32" cy="38" rx="16" ry="11" fill="#e7c2b0"/><path d="M32 28v18M22 38h20" stroke="#d7a898"/>`);
  put('blanquette', `<circle cx="26" cy="38" r="7" fill="#f7f4ee"/><circle cx="38" cy="34" r="6" fill="#fff"/><circle cx="36" cy="44" r="5" fill="#f3e6d0"/><path d="M18 46h28" stroke="#e6d8c4"/>`);
  put('liver', `<path d="M16 36c4-10 16-12 24-6 6 4 8 12 4 18-8 4-22 4-28-12z" fill="#7a3038"/>${g(24, 32, 3, 2, .2)}`);
  put('kidney', `<ellipse cx="26" cy="38" rx="8" ry="10" fill="#8a3a40"/><ellipse cx="38" cy="38" rx="8" ry="10" fill="#a84850"/><path d="M32 30v16" stroke="#f4d2c4"/>`);
  put('ham', `<circle cx="32" cy="36" r="14" fill="#f4a0a0"/><circle cx="32" cy="36" r="8" fill="#f8c0b8"/><path d="M32 22c8 4 12 10 12 14" stroke="#fff" stroke-width="3" fill="none" opacity=".7"/>`);
  put('ham-raw', `<ellipse cx="32" cy="36" rx="16" ry="10" fill="#c45050"/><ellipse cx="32" cy="36" rx="8" ry="5" fill="#f4b0a0"/><path d="M18 32c6-4 20-4 28 2" stroke="#fff" opacity=".4" fill="none"/>`);
  put('lardon', `<rect x="18" y="30" width="8" height="8" rx="1" fill="#f4a0a0"/><rect x="28" y="26" width="8" height="8" rx="1" fill="#fff"/><rect x="36" y="32" width="8" height="8" rx="1" fill="#f4b0a8"/><rect x="24" y="38" width="8" height="8" rx="1" fill="#e27878"/>`);
  put('bacon', `<path d="M16 28c6 2 8-2 14 0s8 2 14 0v6c-6 2-8-2-14 0s-8 2-14 0z" fill="#f4a0a0"/><path d="M16 36c6 2 8-2 14 0s8 2 14 0v6c-6 2-8-2-14 0s-8 2-14 0z" fill="#c45050"/><path d="M18 31h24M18 39h24" stroke="#fff" opacity=".45"/>`);
  put('pancetta', `<path d="M20 24c10 4 18 4 24 0 0 8-2 14-4 20-8 2-16 0-20-4 0-6 0-12 0-16z" fill="#e27878"/><path d="M24 28c6 2 12 2 16 0M24 36c6 2 12 2 16 0" stroke="#fff" opacity=".4" fill="none"/>`);
  put('sausage', `<path d="M14 34c4-6 10-6 12 0 2-6 8-6 12 0 2-6 8-6 12 0v8c-4 4-8 2-12 0-4 4-8 2-12 0-4 4-8 2-12 0z" fill="#e7b89a"/><path d="M26 32v12M38 32v12" stroke="#c49280"/>`);
  put('sausage-smoked', `<path d="M16 36c6-8 26-8 32 0v8c-6 6-26 6-32 0z" fill="#a86858"/><path d="M20 36h24" stroke="#6e4420" stroke-dasharray="2 2"/>`);
  put('morteau', `<path d="M14 36c4-8 32-8 36 0v6c-4 8-32 8-36 0z" fill="#c9846a"/><rect x="18" y="34" width="6" height="8" fill="#f7f4ee"/><path d="M28 36h16" stroke="#8a5040"/>`);
  put('merguez', `<path d="M12 38c6-4 10 2 16-2 6 4 10-2 16 2 4 4 2 8-2 8-6-2-10 2-14 0-4 2-10-2-14 0-4 0-6-4-2-8z" fill="#c45040"/>`);
  put('chorizo', `<path d="M16 40c2-12 8-16 12-16 6 0 8 8 6 16-2 6-8 8-12 6-6-2-8-2-6-6z" fill="#d4232a"/><circle cx="26" cy="32" r="1.2" fill="#f0c14a"/><circle cx="30" cy="38" r="1.2" fill="#f0c14a"/><circle cx="24" cy="40" r="1" fill="#f0c14a"/>`);
  put('andouille', `<path d="M18 28h28v18H18z" fill="#e7c2b0"/><path d="M18 34h28M18 40h28" stroke="#c49280"/><circle cx="32" cy="37" r="3" fill="#f4d2c4"/>`);
  put('boudin', `<path d="M14 36c6-6 30-6 36 0v6c-6 6-30 6-36 0z" fill="#3a2a2a"/><path d="M20 38h24" stroke="#6a4a4a"/>`);
  put('boudin-blanc', `<path d="M14 36c6-6 30-6 36 0v6c-6 6-30 6-36 0z" fill="#f7f4ee" stroke="#e6d8c4"/><path d="M20 38h24" stroke="#e2d4c0"/>`);
  put('saucisson', `<path d="M20 22h18c4 8 6 16 4 26H22c-2-10 0-18-2-26z" fill="#c9846a"/><path d="M24 28h12M26 36h8M28 44h4" stroke="#f3e6d0" stroke-width="1.2"/><path d="M26 20h8" stroke="#f7f4ee" stroke-width="2"/>`);
  put('sausage-meat', `<path d="M18 38c2-8 8-12 14-12s12 4 14 12c-4 6-10 8-14 8s-10-2-14-8z" fill="#f0b0a0"/><path d="M24 36c4 2 12 2 16 0" stroke="#e29890" fill="none"/>`);
  put('duck-confit', `<path d="M18 36c4-8 16-10 22-4 6 4 8 12 2 16-8 4-20 2-24-12z" fill="#c4926a"/><path d="M40 28c6-2 10 2 8 6" fill="#8a6238"/>`);
  put('magret', `<path d="M14 36c6-10 26-12 36-2 2 8-6 14-16 14S12 44 14 36z" fill="#8a3a32"/><path d="M20 34c4 2 8 2 12 0M22 40c6 2 12 2 16 0" stroke="#f4d2b8" stroke-width="1.4"/>`);
  put('gizzard', `<circle cx="26" cy="38" r="8" fill="#7a4038"/><circle cx="38" cy="36" r="7" fill="#8a5040"/>`);
  put('foie-gras', `<path d="M14 36c6-10 18-12 26-6 8 4 10 12 4 18-8 4-22 2-30-12z" fill="#e2c08a"/>${g(24, 32, 4, 2.4)}<path d="M22 38c8 3 16 2 20-2" stroke="#c9a06a" fill="none"/>`);
  put('rabbit', `<ellipse cx="28" cy="40" rx="12" ry="8" fill="#e7c8b0"/><ellipse cx="20" cy="24" rx="3" ry="10" fill="#f4d2c4"/><ellipse cx="28" cy="22" rx="3" ry="11" fill="#f4d2c4"/><circle cx="40" cy="36" r="5" fill="#f4d2c4"/><circle cx="42" cy="35" r="1" fill="#2a241c"/>`);
  put('quail', `<ellipse cx="32" cy="38" rx="12" ry="8" fill="#c9a06a"/><circle cx="44" cy="32" r="4" fill="#d7b888"/><path d="M18 36c-6 2-8 6-4 6" fill="#8a6238"/>`);
  put('pintade', `<ellipse cx="32" cy="38" rx="14" ry="10" fill="#6e7278"/><circle cx="12" cy="34" r="2" fill="#fff"/><circle cx="20" cy="30" r="2" fill="#fff"/><circle cx="28" cy="34" r="2" fill="#fff"/><circle cx="46" cy="32" r="5" fill="#5a5e64"/>`);
  put('charcuterie', `<ellipse cx="22" cy="38" rx="8" ry="6" fill="#f4a0a0"/><rect x="32" y="30" width="16" height="14" rx="3" fill="#c45050"/><path d="M34 36h12" stroke="#f4d2b8"/>`);

  put('salmon', `<path d="M12 36c8-10 28-12 40-4 2 8-4 14-16 14-14 0-26-2-24-10z" fill="#f08a5d"/><path d="M20 34c6 2 12 2 18 0M22 40c6 2 12 1 16-1" stroke="#fff" stroke-width="1.6" opacity=".8"/><path d="M48 32l6-4v12z" fill="#e26a3a"/>`);
  put('salmon-smoked', `<path d="M16 30c10-4 22-2 30 4-8 2-16 6-24 4-6-2-8-6-6-8z" fill="#f08a5d"/><path d="M18 38c12-2 24 0 32 6-10 2-22 4-30 0-4-2-4-4-2-6z" fill="#e26a3a"/><path d="M20 32h20M22 40h18" stroke="#fff" opacity=".5"/>`);
  put('tuna', `<ellipse cx="32" cy="36" rx="16" ry="10" fill="#c45050"/><path d="M18 36h28" stroke="#8a3038"/><path d="M46 32l8-4v12z" fill="#a33b40"/>`);
  put('tuna-steak', `<ellipse cx="32" cy="36" rx="14" ry="12" fill="#8a3038"/><ellipse cx="32" cy="36" rx="6" ry="5" fill="#d47870"/>`);
  put('tuna-can', `<ellipse cx="32" cy="28" rx="14" ry="5" fill="#d7d0c4"/><path d="M18 28v14c0 4 6 7 14 7s14-3 14-7V28" fill="#c45050"/><ellipse cx="32" cy="28" rx="14" ry="5" fill="#e23d32"/><path d="M18 28c0 3 6 5 14 5s14-2 14-5" fill="none" stroke="#fff" opacity=".4"/>`);
  put('white-fish', `<path d="M12 36c10-10 28-10 40-2 0 8-8 12-18 12-14 0-24-4-22-10z" fill="#f7f4ee" stroke="#d7e0ea"/><path d="M48 34l8-6v12z" fill="#e6eef4"/><circle cx="22" cy="34" r="1.4" fill="#3a4a5a"/>`);
  put('cod', `<path d="M14 36c8-8 26-10 36-2v8c-10 6-28 4-36-6z" fill="#f3e6d0"/><path d="M46 36l8-4v10z" fill="#e2d4b8"/><circle cx="22" cy="35" r="1.3" fill="#3a3228"/>`);
  put('fish-stick', `<rect x="16" y="28" width="32" height="14" rx="6" fill="#e2a83a"/><path d="M20 34h24" stroke="#f6d48a"/>`);
  put('haddock', `<path d="M14 36c8-8 28-8 36 0v8c-10 6-28 4-36-8z" fill="#f0c36e"/><path d="M46 38l8-4v8z" fill="#e2b15a"/><circle cx="22" cy="36" r="1.3" fill="#3a3228"/>`);
  put('shrimp', `<path d="M18 40c4-12 16-16 24-8 4 4 2 10-2 12-6 2-10-2-12-6" fill="none" stroke="#f27d6b" stroke-width="6" stroke-linecap="round"/><path d="M20 36c-4 2-6 6-4 8M26 42c-2 4 2 6 4 4" stroke="#f27d6b" stroke-width="1.4" fill="none"/><circle cx="40" cy="30" r="2" fill="#2a241c"/>`);
  put('gambas', `<path d="M14 42c6-16 22-20 32-8 4 6 0 12-6 12-8 0-12-4-14-10" fill="none" stroke="#e26a4a" stroke-width="7" stroke-linecap="round"/><circle cx="44" cy="28" r="2.4" fill="#2a241c"/><path d="M16 38c-6 2-8 6-4 8" stroke="#e26a4a" stroke-width="1.6" fill="none"/>`);
  put('mussel', `<path d="M22 40c0-12 20-16 22-2 0 10-8 16-11 16s-11-4-11-14z" fill="#2a241c"/><path d="M24 38c4-6 12-6 16 0" stroke="#5a5048" fill="none"/>`);
  put('squid', `<ellipse cx="32" cy="28" rx="8" ry="10" fill="#f4d2c8"/><path d="M24 36c-2 10-6 14-8 14M28 38c-1 10 0 12 2 14M36 38c1 10 0 12-2 14M40 36c2 10 6 14 8 14" stroke="#f4d2c8" stroke-width="2" fill="none" stroke-linecap="round"/><circle cx="29" cy="26" r="1" fill="#2a241c"/><circle cx="35" cy="26" r="1" fill="#2a241c"/>`);
  put('crab', `<ellipse cx="32" cy="38" rx="12" ry="8" fill="#d4562a"/><path d="M16 32c-6-6-8-2-6 2M48 32c6-6 8-2 6 2M20 44l-6 6M44 44l6 6" stroke="#d4562a" stroke-width="2" fill="none"/><circle cx="28" cy="36" r="1" fill="#2a241c"/><circle cx="36" cy="36" r="1" fill="#2a241c"/>`);
  put('scallop', `<path d="M18 40c4-14 24-16 28 0H18z" fill="#f7f4ee"/><path d="M22 40c2-8 6-10 10-10s8 2 10 10" stroke="#e2d4c0" fill="none"/><ellipse cx="32" cy="36" rx="4" ry="3" fill="#f4d2b8"/>`);
  put('oyster', `<path d="M16 38c4-12 28-14 34 0-6 8-28 8-34 0z" fill="#d7d8cc"/><ellipse cx="32" cy="36" rx="8" ry="4" fill="#f4e6d8"/>`);
  put('clam', `<path d="M14 38c6-8 30-8 36 0-8 6-28 6-36 0z" fill="#f3e6d0"/><path d="M18 36h28" stroke="#d7c4a4"/>`);
  put('octopus', `<circle cx="32" cy="30" r="10" fill="#c46b8a"/><path d="M22 38c-4 8-8 10-8 10M28 40c-2 8 0 10 2 10M36 40c2 8 0 10-2 10M42 38c4 8 8 10 8 10" stroke="#c46b8a" stroke-width="2.4" fill="none" stroke-linecap="round"/><circle cx="28" cy="28" r="1.3" fill="#2a241c"/><circle cx="36" cy="28" r="1.3" fill="#2a241c"/>`);
  put('crayfish', `<path d="M20 36c6-8 16-8 20 0v6c-6 4-16 4-20-6z" fill="#d4562a"/><path d="M18 32c-8-2-10 4-6 6M46 30l8-6M46 34l8 2" stroke="#d4562a" stroke-width="2" fill="none"/>`);
  put('seafood', `<path d="M16 40c2-8 8-8 8 0" fill="none" stroke="#f27d6b" stroke-width="3"/><path d="M30 42c0-10 8-12 10-2" fill="#2a241c"/><ellipse cx="46" cy="38" rx="6" ry="4" fill="#f7f4ee"/>`);
  put('sardine', `<path d="M12 36c10-6 30-6 40 0-10 6-30 6-40 0z" fill="#7a8a9a"/><circle cx="20" cy="36" r="1.2" fill="#fff"/><path d="M48 36l6-4v8z" fill="#5a6a7a"/>`);
  put('mackerel', `<path d="M12 36c8-8 32-8 42 0-8 8-32 8-42 0z" fill="#4a6a7a"/><path d="M22 32c4 4 4 4 0 8M30 31c4 5 4 5 0 10M38 32c4 4 4 4 0 8" stroke="#2a241c" fill="none"/><circle cx="18" cy="36" r="1.2" fill="#fff"/>`);
  put('herring', `<path d="M14 36c8-6 28-6 38 0-8 6-28 6-38 0z" fill="#9aa8b0"/><circle cx="22" cy="36" r="1.2" fill="#2a241c"/><path d="M48 36l6-3v6z" fill="#7a8a92"/>`);
  put('trout', `<path d="M12 36c8-8 30-8 40 0-6 8-28 8-40 0z" fill="#f0a070"/><circle cx="18" cy="34" r="3" fill="#c45040"/><circle cx="28" cy="38" r="2.4" fill="#c45040"/><circle cx="36" cy="33" r="2" fill="#c45040"/>`);
  put('dorade', `<path d="M12 36c10-8 30-8 40 2-8 8-30 6-40-2z" fill="#c0b0a0"/><circle cx="20" cy="35" r="1.4" fill="#2a241c"/><path d="M48 36l8-5v10z" fill="#a89888"/>`);
  put('lotte', `<path d="M18 40c4-12 20-14 28-4 4 6 2 12-4 14-10 2-22 0-24-10z" fill="#f4e6d4"/><circle cx="40" cy="32" r="2" fill="#2a241c"/>`);
  put('anchovy', `<path d="M14 38c8-4 28-6 38-2-6 4-24 6-38 2z" fill="#6a5a4a"/><circle cx="20" cy="36" r="1" fill="#fff"/>`);
  put('roe', `<circle cx="24" cy="36" r="4" fill="#f4a0a0"/><circle cx="32" cy="40" r="4" fill="#f8b8b0"/><circle cx="40" cy="34" r="4" fill="#e27878"/><circle cx="34" cy="32" r="3" fill="#f4c0b8"/>`);
  put('surimi', `<rect x="18" y="28" width="8" height="18" rx="3" fill="#f7f4ee" transform="rotate(-8 22 37)"/><rect x="28" y="26" width="8" height="18" rx="3" fill="#fff" transform="rotate(4 32 35)"/><rect x="36" y="28" width="8" height="16" rx="3" fill="#f4d2b8"/>`);

  put('rice', `<path d="M16 32h32c0 12-6 16-16 16S16 44 16 32z" fill="#f7f4ee"/><ellipse cx="32" cy="32" rx="16" ry="5" fill="#fff"/><ellipse cx="26" cy="36" rx="2" ry="3" fill="#f3e6d0"/><ellipse cx="32" cy="38" rx="2" ry="3" fill="#fff"/><ellipse cx="38" cy="35" rx="2" ry="3" fill="#f6e6c0"/><ellipse cx="30" cy="42" rx="1.6" ry="2.4" fill="#fff"/>`);
  put('black-rice', `<path d="M16 32h32c0 12-6 16-16 16S16 44 16 32z" fill="#3a3228"/><ellipse cx="32" cy="32" rx="16" ry="5" fill="#2a241c"/><ellipse cx="28" cy="38" rx="2" ry="3" fill="#1a1612"/><ellipse cx="36" cy="36" rx="2" ry="3" fill="#4a4038"/>`);
  put('pasta', `<path d="M20 30c4 2 4 10 0 12M28 26c4 4 4 14 0 16M36 28c4 3 4 12 0 14M44 32c3 2 3 8 0 10" stroke="#f0d08a" stroke-width="3" fill="none" stroke-linecap="round"/>`);
  put('spaghetti', `<path d="M18 26c2 16-2 16 2 20M24 22c3 18 0 18 2 22M30 24c2 16 2 16 0 20M36 22c2 18 4 16 2 22M42 26c2 14 0 14-1 18" stroke="#f0d08a" stroke-width="1.7" fill="none" stroke-linecap="round"/>`);
  put('lasagna', `<rect x="16" y="24" width="32" height="6" rx="1" fill="#f0d08a"/><rect x="18" y="31" width="28" height="5" fill="#d4232a"/><rect x="16" y="37" width="32" height="6" rx="1" fill="#f6e3b0"/><rect x="18" y="44" width="28" height="4" fill="#f4d2b8"/>`);
  put('tagliatelle', `<path d="M16 30h32M16 36h32M16 42h32" stroke="#f0d08a" stroke-width="3" stroke-linecap="round"/>`);
  put('penne', `<path d="M20 30l8 4v10l-8-4z" fill="#f0d08a"/><path d="M32 28l8 4v10l-8-4z" fill="#e2c07a"/><path d="M24 34h6M36 32h6" stroke="#fff" opacity=".4"/>`);
  put('macaroni', `<path d="M22 28c8 0 10 8 4 12M36 26c8 2 8 12 0 14" fill="none" stroke="#f0d08a" stroke-width="4" stroke-linecap="round"/>`);
  put('rice-noodle', `<path d="M18 28c6 4 4 10 0 14M26 24c6 6 4 14 0 18M34 26c6 4 4 12 0 16M42 30c4 4 2 8 0 12" stroke="#f7f4ee" stroke-width="2" fill="none"/>`);
  put('noodle', `<path d="M16 34c8-8 12 8 20 0s12 8 16 0" fill="none" stroke="#f0d08a" stroke-width="3" stroke-linecap="round"/><path d="M16 42c8-6 12 6 20 0s10 6 14 0" fill="none" stroke="#e2c07a" stroke-width="3"/>`);
  put('soba', `<path d="M22 22v24M30 20v28M38 22v24" stroke="#6e5a40" stroke-width="2.4" stroke-linecap="round"/>`);
  put('ramen', `<path d="M16 30h32v14c0 6-6 8-16 8s-16-2-16-8z" fill="#f7f4ee"/><path d="M18 36c6-4 10 4 16 0s10 4 14 0" stroke="#f0d08a" stroke-width="2" fill="none"/><ellipse cx="32" cy="30" rx="16" ry="4" fill="#fff"/>`);
  put('udon', `<path d="M18 28c2 16 2 16 0 18M28 24c2 18 4 16 0 20M38 26c2 16 2 16 0 18" stroke="#f7f4ee" stroke-width="4" stroke-linecap="round"/>`);
  put('flour', `<path d="M18 26h22l6 20H16z" fill="#f7f4ee"/><ellipse cx="29" cy="26" rx="11" ry="4" fill="#fff"/><path d="M24 36c4 4 10 4 14 0" fill="#f3e6d0"/>`);
  put('cornstarch', `<rect x="22" y="20" width="20" height="26" rx="2" fill="#f7f4ee"/><rect x="24" y="28" width="16" height="10" fill="#f0c14a"/><path d="M28 24h8" stroke="#e2d4c0"/>`);
  put('semolina', `<path d="M20 30h24v16H20z" fill="#f6e6c0"/><circle cx="26" cy="36" r="1.4" fill="#e2c07a"/><circle cx="32" cy="40" r="1.4" fill="#e2c07a"/><circle cx="38" cy="35" r="1.4" fill="#e2c07a"/><circle cx="30" cy="34" r="1.2" fill="#f0d08a"/>`);
  put('quinoa', `<circle cx="24" cy="36" r="3" fill="#e2c07a"/><circle cx="32" cy="32" r="3" fill="#f0d08a"/><circle cx="40" cy="36" r="3" fill="#d7b06a"/><circle cx="28" cy="42" r="2.6" fill="#c9a06a"/><circle cx="38" cy="42" r="2.6" fill="#e2c07a"/>`);
  put('bulgur', `<circle cx="22" cy="38" r="3.2" fill="#c9843a"/><circle cx="32" cy="34" r="3.4" fill="#e2a04a"/><circle cx="42" cy="38" r="3" fill="#a86830"/><circle cx="30" cy="44" r="2.6" fill="#d4890b"/>`);
  put('barley', `<ellipse cx="24" cy="36" rx="4" ry="7" fill="#e2c07a"/><ellipse cx="34" cy="34" rx="4" ry="7" fill="#f0d08a"/><ellipse cx="42" cy="38" rx="3" ry="6" fill="#d7b06a"/>`);
  put('spelt', `<ellipse cx="26" cy="38" rx="5" ry="8" fill="#c9a06a"/><ellipse cx="38" cy="36" rx="5" ry="8" fill="#d7b888"/>`);
  put('polenta', `<path d="M18 34h28v12H18z" fill="#f0c14a"/><ellipse cx="32" cy="34" rx="14" ry="4" fill="#f6d48a"/>`);
  put('tofu', `<rect x="18" y="24" width="28" height="20" rx="2" fill="#f7f4ee"/><path d="M18 32h28" stroke="#e6e0d4"/><circle cx="28" cy="28" r="1" fill="#e2d4c0"/>`);

  put('lemon', `<ellipse cx="32" cy="36" rx="16" ry="12" fill="#f5d90a"/><path d="M18 36h28" stroke="#e2c200" opacity=".6"/><path d="M46 32c4-2 6 2 4 4" fill="#6aaa45"/>${g(24, 32, 4, 2)}`);
  put('lime', `<ellipse cx="32" cy="36" rx="15" ry="12" fill="#7cb342"/><path d="M18 36h26" stroke="#5a9a32"/><path d="M44 30c4 0 6 4 2 6" fill="#3f8f4e"/>${g(24, 32, 3, 2, .3)}`);
  put('preserved-lemon', `<ellipse cx="32" cy="36" rx="14" ry="11" fill="#f0c14a"/><path d="M32 26v20M22 36h20" stroke="#c9843a"/><rect x="28" y="22" width="8" height="4" fill="#f7f4ee"/>`);
  put('orange', `<circle cx="32" cy="36" r="14" fill="#f08a2a"/>${g(26, 30, 4, 3)}<circle cx="32" cy="22" r="3" fill="#3f8f4e"/>`);
  put('grapefruit', `<circle cx="32" cy="36" r="14" fill="#f2b4a0"/><path d="M32 24v24M20 36h24" stroke="#e28a78"/><path d="M32 24c6 6 6 18 0 24-6-6-6-18 0-24z" fill="#f8d0c4"/>`);
  put('mandarin', `<circle cx="32" cy="36" r="12" fill="#f0a020"/><path d="M26 24h8" stroke="#3f8f4e" stroke-width="2" stroke-linecap="round"/>${g(27, 32, 3, 2)}`);
  put('apple', `<circle cx="32" cy="38" r="13" fill="#d4232a"/>${g(26, 32, 3, 2.4)}<path d="M32 24c2-6 8-8 8-4" stroke="#6b4428" fill="none"/><ellipse cx="38" cy="22" rx="5" ry="3" fill="#3f8f4e" transform="rotate(30 38 22)"/>`);
  put('pear', `<path d="M32 18c8 4 12 12 10 22-2 8-8 12-10 12s-8-4-10-12c-2-10 2-18 10-22z" fill="#d4e06a"/><path d="M32 18c1-6 4-8 6-6" stroke="#6b4428" fill="none"/><ellipse cx="36" cy="14" rx="4" ry="2" fill="#3f8f4e"/>`);
  put('strawberry', `<path d="M32 46c-10-2-14-12-10-22 4 2 8 0 10-4 2 4 6 6 10 4 4 10 0 20-10 22z" fill="#e23d32"/><circle cx="28" cy="32" r="1" fill="#f6d48a"/><circle cx="34" cy="36" r="1" fill="#f6d48a"/><circle cx="30" cy="40" r="1" fill="#f6d48a"/><path d="M24 24c4-4 8-2 8 2 2-4 6-4 8-1" fill="#3f8f4e"/>`);
  put('mango', `<path d="M20 36c4-12 16-16 26-8 6 6 6 16-2 22-10 6-22 2-24-14z" fill="#f0a020"/><path d="M28 24c4 8 6 14 4 22" stroke="#e28a10" fill="none"/>`);
  put('melon', `<circle cx="32" cy="36" r="14" fill="#8ed36a"/><path d="M32 22c8 6 10 14 8 22" fill="#f6e6a8"/><ellipse cx="32" cy="36" rx="5" ry="8" fill="#e7d48a"/>`);
  put('peach', `<circle cx="32" cy="36" r="13" fill="#f2a070"/>${g(26, 30, 3, 2)}<path d="M32 24v20" stroke="#e28a58"/><path d="M32 22c4-4 8-2 6 2" fill="#3f8f4e"/>`);
  put('banana', `<path d="M18 26c8 2 14 10 16 22 4-8 10-16 18-18-6 4-10 12-14 20-6 2-16-6-20-24z" fill="#f5d90a"/><path d="M22 28c6 4 10 12 12 18" stroke="#e2c200" fill="none"/>`);
  put('plantain', `<path d="M16 30c10 0 16 8 18 20 6-10 14-16 20-16-8 6-12 14-16 22-8 0-18-8-22-26z" fill="#c6a04a"/>`);
  put('apricot', `<circle cx="32" cy="36" r="12" fill="#f0a040"/><path d="M32 26v20" stroke="#e29030"/><path d="M30 22c4-4 8 0 4 4" fill="#3f8f4e"/>`);
  put('apricot-dried', `<ellipse cx="32" cy="36" rx="12" ry="8" fill="#e26a2c"/><path d="M24 36c4 2 12 2 16 0" stroke="#c45020" fill="none"/>`);
  put('prune', `<ellipse cx="32" cy="36" rx="10" ry="13" fill="#4a2a58"/><path d="M32 24v22" stroke="#3a2048"/>${g(28, 30, 2, 3, .25)}`);
  put('fig', `<path d="M32 18c8 2 12 10 10 20-4 8-16 8-20 0-2-10 2-18 10-20z" fill="#6a3058"/><path d="M26 22c4-4 8-2 8 2" fill="#3f8f4e"/><path d="M28 36c2 4 6 4 8 0" stroke="#f4d2b8" fill="none"/>`);
  put('cherry', `<circle cx="26" cy="38" r="7" fill="#c41e3a"/><circle cx="38" cy="36" r="7" fill="#d4232a"/>${g(24, 35, 2, 1.6)}<path d="M28 32c2-10 6-14 10-16M36 30c2-8 6-10 8-8" stroke="#246b34" fill="none"/>`);
  put('blueberry', `<circle cx="26" cy="38" r="6" fill="#3a4a9a"/><circle cx="38" cy="36" r="6" fill="#2a3a88"/>${g(24, 36, 1.6, 1.2, .3)}<path d="M32 24c2 4 4 6 2 8" stroke="#3f8f4e" fill="none"/>`);
  put('watermelon', `<path d="M16 36c4-10 28-12 36-2-8 10-28 10-36 2z" fill="#e23d32"/><path d="M16 36c4-6 28-8 36-2" fill="#7dcc6a"/><path d="M18 36c6-4 24-4 32 0" fill="#f7f4ee"/><circle cx="28" cy="34" r="1" fill="#2a241c"/><circle cx="36" cy="32" r="1" fill="#2a241c"/>`);
  put('kiwi', `<circle cx="32" cy="36" r="14" fill="#8a6a3a"/><circle cx="32" cy="36" r="11" fill="#c6dd6a"/><circle cx="32" cy="36" r="4" fill="#f7f4ee"/><circle cx="26" cy="32" r="1" fill="#2a241c"/><circle cx="38" cy="34" r="1" fill="#2a241c"/><circle cx="30" cy="42" r="1" fill="#2a241c"/><circle cx="38" cy="40" r="1" fill="#2a241c"/>`);
  put('pineapple', `<path d="M24 28h16l-2 20H26z" fill="#f0c14a"/><path d="M26 32h12M27 38h10M28 44h8" stroke="#e2a83a"/><path d="M26 32l4 6M34 32l-4 6M30 38l4 6" stroke="#e2a83a"/><path d="M28 18c2 4 6 6 4 10M36 16c-2 6-2 8-6 12M32 14v10" stroke="#3f8f4e" stroke-width="2" fill="none"/>`);
  put('pomegranate', `<circle cx="32" cy="36" r="13" fill="#c41e3a"/><path d="M24 28c4 2 12 2 16 0" fill="#8a1830"/><path d="M30 20c2 4 4 4 4 6" fill="#3f8f4e"/><circle cx="28" cy="38" r="1.2" fill="#f4a0a8"/><circle cx="34" cy="40" r="1.2" fill="#f4a0a8"/>`);
  put('papaya', `<ellipse cx="32" cy="36" rx="12" ry="15" fill="#f0a040"/><ellipse cx="32" cy="38" rx="5" ry="8" fill="#3a2418"/><circle cx="30" cy="34" r="1" fill="#2a241c"/><circle cx="34" cy="40" r="1" fill="#2a241c"/>`);
  put('cranberry', `<circle cx="24" cy="36" r="5" fill="#a31830"/><circle cx="34" cy="32" r="5" fill="#c41e3a"/><circle cx="40" cy="40" r="4" fill="#8a1830"/>`);
  put('red-fruit', `<circle cx="24" cy="38" r="6" fill="#e23d32"/><circle cx="36" cy="34" r="5" fill="#3a4a9a"/><circle cx="42" cy="42" r="4" fill="#c41e3a"/><path d="M22 30c2-4 6-2 4 2" fill="#3f8f4e"/>`);
  put('raisin', `<ellipse cx="24" cy="38" rx="5" ry="3" fill="#6a3058"/><ellipse cx="34" cy="34" rx="5" ry="3" fill="#4a2040"/><ellipse cx="40" cy="40" rx="4" ry="2.4" fill="#5a2848"/>`);
  put('grape', `<circle cx="26" cy="30" r="5" fill="#6a3a9a"/><circle cx="36" cy="28" r="5" fill="#7a4aaa"/><circle cx="32" cy="38" r="5" fill="#5a2a88"/><circle cx="40" cy="36" r="4" fill="#6a3a9a"/><path d="M32 18v8" stroke="#3f8f4e" stroke-width="2"/>`);
  put('coconut', `<circle cx="32" cy="36" r="14" fill="#6b4428"/><circle cx="26" cy="32" r="1.6" fill="#3a2418"/><circle cx="32" cy="30" r="1.6" fill="#3a2418"/><circle cx="30" cy="36" r="1.4" fill="#3a2418"/><path d="M32 22c6-8 14-6 12 0" fill="#f7f4ee"/>`);

  put('stock', `<rect x="22" y="18" width="20" height="26" rx="2" fill="#f6d56b"/><rect x="24" y="24" width="16" height="8" fill="#c9843a"/><path d="M26 36h12" stroke="#a86830"/>`);
  put('soy', `<path d="M26 16h12l2 8v22c0 3-3 4-8 4s-8-1-8-4V24z" fill="#3a2418"/><rect x="28" y="12" width="8" height="6" rx="1" fill="#d4232a"/><rect x="28" y="28" width="8" height="8" fill="#f0c14a"/>`);
  put('nuocmam', `<path d="M26 18h12l2 26H24z" fill="#c9843a"/><rect x="28" y="14" width="8" height="6" fill="#6e4420"/><path d="M28 30h8" stroke="#f6d48a"/>`);
  put('oyster-sauce', `<path d="M24 20h16v24H24z" fill="#3a2418"/><rect x="26" y="16" width="12" height="6" fill="#d4232a"/><ellipse cx="32" cy="34" rx="4" ry="3" fill="#d7d8cc"/>`);
  put('olive-oil', `<path d="M28 14h8l2 8-2 24H28L26 22z" fill="#c6dd4a" opacity=".9"/><path d="M28 14h8v6H28z" fill="#3f8f4e"/><path d="M30 28h6" stroke="#8aaa20"/>`);
  put('oil', `<path d="M28 16h8l4 8v20H24V24z" fill="#f0c14a"/><rect x="28" y="12" width="8" height="6" rx="1" fill="#e2a83a"/>`);
  put('sesame-oil', `<path d="M28 16h8l3 28H25z" fill="#a86830"/><rect x="28" y="12" width="8" height="6" fill="#6e4420"/><circle cx="30" cy="30" r="1" fill="#f3e6c8"/><circle cx="34" cy="34" r="1" fill="#f3e6c8"/>`);
  put('nut-oil', `<path d="M28 16h8v28H28z" fill="#c9a06a"/><rect x="28" y="12" width="8" height="6" fill="#6b4428"/><circle cx="32" cy="32" r="3" fill="#8a6238"/>`);
  put('vinegar', `<path d="M28 14h8l1 8v22H27V22z" fill="#f7f4ee"/><path d="M28 30h8v10H28z" fill="#e7d48a"/><rect x="29" y="10" width="6" height="6" fill="#c9843a"/>`);
  put('balsamic', `<path d="M28 14h8l1 8v22H27V22z" fill="#3a2418"/><rect x="29" y="10" width="6" height="6" fill="#6e4420"/><path d="M30 32h4" stroke="#c9a06a"/>`);
  put('mustard', `<path d="M24 22h16v20c0 4-3 6-8 6s-8-2-8-6z" fill="#f7f4ee"/><path d="M26 32h12v8c0 2-2 4-6 4s-6-2-6-4z" fill="#e2b020"/><ellipse cx="32" cy="22" rx="8" ry="3" fill="#d7b888"/>`);
  put('mayo', `<path d="M24 22h16v22H24z" fill="#f7f4ee"/><path d="M26 30h12v10H26z" fill="#fff"/><rect x="26" y="18" width="12" height="6" rx="1" fill="#f0c14a"/>`);
  put('ketchup', `<path d="M28 16h8c4 6 6 10 6 16 0 8-4 14-10 14s-10-6-10-14c0-6 2-10 6-16z" fill="#d4232a"/><rect x="30" y="12" width="4" height="6" fill="#f7f4ee"/>`);
  put('bbq', `<path d="M26 18h12l2 8v18H24V26z" fill="#6e2420"/><rect x="28" y="14" width="8" height="6" fill="#c45020"/><path d="M28 32h8" stroke="#f0c14a"/>`);
  put('pesto', `<path d="M24 22h16v20H24z" fill="#f4f1ea"/><path d="M26 30h12v8H26z" fill="#3f8f4e"/><rect x="28" y="18" width="8" height="5" fill="#6e4420"/>`);
  put('tahini', `<path d="M24 24h16v18H24z" fill="#f6e6c0"/><ellipse cx="32" cy="24" rx="8" ry="3" fill="#e2c07a"/><path d="M28 32h8" stroke="#d7b06a"/>`);
  put('miso', `<path d="M22 26h20v16H22z" fill="#c9843a"/><ellipse cx="32" cy="26" rx="10" ry="3" fill="#a86830"/><path d="M26 32c4 2 8 2 12 0" stroke="#e2a04a" fill="none"/>`);
  put('sugar', `<path d="M20 28h24l-2 16H22z" fill="#fff"/><ellipse cx="32" cy="28" rx="12" ry="4" fill="#f7f4ee"/><circle cx="28" cy="36" r="1.2" fill="#f3e6d0"/><circle cx="34" cy="38" r="1.2" fill="#f3e6d0"/>`);
  put('icing', `<path d="M22 34h20l-4 10H26z" fill="#fff"/><path d="M18 34c2-8 8-10 14-10s12 2 14 10" fill="#f7f4ee"/><circle cx="24" cy="30" r="1.4" fill="#fff"/><circle cx="40" cy="28" r="1.2" fill="#fff"/>`);
  put('brown-sugar', `<path d="M20 30h24v14H20z" fill="#c9843a"/><ellipse cx="32" cy="30" rx="12" ry="4" fill="#a86830"/>`);
  put('honey', `<path d="M24 20h16v6l4 18H20L24 26z" fill="#f0c14a"/><ellipse cx="32" cy="22" rx="8" ry="3" fill="#e2a83a"/><path d="M30 12c2 4 2 6 0 8" stroke="#6b4428" stroke-width="2" fill="none"/>`);
  put('maple', `<path d="M28 16h8l2 28H26z" fill="#a86830"/><rect x="29" y="12" width="6" height="6" fill="#6e4420"/><path d="M32 8l2 4h-4z" fill="#6b8f4e"/>`);
  put('chocolate', `<rect x="16" y="22" width="32" height="22" rx="2" fill="#5a3218"/><path d="M16 30h32M16 37h32M26 22v22M38 22v22" stroke="#3a2010"/>`);
  put('cocoa', `<path d="M22 24h20v20H22z" fill="#6b4428"/><ellipse cx="32" cy="24" rx="10" ry="3" fill="#4e3222"/><circle cx="28" cy="32" r="1.4" fill="#c9a06a"/><circle cx="34" cy="36" r="1.4" fill="#c9a06a"/>`);
  put('choc-chip', `<circle cx="24" cy="36" r="4" fill="#5a3218"/><circle cx="34" cy="32" r="4.5" fill="#3a2010"/><circle cx="42" cy="38" r="3.5" fill="#6b4428"/><path d="M30 40l4 4" stroke="#5a3218" stroke-width="3"/>`);
  put('praline', `<circle cx="32" cy="36" r="12" fill="#c9843a"/><path d="M24 36c4 4 12 4 16 0" stroke="#a86830" fill="none"/><circle cx="28" cy="32" r="1.4" fill="#f6d48a"/>`);
  put('yeast', `<rect x="22" y="22" width="20" height="22" rx="2" fill="#f6e6c0"/><circle cx="28" cy="30" r="2" fill="#e2c07a"/><circle cx="36" cy="34" r="2.4" fill="#d7b06a"/><circle cx="30" cy="38" r="1.8" fill="#f0d08a"/>`);
  put('baking-powder', `<rect x="22" y="18" width="20" height="26" rx="2" fill="#f7f4ee"/><rect x="24" y="26" width="16" height="8" fill="#f2c14e"/><path d="M28 22h8" stroke="#e2d4c0"/>`);
  put('almond', `<ellipse cx="28" cy="36" rx="6" ry="9" fill="#e2c07a" transform="rotate(-20 28 36)"/><ellipse cx="40" cy="36" rx="5" ry="8" fill="#f0d09a" transform="rotate(16 40 36)"/>`);
  put('almond-powder', `<ellipse cx="32" cy="40" rx="14" ry="6" fill="#f6e6c0"/><path d="M20 40c4-8 20-8 24 0" fill="#f0d09a"/><ellipse cx="26" cy="36" rx="3" ry="5" fill="#e2c07a" transform="rotate(-16 26 36)"/>`);
  put('hazelnut', `<circle cx="28" cy="38" r="7" fill="#8a6238"/><circle cx="40" cy="36" r="6" fill="#a87848"/><path d="M28 32c2 2 4 2 6 0" stroke="#6e4420" fill="none"/>`);
  put('walnut', `<path d="M20 36c2-8 10-10 12-10s10 2 12 10c-4 6-8 8-12 8s-8-2-12-8z" fill="#c9a06a"/><path d="M32 26v18M26 34c4 2 8 2 12 0" stroke="#8a6238" fill="none"/>`);
  put('pecan', `<ellipse cx="32" cy="36" rx="8" ry="14" fill="#a86830"/><path d="M32 24v24" stroke="#6e4420"/>`);
  put('cashew', `<path d="M22 40c2-12 10-16 16-10 4 4 2 10-2 12-6 4-12 4-14-2z" fill="#f0d09a"/>`);
  put('pine-nut', `<ellipse cx="24" cy="38" rx="4" ry="7" fill="#f3e6c8"/><ellipse cx="32" cy="36" rx="4" ry="8" fill="#fff6ea"/><ellipse cx="40" cy="38" rx="3.4" ry="6" fill="#e7d2a8"/>`);
  put('peanut', `<ellipse cx="26" cy="32" rx="6" ry="8" fill="#e2c07a"/><ellipse cx="34" cy="42" rx="6" ry="7" fill="#d7b06a"/><path d="M28 36c4 2 6 4 4 8" stroke="#c9a06a" fill="none"/>`);
  put('peanut-butter', `<path d="M24 22h16v20H24z" fill="#f4f1ea"/><path d="M26 30h12v8H26z" fill="#c9843a"/><rect x="28" y="18" width="8" height="5" fill="#a86830"/>`);
  put('chestnut', `<path d="M32 18c8 2 12 10 8 22-6 6-14 4-16-2-4-10 0-18 8-20z" fill="#6e4420"/><path d="M32 20v20" stroke="#4e3222"/><path d="M28 16c4-4 8 0 4 4" fill="#3f8f4e"/>`);
  put('chestnut-cream', `<path d="M24 22h16v20H24z" fill="#f7f4ee"/><path d="M26 32h12c-1 6-3 8-6 8s-5-2-6-8z" fill="#a86830"/><rect x="28" y="18" width="8" height="5" fill="#6e4420"/>`);
  put('water', `<path d="M26 16h12l2 6v22c0 3-3 5-8 5s-8-2-8-5V22z" fill="#d7eaf8" stroke="#7eb6e0"/><rect x="28" y="12" width="8" height="6" rx="1" fill="#4aa3e0"/>${g(30, 28, 2, 3, .5)}`);
  put('sparkling', `<path d="M26 16h12l2 6v22c0 3-3 5-8 5s-8-2-8-5V22z" fill="#e7f6ff" stroke="#7eb6e0"/><circle cx="30" cy="30" r="1.2" fill="#fff"/><circle cx="34" cy="36" r="1.2" fill="#fff"/><circle cx="31" cy="40" r="1" fill="#fff"/>`);
  put('wine-white', `<path d="M24 18h16l-2 14c0 6-4 8-6 8s-6-2-6-8z" fill="#f3e6a0"/><path d="M32 40v8M26 48h12" stroke="#c9b48a" stroke-width="2"/>`);
  put('wine-red', `<path d="M24 18h16l-2 14c0 6-4 8-6 8s-6-2-6-8z" fill="#8a1830"/><path d="M32 40v8M26 48h12" stroke="#6e4420" stroke-width="2"/>${g(28, 24, 2, 2, .3)}`);
  put('beer', `<path d="M22 20h16v22c0 4-3 6-8 6s-8-2-8-6z" fill="#f0c14a"/><path d="M38 24h6v10h-6" fill="none" stroke="#f0c14a" stroke-width="2"/><path d="M22 26c4 2 12 2 16 0" fill="#fff" opacity=".7"/>`);
  put('cider', `<path d="M26 16h12l2 8v20H24V24z" fill="#c6dd4a"/><rect x="28" y="12" width="8" height="6" fill="#6aaa45"/>`);
  put('porto', `<path d="M28 16h8v28H28z" fill="#6e1830"/><rect x="29" y="12" width="6" height="6" fill="#3a1020"/><path d="M30 28h4" stroke="#f0c14a"/>`);
  put('cognac', `<path d="M26 20h12l-1 8c2 2 3 6 1 10H26c-2-4-1-8 1-10z" fill="#c9843a"/><path d="M30 20v-4h4" stroke="#6e4420" fill="none"/>`);
  put('rum', `<path d="M28 18h8v26H28z" fill="#e2a04a"/><rect x="29" y="14" width="6" height="6" fill="#a86830"/>`);
  put('coffee', `<path d="M18 28h24v8c0 8-5 12-12 12s-12-4-12-12z" fill="#6b4428"/><path d="M42 30h6c0 6-2 8-6 8" fill="none" stroke="#6b4428" stroke-width="2"/><path d="M24 20c2 3-2 4 0 7M32 18c2 3-2 4 0 7" stroke="#c9b49a" fill="none"/>`);
  put('tea', `<path d="M20 30h22v6c0 8-4 12-11 12s-11-4-11-12z" fill="#c6dd6a"/><path d="M42 32h5c0 5-2 7-5 7" fill="none" stroke="#8aaa44" stroke-width="2"/><ellipse cx="24" cy="28" rx="4" ry="2" fill="#3f8f4e"/>`);
  put('gelatin', `<rect x="22" y="22" width="14" height="20" rx="1" fill="#f7f4ee" stroke="#e2d4c0"/><rect x="38" y="24" width="8" height="16" rx="1" fill="#f3e6d0" stroke="#e2d4c0"/>`);
  put('caramel', `<path d="M20 30h24c0 8-4 14-12 14s-12-6-12-14z" fill="#c9843a"/><path d="M24 26c4-6 12-6 16 0" fill="#e2a04a"/><ellipse cx="32" cy="30" rx="12" ry="3" fill="#a86830"/>`);
  put('ice-cream', `<path d="M26 36l6 14 6-14z" fill="#e2c07a"/><circle cx="32" cy="28" r="10" fill="#f7f4ee"/><circle cx="26" cy="26" r="6" fill="#f6e6c0"/>${g(28, 24, 2, 1.4)}`);
  put('sorbet', `<path d="M26 34l6 14 6-14z" fill="#e2c07a"/><circle cx="32" cy="28" r="10" fill="#e23d6a"/>${g(28, 24, 3, 2, .35)}`);
  put('speculoos', `<rect x="18" y="22" width="28" height="22" rx="3" fill="#c9843a"/><circle cx="26" cy="30" r="1.4" fill="#a86830"/><circle cx="32" cy="34" r="1.4" fill="#a86830"/><circle cx="38" cy="28" r="1.4" fill="#a86830"/><path d="M24 38h16" stroke="#a86830"/>`);
  put('biscuit', `<ellipse cx="32" cy="36" rx="14" ry="10" fill="#e2b56e"/><circle cx="26" cy="34" r="1.3" fill="#c9843a"/><circle cx="34" cy="38" r="1.3" fill="#c9843a"/><circle cx="38" cy="32" r="1.3" fill="#c9843a"/>`);
  put('meringue', `<path d="M18 40c2-12 8-16 14-16s12 4 14 16c-4 4-24 4-28 0z" fill="#fff"/><path d="M22 36c4-4 8-2 10-6 2 4 6 4 10 2" fill="#f7f4ee"/>`);
  put('nori', `<rect x="18" y="20" width="28" height="26" rx="2" fill="#1f3a32"/><path d="M22 28c6 2 14 2 20 0M22 36c6 2 14 2 20 0" stroke="#3a6a58" fill="none"/>`);
  put('wakame', `<path d="M24 20c8 6 6 14 2 26-6-8-10-12-14-10 4-6 6-12 12-16z" fill="#1f4e3c"/><path d="M36 22c6 8 4 16 0 24" stroke="#2f6e4e" stroke-width="4" fill="none"/>`);
  put('confiture', `<path d="M24 24h16v18H24z" fill="#f7f4ee"/><path d="M26 32h12v8H26z" fill="#c41e3a"/><rect x="26" y="18" width="12" height="7" rx="1" fill="#d7d0c4"/><circle cx="30" cy="36" r="1" fill="#f4a0a8"/>`);
  put('cereal', `<path d="M18 30h28v14H18z" fill="#f7f4ee"/><ellipse cx="26" cy="34" rx="4" ry="2" fill="#c9843a" transform="rotate(-20 26 34)"/><ellipse cx="34" cy="38" rx="4" ry="2" fill="#e2a04a" transform="rotate(16 34 38)"/><ellipse cx="40" cy="33" rx="3" ry="1.6" fill="#f0c14a"/>`);
  put('jam-jar', `<path d="M24 26h16v16H24z" fill="#d4232a"/><rect x="26" y="20" width="12" height="7" fill="#d7d0c4"/><path d="M28 32h8" stroke="#fff" opacity=".4"/>`);

  put('toilet-paper', `<ellipse cx="26" cy="36" rx="10" ry="12" fill="#f7f4ee"/><ellipse cx="26" cy="36" rx="4" ry="5" fill="#e6e0d4"/><path d="M36 26h8v20c-6 2-8-2-8-4z" fill="#fff"/>`);
  put('tissues', `<rect x="16" y="26" width="32" height="16" rx="2" fill="#d7eaf8"/><path d="M28 26c2 6 6 6 8 0" fill="#fff"/>`);
  put('toothpaste', `<path d="M16 30h24l6 8-6 8H16z" fill="#f7f4ee"/><rect x="16" y="30" width="8" height="16" fill="#4aa3e0"/><path d="M40 34l6 4-6 4" fill="#d7eaf8"/>`);
  put('toothbrush', `<path d="M14 38h26" stroke="#4aa3e0" stroke-width="3" stroke-linecap="round"/><rect x="36" y="30" width="12" height="10" rx="2" fill="#f7f4ee"/><path d="M38 40v4M42 40v4M46 40v4" stroke="#7eb6e0"/>`);
  put('shower-gel', `<path d="M26 18h12l2 26H24z" fill="#7eb6e0"/><rect x="28" y="14" width="8" height="6" rx="2" fill="#4aa3e0"/><path d="M28 30h8" stroke="#fff"/>`);
  put('shampoo', `<path d="M26 20h12l2 24H24z" fill="#f2a0c0"/><rect x="28" y="14" width="8" height="8" rx="2" fill="#d4789a"/>`);
  put('soap', `<rect x="16" y="28" width="32" height="16" rx="6" fill="#f7f4ee" stroke="#e2d4c0"/><path d="M22 34c6 2 14 2 20 0" stroke="#e6e0d4" fill="none"/>`);
  put('deodorant', `<rect x="26" y="20" width="12" height="24" rx="4" fill="#d7eaf8"/><rect x="28" y="16" width="8" height="6" rx="1" fill="#4aa3e0"/>`);
  put('cotton-swab', `<path d="M20 32h24" stroke="#f7f4ee" stroke-width="2"/><circle cx="18" cy="32" r="5" fill="#fff"/><circle cx="46" cy="32" r="5" fill="#fff"/>`);
  put('cotton-pad', `<ellipse cx="32" cy="36" rx="14" ry="10" fill="#fff" stroke="#e6e0d4"/><ellipse cx="32" cy="36" rx="8" ry="5" fill="#f7f4ee"/>`);
  put('razor', `<path d="M18 40h20" stroke="#8aa0b0" stroke-width="2"/><rect x="34" y="28" width="14" height="10" rx="2" fill="#4aa3e0"/><path d="M36 38h10" stroke="#d7eaf8"/>`);
  put('sanitary', `<rect x="18" y="28" width="28" height="14" rx="6" fill="#f7f4ee" stroke="#f2a0c0"/><path d="M24 35h16" stroke="#f2a0c0"/>`);
  put('lotion', `<path d="M28 20h8l4 8v16H24V28z" fill="#f7f4ee"/><rect x="28" y="14" width="8" height="8" rx="2" fill="#f2a0c0"/><path d="M26 34h12" stroke="#f2c0d4"/>`);
  put('paper-towel', `<ellipse cx="32" cy="36" rx="12" ry="14" fill="#f7f4ee"/><ellipse cx="32" cy="36" rx="4" ry="6" fill="#e6e0d4"/><path d="M20 30h24" stroke="#d7d0c4"/>`);
  put('dish-soap', `<path d="M26 18h12l2 28H24z" fill="#3faf6a"/><rect x="28" y="12" width="8" height="8" rx="2" fill="#2f8a50"/><path d="M28 30h8" stroke="#fff"/>`);
  put('dishwasher-tab', `<rect x="20" y="26" width="24" height="16" rx="3" fill="#fff"/><rect x="22" y="28" width="10" height="12" fill="#4aa3e0"/><rect x="32" y="28" width="10" height="12" fill="#f2c14e"/>`);
  put('dishwasher-salt', `<path d="M22 24h20v20H22z" fill="#f7f4ee"/><circle cx="28" cy="32" r="1.4" fill="#d7eaf8"/><circle cx="34" cy="36" r="1.4" fill="#d7eaf8"/><circle cx="32" cy="30" r="1.2" fill="#d7eaf8"/><rect x="26" y="20" width="12" height="5" fill="#4aa3e0"/>`);
  put('laundry', `<path d="M24 16h16l4 8v22H20V24z" fill="#4aa3e0"/><rect x="26" y="12" width="12" height="6" rx="1" fill="#2a7ab0"/><path d="M26 32h12" stroke="#fff"/>`);
  put('softener', `<path d="M24 18h16l2 26H22z" fill="#f2a0c0"/><rect x="28" y="14" width="8" height="6" fill="#d4789a"/><path d="M28 32h8" stroke="#fff"/>`);
  put('sponge', `<rect x="16" y="28" width="32" height="16" rx="3" fill="#f0c14a"/><path d="M16 36h32" stroke="#e2a83a"/><rect x="16" y="36" width="32" height="8" rx="2" fill="#6aaa45"/>`);
  put('trash-bag', `<path d="M22 24h20l4 22H18z" fill="#3a4a5a"/><path d="M24 24c0-4 16-4 16 0" fill="none" stroke="#2a3a4a" stroke-width="2"/><path d="M26 32h12" stroke="#5a6a7a"/>`);
  put('cleaner', `<path d="M28 22h8l6 6v16H22V28z" fill="#7eb6e0"/><rect x="30" y="12" width="4" height="12" fill="#4aa3e0"/><path d="M34 12h8" stroke="#4aa3e0" stroke-width="2"/>`);
  put('bleach', `<path d="M26 18h12l2 26H24z" fill="#f7f4ee"/><rect x="26" y="26" width="12" height="10" fill="#4aa3e0"/><path d="M29 16h6" stroke="#d4232a" stroke-width="2"/>`);
  put('wc-cleaner', `<path d="M30 14h4l6 10v20H24V24z" fill="#3faf6a"/><path d="M30 14c4-4 8 0 4 2" fill="#2f8a50"/>`);
  put('wipes', `<rect x="16" y="26" width="32" height="18" rx="2" fill="#d7eaf8"/><path d="M16 32h32" stroke="#fff"/><path d="M28 26c2 4 6 4 8 0" fill="#fff"/>`);
  put('foil', `<rect x="16" y="24" width="22" height="18" rx="2" fill="#d7dde4"/><ellipse cx="42" cy="33" rx="6" ry="9" fill="#c5ced6"/><path d="M20 30h14M20 35h14" stroke="#fff" opacity=".6"/>`);
  put('cling', `<rect x="18" y="22" width="20" height="22" rx="1" fill="#e7f6ff" stroke="#7eb6e0"/><ellipse cx="42" cy="33" rx="5" ry="10" fill="#d7eaf8" stroke="#7eb6e0"/>`);
  put('baking-paper', `<rect x="18" y="22" width="28" height="22" rx="1" fill="#f6e6c0"/><path d="M18 28h28M18 34h28M18 40h28" stroke="#e2d0a4"/>`);
  put('freezer-bag', `<path d="M18 24h28v22H18z" fill="#d7eaf8" stroke="#7eb6e0"/><path d="M18 30h28" stroke="#4aa3e0"/><path d="M24 36h16" stroke="#fff"/>`);
  put('coffee-filter', `<path d="M18 24h28l-6 22H24z" fill="#f7f4ee"/><path d="M22 30h20M24 38h16" stroke="#e6e0d4"/>`);
  put('battery', `<rect x="18" y="24" width="26" height="16" rx="2" fill="#f0c14a"/><rect x="44" y="28" width="4" height="8" fill="#c9843a"/><path d="M24 32h6M36 32h4" stroke="#3a3228" stroke-width="2"/>`);
  put('bulb', `<circle cx="32" cy="30" r="10" fill="#f6e6a0"/><path d="M26 40h12l-2 6H28z" fill="#d7d0c4"/><path d="M28 40h8" stroke="#c9b49a"/><path d="M32 22v8" stroke="#f0c14a" stroke-width="1.4"/>`);
  put('matches', `<rect x="20" y="20" width="18" height="26" rx="1" fill="#c9843a"/><rect x="38" y="24" width="6" height="20" fill="#f7f4ee"/><circle cx="41" cy="24" r="3" fill="#d4232a"/>`);

  const rules = [
    [/temps min de preparation/, ''],
    [/farine de chataigne/, 'flour'],
    [/sauce d huitre|sauce huitre/, 'oyster-sauce'],
    [/coriandre en graines/, 'cumin'],
    [/jeunes pousses d epinards/, 'spinach'],
    [/jeunes pousses/, 'shoots'],
    [/escargots?/, 'snail'],
    [/gyozas?/, 'gyoza'],
    [/paninis?/, 'panini'],
    [/ravioles|raviolis/, 'ravioles'],
    [/proteines de soja/, 'soy-protein'],
    [/colombo/, 'spice-mix'],
    [/creme de marron/, 'chestnut-cream'],
    [/lait de coco/, 'coconut-milk'],
    [/noix de coco/, 'coconut'],
    [/beurre de cacahu/, 'peanut-butter'],
    [/noix de beurre|margarine/, 'butter'],
    [/coco rapee/, 'coconut'],
    [/noix de saint jacques|saint jacques/, 'scallop'],
    [/noix de cajou/, 'cashew'],
    [/noix de pecan/, 'pecan'],
    [/noix de muscade|muscade/, 'nutmeg'],
    [/huile de noix|huile de noisette/, 'nut-oil'],
    [/pain aux noix/, 'walnut-bread'],
    [/pignons? de pin/, 'pine-nut'],
    [/poudre d amande|amandes? (effilees|en poudre|moulues)/, 'almond-powder'],
    [/amandes?/, 'almond'],
    [/noisettes?/, 'hazelnut'],
    [/\bchataignes?\b|\bmarrons?\b/, 'chestnut'],
    [/creme de marron/, 'chestnut-cream'],
    [/\bnoix\b/, 'walnut'],
    [/cacahu/, 'peanut'],
    [/oeufs? de cabillaud|oeufs? de poisson/, 'roe'],
    [/jaunes? d oeufs?/, 'yolk'],
    [/blancs? d oeufs?/, 'egg-white'],
    [/\boeufs?\b/, 'egg'],
    [/creme fraiche/, 'creme-fraiche'],
    [/creme liquide|creme epaisse|creme legere/, 'cream'],
    [/yaourt grec/, 'greek-yogurt'],
    [/yaourts?/, 'yogurt'],
    [/\blaits?\b/, 'milk'],
    [/beurre/, 'butter'],
    [/parmesan/, 'parmesan'],
    [/emmental|fromage rape/, 'emmental'],
    [/gruyere/, 'gruyere'],
    [/comte/, 'comte'],
    [/cheddar/, 'cheddar'],
    [/feta/, 'feta'],
    [/burrata/, 'burrata'],
    [/mozzarella/, 'mozzarella'],
    [/chevres?|buche/, 'goat-cheese'],
    [/fromage frais/, 'fresh-cheese'],
    [/mascarpone/, 'mascarpone'],
    [/ricotta/, 'ricotta'],
    [/gorgonzola|roquefort|fourme/, 'blue-cheese'],
    [/reblochon/, 'reblochon'],
    [/raclette/, 'raclette'],
    [/beaufort/, 'beaufort'],
    [/halloumi/, 'halloumi'],
    [/pecorino/, 'pecorino'],
    [/paneer/, 'paneer'],
    [/maroilles/, 'maroilles'],
    [/mont d or/, 'montdor'],
    [/tommes?/, 'tomme'],
    [/fromages?/, 'cheese'],
    [/citrons? confits?/, 'preserved-lemon'],
    [/citronnelle/, 'lemongrass'],
    [/citrons? verts?/, 'lime'],
    [/citrons?/, 'lemon'],
    [/oignons? rouges?/, 'red-onion'],
    [/oignons? (nouveaux|cebettes?)|cebettes?|ciboule/, 'spring-onion'],
    [/echalotes?/, 'shallot'],
    [/oignons?/, 'onion'],
    [/concombre/, 'cucumber'],
    [/cornichons?/, 'pickle'],
    [/courgettes?/, 'zucchini'],
    [/poivrons? rouges?/, 'pepper-red'],
    [/poivrons? verts?/, 'pepper-green'],
    [/poivrons?/, 'pepper'],
    [/piment d espelette|espelette/, 'espelette'],
    [/piments?/, 'chili'],
    [/tomates? cerises?/, 'cherry-tomato'],
    [/tomates? (concassee|sechee)|coulis|concentre de tomate|puree de tomate/, 'tomato-sauce'],
    [/tomates?/, 'tomato'],
    [/pommes? de terre|\bpatates?\b(?! douces?)/, 'potato'],
    [/patates? douces?/, 'sweet-potato'],
    [/frites?/, 'fries'],
    [/gnocchis?/, 'gnocchi'],
    [/carottes?/, 'carrot'],
    [/navets?/, 'turnip'],
    [/betteraves?/, 'beet'],
    [/fenouil/, 'fennel'],
    [/celeri rave/, 'celeriac'],
    [/celeri/, 'celery'],
    [/radis/, 'radish'],
    [/panais/, 'parsnip'],
    [/topinambour/, 'topinambour'],
    [/artichauts?/, 'artichoke'],
    [/asperges? blanches?/, 'asparagus-white'],
    [/asperges?/, 'asparagus'],
    [/butternut|courge butternut/, 'butternut'],
    [/potimarron/, 'potimarron'],
    [/potiron|citrouille/, 'pumpkin'],
    [/aubergines?/, 'eggplant'],
    [/avocats?/, 'avocado'],
    [/epinards?/, 'spinach'],
    [/roquette/, 'rocket'],
    [/maches?/, 'mache'],
    [/endives?/, 'endive'],
    [/frisee/, 'frisee'],
    [/cresson/, 'cress'],
    [/oseille/, 'sorrel'],
    [/pak choi|chou chinois/, 'pakchoi'],
    [/laitues?|salade/, 'lettuce'],
    [/poireaux?/, 'leek'],
    [/morilles?/, 'morel'],
    [/champignons?/, 'mushroom'],
    [/brocolis?/, 'broccoli'],
    [/chou fleur/, 'cauliflower'],
    [/choux de bruxelles/, 'brussels'],
    [/chou kale|kale/, 'kale'],
    [/chou rouge/, 'cabbage-red'],
    [/chou blanc/, 'cabbage-white'],
    [/choux? raves?/, 'kohlrabi'],
    [/choucroute/, 'sauerkraut'],
    [/choux?/, 'cabbage-green'],
    [/\bmais\b/, 'corn'],
    [/pois gourmands?/, 'snow-peas'],
    [/pousses de soja/, 'sprouts'],
    [/petits? pois/, 'peas'],
    [/pois casses?/, 'split-pea'],
    [/pois chiches?/, 'chickpea'],
    [/haricots? verts?/, 'green-bean'],
    [/haricots? rouges?/, 'bean-red'],
    [/haricots? blancs?/, 'bean-white'],
    [/haricots? noirs?/, 'bean-black'],
    [/haricots? coco/, 'bean-white'],
    [/flageolets?/, 'flageolet'],
    [/lentilles? corail/, 'lentil-coral'],
    [/lentilles? beluga/, 'lentil-black'],
    [/lentilles?/, 'lentil-green'],
    [/feves?/, 'fava'],
    [/edamame/, 'edamame'],
    [/olives? noires?/, 'olive-black'],
    [/(?<!huile d )olives?\b/, 'olive-green'],
    [/capres?/, 'caper'],
    [/ail/, 'garlic'],
    [/gingembre en poudre|gingembre moulu/, 'ginger-powder'],
    [/gingembre/, 'ginger'],
    [/persil/, 'parsley'],
    [/basilic/, 'basil'],
    [/menthe/, 'mint'],
    [/aneth/, 'dill'],
    [/ciboulette/, 'chive'],
    [/coriandre/, 'cilantro'],
    [/thym/, 'thyme'],
    [/romarin/, 'rosemary'],
    [/sauge/, 'sage'],
    [/origan/, 'oregano'],
    [/herbes de provence|bouquet garni/, 'herbes'],
    [/laurier/, 'bay'],
    [/blancs? de poulet|aiguillettes?/, 'chicken-breast'],
    [/cuisses? de poulet|hauts? de cuisse|pilons?/, 'chicken-leg'],
    [/poulet entier|\bcoq\b/, 'whole-chicken'],
    [/poulet hache/, 'chicken-mince'],
    [/poulets?/, 'whole-chicken'],
    [/escalopes? de dinde|saute de dinde/, 'turkey'],
    [/roti de dinde/, 'turkey-roast'],
    [/dinde/, 'turkey'],
    [/boeuf hache|steaks? haches?|viande hachee/, 'beef-mince'],
    [/joues? de boeuf|boeuf a braiser|pot au feu|boeuf a fondue/, 'beef-stew'],
    [/entrecotes?/, 'entrecote'],
    [/bavettes?|filet de boeuf|paves? de boeuf|tournedos|roti de boeuf|boeuf a (griller|brochettes)/, 'steak'],
    [/boeuf/, 'steak'],
    [/travers de porc/, 'pork-ribs'],
    [/filets? mignons?/, 'pork-filet'],
    [/porc hache/, 'pork-mince'],
    [/porc|echine|epaule de porc|palette de porc|cotes? de porc|joues? de porc|queue de porc/, 'pork'],
    [/gigot|souris d agneau/, 'lamb-leg'],
    [/cotelettes? d agneau/, 'lamb-chop'],
    [/agneau hache/, 'lamb'],
    [/agneau/, 'lamb'],
    [/foie de veau|foies? de volaille/, 'liver'],
    [/rognons?/, 'kidney'],
    [/blanquette|paupiettes?/, 'blanquette'],
    [/roti de veau|tete de veau|jarret/, 'veal-roast'],
    [/veau/, 'veal'],
    [/jambon cru|rosette/, 'ham-raw'],
    [/jambons?/, 'ham'],
    [/lardons?/, 'lardon'],
    [/bacon|poitrine fumee|lard fume/, 'bacon'],
    [/pancetta/, 'pancetta'],
    [/chorizo/, 'chorizo'],
    [/merguez/, 'merguez'],
    [/morteau/, 'morteau'],
    [/andouillettes?|andouilles?/, 'andouille'],
    [/boudins? blancs?/, 'boudin-blanc'],
    [/boudins?/, 'boudin'],
    [/saucisson|petit sale/, 'saucisson'],
    [/chair a saucisse/, 'sausage-meat'],
    [/saucisses? fumees?/, 'sausage-smoked'],
    [/saucisses?/, 'sausage'],
    [/magrets?/, 'magret'],
    [/canard confit|cuisses? de canard/, 'duck-confit'],
    [/gesiers?/, 'gizzard'],
    [/foie gras/, 'foie-gras'],
    [/lapins?/, 'rabbit'],
    [/cailles?/, 'quail'],
    [/pintade|chapon|poule/, 'pintade'],
    [/charcuterie/, 'charcuterie'],
    [/saumon fume|truite fumee/, 'salmon-smoked'],
    [/saumons?/, 'salmon'],
    [/thon au naturel/, 'tuna-can'],
    [/steaks? de thon/, 'tuna-steak'],
    [/thons?/, 'tuna'],
    [/gambas/, 'gambas'],
    [/crevettes?/, 'shrimp'],
    [/moules?/, 'mussel'],
    [/calamars?|encornets?|seiche/, 'squid'],
    [/crabes?/, 'crab'],
    [/huitres?/, 'oyster'],
    [/palourdes?/, 'clam'],
    [/poulpe/, 'octopus'],
    [/ecrevisses?/, 'crayfish'],
    [/fruits de mer/, 'seafood'],
    [/sardines?/, 'sardine'],
    [/maquereaux?/, 'mackerel'],
    [/harengs?/, 'herring'],
    [/truites?/, 'trout'],
    [/dorades?/, 'dorade'],
    [/lotte/, 'lotte'],
    [/anchois/, 'anchovy'],
    [/poissons? panes?/, 'fish-stick'],
    [/haddock/, 'haddock'],
    [/cabillaud|morue|colin|merlu|lieu|sole|poisson/, 'cod'],
    [/surimi/, 'surimi'],
    [/galettes? de riz|vermicelles de riz|nouilles de riz/, 'rice-noodle'],
    [/vinaigre de riz/, 'vinegar'],
    [/riz noir|riz sauvage/, 'black-rice'],
    [/\briz\b/, 'rice'],
    [/feuilles de lasagne|lasagnes?/, 'lasagna'],
    [/spaghettis?|linguines?/, 'spaghetti'],
    [/tagliatelles?/, 'tagliatelle'],
    [/macaronis?|coquillettes?/, 'macaroni'],
    [/pennes?|rigatonis?|cannellonis?|tortellinis?|crozets?|spatzle/, 'penne'],
    [/nouilles soba/, 'soba'],
    [/nouilles ramen/, 'ramen'],
    [/nouilles udon/, 'udon'],
    [/nouilles chinoises|vermicelles|nouilles/, 'noodle'],
    [/pates? brisees?/, 'brisee'],
    [/pates? feuilletees?/, 'feuilletee'],
    [/pates? sablees?/, 'sablee'],
    [/pate a pizza/, 'pizza-dough'],
    [/pate de curry|pates? de curry/, 'curry-paste'],
    [/pate miso|miso/, 'miso'],
    [/petites pates|pates fraiches|pates completes|\bpates\b/, 'pasta'],
    [/feuilles de brick/, 'brick'],
    [/vol au vent/, 'volauvent'],
    [/galettes? de sarrasin/, 'galette'],
    [/crepes?/, 'crepe'],
    [/blinis?/, 'blini'],
    [/croissants?/, 'croissant'],
    [/pain brioche|brioch/, 'brioche'],
    [/pain d epices/, 'gingerbread'],
    [/pain de mie/, 'sliced-bread'],
    [/pain de campagne/, 'country-bread'],
    [/pain de seigle/, 'rye'],
    [/pains? a hot dog|hot dog/, 'hotdog-bun'],
    [/pains? a burger/, 'burger-bun'],
    [/pitas?|pains? pita/, 'pita'],
    [/naan/, 'naan'],
    [/bagels?/, 'bagel'],
    [/tortilla chips/, 'chips'],
    [/tortillas?/, 'tortilla'],
    [/chapelure/, 'breadcrumbs'],
    [/croutons?/, 'crouton'],
    [/baguettes?/, 'baguette'],
    [/crackers?/, 'cracker'],
    [/pains?|pain rassis/, 'bread'],
    [/fecule|maizena/, 'cornstarch'],
    [/farine/, 'flour'],
    [/semoule/, 'semolina'],
    [/quinoa/, 'quinoa'],
    [/boulgour/, 'bulgur'],
    [/orge/, 'barley'],
    [/epeautre/, 'spelt'],
    [/polenta/, 'polenta'],
    [/tofu/, 'tofu'],
    [/pommes?/, 'apple'],
    [/poires?/, 'pear'],
    [/fraises?/, 'strawberry'],
    [/mangues?/, 'mango'],
    [/melons?/, 'melon'],
    [/peches?/, 'peach'],
    [/bananes? plantains?/, 'plantain'],
    [/bananes?/, 'banana'],
    [/abricots? secs?/, 'apricot-dried'],
    [/abricots?/, 'apricot'],
    [/pruneaux?/, 'prune'],
    [/prunes?/, 'prune'],
    [/figues?/, 'fig'],
    [/cerises?/, 'cherry'],
    [/myrtilles?/, 'blueberry'],
    [/pasteque/, 'watermelon'],
    [/kiwis?/, 'kiwi'],
    [/ananas/, 'pineapple'],
    [/grenades?/, 'pomegranate'],
    [/papaye/, 'papaya'],
    [/canneberges?/, 'cranberry'],
    [/fruits rouges/, 'red-fruit'],
    [/raisins? secs?/, 'raisin'],
    [/raisins?/, 'grape'],
    [/oranges?/, 'orange'],
    [/pamplemousses?/, 'grapefruit'],
    [/mandarines?|clementines?/, 'mandarin'],
    [/huile d olive|huile olive/, 'olive-oil'],
    [/huile de sesame/, 'sesame-oil'],
    [/huile|cuilleres d huile/, 'oil'],
    [/vinaigre balsamique/, 'balsamic'],
    [/vinaigre/, 'vinegar'],
    [/sauce soja/, 'soy'],
    [/nuoc mam|sauce poisson/, 'nuocmam'],
    [/sauce d huitre|sauce huitre/, 'oyster-sauce'],
    [/moutarde/, 'mustard'],
    [/mayonnaise/, 'mayo'],
    [/ketchup/, 'ketchup'],
    [/sauce barbecue/, 'bbq'],
    [/sauce cesar/, 'mayo'],
    [/pesto/, 'pesto'],
    [/tahini/, 'tahini'],
    [/cubes? de bouillon|bouillon/, 'stock'],
    [/sucre glace/, 'icing'],
    [/sucre roux|cassonade|sucre vanille/, 'brown-sugar'],
    [/sucre/, 'sugar'],
    [/miel/, 'honey'],
    [/sirop d erable/, 'maple'],
    [/pepites de chocolat/, 'choc-chip'],
    [/chocolat|cacao/, 'chocolate'],
    [/praline/, 'praline'],
    [/levure chimique|poudres? a lever|bicarbonate/, 'baking-powder'],
    [/levure/, 'yeast'],
    [/graines de sesame|sesame/, 'sesame'],
    [/graines de courge/, 'pumpkin-seed'],
    [/paprika fume/, 'paprika-smoked'],
    [/paprika/, 'paprika'],
    [/cumin/, 'cumin'],
    [/curry/, 'curry'],
    [/cannelle/, 'cinnamon'],
    [/curcuma/, 'turmeric'],
    [/safran/, 'saffron'],
    [/garam masala/, 'garam'],
    [/ras el hanout/, 'ras-el'],
    [/cinq epices|5 epices/, 'five-spice'],
    [/epices /, 'spice-mix'],
    [/wasabi/, 'wasabi'],
    [/vanille/, 'vanilla'],
    [/sel lave vaisselle/, 'dishwasher-salt'],
    [/sel poivre/, 'salt-pepper'],
    [/fleur de sel/, 'fleur-sel'],
    [/gros sel/, 'salt'],
    [/poivre|baies roses/, 'peppercorn'],
    [/\bsel\b/, 'salt'],
    [/eau gazeuse/, 'sparkling'],
    [/\beau\b/, 'water'],
    [/vin blanc/, 'wine-white'],
    [/vin rouge|sauternes/, 'wine-red'],
    [/bieres?/, 'beer'],
    [/cidre/, 'cider'],
    [/porto|madere/, 'porto'],
    [/cognac/, 'cognac'],
    [/rhum|liqueur/, 'rum'],
    [/filtres? a cafe/, 'coffee-filter'],
    [/\bcafes?\b/, 'coffee'],
    [/thes?|tisanes?|infusion/, 'tea'],
    [/gelatine/, 'gelatin'],
    [/caramel/, 'caramel'],
    [/glace vanille|boules de glace/, 'ice-cream'],
    [/sorbet/, 'sorbet'],
    [/speculoos/, 'speculoos'],
    [/biscuits?/, 'biscuit'],
    [/meringues?/, 'meringue'],
    [/nori|algue nori/, 'nori'],
    [/wakame|algues?/, 'wakame'],
    [/confiture/, 'confiture'],
    [/cereales/, 'cereal'],
    [/papier toilette/, 'toilet-paper'],
    [/mouchoirs?/, 'tissues'],
    [/dentifrice/, 'toothpaste'],
    [/brosses? a dents/, 'toothbrush'],
    [/gel douche/, 'shower-gel'],
    [/shampoing|shampooing/, 'shampoo'],
    [/savon/, 'soap'],
    [/deodorant/, 'deodorant'],
    [/coton tiges?/, 'cotton-swab'],
    [/cotons?/, 'cotton-pad'],
    [/rasoirs?/, 'razor'],
    [/protections hyg/, 'sanitary'],
    [/creme hydratante|lotion/, 'lotion'],
    [/essuie tout|sopalin/, 'paper-towel'],
    [/liquide vaisselle/, 'dish-soap'],
    [/pastilles lave vaisselle|tablettes lave vaisselle/, 'dishwasher-tab'],
    [/lessive/, 'laundry'],
    [/adoucissant/, 'softener'],
    [/eponges?/, 'sponge'],
    [/sacs? poubelle/, 'trash-bag'],
    [/nettoyant multi/, 'cleaner'],
    [/javel/, 'bleach'],
    [/nettoyant wc/, 'wc-cleaner'],
    [/lingettes?/, 'wipes'],
    [/papier aluminium|aluminium/, 'foil'],
    [/film etirable|film alimentaire/, 'cling'],
    [/papier cuisson/, 'baking-paper'],
    [/sacs? congelation/, 'freezer-bag'],
    [/piles?|batteries?/, 'battery'],
    [/ampoules?/, 'bulb'],
    [/allumettes?/, 'matches']
  ];

  function prepare(raw) {
    return norm(raw).replace(/\bgou\b/g, 'gousse').replace(/\bbou\b/g, 'bouquet').replace(/\bpinc\b/g, 'pincee').replace(/\btran\b/g, 'tranche');
  }
  function idFor(raw) {
    const n = prepare(raw);
    if (!n) return '';
    for (const [re, id] of rules) if (re.test(n)) return id;
    return '';
  }
  function svgFor(raw) {
    const id = idFor(raw);
    return (id && I[id]) || '';
  }
  root.IngredientArt = { svg: svgFor, idFor, has: id => !!I[id] };
})(typeof globalThis !== 'undefined' ? globalThis : this);
