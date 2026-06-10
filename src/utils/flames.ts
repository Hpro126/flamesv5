export interface FlamesDetail {
  letter: 'F' | 'L' | 'A' | 'M' | 'E' | 'S' | 'N';
  label: string;
  badgeColor: string;
  textColor: string;
  bgColor: string;
  borderColor: string;
  quote: string;
  description: string;
  emoji: string;
}

export const FLAMES_DETAILS: Record<'F' | 'L' | 'A' | 'M' | 'E' | 'S' | 'N', FlamesDetail> = {
  F: {
    letter: 'F',
    label: 'Friends',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    textColor: 'text-emerald-600',
    bgColor: 'bg-emerald-50/70',
    borderColor: 'border-emerald-200',
    emoji: '🤝',
    quote: "A true friend is one soul in two bodies.",
    description: "You share an unbreakable, platonic bond built on trust, laughter, and high-fives. No romantic pressure—just pure, absolute camaraderie."
  },
  L: {
    letter: 'L',
    label: 'Lovers',
    badgeColor: 'bg-rose-100 text-rose-800 border-rose-200',
    textColor: 'text-rose-600',
    bgColor: 'bg-rose-50/70',
    borderColor: 'border-rose-200',
    emoji: '💖',
    quote: "Love is composed of a single soul inhabiting two bodies.",
    description: "Sparks are flying! Your chemistry is off the charts, and there is a deep, mutual yearning. A beautiful romance is written in the stars."
  },
  A: {
    letter: 'A',
    label: 'Affection',
    badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    textColor: 'text-indigo-600',
    bgColor: 'bg-indigo-50/70',
    borderColor: 'border-indigo-200',
    emoji: '🥰',
    quote: "Affection is responsible for nine-tenths of whatever solid and durable happiness there is.",
    description: "Warmth, tender care, and fond feelings. Even if it's not a burning love story yet, you hold a very special, comforting space in each other's hearts."
  },
  M: {
    letter: 'M',
    label: 'Marriage',
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
    textColor: 'text-amber-600',
    bgColor: 'bg-amber-50/70',
    borderColor: 'border-amber-200',
    emoji: '💍',
    quote: "A successful marriage requires falling in love many times, always with the same person.",
    description: "Pack your bags, we are hearing wedding bells! You two are built for the long haul. A lifetime of bickering, sharing desserts, and growing old together awaits."
  },
  E: {
    letter: 'E',
    label: 'Enemy',
    badgeColor: 'bg-red-100 text-red-800 border-red-200',
    textColor: 'text-red-600',
    bgColor: 'bg-red-50/70',
    borderColor: 'border-red-200',
    emoji: '⚡',
    quote: "Keep your friends close, and your enemies closer.",
    description: "Uh-oh! Friction, tension, and fierce intellectual rivalries. You either can't stand each other, or you are secretly obsessed. The line between love and hate is razor-thin!"
  },
  S: {
    letter: 'S',
    label: 'Sisterly/Brotherly Bond',
    badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
    textColor: 'text-purple-600',
    bgColor: 'bg-purple-50/70',
    borderColor: 'border-purple-200',
    emoji: '⭐',
    quote: "Sisters and brothers are as close as hands and feet.",
    description: "A sibling-like guardian bond. You look out for each other, tease endlessly, and share a protective instincts, but romance is definitely out of the equation."
  },
  N: {
    letter: 'N',
    label: 'Soulmates',
    badgeColor: 'bg-sky-100 text-sky-800 border-sky-300',
    textColor: 'text-sky-600',
    bgColor: 'bg-sky-50/70',
    borderColor: 'border-sky-200',
    emoji: '✨',
    quote: "Our souls already know each other, don't they?",
    description: "Identical/highly similar names! This rare outcome represents a soul connection where you mirror each other perfectly."
  }
};

export function calculateFlames(name1: string, name2: string): {
  resultLetter: 'F' | 'L' | 'A' | 'M' | 'E' | 'S' | 'N';
  resultLabel: string;
  remainingCount: number;
  steps: { list: string[]; eliminated: string | null; startIndex: number }[];
} {
  // Normalize names: remove everything except letters, convert to lowercase
  const n1 = name1.toLowerCase().replace(/[^a-z]/g, "");
  const n2 = name2.toLowerCase().replace(/[^a-z]/g, "");
  
  let arr1 = n1.split("");
  let arr2 = n2.split("");
  
  // Track matched letters for elimination display
  for (let i = 0; i < arr1.length; i++) {
    const char = arr1[i];
    const indexIn2 = arr2.indexOf(char);
    if (indexIn2 !== -1) {
      arr1.splice(i, 1);
      arr2.splice(indexIn2, 1);
      i--; // adjust index
    }
  }
  
  const remainingCount = arr1.length + arr2.length;
  
  if (remainingCount === 0) {
    return {
      resultLetter: 'N',
      resultLabel: FLAMES_DETAILS.N.label,
      remainingCount: 0,
      steps: []
    };
  }
  
  let flames = ["F", "L", "A", "M", "E", "S"];
  let currentIndex = 0;
  const steps: { list: string[]; eliminated: string | null; startIndex: number }[] = [];
  
  while (flames.length > 1) {
    const listBefore = [...flames];
    const eliminateIndex = (currentIndex + remainingCount - 1) % flames.length;
    const eliminatedLetter = flames[eliminateIndex];
    
    steps.push({
      list: listBefore,
      eliminated: eliminatedLetter,
      startIndex: currentIndex
    });
    
    flames.splice(eliminateIndex, 1);
    currentIndex = eliminateIndex % flames.length;
  }
  
  const finalLetter = flames[0] as 'F' | 'L' | 'A' | 'M' | 'E' | 'S';
  
  return {
    resultLetter: finalLetter,
    resultLabel: FLAMES_DETAILS[finalLetter]?.label || "Friends",
    remainingCount,
    steps
  };
}
