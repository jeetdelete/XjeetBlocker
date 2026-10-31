export interface Country {
  code: string;
  name: string;
}

export interface Continent {
  name: string;
  countries: Country[];
}

const c = (code: string, name: string): Country => ({ code, name });

export const CONTINENTS: Continent[] = [
  {
    name: "Africa",
    countries: [
      c("DZ", "Algeria"), c("AO", "Angola"), c("BJ", "Benin"), c("BW", "Botswana"),
      c("BF", "Burkina Faso"), c("BI", "Burundi"), c("CV", "Cape Verde"), c("CM", "Cameroon"),
      c("CF", "Central African Republic"), c("TD", "Chad"), c("KM", "Comoros"), c("CG", "Congo"),
      c("CD", "Democratic Republic of the Congo"), c("CI", "Côte d'Ivoire"), c("DJ", "Djibouti"),
      c("EG", "Egypt"), c("GQ", "Equatorial Guinea"), c("ER", "Eritrea"), c("SZ", "Eswatini"),
      c("ET", "Ethiopia"), c("GA", "Gabon"), c("GM", "Gambia"), c("GH", "Ghana"), c("GN", "Guinea"),
      c("GW", "Guinea-Bissau"), c("KE", "Kenya"), c("LS", "Lesotho"), c("LR", "Liberia"),
      c("LY", "Libya"), c("MG", "Madagascar"), c("MW", "Malawi"), c("ML", "Mali"),
      c("MR", "Mauritania"), c("MU", "Mauritius"), c("MA", "Morocco"), c("MZ", "Mozambique"),
      c("NA", "Namibia"), c("NE", "Niger"), c("NG", "Nigeria"), c("RW", "Rwanda"),
      c("ST", "São Tomé and Príncipe"), c("SN", "Senegal"), c("SC", "Seychelles"),
      c("SL", "Sierra Leone"), c("SO", "Somalia"), c("ZA", "South Africa"), c("SS", "South Sudan"),
      c("SD", "Sudan"), c("TZ", "Tanzania"), c("TG", "Togo"), c("TN", "Tunisia"), c("UG", "Uganda"),
      c("ZM", "Zambia"), c("ZW", "Zimbabwe"),
    ],
  },
  {
    name: "Asia",
    countries: [
      c("AF", "Afghanistan"), c("AM", "Armenia"), c("AZ", "Azerbaijan"), c("BH", "Bahrain"),
      c("BD", "Bangladesh"), c("BT", "Bhutan"), c("BN", "Brunei"), c("KH", "Cambodia"),
      c("CN", "China"), c("GE", "Georgia"), c("HK", "Hong Kong"), c("IN", "India"),
      c("ID", "Indonesia"), c("IR", "Iran"), c("IQ", "Iraq"), c("IL", "Israel"), c("JP", "Japan"),
      c("JO", "Jordan"), c("KZ", "Kazakhstan"), c("KW", "Kuwait"), c("KG", "Kyrgyzstan"),
      c("LA", "Laos"), c("LB", "Lebanon"), c("MO", "Macao"), c("MY", "Malaysia"), c("MV", "Maldives"),
      c("MN", "Mongolia"), c("MM", "Myanmar"), c("NP", "Nepal"), c("KP", "North Korea"),
      c("OM", "Oman"), c("PK", "Pakistan"), c("PS", "Palestine"), c("PH", "Philippines"),
      c("QA", "Qatar"), c("SA", "Saudi Arabia"), c("SG", "Singapore"), c("KR", "South Korea"),
      c("LK", "Sri Lanka"), c("SY", "Syria"), c("TW", "Taiwan"), c("TJ", "Tajikistan"),
      c("TH", "Thailand"), c("TL", "Timor-Leste"), c("TR", "Türkiye"), c("TM", "Turkmenistan"),
      c("AE", "United Arab Emirates"), c("UZ", "Uzbekistan"), c("VN", "Vietnam"), c("YE", "Yemen"),
    ],
  },
  {
    name: "Europe",
    countries: [
      c("AL", "Albania"), c("AD", "Andorra"), c("AT", "Austria"), c("BY", "Belarus"),
      c("BE", "Belgium"), c("BA", "Bosnia and Herzegovina"), c("BG", "Bulgaria"), c("HR", "Croatia"),
      c("CY", "Cyprus"), c("CZ", "Czechia"), c("DK", "Denmark"), c("EE", "Estonia"),
      c("FI", "Finland"), c("FR", "France"), c("DE", "Germany"), c("GR", "Greece"),
      c("HU", "Hungary"), c("IS", "Iceland"), c("IE", "Ireland"), c("IT", "Italy"), c("XK", "Kosovo"),
      c("LV", "Latvia"), c("LI", "Liechtenstein"), c("LT", "Lithuania"), c("LU", "Luxembourg"),
      c("MT", "Malta"), c("MD", "Moldova"), c("MC", "Monaco"), c("ME", "Montenegro"),
      c("NL", "Netherlands"), c("MK", "North Macedonia"), c("NO", "Norway"), c("PL", "Poland"),
      c("PT", "Portugal"), c("RO", "Romania"), c("RU", "Russia"), c("SM", "San Marino"),
      c("RS", "Serbia"), c("SK", "Slovakia"), c("SI", "Slovenia"), c("ES", "Spain"),
      c("SE", "Sweden"), c("CH", "Switzerland"), c("UA", "Ukraine"), c("GB", "United Kingdom"),
      c("VA", "Vatican City"),
    ],
  },
  {
    name: "North America",
    countries: [
      c("AG", "Antigua and Barbuda"), c("BS", "Bahamas"), c("BB", "Barbados"), c("BZ", "Belize"),
      c("CA", "Canada"), c("CR", "Costa Rica"), c("CU", "Cuba"), c("DM", "Dominica"),
      c("DO", "Dominican Republic"), c("SV", "El Salvador"), c("GL", "Greenland"), c("GD", "Grenada"),
      c("GT", "Guatemala"), c("HT", "Haiti"), c("HN", "Honduras"), c("JM", "Jamaica"),
      c("MX", "Mexico"), c("NI", "Nicaragua"), c("PA", "Panama"), c("PR", "Puerto Rico"),
      c("KN", "Saint Kitts and Nevis"), c("LC", "Saint Lucia"),
      c("VC", "Saint Vincent and the Grenadines"), c("TT", "Trinidad and Tobago"),
      c("US", "United States"),
    ],
  },
  {
    name: "South America",
    countries: [
      c("AR", "Argentina"), c("BO", "Bolivia"), c("BR", "Brazil"), c("CL", "Chile"),
      c("CO", "Colombia"), c("EC", "Ecuador"), c("GY", "Guyana"), c("PY", "Paraguay"),
      c("PE", "Peru"), c("SR", "Suriname"), c("UY", "Uruguay"), c("VE", "Venezuela"),
    ],
  },
  {
    name: "Oceania",
    countries: [
      c("AU", "Australia"), c("FJ", "Fiji"), c("KI", "Kiribati"), c("MH", "Marshall Islands"),
      c("FM", "Micronesia"), c("NR", "Nauru"), c("NZ", "New Zealand"), c("PW", "Palau"),
      c("PG", "Papua New Guinea"), c("WS", "Samoa"), c("SB", "Solomon Islands"), c("TO", "Tonga"),
      c("TV", "Tuvalu"), c("VU", "Vanuatu"),
    ],
  },
];

