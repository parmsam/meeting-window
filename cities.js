const CITIES = [
  // North America
  { name: "New York",       country: "US", tz: "America/New_York" },
  { name: "Los Angeles",    country: "US", tz: "America/Los_Angeles" },
  { name: "Chicago",        country: "US", tz: "America/Chicago" },
  { name: "Houston",        country: "US", tz: "America/Chicago" },
  { name: "Phoenix",        country: "US", tz: "America/Phoenix" },
  { name: "Philadelphia",   country: "US", tz: "America/New_York" },
  { name: "San Antonio",    country: "US", tz: "America/Chicago" },
  { name: "San Diego",      country: "US", tz: "America/Los_Angeles" },
  { name: "Dallas",         country: "US", tz: "America/Chicago" },
  { name: "San Jose",       country: "US", tz: "America/Los_Angeles" },
  { name: "Austin",         country: "US", tz: "America/Chicago" },
  { name: "Seattle",        country: "US", tz: "America/Los_Angeles" },
  { name: "Denver",         country: "US", tz: "America/Denver" },
  { name: "Boston",         country: "US", tz: "America/New_York" },
  { name: "Atlanta",        country: "US", tz: "America/New_York" },
  { name: "Miami",          country: "US", tz: "America/New_York" },
  { name: "Minneapolis",    country: "US", tz: "America/Chicago" },
  { name: "Portland",       country: "US", tz: "America/Los_Angeles" },
  { name: "Las Vegas",      country: "US", tz: "America/Los_Angeles" },
  { name: "Detroit",        country: "US", tz: "America/Detroit" },
  { name: "Nashville",      country: "US", tz: "America/Chicago" },
  { name: "Charlotte",      country: "US", tz: "America/New_York" },
  { name: "Raleigh",        country: "US", tz: "America/New_York" },
  { name: "Salt Lake City", country: "US", tz: "America/Denver" },
  { name: "Honolulu",       country: "US", tz: "Pacific/Honolulu" },
  { name: "Anchorage",      country: "US", tz: "America/Anchorage" },
  // Additional US cities — all 50 states + DC represented
  { name: "Albuquerque",    country: "US", tz: "America/Denver" },       // NM
  { name: "Baltimore",      country: "US", tz: "America/New_York" },     // MD
  { name: "Bangor",         country: "US", tz: "America/New_York" },     // ME
  { name: "Billings",       country: "US", tz: "America/Denver" },       // MT
  { name: "Birmingham",     country: "US", tz: "America/Chicago" },      // AL
  { name: "Boise",          country: "US", tz: "America/Boise" },        // ID
  { name: "Buffalo",        country: "US", tz: "America/New_York" },     // NY
  { name: "Burlington",     country: "US", tz: "America/New_York" },     // VT
  { name: "Charleston",     country: "US", tz: "America/New_York" },     // WV / SC
  { name: "Cheyenne",       country: "US", tz: "America/Denver" },       // WY
  { name: "Cincinnati",     country: "US", tz: "America/New_York" },     // OH
  { name: "Cleveland",      country: "US", tz: "America/New_York" },     // OH
  { name: "Columbia",       country: "US", tz: "America/New_York" },     // SC
  { name: "Columbus",       country: "US", tz: "America/New_York" },     // OH
  { name: "Des Moines",     country: "US", tz: "America/Chicago" },      // IA
  { name: "El Paso",        country: "US", tz: "America/Denver" },       // TX (Mountain Time)
  { name: "Fargo",          country: "US", tz: "America/Chicago" },      // ND
  { name: "Grand Rapids",   country: "US", tz: "America/Detroit" },      // MI
  { name: "Hartford",       country: "US", tz: "America/New_York" },     // CT
  { name: "Indianapolis",   country: "US", tz: "America/Indiana/Indianapolis" }, // IN
  { name: "Jackson",        country: "US", tz: "America/Chicago" },      // MS
  { name: "Jacksonville",   country: "US", tz: "America/New_York" },     // FL
  { name: "Kansas City",    country: "US", tz: "America/Chicago" },      // MO/KS
  { name: "Lexington",      country: "US", tz: "America/Kentucky/Louisville" }, // KY
  { name: "Little Rock",    country: "US", tz: "America/Chicago" },      // AR
  { name: "Louisville",     country: "US", tz: "America/Kentucky/Louisville" }, // KY
  { name: "Manchester",     country: "US", tz: "America/New_York" },     // NH
  { name: "Memphis",        country: "US", tz: "America/Chicago" },      // TN
  { name: "Milwaukee",      country: "US", tz: "America/Chicago" },      // WI
  { name: "New Orleans",    country: "US", tz: "America/Chicago" },      // LA
  { name: "Newark",         country: "US", tz: "America/New_York" },     // NJ
  { name: "Oklahoma City",  country: "US", tz: "America/Chicago" },      // OK
  { name: "Omaha",          country: "US", tz: "America/Chicago" },      // NE
  { name: "Orlando",        country: "US", tz: "America/New_York" },     // FL
  { name: "Pittsburgh",     country: "US", tz: "America/New_York" },     // PA
  { name: "Providence",     country: "US", tz: "America/New_York" },     // RI
  { name: "Reno",           country: "US", tz: "America/Los_Angeles" },  // NV
  { name: "Richmond",       country: "US", tz: "America/New_York" },     // VA
  { name: "Sacramento",     country: "US", tz: "America/Los_Angeles" },  // CA
  { name: "San Francisco",  country: "US", tz: "America/Los_Angeles" },  // CA
  { name: "Sioux Falls",    country: "US", tz: "America/Chicago" },      // SD
  { name: "Spokane",        country: "US", tz: "America/Los_Angeles" },  // WA
  { name: "St. Louis",      country: "US", tz: "America/Chicago" },      // MO
  { name: "Tampa",          country: "US", tz: "America/New_York" },     // FL
  { name: "Tucson",         country: "US", tz: "America/Phoenix" },      // AZ
  { name: "Virginia Beach", country: "US", tz: "America/New_York" },     // VA
  { name: "Washington DC",  country: "US", tz: "America/New_York" },     // DC
  { name: "Wichita",        country: "US", tz: "America/Chicago" },      // KS
  { name: "Wilmington",     country: "US", tz: "America/New_York" },     // DE
  { name: "Toronto",        country: "CA", tz: "America/Toronto" },
  { name: "Vancouver",      country: "CA", tz: "America/Vancouver" },
  { name: "Montreal",       country: "CA", tz: "America/Toronto" },
  { name: "Calgary",        country: "CA", tz: "America/Edmonton" },
  { name: "Ottawa",         country: "CA", tz: "America/Toronto" },
  { name: "Edmonton",       country: "CA", tz: "America/Edmonton" },
  { name: "Winnipeg",       country: "CA", tz: "America/Winnipeg" },
  { name: "Mexico City",    country: "MX", tz: "America/Mexico_City" },
  { name: "Guadalajara",    country: "MX", tz: "America/Mexico_City" },
  { name: "Monterrey",      country: "MX", tz: "America/Monterrey" },

  // South America
  { name: "São Paulo",      country: "BR", tz: "America/Sao_Paulo" },
  { name: "Rio de Janeiro", country: "BR", tz: "America/Sao_Paulo" },
  { name: "Brasília",       country: "BR", tz: "America/Sao_Paulo" },
  { name: "Buenos Aires",   country: "AR", tz: "America/Argentina/Buenos_Aires" },
  { name: "Santiago",       country: "CL", tz: "America/Santiago" },
  { name: "Bogotá",         country: "CO", tz: "America/Bogota" },
  { name: "Lima",           country: "PE", tz: "America/Lima" },
  { name: "Caracas",        country: "VE", tz: "America/Caracas" },
  { name: "Panama City",    country: "PA", tz: "America/Panama" },

  // Europe
  { name: "London",         country: "GB", tz: "Europe/London" },
  { name: "Paris",          country: "FR", tz: "Europe/Paris" },
  { name: "Berlin",         country: "DE", tz: "Europe/Berlin" },
  { name: "Madrid",         country: "ES", tz: "Europe/Madrid" },
  { name: "Rome",           country: "IT", tz: "Europe/Rome" },
  { name: "Amsterdam",      country: "NL", tz: "Europe/Amsterdam" },
  { name: "Brussels",       country: "BE", tz: "Europe/Brussels" },
  { name: "Vienna",         country: "AT", tz: "Europe/Vienna" },
  { name: "Zurich",         country: "CH", tz: "Europe/Zurich" },
  { name: "Stockholm",      country: "SE", tz: "Europe/Stockholm" },
  { name: "Oslo",           country: "NO", tz: "Europe/Oslo" },
  { name: "Copenhagen",     country: "DK", tz: "Europe/Copenhagen" },
  { name: "Helsinki",       country: "FI", tz: "Europe/Helsinki" },
  { name: "Warsaw",         country: "PL", tz: "Europe/Warsaw" },
  { name: "Prague",         country: "CZ", tz: "Europe/Prague" },
  { name: "Budapest",       country: "HU", tz: "Europe/Budapest" },
  { name: "Bucharest",      country: "RO", tz: "Europe/Bucharest" },
  { name: "Athens",         country: "GR", tz: "Europe/Athens" },
  { name: "Lisbon",         country: "PT", tz: "Europe/Lisbon" },
  { name: "Dublin",         country: "IE", tz: "Europe/Dublin" },
  { name: "Edinburgh",      country: "GB", tz: "Europe/London" },
  { name: "Manchester",     country: "GB", tz: "Europe/London" },
  { name: "Frankfurt",      country: "DE", tz: "Europe/Berlin" },
  { name: "Munich",         country: "DE", tz: "Europe/Berlin" },
  { name: "Hamburg",        country: "DE", tz: "Europe/Berlin" },
  { name: "Barcelona",      country: "ES", tz: "Europe/Madrid" },
  { name: "Milan",          country: "IT", tz: "Europe/Rome" },
  { name: "Kyiv",           country: "UA", tz: "Europe/Kyiv" },
  { name: "Moscow",         country: "RU", tz: "Europe/Moscow" },
  { name: "St. Petersburg", country: "RU", tz: "Europe/Moscow" },
  { name: "Istanbul",       country: "TR", tz: "Europe/Istanbul" },
  { name: "Reykjavik",      country: "IS", tz: "Atlantic/Reykjavik" },

  // Middle East
  { name: "Dubai",          country: "AE", tz: "Asia/Dubai" },
  { name: "Abu Dhabi",      country: "AE", tz: "Asia/Dubai" },
  { name: "Riyadh",         country: "SA", tz: "Asia/Riyadh" },
  { name: "Jeddah",         country: "SA", tz: "Asia/Riyadh" },
  { name: "Doha",           country: "QA", tz: "Asia/Qatar" },
  { name: "Kuwait City",    country: "KW", tz: "Asia/Kuwait" },
  { name: "Tel Aviv",       country: "IL", tz: "Asia/Jerusalem" },
  { name: "Beirut",         country: "LB", tz: "Asia/Beirut" },
  { name: "Amman",          country: "JO", tz: "Asia/Amman" },
  { name: "Muscat",         country: "OM", tz: "Asia/Muscat" },

  // Africa
  { name: "Cairo",          country: "EG", tz: "Africa/Cairo" },
  { name: "Nairobi",        country: "KE", tz: "Africa/Nairobi" },
  { name: "Lagos",          country: "NG", tz: "Africa/Lagos" },
  { name: "Johannesburg",   country: "ZA", tz: "Africa/Johannesburg" },
  { name: "Cape Town",      country: "ZA", tz: "Africa/Johannesburg" },
  { name: "Casablanca",     country: "MA", tz: "Africa/Casablanca" },
  { name: "Accra",          country: "GH", tz: "Africa/Accra" },
  { name: "Addis Ababa",    country: "ET", tz: "Africa/Addis_Ababa" },
  { name: "Dar es Salaam",  country: "TZ", tz: "Africa/Dar_es_Salaam" },
  { name: "Kampala",        country: "UG", tz: "Africa/Kampala" },

  // South & Central Asia
  { name: "Mumbai",         country: "IN", tz: "Asia/Kolkata" },
  { name: "Delhi",          country: "IN", tz: "Asia/Kolkata" },
  { name: "Bangalore",      country: "IN", tz: "Asia/Kolkata" },
  { name: "Hyderabad",      country: "IN", tz: "Asia/Kolkata" },
  { name: "Chennai",        country: "IN", tz: "Asia/Kolkata" },
  { name: "Kolkata",        country: "IN", tz: "Asia/Kolkata" },
  { name: "Pune",           country: "IN", tz: "Asia/Kolkata" },
  { name: "Karachi",        country: "PK", tz: "Asia/Karachi" },
  { name: "Lahore",         country: "PK", tz: "Asia/Karachi" },
  { name: "Islamabad",      country: "PK", tz: "Asia/Karachi" },
  { name: "Dhaka",          country: "BD", tz: "Asia/Dhaka" },
  { name: "Colombo",        country: "LK", tz: "Asia/Colombo" },
  { name: "Kathmandu",      country: "NP", tz: "Asia/Kathmandu" },
  { name: "Yangon",         country: "MM", tz: "Asia/Rangoon" },
  { name: "Almaty",         country: "KZ", tz: "Asia/Almaty" },
  { name: "Tashkent",       country: "UZ", tz: "Asia/Tashkent" },

  // East & Southeast Asia
  { name: "Tokyo",          country: "JP", tz: "Asia/Tokyo" },
  { name: "Osaka",          country: "JP", tz: "Asia/Tokyo" },
  { name: "Seoul",          country: "KR", tz: "Asia/Seoul" },
  { name: "Busan",          country: "KR", tz: "Asia/Seoul" },
  { name: "Beijing",        country: "CN", tz: "Asia/Shanghai" },
  { name: "Shanghai",       country: "CN", tz: "Asia/Shanghai" },
  { name: "Shenzhen",       country: "CN", tz: "Asia/Shanghai" },
  { name: "Guangzhou",      country: "CN", tz: "Asia/Shanghai" },
  { name: "Chengdu",        country: "CN", tz: "Asia/Shanghai" },
  { name: "Hong Kong",      country: "HK", tz: "Asia/Hong_Kong" },
  { name: "Taipei",         country: "TW", tz: "Asia/Taipei" },
  { name: "Singapore",      country: "SG", tz: "Asia/Singapore" },
  { name: "Kuala Lumpur",   country: "MY", tz: "Asia/Kuala_Lumpur" },
  { name: "Bangkok",        country: "TH", tz: "Asia/Bangkok" },
  { name: "Jakarta",        country: "ID", tz: "Asia/Jakarta" },
  { name: "Bali",           country: "ID", tz: "Asia/Makassar" },
  { name: "Manila",         country: "PH", tz: "Asia/Manila" },
  { name: "Ho Chi Minh City", country: "VN", tz: "Asia/Ho_Chi_Minh" },
  { name: "Hanoi",          country: "VN", tz: "Asia/Bangkok" },

  // Oceania
  { name: "Sydney",         country: "AU", tz: "Australia/Sydney" },
  { name: "Melbourne",      country: "AU", tz: "Australia/Melbourne" },
  { name: "Brisbane",       country: "AU", tz: "Australia/Brisbane" },
  { name: "Perth",          country: "AU", tz: "Australia/Perth" },
  { name: "Adelaide",       country: "AU", tz: "Australia/Adelaide" },
  { name: "Auckland",       country: "NZ", tz: "Pacific/Auckland" },
  { name: "Wellington",     country: "NZ", tz: "Pacific/Auckland" },
];
