// KRILLION curated answer bank.
//
// Rarity is EDITORIAL: tiers reflect how likely an average player is to think of
// an answer, judged by the OFFGRID editors — not real-world survey statistics.
//
// Format per tier: entries separated by ';'. Each entry is `canonical|alias|alias`.
// Plurals, case, accents, punctuation, leading articles and small typos are
// handled by the validator, so they don't need listing here.

export type Theme = 'food' | 'nature' | 'world' | 'sport' | 'culture' | 'science' | 'everyday';
export type RawPrompt = { id: string; text: string; theme: Theme; c: string; u: string; r: string; d: string };

export const THEMES: Record<Theme, { label: string; emoji: string }> = {
  food: { label: 'Food & Drink', emoji: '🍕' },
  nature: { label: 'Nature', emoji: '🌿' },
  world: { label: 'Geography', emoji: '🌍' },
  sport: { label: 'Sports & Games', emoji: '🏀' },
  culture: { label: 'Pop Culture', emoji: '🎬' },
  science: { label: 'Science', emoji: '🧪' },
  everyday: { label: 'Everyday', emoji: '🏠' },
};

export const RAW_PROMPTS: RawPrompt[] = [
  // ---------------- FOOD ----------------
  {
    id: 'pizza', text: 'Name a pizza topping.', theme: 'food',
    c: 'pepperoni|peperoni|pepperonni; cheese|extra cheese|mozzarella; mushroom|shroom; sausage|italian sausage; onion|red onion; green pepper|bell pepper|peppers|capsicum; olive|black olive|green olive; pineapple',
    u: 'ham; bacon; jalapeno|jalapeño|jalepeno; spinach; tomato|tomatoes|sliced tomato; chicken|bbq chicken|grilled chicken; ground beef|beef|hamburger; basil|fresh basil; garlic|roasted garlic; anchovy|anchovies',
    r: 'artichoke|artichoke hearts; ricotta; feta; prosciutto; arugula|rocket; meatball; banana pepper; sun dried tomato|sundried tomato; goat cheese|chevre; parmesan|parmigiano; pesto; hot honey|honey; salami; red pepper flakes|chili flakes|crushed red pepper; broccoli; corn|sweetcorn; egg|fried egg; buffalo chicken',
    d: 'capers; clams|clam; shrimp|prawn; potato; truffle|truffle oil; fig; pear; gorgonzola; soppressata; nduja|n duja; burrata; zucchini|courgette; eggplant|aubergine; kale; tuna; squid|calamari; pickle; mac and cheese; kimchi; brussels sprout; walnut; sardine; pistachio; chorizo; bulgogi; mortadella; lobster; peach; cauliflower',
  },
  {
    id: 'fruit', text: 'Name a fruit.', theme: 'food',
    c: 'apple; banana; orange; strawberry; grape; watermelon; pineapple; mango',
    u: 'pear; peach; cherry; blueberry; lemon; lime; kiwi|kiwifruit; raspberry; plum; cantaloupe; coconut; grapefruit; blackberry; avocado; tomato',
    r: 'pomegranate; papaya; apricot; nectarine; honeydew; fig; cranberry; tangerine; clementine; mandarin; guava; passion fruit|passionfruit; lychee|litchi; date; persimmon; dragon fruit|pitaya; star fruit|starfruit|carambola',
    d: 'durian; jackfruit; rambutan; quince; gooseberry; elderberry; mulberry; kumquat; loquat; yuzu; soursop|guanabana; mangosteen; tamarind; plantain; boysenberry; huckleberry; ugli fruit; cherimoya; feijoa; salak|snake fruit; jabuticaba; physalis|ground cherry|cape gooseberry; acai|açaí; medlar; pawpaw; lingonberry; cloudberry; olive',
  },
  {
    id: 'cheese', text: 'Name a type of cheese.', theme: 'food',
    c: 'cheddar; mozzarella; swiss; parmesan|parmigiano|parmigiano reggiano; american',
    u: 'brie; gouda; provolone; feta; pepper jack|pepperjack; monterey jack|jack; colby; ricotta; cream cheese; blue cheese|bleu cheese; cottage cheese; goat cheese|chevre',
    r: 'gruyere|gruyère; camembert; havarti; manchego; muenster|munster; romano|pecorino romano|pecorino; asiago; gorgonzola; mascarpone; halloumi; burrata; colby jack; string cheese; roquefort; stilton; emmental|emmentaler; fontina',
    d: 'taleggio; comte|comté; raclette; edam; limburger; paneer; queso fresco; cotija; oaxaca; jarlsberg; wensleydale; red leicester; double gloucester; boursin; epoisses|époisses; reblochon; manouri; casu marzu; port salut; leerdammer; quark; labneh; burrata di andria; caciocavallo; scamorza; mimolette; brunost|gjetost',
  },
  {
    id: 'breakfast', text: 'Name a breakfast food.', theme: 'food',
    c: 'eggs|egg|scrambled eggs|fried eggs; pancake; bacon; cereal; toast; waffle; oatmeal|porridge|oats',
    u: 'french toast; sausage; bagel; muffin; yogurt|yoghurt; hash brown|hashbrowns|hash browns; omelet|omelette; croissant; granola; breakfast burrito; donut|doughnut; smoothie; fruit',
    r: 'biscuits and gravy|biscuit; grits; avocado toast; eggs benedict; english muffin; crepe|crêpe; quiche; frittata; danish|pastry; cinnamon roll; huevos rancheros; breakfast sandwich; acai bowl|açaí bowl; scone; ham',
    d: 'shakshuka; congee|jook; chilaquiles; kippers; black pudding; full english; baked beans; dosa; idli; poha; menemen; natto; miso soup; tamago; corned beef hash; kedgeree; scrapple; migas; muesli; pain au chocolat; dutch baby; johnnycake; arepa; gallo pinto; chia pudding; lox|smoked salmon; porridge with honey',
  },
  {
    id: 'vegetable', text: 'Name a vegetable.', theme: 'food',
    c: 'carrot; broccoli; potato; lettuce; corn; onion; tomato; pea|peas',
    u: 'spinach; celery; cucumber; green bean|string bean; cauliflower; cabbage; pepper|bell pepper|capsicum; zucchini|courgette; asparagus; mushroom; sweet potato|yam; kale; garlic',
    r: 'brussels sprout|brussel sprout; eggplant|aubergine; beet|beetroot; radish; artichoke; squash|butternut squash; pumpkin; leek; turnip; okra; bok choy|pak choi; arugula|rocket; parsnip; edamame',
    d: 'kohlrabi; rutabaga|swede; fennel; jicama; daikon; chard|swiss chard; collard greens|collards; endive; watercress; celeriac; salsify; taro; cassava|yuca; jerusalem artichoke|sunchoke; romanesco; shallot; scallion|green onion|spring onion; bamboo shoot; lotus root; bitter melon; chayote; fiddlehead; kale rabe|broccoli rabe|rapini; mustard greens; water chestnut; tomatillo; nopal|cactus; burdock',
  },
  {
    id: 'spice', text: 'Name a spice or herb.', theme: 'food',
    c: 'salt; pepper|black pepper; cinnamon; basil; oregano; garlic',
    u: 'paprika; cumin; thyme; rosemary; parsley; ginger; chili powder; nutmeg; cilantro|coriander; mint; dill; sage; turmeric',
    r: 'cayenne; bay leaf|bay; cloves|clove; allspice; cardamom; curry powder; chives; tarragon; saffron; vanilla; fennel; mustard seed|mustard; garam masala; red pepper flakes',
    d: 'sumac; za atar|zaatar|za’atar; star anise|anise; fenugreek; marjoram; lemongrass; asafoetida|hing; annatto; galangal; juniper; mace; nigella; sichuan pepper|szechuan pepper; berbere; ras el hanout; herbes de provence; chervil; lovage; savory; epazote; borage; caraway; celery seed; white pepper; five spice; shichimi; tamarind; smoked paprika|pimenton; long pepper; grains of paradise; kaffir lime leaf|makrut lime leaf; curry leaf',
  },
  {
    id: 'pasta', text: 'Name a type of pasta.', theme: 'food',
    c: 'spaghetti; penne; macaroni; lasagna|lasagne; fettuccine|fettucine|fettuccini',
    u: 'ravioli; linguine|linguini; rigatoni; farfalle|bowtie|bow tie; rotini; tortellini; ziti; angel hair|capellini; elbow',
    r: 'orzo; gnocchi; orecchiette; fusilli; manicotti; cannelloni; pappardelle; tagliatelle; shells|conchiglie; bucatini; vermicelli; cavatappi|cellentani; ditalini',
    d: 'radiatori; campanelle; gemelli; strozzapreti; cavatelli; paccheri; trofie; mafaldine|mafalde; casarecce; anelli; acini di pepe; stelline; agnolotti; mezzelune; tortelloni; garganelli; pici; lumache; calamarata; spaetzle|spätzle; fregola; trenette; bigoli; corzetti; sacchetti; tortiglioni; cappelletti; maltagliati',
  },
  {
    id: 'dessert', text: 'Name a dessert.', theme: 'food',
    c: 'cake; ice cream; cookie; pie; brownie; cupcake',
    u: 'cheesecake; pudding; apple pie; donut|doughnut; chocolate cake; milkshake; sundae; tiramisu; cobbler; fudge; candy',
    r: 'creme brulee|crème brûlée; mousse; flan; macaron|macaroon; eclair|éclair; cannoli; baklava; panna cotta; churro; banana split; key lime pie; trifle; souffle|soufflé; gelato; sorbet; carrot cake; red velvet',
    d: 'pavlova; mochi; tres leches; gulab jamun; kheer; sticky toffee pudding; baked alaska; clafoutis; profiterole; tarte tatin; zabaglione; semifreddo; cassata; bread pudding; halo halo; kulfi; knafeh|kunafa; rice pudding; eton mess; bananas foster; mille feuille|napoleon; croquembouche; kouign amann; lamington; whoopie pie; affogato; galette; pastel de nata; brigadeiro; strudel; madeleine; panettone; bingsu; shaved ice; jello|jell o|gelatin',
  },
  {
    id: 'sandwich', text: 'Name a type of sandwich.', theme: 'food',
    c: 'grilled cheese; peanut butter and jelly|pbj|pb&j|pb and j; blt|bacon lettuce tomato; ham and cheese; club; turkey',
    u: 'sub|submarine|hoagie|hero; reuben; tuna|tuna melt|tuna salad; philly cheesesteak|cheesesteak|cheese steak; sloppy joe; panini; egg salad; chicken salad; meatball sub; hamburger|burger',
    r: 'cuban|cubano; french dip; po boy|po’ boy|poboy; banh mi|bánh mì; monte cristo; patty melt; croque monsieur; muffuletta|muffaletta; gyro; pastrami; italian sub|italian; caprese; falafel; club sandwich',
    d: 'cucumber sandwich; torta; katsu sando|sando; chip butty; bauru; francesinha; smorrebrod|smørrebrød; chacarero; tramezzino; zapiekanka; vada pav; bocadillo; medianoche; pambazo; mitraillette; doner|döner|doner kebab; shawarma; hot brown; beef on weck; fluffernutter; spiedie; cemita; jambon beurre; bacon butty; elvis|peanut butter banana',
  },

  // ---------------- NATURE ----------------
  {
    id: 'ocean', text: 'Name an animal that lives in the ocean.', theme: 'nature',
    c: 'shark; whale; dolphin; fish; octopus; jellyfish',
    u: 'crab; lobster; starfish|sea star; seal; turtle|sea turtle; squid; shrimp; stingray|ray; clownfish; orca|killer whale; sea lion; tuna; seahorse|sea horse; eel',
    r: 'manta ray; walrus; sea urchin|urchin; barracuda; narwhal; swordfish; anglerfish|angler fish; blue whale; hammerhead|hammerhead shark; humpback whale|humpback; pufferfish|blowfish|puffer; marlin; oyster; clam; coral; sea otter; manatee; beluga',
    d: 'nudibranch; sea cucumber; cuttlefish; nautilus; dugong; krill; plankton; barnacle; sunfish|mola mola|mola; oarfish; lionfish; grouper; halibut; sardine; anchovy; mackerel; hagfish; lamprey; sea anemone|anemone; sponge; sea slug; mantis shrimp; vampire squid; leafy sea dragon|sea dragon; goblin shark; frilled shark; whale shark; sperm whale; giant isopod|isopod; blobfish; coelacanth; triggerfish; parrotfish; wrasse; remora; man o war|portuguese man o war; box jellyfish; sea pig',
  },
  {
    id: 'bird', text: 'Name a bird.', theme: 'nature',
    c: 'eagle; robin; pigeon; crow; owl; parrot; penguin; chicken',
    u: 'hawk; seagull|gull; duck; flamingo; hummingbird; blue jay|jay; sparrow; cardinal; turkey; swan; ostrich; peacock|peafowl; woodpecker; goose; dove',
    r: 'falcon; pelican; toucan; raven; vulture; heron; crane; stork; canary; finch; parakeet|budgie|budgerigar; emu; kiwi; magpie; puffin; condor; mockingbird; starling; quail; macaw; cockatoo; bald eagle; oriole',
    d: 'cassowary; albatross; kingfisher; hoopoe; shoebill; secretary bird; kookaburra; lyrebird; bird of paradise; booby|blue footed booby; frigatebird; cormorant; ibis; spoonbill|roseate spoonbill; nightingale; wren; warbler; tanager; grackle; nuthatch; chickadee; titmouse; plover; sandpiper; killdeer; osprey; kestrel; harrier; roadrunner; bittern; egret; grebe; loon; kakapo; quetzal; hornbill; rhea; tern; dodo; oxpecker; weaver; bowerbird; pheasant; grouse; ptarmigan',
  },
  {
    id: 'dog', text: 'Name a dog breed.', theme: 'nature',
    c: 'labrador|lab|labrador retriever; golden retriever|golden; german shepherd; poodle; bulldog; beagle; chihuahua; pug',
    u: 'husky|siberian husky; dachshund|wiener dog|sausage dog; rottweiler; boxer; corgi; shih tzu; pitbull|pit bull; yorkie|yorkshire terrier; great dane; french bulldog|frenchie; border collie; doberman|dobermann; dalmatian',
    r: 'cocker spaniel; maltese; pomeranian; australian shepherd|aussie; bernese mountain dog|bernese; saint bernard|st bernard; greyhound; bichon frise|bichon; collie; schnauzer; jack russell|jack russell terrier; boston terrier; shiba inu|shiba; akita; mastiff; samoyed; cavalier king charles|cavalier; basset hound; bloodhound; sheepdog|old english sheepdog; malamute|alaskan malamute; weimaraner; goldendoodle; labradoodle',
    d: 'basenji; xoloitzcuintli|xolo; komondor; puli; borzoi; saluki; vizsla; whippet; newfoundland; leonberger; bull terrier; shar pei; chow chow|chow; papillon; pekingese; lhasa apso; affenpinscher; keeshond; bedlington terrier; airedale; kelpie; catahoula; rhodesian ridgeback|ridgeback; irish wolfhound; great pyrenees; cane corso; dogo argentino; norwegian elkhound; havanese; coton de tulear; brittany; pointer; setter|irish setter; staffordshire terrier|staffy|staffie; scottie|scottish terrier; westie|west highland terrier; sheltie|shetland sheepdog; belgian malinois|malinois; tibetan mastiff; azawakh; lagotto romagnolo; otterhound',
  },
  {
    id: 'insect', text: 'Name an insect or bug.', theme: 'nature',
    c: 'ant; bee; fly; mosquito; butterfly; spider; ladybug|ladybird; cockroach|roach',
    u: 'beetle; grasshopper; cricket; moth; wasp; dragonfly; caterpillar; flea; tick; termite; firefly|lightning bug; centipede',
    r: 'praying mantis|mantis; stink bug; bed bug|bedbug; hornet; yellow jacket; cicada; gnat; louse|lice; earwig; silverfish; millipede; scorpion; locust; aphid; walking stick|stick insect; june bug; weevil; horsefly',
    d: 'katydid; mayfly; damselfly; lacewing; antlion; cockchafer; dung beetle; stag beetle; rhinoceros beetle; hercules beetle; water strider; whirligig; thrips; mealybug; scale insect; leafhopper; boll weevil; tarantula hawk; velvet ant; assassin bug; kissing bug; caddisfly; stonefly; springtail; booklouse; firebrat; mantisfly; scorpionfly; dobsonfly; hellgrammite; cicada killer; bumblebee; carpenter ant; fire ant; bullet ant; leafcutter ant; tsetse fly',
  },
  {
    id: 'tree', text: 'Name a type of tree.', theme: 'nature',
    c: 'oak; pine; maple; palm; apple tree; christmas tree',
    u: 'birch; willow|weeping willow; redwood; cherry; spruce; fir; cedar; elm; sequoia; aspen; evergreen; walnut',
    r: 'magnolia; dogwood; sycamore; ash; beech; poplar; cypress; hickory; chestnut; eucalyptus; juniper; baobab; bonsai; banyan; mahogany; teak; olive; orange tree; lemon tree; peach tree; joshua tree; douglas fir; hemlock; cottonwood',
    d: 'ginkgo|ginkgo biloba; larch|tamarack; alder; hornbeam; hawthorn; linden|lime tree|basswood; locust|honey locust; catalpa; tupelo; sassafras; mangrove; acacia; dragon blood tree|dragon tree; jacaranda; tulip tree|tulip poplar; sweetgum; yew; rowan|mountain ash; kapok; bristlecone pine; monkey puzzle; cork oak; ironwood; ebony; balsa; sandalwood; rubber tree; ceiba; myrtle; buckeye; horse chestnut; pecan; persimmon; mulberry; paperbark; quaking aspen; hemlock spruce; wollemi pine',
  },
  {
    id: 'flower', text: 'Name a flower.', theme: 'nature',
    c: 'rose; tulip; daisy; sunflower; lily; daffodil',
    u: 'orchid; carnation; lavender; dandelion; poppy; violet; hibiscus; iris; lotus; marigold; peony; hydrangea; lilac',
    r: 'chrysanthemum|mum; geranium; petunia; azalea; begonia; gardenia; magnolia; jasmine; zinnia; pansy; snapdragon; camellia; gladiolus; aster; carnation; cherry blossom|sakura; daylily; forget me not; bluebell; buttercup; morning glory; lily of the valley; tiger lily; dahlia; crocus; amaryllis; hyacinth',
    d: 'protea; ranunculus; anemone; foxglove; hollyhock; delphinium|larkspur; edelweiss; snowdrop; columbine; bird of paradise; plumeria|frangipani; bougainvillea; wisteria; heather; clematis; freesia; gerbera; lisianthus; stephanotis; calla lily|calla; sweet pea; nasturtium; cosmos; verbena; coneflower|echinacea; black eyed susan; yarrow; primrose; trillium; corpse flower|rafflesia|titan arum; passionflower; gardenia; oleander; bleeding heart; salvia; lupine|lupin; alstroemeria; statice; celosia; vinca; impatiens; portulaca',
  },
  {
    id: 'reptile', text: 'Name a reptile or amphibian.', theme: 'nature',
    c: 'snake; frog; turtle; lizard; alligator; crocodile',
    u: 'toad; tortoise; iguana; gecko; chameleon; salamander; python; rattlesnake; cobra; komodo dragon',
    r: 'newt; axolotl; anaconda; boa|boa constrictor; viper; gila monster; bearded dragon; tree frog|red eyed tree frog; poison dart frog|dart frog; sea turtle; caiman; monitor lizard; garter snake; king cobra; black mamba|mamba; bullfrog; snapping turtle; box turtle; skink; corn snake',
    d: 'gharial; tuatara; olm; caecilian; mudpuppy; hellbender; basilisk|jesus lizard; thorny devil; frilled lizard; horned lizard|horned toad; glass frog; goliath frog; cane toad; leatherback; loggerhead; terrapin; slider|red eared slider; sidewinder; copperhead; cottonmouth|water moccasin; taipan; boomslang; krait; adder; milk snake; king snake|kingsnake; ball python; anole; uromastyx; leopard gecko; mata mata; softshell turtle; spadefoot toad; siren; amphiuma; coqui; wood frog; marine iguana; agama; tegu',
  },

  // ---------------- WORLD ----------------
  {
    id: 'europe', text: 'Name a country in Europe.', theme: 'world',
    c: 'france; germany; italy; spain; england; united kingdom|uk|great britain|britain',
    u: 'ireland; portugal; greece; netherlands|holland; sweden; norway; switzerland; poland; russia; belgium; austria; denmark; ukraine; scotland',
    r: 'finland; iceland; czech republic|czechia; hungary; croatia; romania; wales; serbia; bulgaria; turkey|turkiye|türkiye; luxembourg; monaco; slovakia; slovenia; belarus; estonia; latvia; lithuania; vatican city|vatican|holy see',
    d: 'albania; andorra; liechtenstein; san marino; malta; moldova; montenegro; north macedonia|macedonia; bosnia|bosnia and herzegovina; kosovo; cyprus; georgia; armenia; azerbaijan; kazakhstan; northern ireland',
  },
  {
    id: 'africa', text: 'Name a country in Africa.', theme: 'world',
    c: 'egypt; south africa; nigeria; kenya',
    u: 'morocco; ethiopia; ghana; madagascar; algeria; tanzania; uganda; somalia; sudan; libya; rwanda; zimbabwe; congo|democratic republic of the congo|drc|republic of the congo',
    r: 'senegal; tunisia; cameroon; angola; namibia; botswana; zambia; mali; ivory coast|cote d ivoire|côte d’ivoire; mozambique; sierra leone; liberia; south sudan; niger; chad; malawi',
    d: 'eritrea; djibouti; burkina faso; benin; togo; gabon; equatorial guinea; guinea; guinea bissau; gambia|the gambia; mauritania; cape verde|cabo verde; lesotho; eswatini|swaziland; burundi; comoros; seychelles; mauritius; sao tome and principe|são tomé and príncipe; central african republic|car; western sahara',
  },
  {
    id: 'state', text: 'Name a US state.', theme: 'world',
    c: 'california; texas; florida; new york; alaska; hawaii',
    u: 'washington; arizona; nevada; colorado; ohio; michigan; illinois; georgia; massachusetts; oregon; new jersey; pennsylvania; north carolina; virginia; utah',
    r: 'tennessee; kentucky; louisiana; alabama; mississippi; missouri; minnesota; wisconsin; indiana; iowa; kansas; oklahoma; new mexico; south carolina; maryland; connecticut; maine; idaho; montana',
    d: 'wyoming; north dakota; south dakota; nebraska; arkansas; west virginia; delaware; rhode island; vermont; new hampshire',
  },
  {
    id: 'capital', text: 'Name a capital city.', theme: 'world',
    c: 'london; paris; washington dc|washington|washington d c; tokyo; rome; berlin',
    u: 'madrid; moscow; beijing; ottawa; canberra; mexico city; cairo; athens; dublin; amsterdam; seoul; new delhi|delhi; bangkok',
    r: 'lisbon; vienna; prague; stockholm; oslo; copenhagen; helsinki; brussels; warsaw; budapest; buenos aires; lima; santiago; bogota|bogotá; nairobi; havana; jakarta; manila; hanoi; kyiv|kiev; ankara; tehran; riyadh; reykjavik; bern; wellington; brasilia|brasília; sacramento; austin; albany; boston; atlanta; denver',
    d: 'ulaanbaatar|ulan bator; thimphu; kathmandu; tbilisi; yerevan; baku; tashkent; bishkek; astana; vientiane; naypyidaw; antananarivo; addis ababa; kigali; dakar; accra; abuja; windhoek; gaborone; maputo; lusaka; harare; quito; la paz; sucre; asuncion|asunción; montevideo; caracas; tegucigalpa; managua; san jose; port moresby; suva; valletta; ljubljana; bratislava; vilnius; riga; tallinn; chisinau; skopje; tirana; sarajevo; podgorica; nicosia; muscat; doha; manama; kuwait city; amman; beirut; damascus; baghdad; kabul; islamabad; dhaka; colombo; male; juneau; pierre; montpelier; cheyenne; bismarck; olympia; tallahassee; springfield; harrisburg; carson city; boise; helena; topeka; frankfort; dover',
  },
  {
    id: 'river', text: 'Name a river.', theme: 'world',
    c: 'nile; amazon; mississippi; thames',
    u: 'colorado; hudson; rio grande; missouri; danube; ganges; seine; yangtze; ohio; potomac',
    r: 'rhine; volga; tigris; euphrates; mekong; jordan; columbia; snake; delaware; mackenzie; yukon; loire; tiber; congo; zambezi; niger; indus; yellow river|huang he; st lawrence|saint lawrence; arkansas; tennessee; charles; chicago river; east river',
    d: 'orinoco; parana|paraná; murray; darling; ob; yenisei; lena; amur; irrawaddy; brahmaputra; salween; elbe; oder; vistula; dnieper; don; po; ebro; tagus; douro; rhone|rhône; garonne; shannon; severn; trent; tyne; liffey; limpopo; orange river; okavango; fraser; susquehanna; shenandoah; sacramento; san joaquin; platte; red river; pecos; brazos; suwannee; styx; lethe',
  },
  {
    id: 'currency', text: 'Name a currency.', theme: 'world',
    c: 'dollar|us dollar; euro; pound|pound sterling|british pound; yen',
    u: 'peso; rupee; yuan|renminbi|rmb; franc|swiss franc; ruble|rouble; bitcoin; canadian dollar; won',
    r: 'krona; krone; real|brazilian real; rand; lira; shekel; dinar; dirham; baht; zloty; forint; australian dollar; rupiah; ringgit; dogecoin; ethereum|ether',
    d: 'koruna; leu; lev; hryvnia; lari; dram; manat; tenge; som; tugrik; kip; kyat; riel; dong; taka; ngultrum; afghani; rial; riyal; kina; naira; cedi; shilling; birr; kwacha; pula; nakfa; ouguiya; dalasi; guarani; boliviano; colon|colón; cordoba|córdoba; lempira; quetzal; balboa; gourde; sol; bolivar|bolívar; doubloon; drachma; deutsche mark|deutschmark|mark; escudo; peseta; guilder; ducat; denarius; shilling',
  },

  // ---------------- SPORT ----------------
  {
    id: 'ballsport', text: 'Name a sport played with a ball.', theme: 'sport',
    c: 'soccer|football|association football; basketball; baseball; tennis; american football; volleyball; golf',
    u: 'softball; rugby; cricket; bowling; ping pong|table tennis; dodgeball; kickball; handball; lacrosse; water polo; pickleball',
    r: 'squash; racquetball; polo; netball; billiards|pool|snooker; croquet; bocce; beach volleyball; field hockey; four square; tetherball; wiffle ball; padel|paddle tennis; badminton',
    d: 'jai alai|jai-alai; sepak takraw; hurling; gaelic football; aussie rules|australian rules football; korfball; pesapallo; rounders; stoolball; sitball; goalball; bossaball; teqball; footvolley; underwater rugby; buzkashi; chinlone; kemari; pelota; cuju; calcio storico; fistball; spikeball|roundnet; cornhole; skee ball; pall mall; marbles; shinty; camogie; bandy; lawn bowls|bowls; petanque|pétanque',
  },
  {
    id: 'olympic', text: 'Name an Olympic sport.', theme: 'sport',
    c: 'swimming; gymnastics; track|track and field|athletics|running; basketball; soccer|football; diving',
    u: 'boxing; wrestling; skiing; figure skating|ice skating|skating; ice hockey|hockey; volleyball; tennis; cycling; fencing; archery; snowboarding; rowing; weightlifting',
    r: 'judo; taekwondo; equestrian|show jumping|dressage; sailing; canoeing|kayaking; triathlon; badminton; table tennis; handball; water polo; speed skating; bobsled|bobsleigh; luge; curling; biathlon; surfing; skateboarding; sport climbing|climbing; golf; rugby sevens|rugby; synchronized swimming|artistic swimming',
    d: 'modern pentathlon|pentathlon; skeleton; nordic combined; ski jumping; trampoline; rhythmic gymnastics; bmx; mountain biking; breaking|breakdancing; marathon swimming; decathlon; heptathlon; shooting; steeplechase; hammer throw; javelin; shot put; discus; pole vault; race walking; freestyle skiing; moguls; mixed doubles curling; short track; alpine skiing; cross country skiing; tug of war; cricket; lacrosse; squash; softball; baseball',
  },
  {
    id: 'nba', text: 'Name an NBA team.', theme: 'sport',
    c: 'lakers|los angeles lakers; celtics|boston celtics; bulls|chicago bulls; warriors|golden state warriors; heat|miami heat',
    u: 'knicks|new york knicks; spurs|san antonio spurs; mavericks|dallas mavericks|mavs; nets|brooklyn nets; 76ers|sixers|philadelphia 76ers; rockets|houston rockets; clippers|la clippers; suns|phoenix suns; bucks|milwaukee bucks; nuggets|denver nuggets; cavaliers|cavs|cleveland cavaliers',
    r: 'raptors|toronto raptors; thunder|oklahoma city thunder|okc; trail blazers|blazers|portland trail blazers; jazz|utah jazz; hawks|atlanta hawks; pistons|detroit pistons; timberwolves|wolves|minnesota timberwolves; kings|sacramento kings; grizzlies|memphis grizzlies; pacers|indiana pacers',
    d: 'pelicans|new orleans pelicans; hornets|charlotte hornets; magic|orlando magic; wizards|washington wizards; supersonics|sonics|seattle supersonics; bobcats|charlotte bobcats; vancouver grizzlies; new jersey nets; bullets|washington bullets; new orleans hornets; minneapolis lakers; buffalo braves',
  },
  {
    id: 'boardgame', text: 'Name a board game.', theme: 'sport',
    c: 'monopoly; chess; checkers|draughts; scrabble; clue|cluedo',
    u: 'risk; candy land|candyland; sorry; trouble; battleship; connect four|connect 4; operation; life|the game of life; chutes and ladders|snakes and ladders; backgammon; guess who; catan|settlers of catan',
    r: 'ticket to ride; pandemic; stratego; mouse trap; othello|reversi; go; mancala; parcheesi|ludo; trivial pursuit; pictionary; scattergories; jenga; yahtzee; boggle; mastermind; hungry hungry hippos; apples to apples; carcassonne; codenames',
    d: 'azul; wingspan; terraforming mars; gloomhaven; splendor; dominion; 7 wonders|seven wonders; agricola; puerto rico; twilight imperium; diplomacy; axis and allies; blokus; hive; quoridor; xiangqi|chinese chess; shogi; chinese checkers; nine mens morris; senet; ur|royal game of ur; hnefatafl|tafl; carrom; crokinole; root; scythe; everdell; cascadia; patchwork; brass; power grid; small world; king of tokyo; dixit; mysterium; betrayal at house on the hill; arkham horror; cribbage; perfection; payday; masterpiece; acquire; stratego',
  },

  // ---------------- CULTURE ----------------
  {
    id: 'instrument', text: 'Name a musical instrument.', theme: 'culture',
    c: 'guitar; piano; drums|drum; violin; trumpet; flute',
    u: 'saxophone|sax; bass|bass guitar|electric bass; cello; clarinet; harp; ukulele; trombone; harmonica; keyboard; tuba; xylophone; tambourine; banjo',
    r: 'oboe; french horn|horn; viola; double bass|upright bass|contrabass; accordion; bagpipes|bagpipe; mandolin; organ; triangle; cymbal; bongo; marimba; glockenspiel; bassoon; piccolo; recorder; synthesizer|synth; kazoo; cowbell; maracas; sitar; steel drum|steel pan',
    d: 'theremin; didgeridoo; harpsichord; lute; lyre; zither; dulcimer; hurdy gurdy; balalaika; bouzouki; oud; koto; shamisen; erhu; pipa; guzheng; tabla; sarod; shehnai; djembe; cajon|cajón; kalimba|thumb piano|mbira; ocarina; pan flute|panpipes; shakuhachi; tin whistle|penny whistle; euphonium; flugelhorn; sousaphone; cornet; celesta; vibraphone; timpani|kettle drum; gong; handpan|hang drum; melodica; clavinet; mellotron; keytar; washboard; jaw harp|jew’s harp|mouth harp; nyckelharpa; hardanger fiddle; sackbut; serpent; crumhorn; shofar; vuvuzela; talkbox|talk box',
  },
  {
    id: 'superhero', text: 'Name a superhero.', theme: 'culture',
    c: 'spider man|spiderman|spider-man; batman; superman; iron man|ironman; wonder woman; captain america; hulk|the hulk|incredible hulk',
    u: 'thor; black panther; wolverine; flash|the flash; aquaman; black widow; deadpool; green lantern; captain marvel|shazam; ant man|antman; doctor strange|dr strange; hawkeye',
    r: 'cyclops; storm; robin; batgirl; supergirl; green arrow; daredevil; silver surfer; scarlet witch|wanda; vision; falcon; nightwing; cyborg; martian manhunter; jean grey|phoenix; rogue; gambit; ghost rider; star lord|starlord; groot; rocket|rocket raccoon; gamora; she hulk; moon knight; ms marvel|kamala khan; blue beetle; shang chi; invisible woman; human torch; mister fantastic|mr fantastic; the thing; static|static shock',
    d: 'squirrel girl; nova; the tick; hellboy; spawn; invincible; omni man|omniman; homelander; the atom; booster gold; plastic man; hawkman; hawkgirl; zatanna; raven; beast boy; starfire; blue lantern; black canary; huntress; black lightning; firestorm; vixen; elongated man; dazzler; cloak and dagger; luke cage; iron fist; jessica jones; punisher; blade; morbius; nightcrawler; colossus; kitty pryde|shadowcat; iceman; angel|archangel; psylocke; bishop; cable; jubilee; emma frost; mystique; havok; polaris; namor; adam warlock; quasar; sentry; the wasp|wasp; yellowjacket; war machine; spider gwen|ghost spider; miles morales; spider woman; ironheart; america chavez; kate bishop; captain britain; booster gold; doctor fate; spectre; swamp thing; john constantine|constantine; the crow; rorschach; nite owl; dr manhattan|doctor manhattan; mr incredible|mister incredible; elastigirl; frozone; the spirit; the shadow; the phantom; green hornet; zorro; astro boy; saitama|one punch man; all might; sailor moon; ultraman; kamen rider',
  },
  {
    id: 'disney', text: 'Name a Disney or Pixar animated movie.', theme: 'culture',
    c: 'frozen; the lion king|lion king; toy story; aladdin; moana; finding nemo',
    u: 'the little mermaid|little mermaid; beauty and the beast; cinderella; snow white|snow white and the seven dwarfs; tangled; cars; up; encanto; zootopia|zootropolis; the incredibles|incredibles; monsters inc|monsters, inc; coco; inside out; mulan; bambi; dumbo; pinocchio',
    r: 'ratatouille; wall e|walle|wall-e; sleeping beauty; peter pan; lilo and stitch|lilo & stitch; the jungle book|jungle book; pocahontas; hercules; tarzan; big hero 6; wreck it ralph; brave; a bugs life|a bug’s life; finding dory; soul; luca; turning red; lady and the tramp; 101 dalmatians|one hundred and one dalmatians; alice in wonderland; fantasia; the emperors new groove|emperor’s new groove; the princess and the frog|princess and the frog; wish; elemental; raya and the last dragon|raya',
    d: 'the hunchback of notre dame|hunchback of notre dame; atlantis|atlantis the lost empire; treasure planet; brother bear; home on the range; chicken little; meet the robinsons; bolt; the rescuers|rescuers; the fox and the hound|fox and the hound; robin hood; the aristocats|aristocats; the sword in the stone|sword in the stone; the black cauldron|black cauldron; oliver and company; the great mouse detective|great mouse detective; dinosaur; the good dinosaur|good dinosaur; onward; lightyear; strange world; winnie the pooh|the many adventures of winnie the pooh; saludos amigos; the three caballeros|three caballeros; fun and fancy free; melody time; make mine music; the rescuers down under; fantasia 2000; elio; frozen 2|frozen ii; moana 2; inside out 2; toy story 2; toy story 3; toy story 4; cars 2; cars 3; incredibles 2; monsters university; ralph breaks the internet',
  },
  {
    id: 'dance', text: 'Name a style of dance.', theme: 'culture',
    c: 'ballet; hip hop; salsa; tap; tango; waltz',
    u: 'jazz; breakdance|breaking|breakdancing; swing; ballroom; contemporary; line dance|line dancing; square dance; cha cha|cha cha cha; disco; belly dance|belly dancing; flamenco; twerk|twerking; the floss|floss',
    r: 'foxtrot; rumba; samba; bachata; merengue; polka; irish dance|irish step dance|riverdance; lindy hop; charleston; jive; moonwalk; macarena; electric slide; hula; zumba; krump; voguing|vogue; quickstep; paso doble; tap dance; the twist|twist; conga; limbo; mambo; pole dance',
    d: 'kathak; bharatanatyam; odissi; kuchipudi; bhangra; garba; haka; capoeira; kizomba; zouk; lambada; cumbia; forro|forró; batucada; sevillanas; jota; fandango; tarantella; hora; sirtaki; kolo; polonaise; mazurka; quadrille; minuet; gavotte; bolero; cancan|can can; lindy; shag; balboa; west coast swing; hustle; popping; locking; tutting; waacking; house; footwork; dabke; zapateado; jarabe tapatio; bon odori; butoh; kecak; morris dance; maypole; clogging; sean nos; schuhplattler',
  },

  // ---------------- SCIENCE ----------------
  {
    id: 'element', text: 'Name a chemical element.', theme: 'science',
    c: 'oxygen; hydrogen; carbon; gold; iron; helium; nitrogen',
    u: 'silver; copper; sodium; calcium; neon; lead; aluminum|aluminium; uranium; zinc; mercury; potassium; chlorine; platinum',
    r: 'magnesium; silicon; sulfur|sulphur; phosphorus; lithium; nickel; tin; titanium; argon; iodine; fluorine; plutonium; cobalt; radon; tungsten; chromium; boron; krypton; xenon; radium; mercury',
    d: 'beryllium; scandium; vanadium; manganese; gallium; germanium; arsenic; selenium; bromine; rubidium; strontium; yttrium; zirconium; niobium; molybdenum; technetium; ruthenium; rhodium; palladium; cadmium; indium; antimony; tellurium; cesium|caesium; barium; lanthanum; cerium; praseodymium; neodymium; promethium; samarium; europium; gadolinium; terbium; dysprosium; holmium; erbium; thulium; ytterbium; lutetium; hafnium; tantalum; rhenium; osmium; iridium; thallium; bismuth; polonium; astatine; francium; actinium; thorium; protactinium; neptunium; americium; curium; berkelium; californium; einsteinium; fermium; mendelevium; nobelium; lawrencium; rutherfordium; dubnium; seaborgium; bohrium; hassium; meitnerium; darmstadtium; roentgenium; copernicium; nihonium; flerovium; moscovium; livermorium; tennessine; oganesson',
  },
  {
    id: 'space', text: 'Name something in our solar system.', theme: 'science',
    c: 'sun; moon; earth; mars; jupiter; saturn',
    u: 'venus; mercury; neptune; uranus; pluto; asteroid belt|asteroids',
    r: 'europa; titan; io; ganymede; callisto; phobos; deimos; ceres; enceladus; triton; halley’s comet|halleys comet|halley; kuiper belt; oort cloud; great red spot; olympus mons; comet; meteor',
    d: 'eris; haumea; makemake; sedna; charon; miranda; oberon; titania; ariel; umbriel; mimas; tethys; dione; rhea; iapetus; hyperion; phoebe; nereid; proteus; vesta; pallas; hygiea; juno; psyche; bennu; ryugu; arrokoth; amalthea; himalia; valles marineris; heliosphere; termination shock; solar wind; van allen belt; voyager|voyager 1; international space station|iss; hubble; james webb|jwst|james webb space telescope; asteroid 433 eros|eros; quaoar; gonggong; orcus; varuna; ixion',
  },
  {
    id: 'body', text: 'Name a part of the human body.', theme: 'science',
    c: 'heart; brain; hand; head; eye; arm; leg; foot',
    u: 'nose; mouth; ear; finger; toe; knee; elbow; shoulder; stomach; lung; liver; skin; neck; back; hair; teeth|tooth; tongue',
    r: 'kidney; spleen; pancreas; appendix; bladder; intestine|small intestine|large intestine|colon; femur; skull; spine; rib; ankle; wrist; hip; thigh; calf; shin; heel; chin; forehead; cheek; eyebrow; eyelash; navel|belly button; thumb; palm; knuckle; jaw; collarbone|clavicle',
    d: 'hypothalamus; pituitary gland|pituitary; pineal gland|pineal; thyroid; adrenal gland|adrenal; gallbladder; esophagus|oesophagus; trachea|windpipe; larynx|voice box; pharynx; epiglottis; uvula; diaphragm; duodenum; jejunum; ileum; cecum; sternum; scapula|shoulder blade; humerus; radius; ulna; patella|kneecap; tibia; fibula; coccyx|tailbone; sacrum; metatarsal; phalanges|phalanx; cochlea; stapes|stirrup; incus|anvil; malleus|hammer; cornea; retina; iris; pupil; sclera; philtrum; cuticle; lunula; septum; nostril; earlobe; armpit|axilla; achilles tendon|achilles; hamstring; quadriceps|quad; bicep|biceps; tricep|triceps; deltoid|delt; gluteus|glutes|glute; pectoral|pecs; abs|abdominals; cerebellum; medulla; hippocampus; amygdala; cortex; aorta; vena cava; femoral artery; tonsil; adenoid; thymus; lymph node; bone marrow',
  },
  {
    id: 'weather', text: 'Name a type of weather.', theme: 'science',
    c: 'rain; snow; sunny|sun|sunshine; cloudy|clouds; wind|windy; storm',
    u: 'thunderstorm|thunder; lightning; hail; fog; tornado; hurricane; sleet; drizzle; blizzard; humid|humidity; heat wave|heatwave',
    r: 'typhoon; cyclone; monsoon; mist; frost; freezing rain; ice storm; drought; overcast; rainbow; dust storm|sandstorm; flood; gale; breeze; whiteout; snow squall|squall; partly cloudy; haze; smog; downpour',
    d: 'derecho; haboob; microburst; graupel; virga; sun shower|sunshower; diamond dust; hoar frost|hoarfrost; rime; polar vortex; nor easter|noreaster|nor’easter; chinook; foehn|föhn; mistral; sirocco; harmattan; bora; williwaw; waterspout; landspout; dust devil; firenado|fire whirl; supercell; bomb cyclone; atmospheric river; lake effect snow; thundersnow; graupel; ball lightning; heat lightning; aurora; petrichor; inversion; dew',
  },
  {
    id: 'gem', text: 'Name a gemstone.', theme: 'science',
    c: 'diamond; ruby; emerald; sapphire',
    u: 'pearl; amethyst; opal; topaz; jade; turquoise; garnet',
    r: 'onyx; aquamarine; quartz|rose quartz; peridot; citrine; tanzanite; moonstone; amber; tourmaline; lapis lazuli|lapis; obsidian; jasper; agate; coral',
    d: 'alexandrite; spinel; zircon; beryl; morganite; kunzite; iolite; chrysoberyl; tsavorite; demantoid; benitoite; painite; taaffeite; grandidierite; jadeite; nephrite; malachite; rhodochrosite; carnelian; chalcedony; bloodstone; tiger’s eye|tigers eye|tiger eye; sunstone; labradorite; larimar; sugilite; charoite; hematite; pyrite; fluorite; kyanite; apatite; sphene|titanite; andalusite; chrysoprase; aventurine; ammolite; jet; meteorite; moissanite; cubic zirconia; serpentine; sodalite; howlite; azurite',
  },
  {
    id: 'shape', text: 'Name a shape.', theme: 'science',
    c: 'circle; square; triangle; rectangle; star; heart',
    u: 'oval; diamond; pentagon; hexagon; octagon; cube; sphere; cylinder; cone; pyramid',
    r: 'rhombus; trapezoid|trapezium; parallelogram; ellipse; heptagon; nonagon; decagon; crescent; semicircle; arrow; cross; spiral; prism; cuboid; torus|donut|doughnut; kite',
    d: 'dodecahedron; icosahedron; tetrahedron; octahedron; rhombicuboctahedron; hendecagon|undecagon; dodecagon; tridecagon; icosagon; chiliagon; deltoid; annulus; lune; reuleaux triangle; heart curve|cardioid; lemniscate|infinity; mobius strip|möbius strip|mobius; klein bottle; hyperboloid; paraboloid; ellipsoid; frustum; antiprism; trefoil; astroid; deltoid curve; superellipse|squircle; arbelos; vesica piscis; pentagram; hexagram; octagram; quatrefoil; rhombohedron; zonohedron; gyroid',
  },

  // ---------------- EVERYDAY ----------------
  {
    id: 'color', text: 'Name a color.', theme: 'everyday',
    c: 'red; blue; green; yellow; black; purple; orange; pink',
    u: 'white; brown; gray|grey; silver; gold; turquoise; teal; navy|navy blue; violet; magenta; maroon; beige',
    r: 'indigo; lavender; lilac; cyan; aqua; lime; olive; burgundy; crimson; scarlet; coral; peach; tan; khaki; mint; salmon; ivory; cream; charcoal; mauve; plum; fuchsia; periwinkle; sky blue; royal blue; emerald; ruby; sapphire',
    d: 'chartreuse; vermilion|vermillion; cerulean; ochre|ocher; sienna; umber; taupe; puce; ecru; mustard; sepia; cobalt; ultramarine; viridian; celadon; aubergine; vermeil; carmine; cerise; amaranth; heliotrope; wisteria; zaffre; cinnabar; gamboge; byzantium; eggplant; marigold; saffron; amber; sage; seafoam; jade; azure; alabaster; eggshell; oxblood; mahogany; russet; rust; wine; claret; bone; smalt; tyrian purple|tyrian; fallow; isabelline; glaucous; xanadu; falu red; feldgrau; coquelicot; lapis',
  },
  {
    id: 'kitchen', text: 'Name something found in a kitchen.', theme: 'everyday',
    c: 'fridge|refrigerator; stove|oven|range; microwave; sink; knife; fork; spoon; plate',
    u: 'toaster; dishwasher; blender; pan|frying pan|skillet; pot; spatula; cup|mug; bowl; cutting board|chopping board; kettle; coffee maker|coffee machine; freezer; cabinet|cupboard; table',
    r: 'whisk; colander|strainer; ladle; tongs; can opener; grater|cheese grater; peeler; rolling pin; measuring cup; oven mitt|pot holder; apron; trash can|garbage can|bin; mixer|stand mixer; air fryer; slow cooker|crockpot|crock pot; food processor; pressure cooker|instant pot; sponge; dish soap; paper towel; tupperware|container; napkin; teapot',
    d: 'mandoline; zester|microplane; mortar and pestle; garlic press; salad spinner; baster|turkey baster; pastry brush; bench scraper; sieve; ramekin; dutch oven; wok; cast iron; double boiler; spider|spider strainer; mezzaluna; cleaver; santoku; sharpening steel|honing steel; kitchen twine; thermometer|meat thermometer; timer; scale|kitchen scale; trivet; lazy susan; spice rack; bread box|breadbox; butter dish; gravy boat; tureen; decanter; corkscrew; bottle opener; nutcracker; egg slicer; melon baller; pizza cutter; pizza stone; sous vide; dehydrator; rice cooker; waffle iron; panini press; range hood; backsplash; island; pantry; garbage disposal',
  },
  {
    id: 'clothing', text: 'Name a piece of clothing.', theme: 'everyday',
    c: 'shirt|t shirt|tshirt|tee; pants|trousers; jeans; dress; jacket; hat; sock; shoe',
    u: 'sweater|jumper; hoodie|hooded sweatshirt; coat; skirt; shorts; scarf; glove; boot; underwear; belt; tie|necktie; pajamas|pyjamas; sweatpants|joggers; suit; vest; bra',
    r: 'blazer; cardigan; leggings; overalls; tank top; blouse; polo|polo shirt; romper; jumpsuit; parka; poncho; raincoat; beanie; mittens; sandal; sneaker|trainer; slippers; flip flops; bikini; swimsuit; tuxedo; bow tie; kilt; onesie; robe|bathrobe; tights; camisole; turtleneck; crop top; windbreaker; trench coat; fedora; baseball cap|cap',
    d: 'cummerbund; ascot; cravat; waistcoat; sarong; sari|saree; kimono; hanbok; dirndl; lederhosen; caftan|kaftan; dashiki; poncho; serape; tunic; toga; chemise; corset; bustier; petticoat; pinafore; culottes; capris|capri pants; jodhpurs; chaps; cargo pants; dungarees; anorak; balaclava; beret; bowler hat|bowler; trilby; panama hat; sombrero; fez; turban; cloche; deerstalker; snood; ushanka; gaiters; spats; puttees; clogs; espadrilles; moccasins; loafers; brogues; oxfords; mules; wellingtons|wellies|rain boots; galoshes; cagoule; gilet; shrug; bolero; stole; shawl; pashmina; sweatband; legwarmers|leg warmers; garter; suspenders|braces; cufflinks',
  },
  {
    id: 'job', text: 'Name a profession.', theme: 'everyday',
    c: 'doctor; teacher; nurse; lawyer; firefighter|fireman; police officer|cop|police|policeman; chef|cook',
    u: 'engineer; dentist; pilot; farmer; scientist; accountant; artist; actor; programmer|software engineer|developer|coder; mechanic; plumber; electrician; architect; vet|veterinarian; writer|author; musician; banker',
    r: 'pharmacist; surgeon; carpenter; journalist|reporter; photographer; librarian; therapist|psychologist; designer; judge; professor; paramedic|emt; astronaut; baker; barber; hairdresser|hairstylist; janitor|custodian; soldier; waiter|waitress|server; cashier; bartender; tailor; translator|interpreter; economist; marketer; real estate agent|realtor; flight attendant; mail carrier|mailman|postman; truck driver|trucker; welder; zookeeper',
    d: 'actuary; sommelier; cartographer; taxidermist; mortician|undertaker; embalmer; farrier; cooper; blacksmith; luthier; glazier; chandler; ferrier; arborist; apiarist|beekeeper; ichthyologist; entomologist; ornithologist; volcanologist; seismologist; paleontologist; archaeologist; anthropologist; sociologist; epidemiologist; anesthesiologist; podiatrist; optometrist; audiologist; orthodontist; chiropractor; midwife; doula; stenographer; notary; auctioneer; appraiser; locksmith; chimney sweep; lamplighter; sherpa; stevedore|longshoreman; lumberjack; roofer; mason|stonemason; upholsterer; cobbler; milliner; haberdasher; fishmonger; butcher; greengrocer; perfumer; foley artist; stunt double|stuntman; puppeteer; ventriloquist; clown; mime; magician; lexicographer; cryptographer; ethical hacker|penetration tester; air traffic controller; lighthouse keeper; park ranger; game warden; ombudsman; diplomat; ambassador',
  },
  {
    id: 'car', text: 'Name a car brand.', theme: 'everyday',
    c: 'toyota; ford; honda; chevrolet|chevy; tesla; bmw',
    u: 'mercedes|mercedes benz|benz; audi; nissan; hyundai; kia; volkswagen|vw; jeep; subaru; mazda; dodge; lexus; porsche; ferrari; lamborghini',
    r: 'cadillac; gmc; ram; buick; lincoln; chrysler; volvo; acura; infiniti; jaguar; land rover|range rover; mini; fiat; mitsubishi; genesis; maserati; bentley; rolls royce|rolls-royce; aston martin; bugatti; mclaren; alfa romeo; rivian; lucid; polestar',
    d: 'peugeot; renault; citroen|citroën; skoda|škoda; seat; cupra; opel; vauxhall; dacia; lancia; saab; pontiac; oldsmobile; plymouth; saturn; mercury; hummer; scion; datsun; tata; mahindra; maruti|maruti suzuki; suzuki; isuzu; daihatsu; proton; perodua; geely; byd; nio; xpeng; great wall; chery; lada; trabant; koenigsegg; pagani; lotus; morgan; caterham; tvr; de lorean|delorean; studebaker; packard; hudson; nash; amc; tucker; edsel; spyker; rimac; fisker; vinfast; smart; maybach; alpine; abarth; ssangyong|kgm; holden',
  },
  {
    id: 'transport', text: 'Name a way to get around.', theme: 'everyday',
    c: 'car; bus; train; plane|airplane|aeroplane; bike|bicycle; walk|walking; boat',
    u: 'motorcycle|motorbike; subway|metro|underground|tube; taxi|cab; truck; scooter; skateboard; helicopter; ship; ferry; uber|rideshare|lyft; run|running',
    r: 'tram|streetcar|trolley; van; rv|camper; jet ski; sailboat; kayak; canoe; hot air balloon; roller skates|rollerblades|inline skates; unicycle; tricycle; golf cart; horse|horseback; cable car|gondola; monorail; limo|limousine; segway; e bike|ebike|electric bike; electric scooter; yacht; cruise ship; private jet|jet; skis|skiing',
    d: 'hovercraft; zeppelin|blimp|airship; rickshaw; tuk tuk|tuk-tuk|auto rickshaw; pedicab; funicular; hyperloop; maglev; bullet train|shinkansen; snowmobile; dog sled|dogsled; sled|sledge|toboggan; camel; elephant; donkey|mule; carriage|horse and carriage; stagecoach; covered wagon|wagon; raft; gondola; punt; paddleboard|sup; surfboard; hang glider; paraglider; parachute; jetpack; rocket; space shuttle; submarine; zip line|zipline; chairlift|ski lift; escalator; elevator|lift; moving walkway|travelator; pogo stick; stilts; hoverboard; onewheel; penny farthing; velomobile; amphibious vehicle|duck boat; tank; tractor; forklift; bulldozer; ambulance; fire truck|fire engine',
  },
  {
    id: 'app', text: 'Name a social media or messaging app.', theme: 'everyday',
    c: 'instagram|insta|ig; tiktok|tik tok; facebook|fb; snapchat|snap; x|twitter; youtube',
    u: 'whatsapp; reddit; discord; linkedin; pinterest; messenger|facebook messenger; imessage|messages; threads; telegram; twitch',
    r: 'signal; bereal|be real; tumblr; wechat; line; slack; teams|microsoft teams; zoom; facetime; bluesky; mastodon; snapchat; vsco; clubhouse; quora; nextdoor; strava; goodreads; letterboxd; tinder; hinge; bumble; whatsapp business',
    d: 'myspace; vine; friendster; orkut; google plus|google+|g+; bebo; xanga; livejournal; aim|aol instant messenger; msn messenger|msn|windows live messenger; icq; yahoo messenger; kik; viber; kakaotalk|kakao; weibo; qq; douyin; xiaohongshu|rednote|little red book; vk|vkontakte; skype; periscope; meerkat; path; ello; parler; truth social; gab; rumble; cohost; vero; yik yak; whisper; secret; peach; poparazzi; lemon8; mewe; minds; diaspora; steemit; lens; farcaster; nostr; geocities; deviantart; flickr; dribbble; behance; ask fm|ask.fm; formspring; tellonym; ngl; gas; tbh; marco polo|marcopolo; houseparty; glide; zenly; swarm|foursquare; untappd; polywork; substack; patreon; onlyfans; kick',
  },
  {
    id: 'holiday', text: 'Name a holiday.', theme: 'everyday',
    c: 'christmas|xmas; halloween; thanksgiving; easter; new years|new year’s day|new years day|new years eve|new year',
    u: 'valentine’s day|valentines day|valentines; independence day|fourth of july|4th of july|july 4th; hanukkah|chanukah|hanukah; st patrick’s day|saint patricks day|st patricks day; mother’s day|mothers day; father’s day|fathers day; labor day; memorial day; birthday; diwali',
    r: 'kwanzaa; ramadan; eid|eid al fitr|eid al adha; passover; yom kippur; rosh hashanah; lunar new year|chinese new year; martin luther king day|mlk day; presidents day; veterans day; columbus day|indigenous peoples day; groundhog day; april fools|april fools day; earth day; cinco de mayo; day of the dead|dia de los muertos|día de muertos; mardi gras|fat tuesday; boxing day; juneteenth; good friday; canada day; bastille day; halloween',
    d: 'holi; vesak; songkran; nowruz|norooz; purim; sukkot; shavuot; tu bishvat; lag baomer; navratri; durga puja; onam; pongal; raksha bandhan; ganesh chaturthi; obon|bon; tanabata; golden week; chuseok; seollal; mid autumn festival|moon festival; dragon boat festival; qingming; tet; loy krathong; guy fawkes|bonfire night; burns night; hogmanay; st andrews day; st georges day; st david’s day|st davids day; anzac day; waitangi day; australia day; may day; walpurgis night; midsummer; lammas; samhain; yule; beltane; imbolc; ostara; mabon; festivus; pi day; star wars day|may the fourth; talk like a pirate day; leap day; arbor day; flag day; patriots day; boss’s day; national donut day; sweetest day; black friday; cyber monday; small business saturday; super bowl sunday|superbowl sunday; ash wednesday; palm sunday; pentecost; epiphany|three kings day; candlemas; all saints day; all souls day; advent; lent; shrove tuesday|pancake day; carnival|carnaval; oktoberfest; boxing day',
  },
  {
    id: 'language', text: 'Name a language.', theme: 'world',
    c: 'english; spanish; french; chinese|mandarin; german; japanese',
    u: 'italian; portuguese; russian; arabic; korean; hindi; latin; greek; dutch',
    r: 'swedish; norwegian; danish; finnish; polish; turkish; hebrew; vietnamese; thai; tagalog|filipino; swahili; bengali|bangla; urdu; punjabi; persian|farsi; cantonese; indonesian; malay; ukrainian; czech; hungarian; romanian; irish|gaelic|irish gaelic; welsh; sign language|asl|american sign language; esperanto; klingon; elvish|quenya|sindarin; python; javascript',
    d: 'icelandic; faroese; basque|euskara; catalan; galician; occitan; breton; cornish; manx; scottish gaelic; maltese; albanian; armenian; georgian; estonian; latvian; lithuanian; slovak; slovene|slovenian; croatian; serbian; bosnian; macedonian; bulgarian; belarusian; yiddish; ladino; aramaic; sanskrit; pali; tamil; telugu; kannada; malayalam; marathi; gujarati; nepali; sinhala; dzongkha; tibetan; uyghur; mongolian; kazakh; uzbek; kyrgyz; tajik; pashto; kurdish; amharic; tigrinya; somali; yoruba; igbo; hausa; zulu; xhosa; afrikaans; shona; kinyarwanda; malagasy; wolof; lingala; quechua; aymara; guarani; nahuatl; mayan|yucatec maya; navajo; cherokee; lakota; inuktitut; hawaiian; maori|māori; samoan; tongan; fijian; tok pisin; hmong; khmer; lao; burmese; javanese; sundanese; cebuano; ilocano; hokkien; hakka; shanghainese|wu; ainu; okinawan; sumerian; akkadian; hittite; etruscan; coptic; old english; old norse; dothraki; high valyrian|valyrian; navi|na’vi; toki pona; lojban; volapuk|volapük; interlingua',
  },
];
