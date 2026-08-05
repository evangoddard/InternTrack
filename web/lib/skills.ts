// -----------------------------------------------------------------------
// The vocabulary the match explanation is built from.
//
// Why a curated list rather than statistical term extraction: an
// explanation is only worth showing if it names things a person can act on.
// TF-IDF over posting text surfaces "collaborate", "fast-paced", "team" --
// technically the distinguishing terms, useless as advice. A fixed
// vocabulary of real skills means every line of the explanation is
// something you could actually go learn or add to a résumé.
//
// Each entry has a canonical display name and the patterns that count as a
// mention. Patterns are matched case-insensitively with word boundaries, so
// "C" can't match "C++" and "R" can't match every capital R in the document
// -- the genuinely ambiguous one-letter languages are handled with tighter
// context requirements below.
// -----------------------------------------------------------------------

export interface Skill {
  /** Display name, and matched as a literal. */
  name: string;
  /** Alternate spellings, also matched as literals. */
  aliases?: string[];
  /**
   * Raw regex, replacing the generated literal patterns entirely. Only for
   * cases literals can't express -- notably one-letter languages that need
   * a negative lookahead so "C" doesn't match inside "C++" or "C#".
   */
  pattern?: string;
  /** Broad grouping, used to explain *why* something is missing. */
  group: "language" | "hardware" | "tool" | "domain" | "framework";
}

