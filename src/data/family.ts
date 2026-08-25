export interface Person {
  id: string;
  fullName: string;
  birthYear: number;
  deathYear: number | null;
  isAlive: boolean;
  bio: string;
  birthPlace: string;
  profession: string;
  email: string;
  phone: string;
  address: string;
  website: string;
  lat: number | null;
  lng: number | null;
  photoUrl: string;
}

export interface Union {
  id: string;
  partnerA: string;
  partnerB: string;
  type: "marriage" | "partnership" | "divorced";
  startYear: number;
  endYear: number | null;
}

export interface ParentEdge {
  unionId: string;
  childId: string;
  relationshipType: "biological" | "adopted" | "step";
}

export interface LifeEvent {
  id: string;
  personId: string;
  year: number;
  month?: number;
  day?: number;
  type: "birth" | "death" | "marriage" | "divorce" | "career" | "education" | "migration" | "achievement" | "military" | "other";
  title: string;
  description?: string;
  place?: string;
}

export const persons: Person[] = [
  {
    id: "p1",
    fullName: "Arthur Blackwood",
    birthYear: 1920,
    deathYear: 1995,
    isAlive: false,
    bio: "Patriarch of the Blackwood family. Served in the Royal Navy during WWII. Returned home to build a timber business that supported the family for three generations.",
    birthPlace: "Edinburgh, Scotland",
    profession: "Timber Merchant",
    email: "", phone: "", address: "", website: "",
    lat: 55.9533, lng: -3.1883,
    photoUrl: "",
  },
  {
    id: "p2",
    fullName: "Martha Blackwood",
    birthYear: 1922,
    deathYear: 2010,
    isAlive: false,
    bio: "Matriarch of the Blackwood family. A schoolteacher who raised four children while managing the household. Known for her extraordinary baking and the Sunday dinners that gathered the entire family.",
    birthPlace: "Glasgow, Scotland",
    profession: "Schoolteacher",
    email: "", phone: "", address: "", website: "",
    lat: 55.8642, lng: -4.2518,
    photoUrl: "",
  },
  {
    id: "p3",
    fullName: "Rose Turner",
    birthYear: 1940,
    deathYear: null,
    isAlive: true,
    bio: "Arthur's second wife. Met Arthur at a community dance in 1993. They married in 1996 and enjoyed a loving partnership until Arthur's passing.",
    birthPlace: "Aberdeen, Scotland",
    profession: "Nurse",
    email: "rose.turner@outlook.com", phone: "+44 1224 555 0103", address: "14 Union Terrace, Aberdeen", website: "",
    lat: 57.1499, lng: -2.0938,
    photoUrl: "",
  },
  {
    id: "p4",
    fullName: "Robert Blackwood",
    birthYear: 1948,
    deathYear: null,
    isAlive: true,
    bio: "Eldest son of Arthur and Martha. A career diplomat who served postings across Europe before returning to Edinburgh. Father of Emily and David.",
    birthPlace: "Edinburgh, Scotland",
    profession: "Diplomat",
    email: "r.blackwood@btinternet.com", phone: "+44 131 555 0148", address: "22 Royal Terrace, Edinburgh", website: "",
    lat: 55.9533, lng: -3.1883,
    photoUrl: "",
  },
  {
    id: "p5",
    fullName: "Jenny Blackwood",
    birthYear: 1950,
    deathYear: null,
    isAlive: true,
    bio: "Born Jenny McAllister in Dundee. Married Robert in 1973. A talented cellist who played with the Scottish Chamber Orchestra for twenty years before retiring to teach music.",
    birthPlace: "Dundee, Scotland",
    profession: "Cellist & Music Teacher",
    email: "jenny.blackwood@gmail.com", phone: "+44 131 555 0150", address: "22 Royal Terrace, Edinburgh", website: "",
    lat: 56.4620, lng: -2.9707,
    photoUrl: "",
  },
  {
    id: "p6",
    fullName: "Thomas Blackwood",
    birthYear: 1952,
    deathYear: null,
    isAlive: true,
    bio: "Second son of Arthur and Martha. A marine biologist who spent decades studying coastal ecosystems around the British Isles. Father of Sophie.",
    birthPlace: "Edinburgh, Scotland",
    profession: "Marine Biologist",
    email: "t.blackwood@st-andrews.ac.uk", phone: "+44 1334 555 0152", address: "8 North Street, St Andrews", website: "https://blackwood-marine.co.uk",
    lat: 55.9533, lng: -3.1883,
    photoUrl: "",
  },
  {
    id: "p7",
    fullName: "Helen Clarke",
    birthYear: 1955,
    deathYear: null,
    isAlive: true,
    bio: "Thomas's first wife. A marine illustrator who collaborated with Thomas on several published field guides. They separated amicably in 1985; Helen continued her art career in London.",
    birthPlace: "London, England",
    profession: "Marine Illustrator",
    email: "helen.clarke@icloud.com", phone: "+44 20 7555 0155", address: "31 Kensington Church Street, London", website: "https://helenclarke.art",
    lat: 51.5074, lng: -0.1278,
    photoUrl: "",
  },
  {
    id: "p8",
    fullName: "Charles Turner",
    birthYear: 1958,
    deathYear: null,
    isAlive: true,
    bio: "Son of Arthur and Rose. Grew up in Aberdeen. Became an acclaimed landscape photographer whose work captured the Scottish Highlands. Father of Grace.",
    birthPlace: "Aberdeen, Scotland",
    profession: "Landscape Photographer",
    email: "charles@highlandlens.co.uk", phone: "+44 1463 555 0158", address: "7 Academy Street, Inverness", website: "https://highlandlens.co.uk",
    lat: 57.1499, lng: -2.0938,
    photoUrl: "",
  },
  {
    id: "p9",
    fullName: "Emily Blackwood",
    birthYear: 1975,
    deathYear: null,
    isAlive: true,
    bio: "Daughter of Robert and Jenny. An architect specializing in sustainable heritage restoration. Led the renovation of several historic buildings in Edinburgh's Old Town.",
    birthPlace: "Edinburgh, Scotland",
    profession: "Architect",
    email: "emily@blackwoodheritage.com", phone: "+44 131 555 0175", address: "14 George Street, Edinburgh", website: "https://blackwoodheritage.com",
    lat: 55.9533, lng: -3.1883,
    photoUrl: "",
  },
  {
    id: "p10",
    fullName: "David Blackwood",
    birthYear: 1978,
    deathYear: null,
    isAlive: true,
    bio: "Son of Robert and Jenny. A software engineer who works on climate modeling systems. Lives in London with his family.",
    birthPlace: "Edinburgh, Scotland",
    profession: "Software Engineer",
    email: "david.blackwood@metoffice.gov.uk", phone: "+44 20 8555 0178", address: "5 The Street, Exeter", website: "",
    lat: 55.9533, lng: -3.1883,
    photoUrl: "",
  },
  {
    id: "p11",
    fullName: "Sophie Blackwood",
    birthYear: 1980,
    deathYear: null,
    isAlive: true,
    bio: "Daughter of Thomas and Helen. A documentary filmmaker focused on ocean conservation. Her award-winning films have been shown at festivals worldwide.",
    birthPlace: "Edinburgh, Scotland",
    profession: "Documentary Filmmaker",
    email: "sophie@oceanedgefilms.com", phone: "+44 7700 900180", address: "Studio 4, Shoreditch, London", website: "https://oceanedgefilms.com",
    lat: 55.9533, lng: -3.1883,
    photoUrl: "",
  },
  {
    id: "p12",
    fullName: "Grace Turner",
    birthYear: 1985,
    deathYear: null,
    isAlive: true,
    bio: "Daughter of Charles. A ceramic artist whose work draws on Scottish folk traditions. Runs a studio and gallery in the Highlands.",
    birthPlace: "Inverness, Scotland",
    profession: "Ceramic Artist",
    email: "grace@highlandclay.co.uk", phone: "+44 1463 555 0185", address: "3 Castle Road, Inverness", website: "https://highlandclay.co.uk",
    lat: 57.4778, lng: -4.2247,
    photoUrl: "",
  },
];

