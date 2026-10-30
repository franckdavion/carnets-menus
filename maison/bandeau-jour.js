/* Bandeau d'accueil : quatre ambiances selon l'heure locale.
   Aperçu invisible dans l'interface : ?ambiance=matin | aprem | soir | nuit */
(() => {
  'use strict';
  const MOODS = [
    { id: 'matin', hello: 'Bonjour la famille ! ☀️' },
    { id: 'aprem', hello: 'Bel après-midi la famille ! ☀️' },
    { id: 'soir', hello: 'Bonsoir la famille ! 🌙' },
    { id: 'nuit', hello: 'Bonne nuit la famille ! 🌙' }
  ];
  const byId = id => MOODS.find(m => m.id === id) || null;
  let forced = null;
  let timer = 0;

  function moodAt(date) {
    const h = date.getHours();
    if (h >= 5 && h < 11) return MOODS[0];
    if (h >= 11 && h < 18) return MOODS[1];
    if (h >= 18 && h < 22) return MOODS[2];
    return MOODS[3];
  }
  function chosen(date) {
    return forced || moodAt(date || new Date());
  }
  function dateLabel(date) {
    const label = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'full' }).format(date || new Date());
    return label.charAt(0).toUpperCase() + label.slice(1);
  }
  function arts() {
    return `
<svg class="mn-band-art mn-band-matin" viewBox="0 0 480 140" preserveAspectRatio="xMinYMid meet">
  <defs>
    <linearGradient id="mnMkSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffc56a"/><stop offset=".42" stop-color="#ff8b6a"/><stop offset=".72" stop-color="#c45c86"/><stop offset="1" stop-color="#3a3f78"/></linearGradient>
    <radialGradient id="mnMkSun" cx=".5" cy=".45" r=".5"><stop offset="0" stop-color="#fff7d2"/><stop offset=".4" stop-color="#ffb23a"/><stop offset="1" stop-color="#ff7a22" stop-opacity="0"/></radialGradient>
    <linearGradient id="mnMkFade" x1="0" x2="1"><stop offset="0" stop-color="#071833" stop-opacity="0"/><stop offset="1" stop-color="#071428"/></linearGradient>
  </defs>
  <rect width="480" height="140" fill="url(#mnMkSky)"/>
  <circle cx="132" cy="86" r="26" fill="#ffe38a"/>
  <circle cx="132" cy="86" r="46" fill="url(#mnMkSun)"/>
  <g class="mn-cloud" fill="#ffe6d4">
    <ellipse cx="210" cy="34" rx="34" ry="11"/><ellipse cx="236" cy="30" rx="18" ry="9"/><ellipse cx="188" cy="32" rx="16" ry="8"/>
  </g>
  <g class="mn-cloud mn-cloud-b" fill="#ffd0c2" opacity=".8">
    <ellipse cx="300" cy="24" rx="26" ry="8"/><ellipse cx="322" cy="22" rx="14" ry="6"/>
  </g>
  <path d="M0 96c36-18 62 8 104-4 34-10 48 10 86 2 40-8 62 16 112 4 42-10 70 6 178-6v48H0Z" fill="#31456f"/>
  <path d="M0 112c48-14 78 10 128-2 46-12 70 14 124 2 48-10 78 8 228-4v32H0Z" fill="#1c2c52"/>
  <g fill="#15243f">
    <path d="M46 104 58 74 70 104z"/><path d="M64 108 73 84 82 108z"/><path d="M248 98 258 74 268 98z"/><path d="M266 102 274 82 282 102z"/>
  </g>
  <g transform="translate(86 58)">
    <path class="mn-steam" d="M10 12c3-5 1-8 3-12" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/>
    <path class="mn-steam mn-steam-b" d="M20 10c3-5 1-8 3-12" fill="none" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/>
    <rect x="0" y="18" width="30" height="20" rx="5" fill="#f7fbff"/>
    <path d="M30 23h5a7 7 0 0 1 0 14h-5" fill="none" stroke="#f7fbff" stroke-width="2.6"/>
    <ellipse cx="15" cy="18" rx="15" ry="4.2" fill="#f7fbff"/>
    <ellipse cx="15" cy="18" rx="11" ry="2.5" fill="#6a3a1e"/>
  </g>
  <rect x="200" width="280" height="140" fill="url(#mnMkFade)"/>
</svg>
<svg class="mn-band-art mn-band-aprem" viewBox="0 0 480 140" preserveAspectRatio="xMinYMid meet">
  <defs>
    <linearGradient id="mnAkSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8fd4ff"/><stop offset=".55" stop-color="#3f93e4"/><stop offset="1" stop-color="#1d6cb8"/></linearGradient>
    <radialGradient id="mnAkSun" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff6b0"/><stop offset=".35" stop-color="#ffe14a"/><stop offset="1" stop-color="#ffd24a" stop-opacity="0"/></radialGradient>
    <linearGradient id="mnAkFade" x1="0" x2="1"><stop offset="0" stop-color="#071833" stop-opacity="0"/><stop offset="1" stop-color="#071428"/></linearGradient>
  </defs>
  <rect width="480" height="140" fill="url(#mnAkSky)"/>
  <g class="mn-rays" transform="translate(118 42)">
    <path d="M0-30v14M0 16v14M-30 0h14M16 0h14M-21-21 11-11M11 11l10 10M-21 21 11 11M11-11l10-10" fill="none" stroke="#fff3a8" stroke-width="2.4" stroke-linecap="round"/>
  </g>
  <circle cx="118" cy="42" r="16" fill="#ffe56a"/>
  <circle cx="118" cy="42" r="34" fill="url(#mnAkSun)"/>
  <g class="mn-cloud" fill="#fff" opacity=".92">
    <ellipse cx="196" cy="30" rx="30" ry="10"/><ellipse cx="220" cy="26" rx="16" ry="8"/><ellipse cx="176" cy="28" rx="14" ry="7"/>
  </g>
  <g class="mn-cloud mn-cloud-b" fill="#e7f6ff" opacity=".85">
    <ellipse cx="286" cy="46" rx="24" ry="8"/><ellipse cx="306" cy="44" rx="12" ry="6"/>
  </g>
  <path d="M0 92c40-22 70 6 118-8 36-10 54 12 98 2 46-10 70 14 120 2 40-8 78 4 144-8v60H0Z" fill="#3eae58"/>
  <path d="M0 112c50-16 80 8 130-4 44-10 64 12 116 0 52-12 84 8 234-6v38H0Z" fill="#217a3a"/>
  <g fill="#166333">
    <path d="M52 104 66 70 80 104z"/><path d="M74 108 84 82 94 108z"/><path d="M236 100 248 72 260 100z"/><rect x="63" y="104" width="4" height="10" rx="1"/><rect x="244" y="100" width="4" height="10" rx="1"/>
  </g>
  <rect x="210" width="270" height="140" fill="url(#mnAkFade)"/>
</svg>
<svg class="mn-band-art mn-band-soir" viewBox="0 0 480 140" preserveAspectRatio="xMinYMid meet">
  <defs>
    <linearGradient id="mnSkSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5a3d86"/><stop offset=".38" stop-color="#c85a78"/><stop offset=".62" stop-color="#ff8a3c"/><stop offset="1" stop-color="#ffb15a"/></linearGradient>
    <radialGradient id="mnSkSun" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff1c2"/><stop offset=".45" stop-color="#ffb03a"/><stop offset="1" stop-color="#ff7a22" stop-opacity="0"/></radialGradient>
    <linearGradient id="mnSkFade" x1="0" x2="1"><stop offset="0" stop-color="#071833" stop-opacity="0"/><stop offset="1" stop-color="#071428"/></linearGradient>
  </defs>
  <rect width="480" height="140" fill="url(#mnSkSky)"/>
  <rect class="mn-dusk" width="480" height="140" fill="#6a2a58" opacity=".18"/>
  <circle cx="150" cy="92" r="18" fill="#ffe08a"/>
  <circle cx="150" cy="92" r="36" fill="url(#mnSkSun)"/>
  <g class="mn-cloud" fill="#f0b0c8" opacity=".55">
    <ellipse cx="70" cy="36" rx="28" ry="9"/><ellipse cx="92" cy="32" rx="14" ry="7"/>
  </g>
  <g class="mn-cloud mn-cloud-b" fill="#d98ab0" opacity=".4">
    <ellipse cx="230" cy="28" rx="26" ry="8"/>
  </g>
  <path d="M0 100c46-16 78 8 126-6 42-12 60 10 108 0 50-10 78 12 118 2 36-8 62 6 128-4v48H0Z" fill="#1a2748"/>
  <path d="M0 116c54-12 86 8 140-2 48-8 72 10 126 0 50-10 80 6 214-6v32H0Z" fill="#10182f"/>
  <g fill="#0d1528">
    <path d="M40 112 52 82 64 112z"/><path d="M60 116 70 92 80 116z"/><path d="M210 108 222 80 234 108z"/>
  </g>
  <rect x="210" width="270" height="140" fill="url(#mnSkFade)"/>
</svg>
<svg class="mn-band-art mn-band-nuit" viewBox="0 0 480 140" preserveAspectRatio="xMinYMid meet">
  <defs>
    <linearGradient id="mnNkSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#102454"/><stop offset=".6" stop-color="#0a1838"/><stop offset="1" stop-color="#07101f"/></linearGradient>
    <radialGradient id="mnNkMoon" cx=".45" cy=".4" r=".6"><stop offset="0" stop-color="#fff"/><stop offset=".5" stop-color="#d7e6ff"/><stop offset="1" stop-color="#9eb6e8" stop-opacity="0"/></radialGradient>
    <linearGradient id="mnNkFade" x1="0" x2="1"><stop offset="0" stop-color="#071833" stop-opacity="0"/><stop offset="1" stop-color="#071428"/></linearGradient>
  </defs>
  <rect width="480" height="140" fill="url(#mnNkSky)"/>
  <g fill="#f4f7ff">
    <circle class="mn-star" cx="36" cy="22" r="1.3"/><circle class="mn-star" cx="70" cy="40" r="1.1"/><circle class="mn-star" cx="104" cy="18" r="1.4"/>
    <circle class="mn-star" cx="168" cy="28" r="1.1"/><circle class="mn-star" cx="206" cy="16" r="1.3"/><circle class="mn-star" cx="246" cy="36" r="1"/>
    <circle class="mn-star" cx="300" cy="20" r="1.2"/><circle class="mn-star" cx="340" cy="32" r="1"/>
  </g>
  <circle class="mn-halo" cx="118" cy="40" r="28" fill="url(#mnNkMoon)"/>
  <circle cx="118" cy="40" r="13" fill="#f7f4e8"/>
  <circle cx="124" cy="36" r="10" fill="#102454"/>
  <path d="M0 102c50-18 84 8 136-6 44-12 66 12 116 2 48-10 76 10 112 0 34-8 70 6 116-4v46H0Z" fill="#121c34"/>
  <path d="M0 118c60-10 90 6 150-2 56-8 80 8 140 0 54-8 86 4 190-4v28H0Z" fill="#0b1224"/>
  <g transform="translate(168 78)">
    <path d="M22 8 40 24v28H4V24Z" fill="#1a2744"/>
    <rect class="mn-win" x="12" y="30" width="6" height="7" rx="1" fill="#ffd27a"/>
    <rect class="mn-win mn-win-b" x="24" y="30" width="6" height="7" rx="1" fill="#ffb703"/>
    <path d="M18 52v-8h8v8" fill="#0e1830"/>
  </g>
  <rect x="220" width="260" height="140" fill="url(#mnNkFade)"/>
</svg>`;
  }

  function apply(root) {
    const scope = root && root.querySelectorAll ? root : document;
    const bands = scope.querySelectorAll('.mn-dayband');
    if (!bands.length) return;
    const mood = chosen(new Date());
    bands.forEach(band => {
      band.dataset.mnBand = mood.id;
      band.classList.toggle('is-paused', document.hidden);
    });
    const hello = scope.querySelector('.mn-band-hello');
    if (hello && hello.textContent !== mood.hello) hello.textContent = mood.hello;
    const when = scope.querySelector('.mn-band-date span');
    if (when) when.textContent = dateLabel(new Date());
  }
  function mount(root) {
    const sky = root && root.querySelector('.mn-band-sky');
    if (sky && !sky.querySelector('svg')) sky.innerHTML = arts();
    apply(root);
    if (!timer) {
      timer = setInterval(() => { if (!document.hidden) apply(document); }, 20000);
      document.addEventListener('visibilitychange', () => {
        document.querySelectorAll('.mn-dayband').forEach(el => el.classList.toggle('is-paused', document.hidden));
        if (!document.hidden) apply(document);
      });
    }
  }
  const asked = byId(new URLSearchParams(location.search).get('ambiance'));
  if (asked) forced = asked;
  window.mnJour = {
    at: moodAt,
    mount,
    preview(id) { forced = id ? byId(id) : null; apply(document); return !id || !!forced; }
  };
})();
