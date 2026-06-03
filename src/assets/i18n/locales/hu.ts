import { buildLatinLocaleOverrides } from './latinLocaleOverrides';

export const HU_OVERRIDES = buildLatinLocaleOverrides({
  locale: 'hu',
  siteName: 'Daniel Smith immerzív portfóliója',
  nativeLabel: 'Magyar',
  strings: {
    controls: 'Vezérlés',
    settingsHelp: 'Beállítások és súgó',
    language: 'Nyelv',
    languageDescription: 'Váltsd a HUD nyelvét és irányát.',
    switching: 'Váltás erre: {target}…',
    selected: '{label} kiválasztva.',
    failure: 'Nem sikerült váltani erre: {target}. Marad: {current}.',
    textHeading: 'Fedezd fel a kiemeléseket',
    textIntro:
      'A szöveges portfólió minden kiállítást elérhetővé tesz rövid összefoglalókkal, eredményekkel és metrikákkal, amíg az immerzív mód nem érhető el.',
    recoveryTitle: 'Készen állsz a teljes szobára?',
    recoveryDescription:
      'Töröld a mentett szöveges preferenciát, és indítsd újra innen az immerzív portfóliót.',
    recoveryAction: 'Immerszív mód újrapróbálása',
    recoveryAria:
      'Immerszív mód újrapróbálása és a mentett szöveges mód preferencia törlése',
    metrics: 'Fő metrikák',
    links: 'További olvasnivaló',
    outcome: 'Eredmény',
    stars: 'Csillagok',
    syncing: 'Szinkronizálás GitHubról…',
    discovered: '{title} felfedezve. {summary}',
    closePoi: 'POI részletek bezárása',
    nextHighlight: 'Következő kiemelés',
    related: 'Kapcsolódó esettanulmányok',
    prototype: 'Prototípus',
    live: 'Élő',
    textMode: 'Váltás szöveges módra',
    tryImmersive: 'Immerszív mód újrapróbálása',
    guidedTour: 'Vezetett túra',
    guidedTourOn: 'Vezetett túra be',
    guidedTourOff: 'Vezetett túra ki',
    audioOn: 'Hang: be',
    audioOff: 'Hang: ki',
  },
  poi: {
    futuroptimist: {
      summary:
        'Automatizált Futuroptimist forgatókönyv-asztal, amely kutatást, vázlatokat és narrációra kész piszkozatokat fűz össze.',
      outcome:
        'Heti kiemelő forgatókönyveket áramoltat kézi formázás nélkül az automatizációs csatornán.',
      metrics: [
        'Munkafolyamat',
        'Resolve-stílusú vágócsomag · három kijelző',
        'Fókusz',
        'Futuroptimist ökoszisztéma-reels folyamatban',
      ],
    },
    tokenplace: {
      summary:
        'Biztonságos peer-to-peer generatív AI platform Raspberry Pi rácson, titkosított relay és szerver csomópontokkal.',
      outcome:
        'A quickstart scriptek helyben indítják a relayt, szervert és mock LLM stacket teszteléshez.',
      metrics: [
        'Klaszter',
        '12× Pi 5 csomópont moduláris rekeszekben',
        'Hálózat',
        'Efemer tokenek · titkosított burstök',
      ],
    },
    gabriel: {
      summary:
        'Adatvédelem-központú „őrangyal” LLM helyi biztonsági tanácsadással, token.place integrációval vagy offline inferenciával.',
      outcome:
        'A beviteli, elemzési, értesítési és UI stackek típusos interfészekkel maradnak összhangban.',
      metrics: [
        'Fókusz',
        '360° lidar pásztázás + helyi heurisztikák',
        'Ütem',
        'Piros riasztásvillanás 1,0 s-enként',
      ],
    },
    flywheel: {
      summary:
        'GitHub sablon és automatizációs központ linttel, tesztekkel, doksikkal és Codex promptokkal gyors repo-indításhoz.',
      outcome:
        'Ismételhető CI-t és promptkönyvtárakat szállít, hogy az új repók egészségesen induljanak.',
      metrics: [
        'Automatizáció',
        'CI scaffoldok · típusos promptok · QA ciklusok',
        'Docs CTA',
        'flywheel.futuroptimist.dev →',
      ],
    },
    jobbot: {
      summary:
        'Saját hosztolású álláskereső copilóta CLI-vel és kísérleti web UI-val kapcsolatok és jelentkezések követéséhez.',
      outcome:
        'A végponttól végpontig futó folyamatok a docs és tesztek mintáját követik.',
      metrics: [
        'Állapot',
        'Local-first CLI előnézeti web UI-val',
        'Stack',
        'Node.js 20+ · npm scriptek · Playwright előnézet',
        'Folyamatok',
        'Recruiter outreach bevitel és életciklus-követés',
      ],
    },
    axel: {
      summary:
        'Cél- és questkövető, amely repókat szervez agentic LLM-ekkel, analitikával és pipx-barát CLI-vel.',
      outcome:
        'Az alfa kiadások szinkronban tartják a README-t, FAQ-t és fenyegetési modellt a pytesttel.',
      metrics: [
        'Állapot',
        'Alfa · pipx install axel',
        'Repo analitika',
        'Questtervezés repólistákból és scanekből',
        'Docs',
        'FAQ · ismert hibák · fenyegetési modell tesztekkel',
      ],
    },
    gitshelves: {
      summary:
        'CLI, amely GitHub hozzájárulási adatokat OpenSCAD és STL modellekké alakít 3D nyomtatott Gridfinity polcokhoz.',
      outcome:
        'SCAD/STL párokat exportál metaadatokkal, hogy a polcok tükrözzék a hozzájárulási idővonalakat.',
      metrics: [
        'Anyag',
        '42 mm Gridfinity-kompatibilis blokkok',
        'Szinkron',
        'GitHub idővonalakból generálva',
      ],
    },
    portfolio: {
      summary:
        'Ortografikus Three.js/WebGL portfólió billentyűzetes navigációval és ellenálló szöveges tartalékkal.',
      outcome:
        'Minden kiadásban összhangban tartja az immerzív és szöveges deployokat.',
      metrics: [
        'Stack',
        'Vite · Three.js · akadálymentes HUD',
        'Deploy',
        'CI smoke + docs + lint kapuk',
      ],
    },
    f2clipboard: {
      summary:
        'CLI Codex feladatoldalak és GitHub logok beolvasására, titkok maszkolására és beilleszthető Markdown összefoglalókra.',
      outcome:
        'Automatizálja a CI loggyűjtést és összegzést gyors hibakeresési átadáshoz.',
      metrics: [
        'Sebesség',
        'Hibás logok másolása 3 s alatt',
        'Formátumok',
        'CLI + vágólap + Markdown kimenet',
      ],
    },
    sigma: {
      summary:
        'ESP32 „AI pin”, amely push-to-talk hangot streamel Whispernek, és TTS-t ad vissza 3D nyomtatott OpenSCAD házban.',
      outcome:
        'Firmware-t, ház CAD-et, STL exportokat és CI-frissített szerelési doksikat tartalmaz.',
      metrics: [
        'Hardver',
        'ESP32 · OpenSCAD ház',
        'Módok',
        'Push-to-talk · Whisper + TTS relay',
      ],
    },
    wove: {
      summary:
        'Nyílt forrású eszközkészlet kötés és horgolás tanulásához, OpenSCAD hardveres robotikus szövőszék felé haladva.',
      outcome:
        'A doksik mintaszámolókat, tervező exportokat és fonalsúly szerinti feszességprofilokat fednek le.',
      metrics: [
        'Kézművesség',
        'A szövőszék CAD öltéstérképekből kalibrál',
        'Útiterv',
        'Út robotikus szövőlabok felé',
      ],
    },
    dspace: {
      summary:
        'Hátsókerti indítóállvány a DSPACE projekthez telemetria-vezérelt visszaszámlálási jelzésekkel és nyilvános missziónaplóval.',
      outcome:
        'Visszaszámlálási jegyzeteket tart GitHub és missziónapló linkek mellett, miközben a repo privát.',
      metrics: [
        'Visszaszámlálás',
        'Autonóm T-0 szekvencia',
        'Stack',
        'Three.js FX · térbeli hang',
      ],
    },
    prReaper: {
      summary:
        'GitHub Actions workflow, amely stale PR-eket zár tömegesen dry-run előnézettel és opcionális branch-takarítással.',
      outcome:
        'Egygombos workflow dokumentált bemenetekkel, biztonsági modellel és audit kimenetekkel a README-ben.',
      metrics: [
        'Söprés',
        'Stale PR-ek tömeges zárása előnézeti móddal',
        'Ütem',
        'Cron + kézi dry-runok',
      ],
    },
    sugarkube: {
      summary:
        'Raspberry Pi-n futó k3s platform off-grid solar cube telepítéssel, CAD-del, Pi image-ekkel és terepi útmutatókkal.',
      outcome:
        'Lépésről lépésre doksik napenergiás hardverhez, Pi provisioninghez és Kubernetes segédekhez.',
      metrics: [
        'Platform',
        'k3s, Kubernetes segédek, Cloudflare tunnelek és napenergia jegyzetek',
        'Hardver',
        'Solar cube CAD, Pi tartólemezek és elektronika',
        'Útmutatók',
        'Pi image-ek és headless provisioning',
      ],
    },
  },
});