export const SKILLS: Skill[] = [
  // --- languages ---
  { name: "Python", group: "language" },
  { name: "C++", aliases: ["cpp"], group: "language" },
  { name: "C", pattern: "\\bC\\b(?!\\+|#)", group: "language" },
  { name: "Java", pattern: "\\bjava\\b(?!script)", group: "language" },
  { name: "JavaScript", aliases: ["javascript", "js"], group: "language" },
  { name: "TypeScript", aliases: ["typescript", "ts"], group: "language" },
  { name: "Go", pattern: "\\bgolang\\b|\\bGo\\b(?= (?:developer|programming|language))", group: "language" },
  { name: "Rust", group: "language" },
  { name: "MATLAB", group: "language" },
  { name: "SQL", group: "language" },
  { name: "Scala", group: "language" },
  { name: "Swift", group: "language" },
  { name: "Kotlin", group: "language" },
  { name: "Ruby", group: "language" },
  { name: "Perl", group: "language" },
  { name: "Bash", aliases: ["shell scripting", "bash"], group: "language" },
  { name: "Assembly", aliases: ["assembly language"], group: "language" },

  // --- hardware / ECE ---
  { name: "Verilog", aliases: ["systemverilog"], group: "hardware" },
  { name: "VHDL", group: "hardware" },
  { name: "FPGA", group: "hardware" },
  { name: "ASIC", group: "hardware" },
  { name: "RTL", aliases: ["rtl design"], group: "hardware" },
  // Bare "embedded" is as often a verb ("encryption embedded in the file")
  // as the field, so it has to be followed by a real noun to count.
  {
    name: "Embedded systems",
    pattern: "\\bembedded\\s+(?:systems?|software|firmware|c\\b|devices?|programming|engineer|linux|development)",
    group: "hardware",
  },
  { name: "Microcontrollers", aliases: ["microcontroller", "mcu", "arduino", "stm32", "raspberry pi"], group: "hardware" },
  { name: "PCB design", aliases: ["pcb", "altium", "kicad", "eagle cad"], group: "hardware" },
  { name: "Circuit design", aliases: ["circuit design", "analog design", "analog circuits"], group: "hardware" },
  { name: "SPICE", aliases: ["ltspice", "hspice", "spice"], group: "hardware" },
  { name: "Signal processing", aliases: ["dsp", "signal processing"], group: "hardware" },
  { name: "Firmware", group: "hardware" },
  { name: "Oscilloscope", aliases: ["oscilloscope", "logic analyzer"], group: "hardware" },
  { name: "CAD", aliases: ["solidworks", "autocad", "cad"], group: "hardware" },
  { name: "Semiconductors", aliases: ["semiconductor", "silicon", "vlsi"], group: "hardware" },
  { name: "I2C/SPI/UART", aliases: ["i2c", "spi", "uart", "can bus"], group: "hardware" },

  // --- ML / data ---
  { name: "Machine learning", aliases: ["machine learning", "ml"], group: "domain" },
  { name: "Deep learning", aliases: ["deep learning", "neural network"], group: "domain" },
  { name: "PyTorch", aliases: ["pytorch", "torch"], group: "framework" },
  { name: "TensorFlow", aliases: ["tensorflow", "keras"], group: "framework" },
  { name: "scikit-learn", aliases: ["scikit-learn", "sklearn"], group: "framework" },
  { name: "NumPy", aliases: ["numpy"], group: "framework" },
  { name: "Pandas", group: "framework" },
  { name: "Computer vision", aliases: ["computer vision", "opencv"], group: "domain" },
  { name: "NLP", aliases: ["nlp", "natural language processing"], group: "domain" },
  { name: "LLMs", pattern: "\\bllms?\\b|large language model|generative ai", group: "domain" },
  { name: "Statistics", aliases: ["statistics", "statistical"], group: "domain" },
  { name: "Data visualization", aliases: ["data visualization", "tableau", "power bi", "powerbi"], group: "domain" },
  { name: "Spark", aliases: ["apache spark", "spark"], group: "framework" },
  { name: "Hadoop", group: "framework" },

  // --- software / infra ---
  { name: "Git", aliases: ["git", "version control"], group: "tool" },
  { name: "Linux", aliases: ["linux", "unix"], group: "tool" },
  { name: "Docker", aliases: ["docker", "containeriz"], group: "tool" },
  { name: "Kubernetes", aliases: ["kubernetes", "k8s"], group: "tool" },
  { name: "AWS", aliases: ["aws", "amazon web services"], group: "tool" },
  { name: "Azure", group: "tool" },
  { name: "GCP", aliases: ["gcp", "google cloud"], group: "tool" },
  { name: "CI/CD", aliases: ["ci/cd", "jenkins", "github actions"], group: "tool" },
  { name: "React", aliases: ["react", "react.js"], group: "framework" },
  { name: "Node.js", aliases: ["node.js", "nodejs"], group: "framework" },
  { name: "REST APIs", aliases: ["rest api", "restful"], group: "domain" },
  { name: "Distributed systems", aliases: ["distributed system"], group: "domain" },
  { name: "Databases", aliases: ["postgres", "mysql", "mongodb", "database design"], group: "domain" },
  { name: "Testing", aliases: ["unit test", "test automation", "pytest"], group: "domain" },
  { name: "Algorithms", aliases: ["algorithms", "data structures"], group: "domain" },
  { name: "Operating systems", aliases: ["operating system"], group: "domain" },
  { name: "Networking", aliases: ["tcp/ip", "computer network"], group: "domain" },
  { name: "Cybersecurity", aliases: ["cybersecurity", "cyber security", "penetration test"], group: "domain" },
  { name: "Compilers", aliases: ["compiler"], group: "domain" },
  { name: "CUDA", aliases: ["cuda", "gpu programming"], group: "domain" },
  { name: "Robotics", aliases: ["robotics", "ros"], group: "domain" },
];

/**
 * A literal term becomes an escaped pattern with word boundaries added only
 * where they can actually match. "C++" ends in punctuation, so a trailing
 * \b would require a word character after it and the term would never
 * match at end of sentence.
 */
function literalPattern(term: string): string {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const lead = /^\w/.test(term) ? "\\b" : "";
  const trail = /\w$/.test(term) ? "\\b" : "";
  return `${lead}${escaped}${trail}`;
}

/** Compiled once -- these regexes run over every posting on the page. */
const COMPILED = SKILLS.map((skill) => {
  const source =
    skill.pattern ??
    [skill.name, ...(skill.aliases ?? [])].map(literalPattern).join("|");
  return { skill, re: new RegExp(source, "gi") };
});

export interface SkillHit {
  skill: Skill;
  /** How many times the posting mentions it -- a proxy for how central it is. */
  count: number;
}

/** Every skill mentioned in a block of text, with mention counts. */
export function findSkills(text: string): SkillHit[] {
  if (!text) return [];
  const out: SkillHit[] = [];
  for (const { skill, re } of COMPILED) {
    re.lastIndex = 0;
    const matches = text.match(re);
    if (matches && matches.length > 0) out.push({ skill, count: matches.length });
  }
  return out;
}