export const unions: Union[] = [
  { id: "u1", partnerA: "p1", partnerB: "p2", type: "marriage", startYear: 1945, endYear: null },
  { id: "u2", partnerA: "p1", partnerB: "p3", type: "marriage", startYear: 1996, endYear: null },
  { id: "u3", partnerA: "p4", partnerB: "p5", type: "marriage", startYear: 1973, endYear: null },
  { id: "u4", partnerA: "p6", partnerB: "p7", type: "divorced", startYear: 1978, endYear: 1985 },
];

export const parentEdges: ParentEdge[] = [
  { unionId: "u1", childId: "p4", relationshipType: "biological" },
  { unionId: "u1", childId: "p6", relationshipType: "biological" },
  { unionId: "u2", childId: "p8", relationshipType: "biological" },
  { unionId: "u3", childId: "p9", relationshipType: "biological" },
  { unionId: "u3", childId: "p10", relationshipType: "biological" },
  { unionId: "u4", childId: "p11", relationshipType: "biological" },
];

export function getPerson(id: string): Person | undefined {
  return persons.find((p) => p.id === id);
}

export function getUnion(id: string): Union | undefined {
  return unions.find((u) => u.id === id);
}

export function getPersonEvents(personId: string): LifeEvent[] {
  return lifeEvents.filter((e) => e.personId === personId).sort((a, b) => a.year - b.year);
}

