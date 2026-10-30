/* Bibliothèque d'emojis partagée — affichage uniquement, aucun changement des courses. */
(function(){'use strict';
const KEY='maisonnee-ingredient-emojis-v1';
const groups=[
['🥚','oeuf oeufs œuf œufs jaune d oeuf blanc d oeuf'],['🥔','pomme de terre pommes de terre patate patates purée'],['🧅','oignon oignons échalote échalotes'],['🧄','ail gousse d ail gousses d ail'],['🥦','brocoli brocolis chou fleur chou-fleur choux fleurs chou chou vert chou rouge'],['🥕','carotte carottes panais'],['🍅','tomate tomates tomate cerise coulis de tomate concentré de tomate'],['🥒','courgette courgettes concombre cornichon'],['🫑','poivron poivrons piment piments'],['🍆','aubergine aubergines'],['🥬','salade laitue mâche épinard épinards roquette poireau poireaux endive endives'],['🍄','champignon champignons cèpe cèpes morille morilles'],['🌽','maïs mais épi de maïs'],['🫛','petit pois petits pois haricot vert haricots verts fève fèves'],['🫘','lentille lentilles haricot blanc haricots blancs haricot rouge haricots rouges pois chiche pois chiches'],['🍚','riz riz basmati riz rond riz complet'],['🍝','pâtes pates spaghetti spaghettis macaroni penne tagliatelles nouilles vermicelles'],['🥖','pain baguette chapelure croûton crouton'],['🌾','farine farine de blé farine complète fécule maïzena semoule boulgour quinoa avoine'],['🧈','beurre beurre doux beurre salé margarine'],['🥛','lait lait entier lait demi écrémé crème fraîche creme fraiche crème liquide creme liquide crème épaisse creme epaisse crème fleurette'],['🧀','fromage emmental comté comte gruyère gruyere parmesan mozzarella feta chèvre chevre ricotta mascarpone cheddar raclette'],['🥓','lardons lardon bacon poitrine fumée jambon jambon cru pancetta'],['🍗','poulet dinde volaille cuisse de poulet blanc de poulet escalope de poulet'],['🥩','boeuf bœuf steak steak haché viande hachée veau agneau porc filet mignon rôti roti'],['🍖','saucisse saucisses merguez chorizo saucisson'],['🐟','poisson cabillaud saumon thon colin merlu sardine maquereau truite lieu noir'],['🦐','crevette crevettes gambas langoustine'],['🦀','crabe surimi'],['🦑','calamar calamar encornet seiche'],['🦪','moule moules huître huitre coquille saint jacques'],['🍋','citron citrons citron vert'],['🍊','orange oranges clémentine clémentines mandarine mandarines'],['🍎','pomme pommes compote de pommes'],['🍐','poire poires'],['🍌','banane bananes'],['🍓','fraise fraises framboise framboises'],['🫐','myrtille myrtilles mûre mure cassis'],['🍇','raisin raisins'],['🍑','pêche peche abricot abricots nectarine'],['🍒','cerise cerises'],['🍍','ananas'],['🥝','kiwi kiwis'],['🥭','mangue mangues'],['🍉','pastèque pasteque melon'],['🥑','avocat avocats'],['🫒','olive olives huile d olive'],['🫗','huile huile de tournesol huile de colza vinaigre vinaigre balsamique'],['🧂','sel fleur de sel poivre poivre noir poivre blanc'],['🌶️','paprika curry cumin curcuma gingembre cannelle muscade piment de cayenne'],['🌿','persil basilic coriandre thym romarin ciboulette menthe laurier aneth estragon herbes de provence'],['🍯','miel sirop d érable'],['🍬','sucre sucre glace cassonade sucre vanillé'],['🍫','chocolat chocolat noir cacao pépites de chocolat'],['🍪','biscuit biscuits levure levure chimique levure boulangère'],['🥫','cube de bouillon cubes de bouillon bouillon de légumes bouillon de volaille bouillon de boeuf conserve concentré'],['🍶','yaourt yaourts fromage blanc skyr'],['🍦','glace sorbet'],['🥥','noix de coco lait de coco'],['🥜','cacahuète cacahuètes arachide beurre de cacahuète'],['🌰','noix noisette noisettes amande amandes châtaigne chataigne pistache pistaches'],['☕','café cafe espresso'],['🍵','thé the tisane'],['💧','eau eau minérale eau gazeuse'],['🍷','vin vin blanc vin rouge'],['🍺','bière biere'],['🍋','jus de citron zeste de citron'],['🥫','moutarde mayonnaise ketchup sauce soja sauce tomate pesto harissa sauce barbecue'],['🍮','flan crème dessert caramel'],['🥣','flocons d avoine céréales cereales muesli'],['🧊','glaçon glaçons glace pilée'],['🧴','gel douche shampoing shampooing savon lessive'],['🧻','papier toilette essuie tout sopalin'],['🧽','éponge liquide vaisselle'],['🪥','dentifrice brosse à dents'],['📦','carton sac poubelle papier cuisson film alimentaire']
];
const norm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/œ/g,'oe').replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
// Associations explicites : les noms proches ne doivent pas produire de faux positifs.
const additional=[
['🥐','brioche|croissant|croissants|pain au chocolat|chocolatine|pain aux raisins|viennoiserie|chausson aux pommes'],
['🥯','bagel|bagels'],['🥨','bretzel|bretzels'],['🧇','gaufre|gaufres'],['🥞','crêpe|crepes|crêpes|pancake|pancakes'],
['🥖','baguette|pain complet|pain de mie|pain de campagne|pain aux céréales|croûtons|croutons'],
['🥔','pommes de terre|pomme de terre|patates douces|patate douce|gnocchis'],
['🧅','oignons rouges|oignon rouge|échalotes|echalotes|cébettes|oignons nouveaux'],
['🥦','chou-fleur|chou fleur|choux fleurs|brocoli|brocolis|chou romanesco|chou vert|chou rouge|chou blanc|choux de bruxelles'],
['🥬','chou chinois|blettes|bette|épinards|epinards|roquette|mâche|mache|laitue|salade iceberg|endive|endives|poireau|poireaux|fenouil|céleri branche|celeri branche|asperges|artichauts|artichaut'],
['🥕','carotte|carottes|panais|navet|navets|betterave|betteraves|radis'],
['🫑','poivron rouge|poivron vert|poivron jaune|poivrons|piment doux|piment rouge|piment vert'],
['🥒','courgettes|courgette|concombres|concombre|cornichons|cornichon'],
['🫛','petits pois|petit pois|pois gourmands|haricots verts|haricot vert|fèves|feves|edamame'],
['🫘','lentilles vertes|lentilles corail|lentilles blondes|pois chiches|pois chiche|haricots rouges|haricots blancs|haricots noirs|flageolets|fayot'],
['🍄','champignons de paris|champignons|champignon|pleurotes|girolles|cèpes|cepes|morilles|shiitakés'],
['🍠','patate douce|patates douces'],['🎃','potiron|potimarron|citrouille|courge|butternut'],
['🍅','tomates cerises|tomate cerise|tomates pelées|tomates concassées|coulis de tomate|purée de tomate|concentré de tomate|passata'],
['🍆','aubergine|aubergines'],['🥑','avocat|avocats|guacamole'],['🌽','maïs|mais|épis de maïs|polenta'],
['🍋','citron|citrons|citron vert|citrons verts|zeste de citron|jus de citron'],
['🍎','pomme|pommes|compote de pommes'],['🍐','poire|poires'],['🍊','orange|oranges|mandarine|mandarines|clémentine|clémentines|pamplemousse'],
['🍓','fraises|fraise|framboises|framboise'],['🫐','myrtilles|myrtille|mûres|mures|cassis|groseilles'],
['🍒','cerise|cerises'],['🍑','pêche|peche|pêches|abricot|abricots|nectarine|nectarines'],
['🍉','pastèque|pasteque|melon|melons'],['🍇','raisins|raisin|raisins secs'],['🍍','ananas'],['🥝','kiwi|kiwis'],['🥭','mangue|mangues'],['🍌','banane|bananes'],
['🥚','œuf|œufs|oeuf|oeufs|jaunes d œufs|jaune d oeuf|blanc d oeuf|blancs d oeufs'],
['🧀','emmental|gruyère|gruyere|comté|comte|cheddar|mozzarella|parmesan|feta|ricotta|mascarpone|raclette|reblochon|camembert|brie|chèvre|chevre|fromage frais|fromage râpé|fromage rape'],
['🥛','lait|lait entier|lait écrémé|lait demi écrémé|lait de soja|lait d amande|lait d avoine|crème fraîche|creme fraiche|crème liquide|creme liquide|crème épaisse|creme epaisse|crème fleurette|creme fleurette'],
['🧈','beurre|beurre doux|beurre salé|beurre demi sel|margarine'],
['🥣','yaourt|yaourts|yaourt nature|fromage blanc|skyr|petit suisse|faisselle'],
['🥓','lardons|lardon|bacon|pancetta|poitrine fumée|poitrine salee|jambon cru|jambon blanc|jambon cuit'],
['🥩','boeuf|bœuf|steak|steaks|steak haché|viande hachée|veau|agneau|porc|filet mignon|rôti de porc|roti de porc|entrecôte|entrecote'],
['🍗','poulet|poulet rôti|poulet roti|blanc de poulet|cuisse de poulet|dinde|escalope de dinde|volaille'],
['🌭','saucisse|saucisses|merguez|chipolatas|knack|hot dog'],['🍖','chorizo|saucisson|jambonneau'],
['🐟','saumon|saumon fumé|thon|thon en boîte|thon en boite|cabillaud|colin|merlu|truite|sardines|maquereau|lieu noir|poisson blanc|anchois'],
['🦐','crevettes|crevette|gambas|langoustines|langoustine'],['🦀','crabe|chair de crabe|surimi'],
['🦑','calamar|calamars|encornet|encornets|seiche'],['🦪','moules|moule|huîtres|huitres|saint jacques|coquilles saint jacques'],
['🍚','riz|riz basmati|riz rond|riz complet|riz arborio|riz thaï|riz thai|riz à sushi'],
['🍝','pâtes|pates|spaghetti|spaghettis|tagliatelles|penne|fusilli|coquillettes|macaronis|lasagnes|nouilles|vermicelles|raviolis'],
['🌾','farine|farine de blé|farine complète|farine de riz|farine de maïs|maïzena|maizena|fécule de maïs|fecule de mais|semoule|boulgour|quinoa|avoine|flocons d avoine|sarrasin|couscous'],
['🥫','cubes de bouillon|cube de bouillon|bouillon de légumes|bouillon de volaille|bouillon de boeuf|bouillon de bœuf|conserve|petits pois en conserve'],
['🧂','sel|fleur de sel|gros sel|poivre|poivre noir|poivre blanc|poivre moulu'],
['🌿','persil|basilic|coriandre|thym|romarin|ciboulette|menthe|laurier|aneth|estragon|origan|herbes de provence|sauge'],
['🌶️','paprika|piment de cayenne|piment en poudre|curry|cumin|curcuma|gingembre|cannelle|muscade|quatre épices|ras el hanout'],
['🫒','olives|olive|huile d olive|huile d olives'],['🫗','huile|huile de tournesol|huile de colza|huile de sésame|huile de sesame|vinaigre|vinaigre balsamique|vinaigre de cidre'],
['🍯','miel|sirop d érable|sirop d erable|sirop d agave|confiture'],
['🍬','sucre|sucre glace|sucre roux|cassonade|sucre vanillé|sucre vanille'],
['🍫','chocolat|chocolat noir|chocolat au lait|chocolat blanc|cacao|pépites de chocolat|pepites de chocolat'],
['🍪','biscuit|biscuits|cookies|cookie|petit beurre|spéculoos|speculoos'],
['🧁','levure|levure chimique|levure boulangère|levure boulangere|bicarbonate alimentaire'],
['🥥','noix de coco|lait de coco|crème de coco|creme de coco'],
['🥜','cacahuètes|cacahuete|arachides|beurre de cacahuète|beurre de cacahuete'],
['🌰','noix|noisettes|noisette|amandes|amande|pistaches|pistache|châtaignes|chataignes|noix de cajou|pignons de pin'],
['🍶','sauce soja|sauce nuoc mam|sauce teriyaki'],['🥫','moutarde|mayonnaise|ketchup|sauce tomate|sauce barbecue|pesto|harissa|concentré de tomate'],
['☕','café|cafe|café moulu|café soluble|capsules de café'],['🍵','thé|the|tisane|infusion'],
['🧃','jus de pomme|jus d orange|jus de fruits|jus de raisin'],['💧','eau|eau gazeuse|eau minérale'],
['🧴','gel douche|shampoing|shampooing|savon liquide|déodorant|deodorant|crème hydratante'],
['🧻','papier toilette|essuie tout|sopalin|mouchoirs'],['🧽','éponge|liquide vaisselle'],
['🪥','dentifrice|brosse à dents'],['🧺','lessive|adoucissant'],['🗑️','sac poubelle|sacs poubelle'],
['🔋','piles|pile|batteries'],['🐾','croquettes|croquettes chien|croquettes chat'],['📦','papier cuisson|film alimentaire|papier aluminium']
];

// Correspondances complémentaires précises, sans modifier les choix personnalisés.
const extraNames=[
  ['🧂','sel fin|sel marin|sel rose|sel de guerande|poivre gris|poivre vert|poivre cinq baies|baies roses'],
  ['🌶️','piment espelette|piment oiseau|piment doux|paprika fume|paprika doux|piment chili|flocons de piment|cayenne|sriracha'],
  ['🌿','thym frais|thym seche|romarin frais|romarin seche|persil plat|persil frise|basilic frais|basilic seche|origan seche|herbes aromatiques|bouquet garni|feuilles de laurier|feuille de laurier|ciboulette fraiche|aneth frais|sauge fraiche|estragon frais|marjolaine|sarriette|cerfeuil|melisse|menthe fraiche'],
  ['🫗','huile de noix|huile de noisette|huile de pepins de raisin|huile de coco|huile d arachide|huile de lin|huile de sesame|huile de colza|huile de tournesol|vinaigre de vin blanc|vinaigre de vin rouge|vinaigre de riz|vinaigre de cidre|vinaigre de xeres|vinaigre blanc|vinaigre de framboise'],
  ['🫒','huile olive vierge|huile olive extra vierge|huile d olive extra vierge|olives noires|olives vertes'],
  ['🥫','sauce worcestershire|sauce huitre|sauce poisson|sauce teriyaki|sauce soja salee|sauce soja sucree|sauce nuoc mam|sauce pimentee|sauce barbecue|sauce aigre douce|sauce curry|fond de veau|fond de volaille|bouillon cube|bouillon de legumes|bouillon de poulet|concentre de tomates|puree de tomates|tomates sechees'],
  ['🍯','sirop agave|melasse|miel acacia|miel fleurs|miel lavande'],
  ['🧄','ail semoule|ail en poudre|ail frais|ail noir'],
  ['🫚','gingembre frais|gingembre moulu|gingembre en poudre|galanga'],
  ['🍋','citronnelle|zeste citron vert|jus citron vert'],
  ['🥜','graines de sesame|sesame blanc|sesame noir|graines de tournesol|graines de courge|graines de chia|graines de lin|pignons de pin'],
  ['🌰','noix de muscade|muscade moulue|noix pecan|noix de macadamia|noix du bresil'],
  ['🍚','riz jasmin|riz sauvage|riz venere|riz rouge|riz gluant'],
  ['🌾','farine epeautre|farine chataigne|farine pois chiche|farine sarrasin|farine avoine|farine seigle|farine t45|farine t55|farine t65|farine t80|farine t110|farine t150|fleur de mais|son avoine'],
  ['🥦','chou kale|chou pointu|chou rave|chou pak choi|chou brocoli|chou fleur violet'],
  ['🥬','cresson|scarole|frisee|batavia|sucrine|pousses epinards|pousses de salade|bette a carde|chicoree'],
  ['🥕','topinambour|rutabaga|radis noir|radis rose|celeri rave|persil tubereux'],
  ['🍄','champignon portobello|champignon brun|trompettes de la mort|bolets|enoki'],
  ['🍎','pomme granny smith|pomme golden|pomme gala|pomme pink lady'],
  ['🍊','kumquat|pomelo|orange sanguine|bergamote'],
  ['🍓','fraise gariguette|fraises des bois|framboise jaune'],
  ['🥩','bavette|rumsteck|paleron|joue de boeuf|bourguignon|jarret|tendron|cote de boeuf|cote de porc|escalope de veau|gigot agneau|souris agneau'],
  ['🐟','dorade|bar|sole|limande|rouget|espadon|haddock|hareng|lotte|merlan|perche|tilapia'],
  ['🦐','bouquet de crevettes|crevettes roses|crevettes grises'],
  ['🧀','gorgonzola|roquefort|bleu auvergne|saint nectaire|cantal|tomme|pecorino|burrata|halloumi|provolone|edam|gouda|munster'],
  ['🥛','lait ribot|lait concentre|lait concentre sucre|lait fermente|creme soja|creme avoine'],
  ['🍫','chocolat patissier|chocolat couverture|cacao amer|cacao non sucre'],
  ['🧃','nectar abricot|jus multifruits|jus cranberry|jus grenade'],
  ['🧴','gel hydroalcoolique|savon mains|shampoing sec|apres shampoing|masque cheveux|gel coiffant|lotion corporelle'],
  ['🧽','pastilles lave vaisselle|tablettes lave vaisselle|nettoyant multi usage|produit vitres|detartrant|degraissant']
];
const exact=new Map();
for(const [em,names] of groups){for(const a of names.split(' | '))exact.set(norm(a),em)}
for(const [em,names] of additional){for(const a of names.split('|'))exact.set(norm(a),em)}
for(const [em,names] of extraNames){for(const a of names.split('|'))exact.set(norm(a),em)}
const rules=[
[/\boeufs?\b|\bjaunes? d oeuf\b|\bblancs? d oeuf\b/,'🥚'],
[/chou fleur|brocoli|romanesco/,'🥦'],[/bouillon/,'🥫'],[/creme fraiche|creme liquide|creme epaisse/,'🥛'],
[/lardons?|bacon/,'🥓'],[/pomme de terre|patates?/,'🥔'],[/oignons?|echalotes?/,'🧅'],
[/\bail\b|gousses? d ail/,'🧄'],[/carottes?/,'🥕'],[/tomates?/,'🍅'],
[/\briz\b/,'🍚'],[/spaghetti|nouilles|\bpates\b/,'🍝'],[/saumon|thon|cabillaud|\bpoisson\b/,'🐟'],
[/poulet|dinde/,'🍗'],[/fromage|emmental|parmesan/,'🧀'],[/beurre/,'🧈'],
[/\blait\b/,'🥛'],[/farine|fecule|semoule/,'🌾'],[/\bhuile\b/,'🫗'],
[/vinaigre|moutarde|\bsauce\b/,'🥫'],[/\bsel\b|poivre/,'🧂'],[/sucre/,'🍬'],
[/chocolat|cacao/,'🍫'],[/champignons?/,'🍄'],[/courgettes?|concombres?/,'🥒'],
[/salade|epinards?|poireaux?/,'🥬'],[/crevettes?/,'🦐'],[/\bboeuf\b|\bviande\b|\bveau\b/,'🥩'],
[/\bpommes?\b/,'🍎'],[/citrons?/,'🍋'],[/yaourts?/,'🥣']
];
function saved(){try{return JSON.parse(localStorage.getItem(KEY)||'{}')}catch(_){return {}}}
function get(name){const n=norm(name);const custom=saved();if(custom[n])return custom[n];try{if(typeof catData==='function'){const C=catData();const key=Object.keys(C.emoji||{}).find(k=>norm(k)===n);if(key&&C.emoji[key])return C.emoji[key];}}catch(_){}if(exact.has(n))return exact.get(n);for(const [re,e] of rules)if(re.test(n))return e;return '🛒'}
function chosen(name){const n=norm(name);const custom=saved();if(custom[n])return custom[n];try{if(typeof catData==='function'){const C=catData();const key=Object.keys(C.emoji||{}).find(k=>norm(k)===n);if(key&&C.emoji[key])return C.emoji[key];}}catch(_){}return ''}
function html(name){const c=chosen(name);if(c)return c;const art=window.IngredientArt&&IngredientArt.svg(name);if(art)return `<span class="ing-art" aria-hidden="true">${art}</span>`;return get(name)}
// Palette enrichie : tous les emojis disponibles dans le sélecteur sont de vrais caractères Unicode.
const categories={
 'Légumes et aromates':['🛒','🥔','🍠','🧅','🧄','🥦','🥕','🥒','🫑','🍆','🥬','🍄','🌽','🫛','🫘','🎃','🍅','🥑','🫒','🌶️','🌿','🫚','🥗','🪴','🌱','🥜'],
 'Fruits':['🍎','🍏','🍐','🍊','🍋','🍋\u200d🟩','🍌','🍉','🍇','🍓','🫐','🍒','🍑','🍍','🥝','🥭','🥥','🫒','🥑','🍈','🍅'],
 'Viandes et charcuteries':['🥩','🍖','🍗','🥓','🌭','🍔','🥪','🥙','🥟','🍲','🍛'],
 'Poissons et fruits de mer':['🐟','🐠','🐡','🦈','🦐','🦀','🦞','🦑','🐙','🦪','🍤','🍣','🍥','🍙'],
 'Œufs et produits laitiers':['🥚','🍳','🥛','🧀','🧈','🍶','🥣','🍦','🍨','🍮','🍼'],
 'Féculents, céréales et pains':['🌾','🍚','🍙','🍘','🍝','🍜','🍞','🥖','🥐','🥯','🥨','🥞','🧇','🥪','🍕','🫓','🫔','🥟','🥠','🍿'],
 'Épicerie salée':['🥫','🫘','🫛','🫒','🍅','🍄','🥒','🥣','🍲','🍛','🥜','🌰','🧄','🧅','🍙','🫙'],
 'Épicerie sucrée et desserts':['🍯','🍬','🍭','🍫','🍪','🍩','🧁','🍰','🎂','🍮','🍨','🍧','🍦','🥧','🥞','🧇','🥐','🥜','🌰','🍡','🍥'],
 'Épices et condiments':['🧂','🌶️','🌶','🌿','🪴','🌱','🍃','🫚','🧄','🧅','🍋','🍋\u200d🟩','🫒','🫗','🫙','🥫','🍯','🥄','🍶','🥜','🌰','🍅','🥒','🧈','🥣'],
 'Boissons':['💧','🫗','🧊','🥛','🧃','🥤','🧋','☕','🍵','🫖','🍶','🍷','🍾','🥂','🍺','🍻','🍹','🍸','🥃','🍼'],
 'Maison, hygiène et animaux':['🧴','🧼','🧽','🧹','🧺','🧻','🪥','🪒','🪣','🗑️','🧤','🧷','🩹','🧯','🕯️','🔋','💡','📦','🛍️','🧸','👶','🐾','🐶','🐱','🌸','☁️','📜','🧵','🧶','🧪','🧫','🧲','🪤','🧦','👕','👟','🧢','🪮','🪞','🪠','🧰']
};
const choices=[...new Set(Object.values(categories).flat())];
function pick(name,onChange){
 const old=document.getElementById('ingredientEmojiPicker');if(old)old.remove();
 const d=document.createElement('dialog');d.id='ingredientEmojiPicker';
 d.style.cssText='width:min(600px,94vw);max-height:85vh;overflow:auto;border:1px solid #38bdf8;border-radius:20px;background:#0b2347;color:white;padding:18px;box-shadow:0 0 30px #1896e8';
 const title=document.createElement('h3');title.textContent='Choisir un emoji : '+name;d.append(title);
 const input=document.createElement('input');input.type='search';input.placeholder='Rechercher une catégorie (fruit, légume, maison…)';input.setAttribute('aria-label','Filtrer les catégories');input.style.cssText='box-sizing:border-box;width:100%;padding:12px;margin-bottom:12px;border:1px solid #397fc4;border-radius:10px;background:#071a35;color:white';d.append(input);
 const content=document.createElement('div');d.append(content);
 function draw(){const query=norm(input.value);content.replaceChildren();let found=0;
 for(const [label,ems] of Object.entries(categories)){
  if(query&&!norm(label).includes(query)&&!((query.includes('epice')||query.includes('sel')||query.includes('poivre')||query.includes('huile')||query.includes('vinaigre')||query.includes('herbe')||query.includes('sauce'))&&label==='Épices et condiments'))continue;
  found++;const h=document.createElement('h4');h.textContent=label;h.style.cssText='margin:12px 0 7px';content.append(h);
  const grid=document.createElement('div');grid.style.cssText='display:grid;grid-template-columns:repeat(auto-fill,minmax(43px,1fr));gap:7px';
  for(const em of ems){const b=document.createElement('button');b.type='button';b.textContent=em;b.setAttribute('aria-label','Choisir '+em);b.style.cssText='font-size:25px;background:#173c69;border:1px solid #397fc4;border-radius:10px;padding:7px;cursor:pointer;min-height:45px';b.addEventListener('click',()=>{const all=saved();all[norm(name)]=em;localStorage.setItem(KEY,JSON.stringify(all));try{if(typeof catSet==='function'&&typeof catData==='function'){const C=catData();const key=[...C.own,...C.builtin].find(k=>norm(k)===norm(name));if(key)catSet('dailyEmoji',key,em);}}catch(_){}d.close();if(onChange)onChange();});grid.append(b)}content.append(grid);
 }if(!found){const p=document.createElement('p');p.textContent='Aucune catégorie trouvée. Effacez la recherche pour voir tous les emojis.';content.append(p)}
 }
 input.addEventListener('input',draw);draw();
 const close=document.createElement('button');close.textContent='Fermer';close.style.cssText='margin-top:15px;padding:10px 20px;border-radius:12px;background:#194577;color:white;border:1px solid #38bdf8';close.onclick=()=>d.close();d.append(close);d.addEventListener('close',()=>d.remove());document.body.append(d);d.showModal();
}
window.IngredientEmoji={get,html,pick,normalize:norm,choices};
})();
