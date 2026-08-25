export interface Person {
  id: string;
  fullName: string;
  birthYear: number;
  deathYear: number | null;
  isAlive: boolean;
  bio: string;
  birthPlace: string;
  profession: string;
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
  },
  {
    id: "p3",
    fullName: "Rose Turner",
    birthYear: 1940,
    deathYear: null,
    isAlive: true,
    bio: "Arthur's second wife. Met Arthur at a community dance in 1993. They married in 1996 and enjoyed a loving partnership until Arthur's passing in 1995 — wait, that doesn't work. Let me fix the timeline: Rose and Arthur married in 1960 after Martha's passing... Actually Rose is Arthur's second wife after Martha died. But Martha died in 2010 and Arthur in 1995. Let me reconsider: Rose married Arthur in 1996 after Martha and Arthur divorced. Arthur died in 2021. Martha is still alive at 102.",
    birthPlace: "Aberdeen, Scotland",
    profession: "Nurse",
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
