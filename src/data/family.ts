export interface Person {
  id: string;
  fullName: string;
  nameNative?: string | null;
  gender?: string;
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

export interface Source {
  id: string;
  personId: string;
  type: "birth-certificate" | "marriage-certificate" | "death-certificate" | "census" | "newspaper" | "photograph" | "letter" | "book" | "website" | "other";
  title: string;
  url: string;
  notes: string;
  dateAdded: string;
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
    fullName: "Md. Abdul Haque",
    nameNative: "আব্দুল হক",
    gender: "male",
    birthYear: 1932,
    deathYear: 2015,
    isAlive: false,
    bio: "Patriarch of the Haque family. Served as an Upazila Nirbahi Officer for over thirty years, known throughout Kushtia for his fairness and public service. Raised his children in Dhaka after retiring from government service.",
    birthPlace: "Kushtia, Bangladesh",
    profession: "Government Official (retired)",
    email: "abdul.haque@gmail.com", phone: "+8801711000001", address: "House 12, Road 5, Dhanmondi, Dhaka 1205", website: "",
    lat: 23.8103, lng: 90.4125,
    photoUrl: "",
  },
  {
    id: "p2",
    fullName: "Begum Sufia Khatun",
    nameNative: "সূফিয়া খাতুন",
    gender: "female",
    birthYear: 1936,
    deathYear: 2001,
    isAlive: false,
    bio: "First wife of Md. Abdul Haque. Raised their son Karim with deep devotion and was beloved in her neighbourhood for her kindness and hospitality.",
    birthPlace: "Mymensingh, Bangladesh",
    profession: "Homemaker",
    email: "", phone: "+8801711000002", address: "House 12, Road 5, Dhanmondi, Dhaka 1205", website: "",
    lat: 23.8103, lng: 90.4125,
    photoUrl: "",
  },
  {
    id: "p3",
    fullName: "Rokeya Khatun",
    nameNative: "রোকেয়া খাতুন",
    gender: "female",
    birthYear: 1950,
    deathYear: null,
    isAlive: true,
    bio: "Second wife of Md. Abdul Haque. A retired primary school teacher who continues to tutor neighbourhood children in her spare time.",
    birthPlace: "Satkhira, Bangladesh",
    profession: "School Teacher",
    email: "rokeya.khatun@gmail.com", phone: "+8801711000003", address: "House 12, Road 5, Dhanmondi, Dhaka 1205", website: "",
    lat: 23.8103, lng: 90.4125,
    photoUrl: "",
  },
  {
    id: "p4",
    fullName: "Abdur Rahman Haque",
    nameNative: "আব্দুর রহমান হক",
    gender: "male",
    birthYear: 1952,
    deathYear: null,
    isAlive: true,
    bio: "Cousin of the patriarch and a successful rice trader in Sylhet. A quiet, pragmatic man who built his business from a single shop.",
    birthPlace: "Sylhet, Bangladesh",
    profession: "Businessman",
    email: "rahman.haque@gmail.com", phone: "+8801912000004", address: "Flat 3B, Green Villa, Zindabazar, Sylhet 3100", website: "",
    lat: 24.8949, lng: 91.8687,
    photoUrl: "",
  },
  {
    id: "p5",
    fullName: "Rahima Akter",
    nameNative: "রাহিমা আক্তার",
    gender: "female",
    birthYear: 1956,
    deathYear: null,
    isAlive: true,
    bio: "Wife of Abdur Rahman Haque. Taught Bengali literature at a Sylhet college for thirty years and is an avid collector of folk poetry.",
    birthPlace: "Sunamganj, Bangladesh",
    profession: "College Lecturer (retired)",
    email: "", phone: "+8801912000005", address: "Flat 3B, Green Villa, Zindabazar, Sylhet 3100", website: "",
    lat: 24.8949, lng: 91.8687,
    photoUrl: "",
  },
  {
    id: "p6",
    fullName: "Abdul Karim Haque",
    nameNative: "আব্দুল করিম হক",
    gender: "male",
    birthYear: 1958,
    deathYear: null,
    isAlive: true,
    bio: "Eldest son of Abdul Haque and Sufia Khatun. A civil engineer who worked on major bridges across the country. Divorced from Farida Sultana; they remain friends and co-parents to Tasnim.",
    birthPlace: "Dhaka, Bangladesh",
    profession: "Civil Engineer",
    email: "karim.haque@engineer.com", phone: "+8801713000006", address: "Apartment 8A, Rupayan Tower, Banani, Dhaka 1213", website: "karim-eng.com",
    lat: 23.7924, lng: 90.4066,
    photoUrl: "",
  },
  {
    id: "p7",
    fullName: "Farida Sultana",
    nameNative: "ফরিদা সুলতানা",
    gender: "female",
    birthYear: 1960,
    deathYear: null,
    isAlive: true,
    bio: "Ex-wife of Abdul Karim Haque. A fashion designer who runs a boutique in Chattogram specialising in traditional jamdani textiles.",
    birthPlace: "Chattogram, Bangladesh",
    profession: "Fashion Designer",
    email: "farida.sultana@gmail.com", phone: "+8801814000007", address: "103 GEC Circle Road, Chattogram 4000", website: "",
    lat: 22.3419, lng: 91.8154,
    photoUrl: "",
  },
  {
    id: "p8",
    fullName: "Shahidul Haque",
    nameNative: "শহিদুল হক",
    gender: "male",
    birthYear: 2006,
    deathYear: null,
    isAlive: true,
    bio: "Youngest son of Abdul Haque and his second wife Rokeya Khatun. A university student in Dhaka, fond of cricket and photography.",
    birthPlace: "Dhaka, Bangladesh",
    profession: "University Student",
    email: "shahidul.haque@gmail.com", phone: "+8801715000008", address: "House 21, Road 11, Banani, Dhaka 1213", website: "",
    lat: 23.7924, lng: 90.4066,
    photoUrl: "",
  },
  {
    id: "p9",
    fullName: "Nusrat Jahan",
    nameNative: "নুসরাত জাহান",
    gender: "female",
    birthYear: 1985,
    deathYear: null,
    isAlive: true,
    bio: "Daughter of Abdur Rahman Haque and Rahima Akter. A doctor specialising in community health services in rural Sylhet.",
    birthPlace: "Sylhet, Bangladesh",
    profession: "Physician",
    email: "nusrat.jahan@medmail.com", phone: "+8801716000009", address: "Flat 3B, Green Villa, Zindabazar, Sylhet 3100", website: "",
    lat: 24.8949, lng: 91.8687,
    photoUrl: "",
  },
  {
    id: "p10",
    fullName: "Raihan Haque",
    nameNative: "রায়হান হক",
    gender: "male",
    birthYear: 1982,
    deathYear: null,
    isAlive: true,
    bio: "Son of Abdur Rahman Haque and Rahima Akter. A software engineer working remotely for an international company from his hometown studio.",
    birthPlace: "Sylhet, Bangladesh",
    profession: "Software Engineer",
    email: "raihan.haque@devmail.com", phone: "+8801717000010", address: "Flat 3B, Green Villa, Zindabazar, Sylhet 3100", website: "raihan.dev",
    lat: 24.8949, lng: 91.8687,
    photoUrl: "",
  },
  {
    id: "p11",
    fullName: "Tasnim Haque",
    nameNative: "তাসনিম হক",
    gender: "female",
    birthYear: 1984,
    deathYear: null,
    isAlive: true,
    bio: "Daughter of Abdul Karim Haque and Farida Sultana. A product designer in Dhaka who divides her time between the capital and Chattogram.",
    birthPlace: "Chattogram, Bangladesh",
    profession: "Product Designer",
    email: "tasnim.haque@gmail.com", phone: "+8801718000011", address: "Apartment 8A, Rupayan Tower, Banani, Dhaka 1213", website: "",
    lat: 23.7924, lng: 90.4066,
    photoUrl: "",
  },
  {
    id: "p13",
    fullName: "Md. Nurul Islam",
    nameNative: "মোঃ নুরুল ইসলাম",
    gender: "male",
    birthYear: 1944,
    deathYear: 2009,
    isAlive: false,
    bio: "A farmer and landowner from the Ishwardi area of Pabna. Remembered for his generosity to the village during the lean seasons.",
    birthPlace: "Pabna, Bangladesh",
    profession: "Farmer",
    email: "", phone: "", address: "Village Jara Bari, Ishwardi, Pabna 6620", website: "",
    lat: 23.8317, lng: 89.6452,
    photoUrl: "",
  },
  {
    id: "p14",
    fullName: "Julekha Begum",
    nameNative: "জুলেখা বেগম",
    gender: "female",
    birthYear: 1950,
    deathYear: null,
    isAlive: true,
    bio: "Wife of Md. Nurul Islam. A warm matriarch of the Pabna branch, still living on the family homestead with her nephew's family.",
    birthPlace: "Pabna, Bangladesh",
    profession: "Homemaker",
    email: "", phone: "", address: "Village Jara Bari, Ishwardi, Pabna 6620", website: "",
    lat: 24.0084, lng: 89.2373,
    photoUrl: "",
  },
];

