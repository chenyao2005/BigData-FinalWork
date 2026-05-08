/**
 * Generates __zipName literal for population-rings bundle from pasted table text.
 * Run: node scripts/build-zip-names.js
 */
const raw = `
曼哈顿 (Manhattan)

10001：切尔西（Chelsea）
10002：下东区（Lower East Side）
10003：东村（East Village）
10004：金融区（Financial District）
10005：金融区（Financial District）
10006：金融区（Financial District）
10007：下曼哈顿（Lower Manhattan）
10009：东村（East Village）
10010：格拉梅西公园（Gramercy Park）
10011：切尔西（Chelsea）
10012：苏荷区（SoHo）
10013：翠贝卡（Tribeca）
10014：格林威治村（Greenwich Village）
10016：莫瑞丘（Murray Hill）
10017：中城东（Midtown East）
10018：中城南（Midtown South）
10019：中城西（Midtown West）
10021：上东区（Upper East Side）
10022：中城东（Midtown East）
10023：上西区（Upper West Side）
10024：上西区（Upper West Side）
10025：上西区（Upper West Side）
10026：哈林区（Central Harlem）
10027：哈林区（Central Harlem）
10028：上东区（Upper East Side）
10029：东哈林（East Harlem）
10030：哈林区（Central Harlem）
10031：汉密尔顿高地（Hamilton Heights）
10032：华盛顿高地（Washington Heights）
10033：华盛顿高地（Washington Heights）
10034：英伍德（Inwood）
10035：东哈林（East Harlem）
10036：时代广场（Times Square）
10037：哈林区（Central Harlem）
10038：下曼哈顿（Lower Manhattan）
10039：哈林区（Central Harlem）
10040：华盛顿高地（Washington Heights）
10044：罗斯福岛（Roosevelt Island）
10065：上东区（Upper East Side）
10069：上西区（Upper West Side）
10075：上东区（Upper East Side）
10128：上东区（Upper East Side）
10280：炮台公园（Battery Park City）

布鲁克林 (Brooklyn)

11201：布鲁克林高地（Brooklyn Heights）
11203：东法特布什（East Flatbush）
11204：本森赫斯特（Bensonhurst）
11205：克林顿丘（Clinton Hill）
11206：威廉斯堡（Williamsburg）
11207：东纽约（East New York）
11208：东纽约（East New York）
11209：湾脊区（Bay Ridge）
11210：法特布什（Flatbush）
11211：威廉斯堡（Williamsburg）
11212：布朗斯维尔（Brownsville）
11213：皇冠高地（Crown Heights）
11214：本森赫斯特（Bensonhurst）
11215：公园坡（Park Slope）
11216：贝德福德-斯泰弗森特（Bedford Stuyvesant）
11217：波莱姆丘（Boerum Hill）
11218：肯辛顿（Kensington）
11219：自治市公园（Borough Park）
11220：日落公园（Sunset Park）
11221：布什维克（Bushwick）
11222：绿点（Greenpoint）
11223：葛瑞森德（Gravesend）
11224：康尼岛（Coney Island）
11225：皇冠高地（Crown Heights）
11226：法特布什（Flatbush）
11228：戴克高地（Dyker Heights）
11229：地平线区（Homecrest）
11230：仲心区（Midwood）
11231：卡罗尔花园（Carroll Gardens）
11232：日落公园（Sunset Park）
11233：贝德福德-斯泰弗森特（Bedford Stuyvesant）
11234：米尔盆地（Mill Basin）
11235：羊头湾（Sheepshead Bay）
11236：卡纳西（Canarsie）
11237：布什维克（Bushwick）
11238：克林顿丘（Clinton Hill）
11239：东纽约（East New York）
11249：威廉斯堡（Williamsburg）

皇后区 (Queens)

11101：长岛市（Long Island City）
11102：阿斯托里亚（Astoria）
11103：阿斯托里亚（Astoria）
11104：桑尼赛德（Sunnyside）
11105：阿斯托里亚（Astoria）
11106：阿斯托里亚（Astoria）
11354：法拉盛（Flushing）
11355：法拉盛（Flushing）
11356：学院点（College Point）
11357：白石镇（Whitestone）
11358：法拉盛（Flushing）
11360：贝赛（Bayside）
11361：贝赛（Bayside）
11362：利特尔内克（Little Neck）
11363：利特尔内克（Little Neck）
11364：奥克兰花园（Oakland Gardens）
11365：新鲜草原（Fresh Meadows）
11366：新鲜草原（Fresh Meadows）
11367：丘园山（Kew Gardens Hills）
11368：科罗娜（Corona）
11369：东艾姆赫斯特（East Elmhurst）
11370：东艾姆赫斯特（East Elmhurst）
11372：杰克逊高地（Jackson Heights）
11373：艾姆赫斯特（Elmhurst）
11374：雷哥公园（Rego Park）
11375：森林小丘（Forest Hills）
11377：伍德赛德（Woodside）
11378：马斯佩斯（Maspeth）
11379：中村（Middle Village）
11385：里奇伍德（Ridgewood）
11411：坎布里亚高地（Cambria Heights）
11412：圣奥尔本斯（Saint Albans）
11413：劳雷尔顿（Laurelton）
11414：霍华德海滩（Howard Beach）
11415：丘园（Kew Gardens）
11416：奥松公园（Ozone Park）
11417：奥松公园（Ozone Park）
11418：里士满丘（Richmond Hill）
11419：里士满丘（Richmond Hill）
11420：南奥松公园（South Ozone Park）
11421：伍德黑文（Woodhaven）
11422：罗斯代尔（Rosedale）
11423：霍利斯（Hollis）
11426：贝洛斯（Bellerose）
11427：昆斯村（Queens Village）
11428：昆斯村（Queens Village）
11429：昆斯村（Queens Village）
11432：牙买加（Jamaica）
11433：牙买加（Jamaica）
11434：牙买加（Jamaica）
11435：牙买加（Jamaica）
11436：牙买加（Jamaica）

布朗克斯 (The Bronx)

10451：康考斯（Concourse）
10452：高桥（Highbridge）
10453：莫里斯高地（Morris Heights）
10454：莫特哈芬（Mott Haven）
10455：莫特哈芬（Mott Haven）
10456：莫里萨尼亚（Morrisania）
10457：贝尔蒙特（Belmont）
10458：贝尔蒙特（Belmont）
10459：亨茨点（Hunts Point）
10460：西法姆（West Farms）
10461：莫里斯公园（Morris Park）
10462：帕克切斯特（Parkchester）
10463：瑞夫戴尔（Riverdale）
10464：城市岛（City Island）
10465：斯罗格斯内克（Throgs Neck）
10466：威克菲尔德（Wakefield）
10467：威廉斯布里奇（Williamsbridge）
10468：福特汉姆（Fordham）
10469：威廉斯布里奇（Williamsbridge）
10470：伍德劳恩（Woodlawn）
10471：瑞夫戴尔（Riverdale）
10472：音景区（Soundview）
10473：音景区（Soundview）
10474：亨茨点（Hunts Point）
10475：科奥普城（Co-op City）

史泰登岛 (Staten Island)

10301：圣乔治（St. George）
10302：埃尔姆公园（Elm Park）
10303：马里纳斯港（Mariners Harbor）
10304：斯台普顿（Stapleton）
10305：罗斯班克（Rosebank）
10306：新多普（New Dorp）
10307：托滕维尔（Tottenville）
10308：大基尔斯（Great Kills）
10309：查尔斯顿（Charleston）
10310：西布赖顿（West Brighton）
10312：埃尔廷维尔（Eltingville）
10314：卡斯尔顿角（Castleton Corners）
`;

const map = {};
for (const line of raw.split(/\n/)) {
  const t = line.trim();
  if (!/^\d{5}/.test(t)) continue;
  const m = t.match(/^(\d{5})[：:]\s*(.+)$/);
  if (!m) continue;
  const zip = m[1];
  const label = m[2].trim();
  if (map[zip]) console.warn("duplicate", zip);
  map[zip] = label;
}
const keys = Object.keys(map).sort();
console.log("count", keys.length);
const parts = keys.map((z) => JSON.stringify(z) + ":" + JSON.stringify(map[z]));
const literal = "const __zipName={" + parts.join(",") + "}";
console.log(literal.slice(0, 200) + "...");
require("fs").writeFileSync(
  "apps/02-population-rings/assets/__zipName-snippet.txt",
  literal,
  "utf8"
);