// X's region-only values are not documented; these are the likely ones. Any
// other non-country value seen on X is also offered in the popup.
export const KNOWN_BROAD_REGIONS = [
  "Africa", "Caribbean", "Central America", "Central Asia", "East Asia", "Eastern Europe",
  "Europe", "Middle East", "North Africa", "North America", "Oceania", "South America",
  "South Asia", "Southeast Asia", "Sub-Saharan Africa", "West Asia", "Western Europe",
];

const ALIASES: Record<string, string> = {
  "united states of america": "US",
  usa: "US",
  "united kingdom of great britain and northern ireland": "GB",
  uk: "GB",
  turkey: "TR",
  "czech republic": "CZ",
  "ivory coast": "CI",
  "republic of korea": "KR",
  korea: "KR",
  "russian federation": "RU",
  "viet nam": "VN",
  "hong kong sar": "HK",
  macau: "MO",
  burma: "MM",
  "east timor": "TL",
  swaziland: "SZ",
  "cabo verde": "CV",
  "dr congo": "CD",
  "republic of the congo": "CG",
};

const norm = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();

const BY_NAME = new Map<string, Country>();
const BY_CODE = new Map<string, Country>();
for (const continent of CONTINENTS) {
  for (const country of continent.countries) {
    BY_NAME.set(norm(country.name), country);
    BY_CODE.set(country.code, country);
  }
}
for (const [alias, code] of Object.entries(ALIASES)) BY_NAME.set(alias, BY_CODE.get(code)!);

/** The country X's "Account based in" text names, or null for a Broad Region. */
export function countryFromBasedIn(basedIn: string): Country | null {
  return BY_NAME.get(norm(basedIn)) ?? null;
}

export function countryByCode(code: string): Country | undefined {
  return BY_CODE.get(code);
}

export function flagOf(code: string): string {
  return [...code.toUpperCase()]
    .map((ch) => String.fromCodePoint(0x1f1e6 + ch.charCodeAt(0) - 65))
    .join("");
}