export const unions: Union[] = [
  { id: "u1", partnerA: "p1", partnerB: "p2", type: "marriage", startYear: 1955, endYear: null },
  { id: "u2", partnerA: "p1", partnerB: "p3", type: "marriage", startYear: 2004, endYear: null },
  { id: "u3", partnerA: "p4", partnerB: "p5", type: "marriage", startYear: 1976, endYear: null },
  { id: "u4", partnerA: "p6", partnerB: "p7", type: "divorced", startYear: 1980, endYear: 1986 },
  { id: "u5", partnerA: "p14", partnerB: "p13", type: "marriage", startYear: 1970, endYear: null },
];

export const parentEdges: ParentEdge[] = [
  { unionId: "u1", childId: "p6", relationshipType: "biological" },
  { unionId: "u2", childId: "p8", relationshipType: "biological" },
  { unionId: "u3", childId: "p10", relationshipType: "biological" },
  { unionId: "u3", childId: "p9", relationshipType: "biological" },
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
  { id: "ev1", personId: "p1", year: 1932, type: "birth", title: "Born in Kushtia", place: "Kushtia, Bangladesh" },
  { id: "ev2", personId: "p1", year: 1954, type: "career", title: "Joined the civil service", description: "Appointed as an Assistant Commissioner after the Public Service Commission exam." },
  { id: "ev3", personId: "p1", year: 1955, type: "marriage", title: "Married Begum Sufia Khatun", place: "Kushtia, Bangladesh" },
  { id: "ev4", personId: "p1", year: 1975, type: "career", title: "Promoted to Upazila Nirbahi Officer", place: "Kushtia, Bangladesh" },
  { id: "ev5", personId: "p1", year: 1992, type: "career", title: "Retired from government service" },
  { id: "ev6", personId: "p1", year: 2004, type: "marriage", title: "Married Rokeya Khatun", place: "Dhaka, Bangladesh" },
  { id: "ev7", personId: "p1", year: 2015, type: "death", title: "Passed away", place: "Dhaka, Bangladesh" },

  { id: "ev8", personId: "p2", year: 1936, type: "birth", title: "Born in Mymensingh", place: "Mymensingh, Bangladesh" },
  { id: "ev9", personId: "p2", year: 1955, type: "marriage", title: "Married Md. Abdul Haque", place: "Kushtia, Bangladesh" },
  { id: "ev10", personId: "p2", year: 1958, type: "birth", title: "Birth of son Abdul Karim", description: "Their only child, Abdul Karim, was born in Dhaka." },
  { id: "ev11", personId: "p2", year: 2001, type: "death", title: "Passed away", place: "Dhaka, Bangladesh" },

  { id: "ev12", personId: "p3", year: 1950, type: "birth", title: "Born in Satkhira", place: "Satkhira, Bangladesh" },
  { id: "ev13", personId: "p3", year: 1970, type: "education", title: "Graduated from Teachers' Training College", place: "Jessore, Bangladesh" },
  { id: "ev14", personId: "p3", year: 1972, type: "career", title: "Began teaching career at a Dhaka primary school" },
  { id: "ev15", personId: "p3", year: 2004, type: "marriage", title: "Married Md. Abdul Haque", place: "Dhaka, Bangladesh" },
  { id: "ev16", personId: "p3", year: 2006, type: "birth", title: "Birth of son Shahidul", description: "Their son Shahidul was born in Dhaka." },
  { id: "ev17", personId: "p3", year: 2010, type: "career", title: "Retired from teaching, continued tutoring" },

  { id: "ev18", personId: "p4", year: 1952, type: "birth", title: "Born in Sylhet", place: "Sylhet, Bangladesh" },
  { id: "ev19", personId: "p4", year: 1972, type: "career", title: "Opened his first rice shop in Zindabazar", place: "Sylhet, Bangladesh" },
  { id: "ev20", personId: "p4", year: 1976, type: "marriage", title: "Married Rahima Akter", place: "Sylhet, Bangladesh" },
  { id: "ev21", personId: "p4", year: 1982, type: "birth", title: "Birth of son Raihan", description: "Their eldest child, Raihan, was born in Sylhet." },
  { id: "ev22", personId: "p4", year: 1985, type: "birth", title: "Birth of daughter Nusrat" },

  { id: "ev23", personId: "p5", year: 1956, type: "birth", title: "Born in Sunamganj", place: "Sunamganj, Bangladesh" },
  { id: "ev24", personId: "p5", year: 1974, type: "education", title: "MA in Bengali Literature, University of Dhaka", place: "Dhaka, Bangladesh" },
  { id: "ev25", personId: "p5", year: 1976, type: "marriage", title: "Married Abdur Rahman Haque", place: "Sylhet, Bangladesh" },
  { id: "ev26", personId: "p5", year: 1977, type: "career", title: "Joined the faculty of a Sylhet college" },
  { id: "ev27", personId: "p5", year: 2007, type: "career", title: "Retired from college teaching" },

  { id: "ev28", personId: "p6", year: 1958, type: "birth", title: "Born in Dhaka", place: "Dhaka, Bangladesh" },
  { id: "ev29", personId: "p6", year: 1980, type: "education", title: "BSc in Civil Engineering, BUET", place: "Dhaka, Bangladesh" },
  { id: "ev30", personId: "p6", year: 1980, type: "marriage", title: "Married Farida Sultana", place: "Chattogram, Bangladesh" },
  { id: "ev31", personId: "p6", year: 1984, type: "birth", title: "Birth of daughter Tasnim" },
  { id: "ev32", personId: "p6", year: 1986, type: "divorce", title: "Divorced Farida Sultana" },
  { id: "ev33", personId: "p6", year: 1995, type: "career", title: "Chief engineer on the Meghna bridge project" },

  { id: "ev34", personId: "p7", year: 1960, type: "birth", title: "Born in Chattogram", place: "Chattogram, Bangladesh" },
  { id: "ev35", personId: "p7", year: 1980, type: "marriage", title: "Married Abdul Karim Haque", place: "Chattogram, Bangladesh" },
  { id: "ev36", personId: "p7", year: 1985, type: "career", title: "Opened a jamdani boutique in Chattogram" },
  { id: "ev37", personId: "p7", year: 1986, type: "divorce", title: "Divorced Abdul Karim Haque" },

  { id: "ev38", personId: "p8", year: 2006, type: "birth", title: "Born in Dhaka", place: "Dhaka, Bangladesh" },
  { id: "ev39", personId: "p8", year: 2024, type: "education", title: "Started university in Dhaka", description: "Began undergraduate studies in Dhaka." },

  { id: "ev40", personId: "p9", year: 1985, type: "birth", title: "Born in Sylhet", place: "Sylhet, Bangladesh" },
  { id: "ev41", personId: "p9", year: 2008, type: "education", title: "MBBS, Sylhet MAG Osmani Medical College", place: "Sylhet, Bangladesh" },
  { id: "ev42", personId: "p9", year: 2013, type: "career", title: "Joined community health services in rural Sylhet" },

  { id: "ev43", personId: "p10", year: 1982, type: "birth", title: "Born in Sylhet", place: "Sylhet, Bangladesh" },
  { id: "ev44", personId: "p10", year: 2003, type: "education", title: "BSc in Computer Science, SUST", place: "Sylhet, Bangladesh" },
  { id: "ev45", personId: "p10", year: 2007, type: "career", title: "Began working remotely as a software engineer" },

  { id: "ev46", personId: "p11", year: 1984, type: "birth", title: "Born in Chattogram", place: "Chattogram, Bangladesh" },
  { id: "ev47", personId: "p11", year: 2006, type: "education", title: "BDes in Product Design, UODA", place: "Dhaka, Bangladesh" },
  { id: "ev48", personId: "p11", year: 2010, type: "career", title: "Started work as a product designer in Dhaka" },

  { id: "ev49", personId: "p13", year: 1944, type: "birth", title: "Born in Pabna", place: "Pabna, Bangladesh" },
  { id: "ev50", personId: "p13", year: 1970, type: "marriage", title: "Married Julekha Begum", place: "Pabna, Bangladesh" },
  { id: "ev51", personId: "p13", year: 2009, type: "death", title: "Passed away", place: "Pabna, Bangladesh" },

  { id: "ev52", personId: "p14", year: 1950, type: "birth", title: "Born in Pabna", place: "Pabna, Bangladesh" },
  { id: "ev53", personId: "p14", year: 1970, type: "marriage", title: "Married Md. Nurul Islam", place: "Pabna, Bangladesh" },
];

export function getPersonsByGeneration(): Person[][] {
  const gen1 = persons.filter((p) => ["p1", "p2", "p3", "p13", "p14"].includes(p.id));
  const gen2 = persons.filter((p) => ["p4", "p5", "p6", "p7"].includes(p.id));
  const gen3 = persons.filter((p) => ["p8", "p9", "p10", "p11"].includes(p.id));
  return [gen1, gen2, gen3];
}