export function getAllEventsSorted(): (LifeEvent & { personName: string })[] {
  return lifeEvents
    .map((e) => ({ ...e, personName: getPerson(e.personId)?.fullName ?? "Unknown" }))
    .sort((a, b) => a.year - b.year || (a.month ?? 0) - (b.month ?? 0) || (a.day ?? 0) - (b.day ?? 0));
}

export const lifeEvents: LifeEvent[] = [
  { id: "ev1", personId: "p1", year: 1920, type: "birth", title: "Born in Edinburgh", place: "Edinburgh, Scotland" },
  { id: "ev2", personId: "p1", year: 1939, type: "military", title: "Enlisted in the Royal Navy", description: "Served during World War II." },
  { id: "ev3", personId: "p1", year: 1945, type: "career", title: "Founded Blackwood Timber", description: "Returned home to build a timber business.", place: "Edinburgh, Scotland" },
  { id: "ev4", personId: "p1", year: 1945, type: "marriage", title: "Married Martha Stewart", place: "Edinburgh, Scotland" },
  { id: "ev5", personId: "p1", year: 1995, type: "death", title: "Passed away", place: "Edinburgh, Scotland" },

  { id: "ev6", personId: "p2", year: 1922, type: "birth", title: "Born in Glasgow", place: "Glasgow, Scotland" },
  { id: "ev7", personId: "p2", year: 1944, type: "education", title: "Graduated from Glasgow Teacher Training College" },
  { id: "ev8", personId: "p2", year: 1945, type: "marriage", title: "Married Arthur Blackwood", place: "Edinburgh, Scotland" },
  { id: "ev9", personId: "p2", year: 1948, type: "career", title: "Began teaching career at Portobello Primary" },
  { id: "ev10", personId: "p2", year: 2010, type: "death", title: "Passed away", place: "Edinburgh, Scotland" },

  { id: "ev11", personId: "p3", year: 1940, type: "birth", title: "Born in Aberdeen", place: "Aberdeen, Scotland" },
  { id: "ev12", personId: "p3", year: 1960, type: "education", title: "Trained as a nurse" },
  { id: "ev13", personId: "p3", year: 1993, type: "other", title: "Met Arthur at a community dance" },
  { id: "ev14", personId: "p3", year: 1996, type: "marriage", title: "Married Arthur Blackwood", place: "Aberdeen, Scotland" },

  { id: "ev15", personId: "p4", year: 1948, type: "birth", title: "Born in Edinburgh", place: "Edinburgh, Scotland" },
  { id: "ev16", personId: "p4", year: 1970, type: "education", title: "Graduated from the University of Edinburgh" },
  { id: "ev17", personId: "p4", year: 1971, type: "career", title: "Joined the Foreign Office" },
  { id: "ev18", personId: "p4", year: 1973, type: "marriage", title: "Married Jenny McAllister", place: "Dundee, Scotland" },
  { id: "ev19", personId: "p4", year: 1980, type: "migration", title: "Posted to Paris", description: "Diplomatic posting to the French capital." },
  { id: "ev20", personId: "p4", year: 1995, type: "migration", title: "Returned to Edinburgh" },

  { id: "ev21", personId: "p5", year: 1950, type: "birth", title: "Born in Dundee", place: "Dundee, Scotland" },
  { id: "ev22", personId: "p5", year: 1968, type: "education", title: "Royal Academy of Music, London" },
  { id: "ev23", personId: "p5", year: 1973, type: "marriage", title: "Married Robert Blackwood", place: "Dundee, Scotland" },
  { id: "ev24", personId: "p5", year: 1975, type: "career", title: "Joined the Scottish Chamber Orchestra" },
  { id: "ev25", personId: "p5", year: 1995, type: "career", title: "Retired from orchestra, began teaching" },

  { id: "ev26", personId: "p6", year: 1952, type: "birth", title: "Born in Edinburgh", place: "Edinburgh, Scotland" },
  { id: "ev27", personId: "p6", year: 1974, type: "education", title: "PhD in Marine Biology, University of St Andrews" },
  { id: "ev28", personId: "p6", year: 1978, type: "marriage", title: "Married Helen Clarke", place: "Edinburgh, Scotland" },
  { id: "ev29", personId: "p6", year: 1985, type: "divorce", title: "Divorced Helen Clarke" },
  { id: "ev30", personId: "p6", year: 1986, type: "career", title: "Led research expedition to Shetland Islands" },

  { id: "ev31", personId: "p7", year: 1955, type: "birth", title: "Born in London", place: "London, England" },
  { id: "ev32", personId: "p7", year: 1978, type: "marriage", title: "Married Thomas Blackwood" },
  { id: "ev33", personId: "p7", year: 1985, type: "divorce", title: "Divorced Thomas Blackwood" },
  { id: "ev34", personId: "p7", year: 1986, type: "migration", title: "Moved back to London" },
  { id: "ev35", personId: "p7", year: 1990, type: "achievement", title: "Solo exhibition at the Natural History Museum" },

  { id: "ev36", personId: "p8", year: 1958, type: "birth", title: "Born in Aberdeen", place: "Aberdeen, Scotland" },
  { id: "ev37", personId: "p8", year: 1980, type: "education", title: "Photography degree, Robert Gordon University" },
  { id: "ev38", personId: "p8", year: 1985, type: "achievement", title: "First published photo book: Highland Seasons" },
  { id: "ev39", personId: "p8", year: 1992, type: "achievement", title: "Won Scottish Wildlife Photographer of the Year" },

  { id: "ev40", personId: "p9", year: 1975, type: "birth", title: "Born in Edinburgh", place: "Edinburgh, Scotland" },
  { id: "ev41", personId: "p9", year: 1997, type: "education", title: "Architecture degree, Edinburgh College of Art" },
  { id: "ev42", personId: "p9", year: 2005, type: "career", title: "Founded Blackwood Heritage Architects" },
  { id: "ev43", personId: "p9", year: 2015, type: "achievement", title: "RIBA Award for Sustainable Heritage Restoration" },

  { id: "ev44", personId: "p10", year: 1978, type: "birth", title: "Born in Edinburgh", place: "Edinburgh, Scotland" },
  { id: "ev45", personId: "p10", year: 2000, type: "education", title: "Computer Science degree, University of Cambridge" },
  { id: "ev46", personId: "p10", year: 2003, type: "migration", title: "Moved to London" },
  { id: "ev47", personId: "p10", year: 2005, type: "career", title: "Joined the Met Office, climate modelling division" },

  { id: "ev48", personId: "p11", year: 1980, type: "birth", title: "Born in Edinburgh", place: "Edinburgh, Scotland" },
  { id: "ev49", personId: "p11", year: 2002, type: "education", title: "Film Studies, University of Bristol" },
  { id: "ev50", personId: "p11", year: 2010, type: "achievement", title: "First documentary: Tidal Memories, shown at Edinburgh Film Festival" },
  { id: "ev51", personId: "p11", year: 2018, type: "achievement", title: "BAFTA Scotland nomination for Ocean's Edge" },

  { id: "ev52", personId: "p12", year: 1985, type: "birth", title: "Born in Inverness", place: "Inverness, Scotland" },
  { id: "ev53", personId: "p12", year: 2007, type: "education", title: "Fine Art Ceramics, Glasgow School of Art" },
  { id: "ev54", personId: "p12", year: 2012, type: "career", title: "Opened Highland Clay Studio & Gallery", place: "Inverness, Scotland" },
  { id: "ev55", personId: "p12", year: 2020, type: "achievement", title: "Featured in Crafts Magazine: 'Keepers of Tradition'" },
];

export function getPersonsByGeneration(): Person[][] {
  const gen1 = persons.filter((p) => ["p1", "p2", "p3"].includes(p.id));
  const gen2 = persons.filter((p) => ["p4", "p5", "p6", "p7", "p8"].includes(p.id));
  const gen3 = persons.filter((p) => ["p9", "p10", "p11", "p12"].includes(p.id));
  return [gen1, gen2, gen3];
}
