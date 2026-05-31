import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import { 
  BookOpen, MessageSquare, Clock, FileText, GraduationCap, ArrowRight,
  Flame, Star, Trophy, Award, Target, CheckCircle2, ChevronRight, 
  AlertCircle, RefreshCw, Plus, Trash2, Sparkles, Zap, Play, Copy, Check, Calendar,
  Loader2, X
} from 'lucide-react';
import { generateAIContent, generateExamRoadmapPrompt, generateOneClickPrompt, fixMathFormatting } from '../lib/ai';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { useAuth } from '../context/AuthContext';
import { saveDocument, logActivity } from '../lib/firebase';

// Custom renderers for beautiful markdown tables
const markdownComponents = {
  table: ({ children }) => (
    <div className="md-table-wrapper">
      <table className="md-table">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="md-thead">{children}</thead>,
  tbody: ({ children }) => <tbody>{children}</tbody>,
  tr: ({ children }) => <tr className="md-tr">{children}</tr>,
  th: ({ children }) => <th className="md-th">{children}</th>,
  td: ({ children }) => <td className="md-td">{children}</td>,
  code: ({ inline, className, children }) => {
    if (inline) {
      return <code className="md-inline-code">{children}</code>;
    }
    return (
      <div className="md-code-block">
        <code>{children}</code>
      </div>
    );
  },
  blockquote: ({ children }) => (
    <blockquote className="md-blockquote">{children}</blockquote>
  ),
};

const standardSubjects = [
  { name: 'Physics', icon: '⚛️', color: '#6366f1' },
  { name: 'Chemistry', icon: '🧪', color: '#10b981' },
  { name: 'Mathematics', icon: '📐', color: '#3b82f6' },
  { name: 'Biology', icon: '🧬', color: '#ec4899' },
  { name: 'Social Science', icon: '🌍', color: '#f59e0b' },
  { name: 'English', icon: '📝', color: '#a855f7' },
  { name: 'Hindi', icon: '✍️', color: '#ef4444' },
  { name: 'Computer Science', icon: '💻', color: '#06b6d4' },
  { name: 'Accountancy', icon: '📂', color: '#f43f5e' },
  { name: 'Business Studies', icon: '💼', color: '#a855f7' },
  { name: 'Economics', icon: '📊', color: '#f59e0b' },
  { name: 'Informatics Practices', icon: '🖥️', color: '#06b6d4' }
];

const CLASS_SYLLABUS = {
  '9': {
    'Mathematics': [
      'Chapter 1: Number Systems',
      'Chapter 2: Polynomials',
      'Chapter 3: Coordinate Geometry',
      'Chapter 4: Linear Equations in Two Variables',
      'Chapter 5: Introduction to Euclid Geometry',
      'Chapter 6: Lines and Angles',
      'Chapter 7: Triangles',
      'Chapter 8: Quadrilaterals',
      'Chapter 9: Circles',
      'Chapter 10: Herons Formula',
      'Chapter 11: Surface Areas and Volumes',
      'Chapter 12: Statistics'
    ],
    'Science': [
      'Chapter 1: Matter in Our Surroundings',
      'Chapter 2: Is Matter Around Us Pure?',
      'Chapter 3: Atoms and Molecules',
      'Chapter 4: Structure of the Atom',
      'Chapter 5: The Fundamental Unit of Life',
      'Chapter 6: Tissues',
      'Chapter 7: Motion',
      'Chapter 8: Force and Laws of Motion',
      'Chapter 9: Gravitation',
      'Chapter 10: Work and Energy',
      'Chapter 11: Sound',
      'Chapter 12: Improvement in Food Resources'
    ],
    'Physics': [
      'Chapter 1: Motion',
      'Chapter 2: Force and Laws of Motion',
      'Chapter 3: Gravitation',
      'Chapter 4: Work and Energy',
      'Chapter 5: Sound'
    ],
    'Chemistry': [
      'Chapter 1: Matter in Our Surroundings',
      'Chapter 2: Is Matter Around Us Pure?',
      'Chapter 3: Atoms and Molecules',
      'Chapter 4: Structure of the Atom'
    ],
    'Biology': [
      'Chapter 1: The Fundamental Unit of Life',
      'Chapter 2: Tissues',
      'Chapter 3: Improvement in Food Resources'
    ],
    'Social Science': [
      'Chapter 1: The French Revolution',
      'Chapter 2: Socialism in Europe and the Russian Revolution',
      'Chapter 3: Nazism and the Rise of Hitler',
      'Chapter 4: Size and Location of India',
      'Chapter 5: Physical Features of India',
      'Chapter 6: Drainage',
      'Chapter 7: Climate',
      'Chapter 8: Natural Vegetation and Wild Life',
      'Chapter 9: Population',
      'Chapter 10: What is Democracy? Why Democracy?',
      'Chapter 11: Constitutional Design',
      'Chapter 12: Electoral Politics',
      'Chapter 13: Working of Institutions',
      'Chapter 14: Democratic Rights',
      'Chapter 15: The Story of Village Palampur',
      'Chapter 16: People as Resource',
      'Chapter 17: Poverty as a Challenge',
      'Chapter 18: Food Security in India'
    ],
    'English': [
      'Chapter 1: The Fun They Had',
      'Chapter 2: The Sound of Music',
      'Chapter 3: The Little Girl',
      'Chapter 4: A Truly Beautiful Mind',
      'Chapter 5: The Snake and the Mirror',
      'Chapter 6: My Childhood',
      'Chapter 7: Reach for the Top',
      'Chapter 8: Kathmandu',
      'Chapter 9: If I Were You'
    ],
    'Hindi': [
      'Chapter 1: Do Bailon Ki Katha (Premchand)',
      'Chapter 2: Lhasa Ki Aur (Rahul Sankrityayan)',
      'Chapter 3: Upbhoktavad Ki Sanskriti (S. C. Dubey)',
      'Chapter 4: Sawale Sapno Ki Yaad (Jabir Husain)',
      'Chapter 5: Premchand Ke Phate Joote (Harishankar Parsai)',
      'Chapter 6: Mere Bachpan Ke Din (Mahadevi Varma)',
      'Chapter 7: Sakhiyan & Sabad (Kabir)',
      'Chapter 8: Vakh (Laldyad)',
      'Chapter 9: Sawaiye (Raskhan)',
      'Chapter 10: Kaidi Aur Kokila (M. L. Chaturvedi)',
      'Chapter 11: Gram Shree (Sumitranandan Pant)',
      'Chapter 12: Megh Aaye (S. D. Saxena)',
      'Chapter 13: Yamraj Ki Disha (Chandrakant Devtale)',
      'Chapter 14: Bachche Kaam Par Ja Rahe Hain (Rajesh Joshi)',
      'Chapter 15: Is Jal Pralay Mein (Phanishwar Nath Renu)',
      'Chapter 16: Mere Sang Ki Auratein (Mridula Garg)',
      'Chapter 17: Reedh Ki Haddi (J. C. Mathur)'
    ],
    'Computer Science': [
      'Chapter 1: Introduction to IT-ITeS Industry',
      'Chapter 2: Data Entry and Keyboarding Skills',
      'Chapter 3: Digital Documentation (Word Processing)',
      'Chapter 4: Electronic Spreadsheet',
      'Chapter 5: Digital Presentation'
    ]
  },
  '10': {
    'Mathematics': [
      'Chapter 1: Real Numbers',
      'Chapter 2: Polynomials',
      'Chapter 3: Pair of Linear Equations in Two Variables',
      'Chapter 4: Quadratic Equations',
      'Chapter 5: Arithmetic Progressions',
      'Chapter 6: Triangles',
      'Chapter 7: Coordinate Geometry',
      'Chapter 8: Introduction to Trigonometry',
      'Chapter 9: Some Applications of Trigonometry',
      'Chapter 10: Circles',
      'Chapter 11: Areas Related to Circles',
      'Chapter 12: Surface Areas and Volumes',
      'Chapter 13: Statistics',
      'Chapter 14: Probability'
    ],
    'Science': [
      'Chapter 1: Chemical Reactions and Equations',
      'Chapter 2: Acids, Bases and Salts',
      'Chapter 3: Metals and Non-Metals',
      'Chapter 4: Carbon and its Compounds',
      'Chapter 5: Life Processes',
      'Chapter 6: Control and Coordination',
      'Chapter 7: How do Organisms Reproduce?',
      'Chapter 8: Heredity and Evolution',
      'Chapter 9: Light - Reflection and Refraction',
      'Chapter 10: The Human Eye and the Colorful World',
      'Chapter 11: Electricity',
      'Chapter 12: Magnetic Effects of Electric Current',
      'Chapter 13: Our Environment'
    ],
    'Physics': [
      'Chapter 1: Light - Reflection and Refraction',
      'Chapter 2: The Human Eye and the Colorful World',
      'Chapter 3: Electricity',
      'Chapter 4: Magnetic Effects of Electric Current',
      'Chapter 5: Our Environment'
    ],
    'Chemistry': [
      'Chapter 1: Chemical Reactions and Equations',
      'Chapter 2: Acids, Bases and Salts',
      'Chapter 3: Metals and Non-Metals',
      'Chapter 4: Carbon and its Compounds'
    ],
    'Biology': [
      'Chapter 1: Life Processes',
      'Chapter 2: Control and Coordination',
      'Chapter 3: How do Organisms Reproduce?',
      'Chapter 4: Heredity and Evolution'
    ],
    'Social Science': [
      'Chapter 1: The Rise of Nationalism in Europe',
      'Chapter 2: Nationalism in India',
      'Chapter 3: The Making of a Global World',
      'Chapter 4: The Age of Industrialisation',
      'Chapter 5: Resources and Development',
      'Chapter 6: Forest and Wildlife Resources',
      'Chapter 7: Water Resources',
      'Chapter 8: Agriculture',
      'Chapter 9: Minerals and Energy Resources',
      'Chapter 10: Manufacturing Industries',
      'Chapter 11: Lifelines of National Economy',
      'Chapter 12: Power Sharing',
      'Chapter 13: Federalism',
      'Chapter 14: Gender, Religion and Caste',
      'Chapter 15: Political Parties',
      'Chapter 16: Outcomes of Democracy',
      'Chapter 17: Development',
      'Chapter 18: Sectors of the Indian Economy',
      'Chapter 19: Money and Credit',
      'Chapter 20: Globalisation and the Indian Economy'
    ],
    'English': [
      'Chapter 1: A Letter to God',
      'Chapter 2: Nelson Mandela: Long Walk to Freedom',
      'Chapter 3: Two Stories about Flying',
      'Chapter 4: From the Diary of Anne Frank',
      'Chapter 5: Glimpses of India',
      'Chapter 6: Mijbil the Otter',
      'Chapter 7: Madam Rides the Bus',
      'Chapter 8: The Sermon at Benares',
      'Chapter 9: The Proposal'
    ],
    'Hindi': [
      'Chapter 1: Surdas ke Pad',
      'Chapter 2: Ram Lakshman Parashuram Samvad',
      'Chapter 3: Dev - Savaiya aur Kabitt',
      'Chapter 4: Aatmakathya - Jaishankar Prasad',
      'Chapter 5: Utsah aur At Nahi Rahi Hai',
      'Chapter 6: Yeh Danturit Muskan aur Fasal',
      'Chapter 7: Chhaya Mat Chhuna',
      'Chapter 8: Kanyadan - Rituraj',
      'Chapter 9: Sangatkar - Manglesh Dabral',
      'Chapter 10: Netaji Ka Chashma (Swayam Prakash)',
      'Chapter 11: Balgobin Bhagat (Ramvriksha Benipuri)',
      'Chapter 12: Lakhnavi Andaaz (Yashpal)',
      'Chapter 13: Ek Kahani Yeh Bhi (Mannu Bhandari)',
      'Chapter 14: Naubat Khane Mein Ibadat (Yatindra Mishra)',
      'Chapter 15: Sanskriti (Bhadant Anand Kausalyayan)',
      'Chapter 16: Mata Ka Anchal (Shivpujan Sahay)',
      'Chapter 17: Sana-Sana Hath Jodi (Madhu Kankariya)',
      'Chapter 18: Main Kyon Likhta Hun? (Agyeya)'
    ],
    'Computer Science': [
      'Chapter 1: Internet Basics & Networking',
      'Chapter 2: HTML - I (Basic Tags, Images, Links)',
      'Chapter 3: HTML - II (Tables, Lists, Forms)',
      'Chapter 4: Cascading Style Sheets (CSS)',
      'Chapter 5: Cyber Ethics',
      'Chapter 6: Digital Documentation (Advanced)',
      'Chapter 7: Electronic Spreadsheet (Advanced)',
      'Chapter 8: Database Management System'
    ]
  },
  '11': {
    'Physics': [
      'Chapter 1: Units and Measurements',
      'Chapter 2: Motion in a Straight Line',
      'Chapter 3: Motion in a Plane',
      'Chapter 4: Laws of Motion',
      'Chapter 5: Work, Energy and Power',
      'Chapter 6: System of Particles and Rotational Motion',
      'Chapter 7: Gravitation',
      'Chapter 8: Mechanical Properties of Solids',
      'Chapter 9: Mechanical Properties of Fluids',
      'Chapter 10: Thermal Properties of Matter',
      'Chapter 11: Thermodynamics',
      'Chapter 12: Kinetic Theory',
      'Chapter 13: Oscillations',
      'Chapter 14: Waves'
    ],
    'Chemistry': [
      'Chapter 1: Some Basic Concepts of Chemistry',
      'Chapter 2: Structure of Atom',
      'Chapter 3: Classification of Elements and Periodicity in Properties',
      'Chapter 4: Chemical Bonding and Molecular Structure',
      'Chapter 5: Chemical Thermodynamics',
      'Chapter 6: Equilibrium',
      'Chapter 7: Redox Reactions',
      'Chapter 8: Organic Chemistry: Some Basic Principles and Techniques',
      'Chapter 9: Hydrocarbons'
    ],
    'Biology': [
      'Chapter 1: The Living World',
      'Chapter 2: Biological Classification',
      'Chapter 3: Plant Kingdom',
      'Chapter 4: Animal Kingdom',
      'Chapter 5: Morphology of Flowering Plants',
      'Chapter 6: Anatomy of Flowering Plants',
      'Chapter 7: Structural Organisation in Animals',
      'Chapter 8: Cell: The Unit of Life',
      'Chapter 9: Biomolecules',
      'Chapter 10: Cell Cycle and Cell Division',
      'Chapter 11: Photosynthesis in Higher Plants',
      'Chapter 12: Respiration in Plants',
      'Chapter 13: Plant Growth and Development',
      'Chapter 14: Breathing and Exchange of Gases',
      'Chapter 15: Body Fluids and Circulation',
      'Chapter 16: Excretory Products and their Elimination',
      'Chapter 17: Locomotion and Movement',
      'Chapter 18: Neural Control and Coordination',
      'Chapter 19: Chemical Coordination and Integration'
    ],
    'Mathematics': [
      'Chapter 1: Sets',
      'Chapter 2: Relations and Functions',
      'Chapter 3: Trigonometric Functions',
      'Chapter 4: Complex Numbers and Quadratic Equations',
      'Chapter 5: Linear Inequalities',
      'Chapter 6: Permutations and Combinations',
      'Chapter 7: Binomial Theorem',
      'Chapter 8: Sequences and Series',
      'Chapter 9: Straight Lines',
      'Chapter 10: Conic Sections',
      'Chapter 11: Introduction to Three Dimensional Geometry',
      'Chapter 12: Limits and Derivatives',
      'Chapter 13: Statistics',
      'Chapter 14: Probability'
    ],
    'English': [
      'Chapter 1: The Portrait of a Lady',
      'Chapter 2: We Are Not Afraid to Die...',
      'Chapter 3: Discovering Tut: the Saga Continues',
      'Chapter 4: The Adventure',
      'Chapter 5: Silk Road'
    ],
    'Computer Science': [
      'Chapter 1: Computer Systems and Organisation',
      'Chapter 2: Computational Thinking and Python Programming',
      'Chapter 3: Database Concepts and SQL',
      'Chapter 4: Introduction to Computer Networks'
    ],
    'Informatics Practices': [
      'Chapter 1: Computer System',
      'Chapter 2: Introduction to Python',
      'Chapter 3: Database Query using SQL',
      'Chapter 4: Emerging Trends'
    ],
    'Accountancy': [
      'Chapter 1: Introduction to Accounting',
      'Chapter 2: Theory Base of Accounting',
      'Chapter 3: Recording of Transactions - I',
      'Chapter 4: Recording of Transactions - II',
      'Chapter 5: Bank Reconciliation Statement',
      'Chapter 6: Trial Balance and Rectification of Errors',
      'Chapter 7: Depreciation, Provisions and Reserves',
      'Chapter 8: Financial Statements - I',
      'Chapter 9: Financial Statements - II'
    ],
    'Business Studies': [
      'Chapter 1: Business, Trade and Commerce',
      'Chapter 2: Forms of Business Organisations',
      'Chapter 3: Private, Public and Global Enterprises',
      'Chapter 4: Business Services',
      'Chapter 5: Emerging Modes of Business',
      'Chapter 6: Social Responsibility of Business and Business Ethics',
      'Chapter 7: Sources of Business Finance',
      'Chapter 8: Small Business',
      'Chapter 9: Internal Trade',
      'Chapter 10: International Business'
    ],
    'Economics': [
      'Chapter 1: Introduction to Statistics',
      'Chapter 2: Collection, Organisation and Presentation of Data',
      'Chapter 3: Statistical Tools and Interpretation',
      'Chapter 4: Introduction to Microeconomics',
      'Chapter 5: Consumer Equilibrium and Demand',
      'Chapter 6: Producer Behaviour and Supply',
      'Chapter 7: Forms of Market and Price Determination'
    ],
    'Hindi': [
      'Chapter 1: Namak Ka Daroga (Premchand)',
      'Chapter 2: Miyan Naseeruddin (Krishna Sobti)',
      'Chapter 3: Appu Ke Saath Dhai Saal (Satyajit Ray)',
      'Chapter 4: Vidai-Sambhashan (Balmukund Gupt)',
      'Chapter 5: Galta Loha (Shekhar Joshi)',
      'Chapter 6: Rajani (Manu Bhandari)',
      'Chapter 7: Jamun Ka Ped (Krishan Chander)',
      'Chapter 8: Bharat Mata (Jawaharlal Nehru)',
      'Chapter 9: Kabir ke Pad (Kabir)',
      'Chapter 10: Meera ke Pad (Meera)',
      'Chapter 11: Ghar Ki Yaad (Bhawani Prasad Mishra)',
      'Chapter 12: Champa Kale Kale Achhar (Trilochan)',
      'Chapter 13: Gajal (Dushyant Kumar)',
      'Chapter 14: He Bhookh Mat Machal (Akka Mahadevi)',
      'Chapter 15: Sabse Khatarnak (Avtar Singh Pash)',
      'Chapter 16: Aao, Milkar Bachayein (Nirmala Putul)',
      'Chapter 17: Bharatiya Gaayikaon Mein: Lata Mangeshkar',
      'Chapter 18: Rajasthan Ki Rajat Boondein',
      'Chapter 19: Alo Aandhari (Baby Halder)'
    ]
  },
  '12': {
    'Physics': [
      'Chapter 1: Electric Charges and Fields',
      'Chapter 2: Electrostatic Potential and Capacitance',
      'Chapter 3: Current Electricity',
      'Chapter 4: Moving Charges and Magnetism',
      'Chapter 5: Magnetism and Matter',
      'Chapter 6: Electromagnetic Induction',
      'Chapter 7: Alternating Current',
      'Chapter 8: Electromagnetic Waves',
      'Chapter 9: Ray Optics and Optical Instruments',
      'Chapter 10: Wave Optics',
      'Chapter 11: Dual Nature of Radiation and Matter',
      'Chapter 12: Atoms',
      'Chapter 13: Nuclei',
      'Chapter 14: Semiconductor Electronics: Materials, Devices and Simple Circuits'
    ],
    'Chemistry': [
      'Chapter 1: Solutions',
      'Chapter 2: Electrochemistry',
      'Chapter 3: Chemical Kinetics',
      'Chapter 4: The d-and f-Block Elements',
      'Chapter 5: Coordination Compounds',
      'Chapter 6: Haloalkanes and Haloarenes',
      'Chapter 7: Alcohols, Phenols and Ethers',
      'Chapter 8: Aldehydes, Ketones and Carboxylic Acids',
      'Chapter 9: Amines',
      'Chapter 10: Biomolecules'
    ],
    'Biology': [
      'Chapter 1: Sexual Reproduction in Flowering Plants',
      'Chapter 2: Human Reproduction',
      'Chapter 3: Reproductive Health',
      'Chapter 4: Principles of Inheritance and Variation',
      'Chapter 5: Molecular Basis of Inheritance',
      'Chapter 6: Evolution',
      'Chapter 7: Human Health and Diseases',
      'Chapter 8: Microbes in Human Welfare',
      'Chapter 9: Biotechnology - Principles and Processes',
      'Chapter 10: Biotechnology and its Applications',
      'Chapter 11: Organisms and Populations',
      'Chapter 12: Ecosystem',
      'Chapter 13: Biodiversity and its Conservation'
    ],
    'Mathematics': [
      'Chapter 1: Relations and Functions',
      'Chapter 2: Inverse Trigonometric Functions',
      'Chapter 3: Matrices',
      'Chapter 4: Determinants',
      'Chapter 5: Continuity and Differentiability',
      'Chapter 6: Application of Derivatives',
      'Chapter 7: Integrals',
      'Chapter 8: Application of Integrals',
      'Chapter 9: Differential Equations',
      'Chapter 10: Vector Algebra',
      'Chapter 11: Three Dimensional Geometry',
      'Chapter 12: Linear Programming',
      'Chapter 13: Probability'
    ],
    'English': [
      'Chapter 1: The Last Lesson',
      'Chapter 2: Lost Spring',
      'Chapter 3: Deep Water',
      'Chapter 4: The Rattrap',
      'Chapter 5: Indigo',
      'Chapter 6: Poets and Pancakes',
      'Chapter 7: The Interview',
      'Chapter 8: Going Places'
    ],
    'Computer Science': [
      'Chapter 1: Computational Thinking and Programming - 2',
      'Chapter 2: Computer Networks',
      'Chapter 3: Database Management'
    ],
    'Informatics Practices': [
      'Chapter 1: Data Handling using Pandas and Data Visualization',
      'Chapter 2: Database Query using SQL',
      'Chapter 3: Introduction to Computer Networks',
      'Chapter 4: Societal Impacts'
    ],
    'Accountancy': [
      'Chapter 1: Accounting for Partnership Firms - Basic Concepts',
      'Chapter 2: Reconstitution of a Partnership Firm - Admission of a Partner',
      'Chapter 3: Reconstitution of a Partnership Firm - Retirement/Death of a Partner',
      'Chapter 4: Dissolution of a Partnership Firm',
      'Chapter 5: Accounting for Share Capital',
      'Chapter 6: Accounting for Debentures',
      'Chapter 7: Financial Statements of a Company',
      'Chapter 8: Analysis of Financial Statements',
      'Chapter 9: Accounting Ratios',
      'Chapter 10: Cash Flow Statement'
    ],
    'Business Studies': [
      'Chapter 1: Nature and Significance of Management',
      'Chapter 2: Principles of Management',
      'Chapter 3: Business Environment',
      'Chapter 4: Planning',
      'Chapter 5: Organising',
      'Chapter 6: Staffing',
      'Chapter 7: Directing',
      'Chapter 8: Controlling',
      'Chapter 9: Financial Management',
      'Chapter 10: Financial Markets',
      'Chapter 11: Marketing Management',
      'Chapter 12: Consumer Protection'
    ],
    'Economics': [
      'Chapter 1: Development Experience (1947-90) and Economic Reforms since 1991',
      'Chapter 2: Current Challenges Facing the Indian Economy',
      'Chapter 3: Development Experience of India – A Comparison with Neighbours',
      'Chapter 4: National Income and Related Aggregates',
      'Chapter 5: Money and Banking',
      'Chapter 6: Determination of Income and Employment',
      'Chapter 7: Government Budget and the Economy',
      'Chapter 8: Balance of Payments'
    ],
    'Hindi': [
      'Chapter 1: Aatmparichay / Ek Geet (H. R. Bachchan)',
      'Chapter 2: Patang (Alok Dhanwa)',
      'Chapter 3: Kavita Ke Bahane / Baat Seedhi Thi Par (K. Narayan)',
      'Chapter 4: Camere Mein Band Apahij (Raghuvir Sahay)',
      'Chapter 5: Usha (Shamsher Bahadur Singh)',
      'Chapter 6: Badal Raag (Suryakant Tripathi Nirala)',
      'Chapter 7: Kavitavali / Laxman-murcha (Tulsidas)',
      'Chapter 8: Rubaaiyaan / Ghazal (Firaq Gorakhpuri)',
      'Chapter 9: Chota Mera Khet / Bangulo Ke Pankh (U. Joshi)',
      'Chapter 10: Bhaktin (Mahadevi Verma)',
      'Chapter 11: Bazar Darshan (Jainendra Kumar)',
      'Chapter 12: Kaale Megha Paani De (Dharmavir Bharati)',
      'Chapter 13: Pahelwan Ki Dholak (P. N. Renu)',
      'Chapter 14: Shirish Ke Phool (Hazari Prasad Dwivedi)',
      'Chapter 15: Shram Vibhajan aur Jati Pratha (B. R. Ambedkar)',
      'Chapter 16: Silver Wedding (Manohar Shyam Joshi)',
      'Chapter 17: Jooje (Anand Yadav)',
      'Chapter 18: Ateet Mein Dabe Paon (Om Thanvi)'
    ]
  }
};

const fallbackTeachingMCQ = {
  topic: "Chemical Reactions: Types of Reactions Masterclass",
  questionText: "Which of the following statements perfectly captures the difference between combination, decomposition, and displacement reactions?",
  options: [
    { key: "A", desc: "Combination reactions break compounds apart; decomposition reactions combine reactants together." },
    { key: "B", desc: "Combination reactions merge reactants into a single product ($A + B \\rightarrow AB$); decomposition breaks a reactant into multiple products ($AB \\rightarrow A + B$); displacement swaps a reactive element into a compound ($A + BC \\rightarrow AC + B$)." },
    { key: "C", desc: "Displacement reactions only occur when a less reactive element is introduced to a highly reactive salt." },
    { key: "D", desc: "Decomposition reactions are the only reaction type that never requires heat, light, or electrical energy to proceed." }
  ],
  correctKey: "B",
  explanation: `### 🧠 Chemical Reactions Masterclass

Chemical reactions are classified into distinct types based on how atoms are rearranged:

#### 1. ⚡ Combination Reactions
* **Definition:** Two or more reactants combine to form a single product.
* **General Form:** $A + B \\rightarrow AB$
* **Example:** Burning of coal: $C(s) + O_2(g) \\rightarrow CO_2(g)$

#### 2. 🧲 Decomposition Reactions
* **Definition:** A single reactant breaks down into two or more simpler products.
* **General Form:** $AB \\rightarrow A + B$
* **Pacing Tip:** These are the exact **opposite of combination reactions** and require energy input in the form of heat (Thermal), light (Photolytic), or electricity (Electrolytic).
* **Example:** Heating limestone: $CaCO_3(s) \\xrightarrow{\\text{Heat}} CaO(s) + CO_2(g)$

#### 3. ⚛️ Displacement Reactions
* **Definition:** A more reactive element displaces a less reactive element from its salt solution.
* **General Form:** $A + BC \\rightarrow AC + B$
* **Example:** Iron nail in copper sulphate: $Fe(s) + CuSO_4(aq) \\rightarrow FeSO_4(aq) + Cu(s)$
* **Visual Check:** The blue color of $CuSO_4$ fades to light green due to the formation of $FeSO_4$.

#### ⚠️ Common Exam Mistakes to Avoid:
* Don't confuse double displacement with single displacement. Double displacement involves an exchange of ions between two compounds ($AB + CD \\rightarrow AD + CB$), often forming a precipitate!`
};



const AttemptItem = ({ att }) => {
  const [expanded, setExpanded] = useState(false);
  
  return (
    <div style={{
      background: 'rgba(255,255,255,0.01)',
      border: '1px solid rgba(255,255,255,0.03)',
      borderRadius: '8px',
      padding: '0.75rem',
      transition: 'all 0.2s',
      cursor: 'pointer'
    }} onClick={() => setExpanded(!expanded)}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {att.subject} : {att.chapter.replace(/^Chapter \d+:\s*/, '')}
          </span>
          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff', marginTop: '0.15rem' }}>{att.topic}</div>
          <div style={{ fontSize: '0.68rem', color: !att.isCorrect ? '#f87171' : att.firstIncorrectKey ? '#f59e0b' : '#34d399', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.15rem' }}>
            <span>⭐ Marks:</span>
            <span>{!att.isCorrect ? '-5 Penalty' : att.firstIncorrectKey ? '+5 (Corrected)' : '+10 Added'}</span>
          </div>
        </div>
        <span style={{
          fontSize: '0.65rem',
          fontWeight: 700,
          padding: '0.2rem 0.45rem',
          borderRadius: '4px',
          background: !att.isCorrect 
            ? 'rgba(239, 68, 68, 0.1)' 
            : att.firstIncorrectKey 
              ? 'rgba(245, 158, 11, 0.15)' 
              : 'rgba(16, 185, 129, 0.1)',
          color: !att.isCorrect 
            ? '#ef4444' 
            : att.firstIncorrectKey 
              ? '#f59e0b' 
              : '#10b981',
          whiteSpace: 'nowrap'
        }}>
          {!att.isCorrect 
            ? '❌ Wrong' 
            : att.firstIncorrectKey 
              ? '✓ Corrected' 
              : '✓ Correct'}
        </span>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div style={{
          marginTop: '0.75rem',
          paddingTop: '0.75rem',
          borderTop: '1px solid rgba(255,255,255,0.05)',
          fontSize: '0.8rem',
          lineHeight: 1.5,
          color: 'var(--text-secondary)'
        }} onClick={e => e.stopPropagation()}>
          <div style={{ background: 'rgba(0,0,0,0.15)', padding: '0.6rem', borderRadius: '6px', marginBottom: '0.75rem', border: '1px solid rgba(255,255,255,0.02)' }}>
            <strong style={{ color: '#fff', fontSize: '0.75rem', display: 'block', marginBottom: '0.25rem' }}>Question:</strong>
            <span style={{ fontSize: '0.78rem' }}>{att.questionText}</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.75rem' }}>
            {att.firstIncorrectKey ? (
              <>
                <div style={{ background: 'rgba(239, 68, 68, 0.05)', padding: '0.5rem', borderRadius: '6px', border: '1px solid rgba(239, 68, 68, 0.1)' }}>
                  <strong style={{ color: '#f87171', fontSize: '0.75rem', display: 'block', marginBottom: '0.15rem' }}>❌ Your First Choice (Incorrect):</strong>
                  <span style={{ fontSize: '0.78rem' }}>({att.firstIncorrectKey}) {att.firstIncorrectDesc}</span>
                </div>
                <div style={{ background: 'rgba(16, 185, 129, 0.05)', padding: '0.5rem', borderRadius: '6px', border: '1px solid rgba(16, 185, 129, 0.1)' }}>
                  <strong style={{ color: '#34d399', fontSize: '0.75rem', display: 'block', marginBottom: '0.15rem' }}>✅ Your Corrected Choice:</strong>
                  <span style={{ fontSize: '0.78rem' }}>({att.selectedKey}) {att.selectedDesc}</span>
                </div>
              </>
            ) : (
              <>
                <div style={{ 
                  background: att.isCorrect ? 'rgba(16, 185, 129, 0.05)' : 'rgba(239, 68, 68, 0.05)', 
                  padding: '0.5rem', 
                  borderRadius: '6px', 
                  border: `1px solid ${att.isCorrect ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)'}` 
                }}>
                  <strong style={{ color: att.isCorrect ? '#34d399' : '#f87171', fontSize: '0.75rem', display: 'block', marginBottom: '0.15rem' }}>
                    {att.isCorrect ? '✅ Your Choice (Correct):' : '❌ Your Choice (Incorrect):'}
                  </strong>
                  <span style={{ fontSize: '0.78rem' }}>({att.selectedKey}) {att.selectedDesc}</span>
                </div>
                {!att.isCorrect && (
                  <div style={{ background: 'rgba(16, 185, 129, 0.05)', padding: '0.5rem', borderRadius: '6px', border: '1px solid rgba(16, 185, 129, 0.1)' }}>
                    <strong style={{ color: '#34d399', fontSize: '0.75rem', display: 'block', marginBottom: '0.15rem' }}>✅ Correct Concept Option:</strong>
                    <span style={{ fontSize: '0.78rem' }}>({att.correctKey}) {att.correctDesc}</span>
                  </div>
                )}
              </>
            )}
          </div>

          <div style={{ background: 'rgba(255,255,255,0.01)', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.03)' }}>
            <strong style={{ color: 'var(--primary)', fontSize: '0.78rem', display: 'block', marginBottom: '0.35rem' }}>📖 Conceptual Masterclass:</strong>
            <div className="generated-content" style={{ fontSize: '0.78rem', lineHeight: 1.6 }}>
              <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkMath]}
                rehypePlugins={[rehypeKatex]}
                components={{
                  table: ({ children }) => (<div className="md-table-wrapper"><table className="md-table" style={{ fontSize: '0.72rem' }}>{children}</table></div>),
                  thead: ({ children }) => <thead className="md-thead">{children}</thead>,
                  tbody: ({ children }) => <tbody>{children}</tbody>,
                  tr: ({ children }) => <tr className="md-tr">{children}</tr>,
                  th: ({ children }) => <th className="md-th" style={{ padding: '0.25rem' }}>{children}</th>,
                  td: ({ children }) => <td className="md-td" style={{ padding: '0.25rem' }}>{children}</td>,
                  code: ({ inline, children }) => inline ? <code className="md-inline-code">{children}</code> : <div className="md-code-block"><code>{children}</code></div>,
                }}
              >{att.explanation}</ReactMarkdown>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};



export default function Home() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const firstName = currentUser?.displayName?.split(' ')[0] || 'Student';
  const isGuest = currentUser?.isGuest;

  // ── USER-SPECIFIC LOCAL STORAGE SANDBOX ──
  const userId = currentUser?.uid || currentUser?.email || 'guest';
  const getUserKey = (baseKey) => `${baseKey}_${userId}`;

  // ── 1. DOPAMINE GAMIFICATION STATE (Persisted in localStorage) ──
  const [xp, setXp] = useState(0);
  const [streak, setStreak] = useState(0);
  const [level, setLevel] = useState(1);
  const [consistency, setConsistency] = useState(0);
  const [badges, setBadges] = useState([]);
  const [xpAwardedMsg, setXpAwardedMsg] = useState('');

  // ── 1.5. STUDENT PROFILE STATE ──
  const [profileBoard, setProfileBoard] = useState('');
  const [profileClass, setProfileClass] = useState('');
  const [profileSubjects, setProfileSubjects] = useState([]);
  const [activeChapters, setActiveChapters] = useState({});
  const [profileSetupDone, setProfileSetupDone] = useState(false);
  const [showProfileSetup, setShowProfileSetup] = useState(false);

  // Temp state for profile setup form
  const [setupBoard, setSetupBoard] = useState('CBSE');
  const [setupClass, setSetupClass] = useState('10');
  const [setupSubjects, setSetupSubjects] = useState('');
  const [selectedSubjects, setSelectedSubjects] = useState([]);

  // ── 2. STUDY MISSIONS STATE (starts EMPTY — generated from profile) ──
  const [missions, setMissions] = useState([]);

  // Interactive Daily Mission Modal states
  const [activeMission, setActiveMission] = useState(null);
  const [missionAnswer, setMissionAnswer] = useState(null);
  const [missionSubmitted, setMissionSubmitted] = useState(false);
  const [quizStep, setQuizStep] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [showShortAnswer, setShowShortAnswer] = useState(false);

  // ── DYNAMIC AI STUDY MISSIONS STATE ──
  const [dynamicMissionContent, setDynamicMissionContent] = useState(null);
  const [missionLoading, setMissionLoading] = useState(false);
  const [missionError, setMissionError] = useState('');
  const [mcqAttempts, setMcqAttempts] = useState([]);
  const [netScore, setNetScore] = useState(0);

  // ── 3. WEAKNESSES STATE (starts EMPTY — student adds their own) ──
  const [weaknesses, setWeaknesses] = useState([]);
  const [newWeakSubject, setNewWeakSubject] = useState('');
  const [newWeakChapter, setNewWeakChapter] = useState('');
  const [showAddWeakness, setShowAddWeakness] = useState(false);

  // ── 4. ONE-CLICK OUTPUT PANEL STATE ──
  const [activeOneClickTool, setActiveOneClickTool] = useState(null);
  const [oneClickTopic, setOneClickTopic] = useState('');
  const [oneClickGrade, setOneClickGrade] = useState('10');
  const [oneClickLoading, setOneClickLoading] = useState(false);
  const [oneClickStatus, setOneClickStatus] = useState('');
  const [oneClickResult, setOneClickResult] = useState('');
  const [oneClickCopied, setOneClickCopied] = useState(false);

  // ── 5. EXAM MODE ROADMAP STATE ──
  const [examBoard, setExamBoard] = useState('CBSE (Central Board)');
  const [examGrade, setExamGrade] = useState('Class 10');
  const [examSubject, setExamSubject] = useState('Science');
  const [examDays, setExamDays] = useState('15');
  const [examLoading, setExamLoading] = useState(false);
  const [examStatus, setExamStatus] = useState('');
  const [examResult, setExamResult] = useState('');
  const [roadmapCopied, setRoadmapCopied] = useState(false);

  // ── MISSION GENERATOR (generates from student's actual subjects) ──
  const generateMissionsFromProfile = (board, grade, subjects, activeChaptersMap = {}) => {
    if (!subjects || subjects.length === 0) return [];

    const getChapterForSubject = (subj) => {
      if (activeChaptersMap && activeChaptersMap[subj]) {
        return activeChaptersMap[subj];
      }
      const chaptersList = CLASS_SYLLABUS[grade]?.[subj] || CLASS_SYLLABUS[grade.toString()]?.[subj];
      if (chaptersList && chaptersList.length > 0) {
        return chaptersList[0];
      }
      return "General Syllabus";
    };

    // Rotate subjects each day using today's date so missions change daily
    const today = new Date().getDate();
    const shuffled = [...subjects].sort(
      (a, b) => ((a.charCodeAt(0) + today) % 7) - ((b.charCodeAt(0) + today) % 7)
    );
    const picked = shuffled.slice(0, Math.min(3, subjects.length));

    const dateKey = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    const generated = picked.map((subj, idx) => {
      const activeCh = getChapterForSubject(subj);
      const chClean = activeCh.replace(/^Chapter \d+:\s*/, '');
      const mission = {
        id: `m_${idx + 1}`,
        type: 'teaching_mcq',
        label: `Learn ${subj}: ${chClean} (Topic Masterclass)`,
        xp: 30,
        done: false,
        dateKey,
        subject: subj,
        chapter: activeCh
      };
      return mission;
    });

    // Daily check-in is always auto-done
    generated.push({
      id: 'm_checkin',
      type: 'login',
      label: 'Daily consistency check-in',
      xp: 15,
      done: true,
      dateKey,
    });

    return generated;
  };

  // ── SAVE PROFILE ──
  const handleSaveProfile = (e) => {
    e.preventDefault();
    
    // Combine clicked quick subjects and custom entered subjects
    const quickSubjectsList = [...selectedSubjects];
    const customList = setupSubjects.split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !quickSubjectsList.some(q => q.toLowerCase() === s.toLowerCase()));
    
    const subjectsArray = [...quickSubjectsList, ...customList];
    
    if (subjectsArray.length === 0) {
      alert("Please select or enter at least one subject to customize your missions.");
      return;
    }

    setProfileBoard(setupBoard);
    setProfileClass(setupClass);
    setProfileSubjects(subjectsArray);
    setProfileSetupDone(true);
    setShowProfileSetup(false);

    // Initialize active chapters to Chapter 1 for all subjects
    const initialActiveChapters = {};
    subjectsArray.forEach(subj => {
      const chaptersList = CLASS_SYLLABUS[setupClass]?.[subj] || CLASS_SYLLABUS[setupClass.toString()]?.[subj] || [];
      initialActiveChapters[subj] = chaptersList.length > 0 ? chaptersList[0] : '';
    });
    setActiveChapters(initialActiveChapters);
    localStorage.setItem(getUserKey('tanios_active_chapters'), JSON.stringify(initialActiveChapters));

    // Persist profile
    const profile = { board: setupBoard, grade: setupClass, subjects: subjectsArray };
    localStorage.setItem(getUserKey('tanios_profile'), JSON.stringify(profile));

    // Generate missions
    const newMissions = generateMissionsFromProfile(setupBoard, setupClass, subjectsArray, initialActiveChapters);
    setMissions(newMissions);
    saveState('tanios_missions', newMissions);

    // Also update exam mode defaults
    setExamBoard(setupBoard === 'CBSE' ? 'CBSE (Central Board)' : setupBoard === 'RBSE' ? 'RBSE (Rajasthan Board)' : setupBoard);
    setExamGrade(`Class ${setupClass}`);
    setOneClickGrade(setupClass);

    awardXp(10, 'Profile Setup Complete');
  };

  // Sync to local storage
  const saveState = (key, value) => {
    try {
      localStorage.setItem(getUserKey(key), typeof value === 'object' ? JSON.stringify(value) : value.toString());
    } catch (e) {
      console.warn(e);
    }
  };

  // ── LOAD STATE ON MOUNT & ON USER CHANGE ──
  // Runs whenever the logged-in user changes (login / logout / switch account).
  // After logout, AuthContext wipes all tanios_* keys, so this re-run finds
  // nothing in storage and resets everything to a clean blank slate.
  useEffect(() => {
    const userId = currentUser?.uid || currentUser?.email || null;

    try {
      const storedXp          = localStorage.getItem(getUserKey('tanios_xp'));
      const storedStreak      = localStorage.getItem(getUserKey('tanios_streak'));
      const storedConsistency = localStorage.getItem(getUserKey('tanios_consistency'));
      const storedBadges      = localStorage.getItem(getUserKey('tanios_badges'));
      const storedWeaknesses  = localStorage.getItem(getUserKey('tanios_weaknesses'));
      const storedMissions    = localStorage.getItem(getUserKey('tanios_missions'));
      const storedProfile     = localStorage.getItem(getUserKey('tanios_profile'));
      const storedAttempts    = localStorage.getItem(getUserKey('tanios_mcq_attempts'));
      const storedNetScore    = localStorage.getItem(getUserKey('tanios_net_score'));

      // ── Numeric counters ── default to 0 for fresh sessions
      setXp(storedXp ? parseInt(storedXp, 10) : 0);
      setStreak(storedStreak ? parseInt(storedStreak, 10) : 0);
      setConsistency(storedConsistency ? parseInt(storedConsistency, 10) : 0);
      setMcqAttempts(storedAttempts ? JSON.parse(storedAttempts) : []);
      setNetScore(storedNetScore ? parseInt(storedNetScore, 10) : 0);

      // ── Badges ── empty for fresh sessions
      setBadges(storedBadges ? JSON.parse(storedBadges) : []);

      // ── Weaknesses ──
      setWeaknesses(storedWeaknesses ? JSON.parse(storedWeaknesses) : []);

      // ── Profile & Missions ──
      if (storedProfile) {
        const profile = JSON.parse(storedProfile);
        setProfileBoard(profile.board);
        setProfileClass(profile.grade);
        setProfileSubjects(profile.subjects);
        setProfileSetupDone(true);
        setSetupBoard(profile.board);
        setSetupClass(profile.grade);

        // Restore subject chip selections for the edit form
        const standardList = [
          'Physics', 'Chemistry', 'Mathematics', 'Biology',
          'Social Science', 'English', 'Hindi', 'Computer Science',
          'Economics', 'Accountancy', 'Business Studies', 'Informatics Practices',
        ];
        setSelectedSubjects(
          profile.subjects.filter(s =>
            standardList.some(std => std.toLowerCase() === s.trim().toLowerCase())
          )
        );
        setSetupSubjects(
          profile.subjects
            .filter(s => !standardList.some(std => std.toLowerCase() === s.trim().toLowerCase()))
            .join(', ')
        );

        // ── DAILY MISSION RESET LOGIC ──
        const todayKey = new Date().toISOString().slice(0, 10);
        let missionsToUse;
        const storedActiveChapters = localStorage.getItem(getUserKey('tanios_active_chapters'));
        const activeChaptersMap = storedActiveChapters ? JSON.parse(storedActiveChapters) : {};

        // Auto-initialize missing or invalid subjects with Chapter 1 by default
        let chaptersMapChanged = false;
        profile.subjects.forEach(subj => {
          const chaptersList = CLASS_SYLLABUS[profile.grade]?.[subj] || CLASS_SYLLABUS[profile.grade.toString()]?.[subj] || [];
          const currentCh = activeChaptersMap[subj];
          
          if (!currentCh || !chaptersList.includes(currentCh)) {
            activeChaptersMap[subj] = chaptersList.length > 0 ? chaptersList[0] : '';
            chaptersMapChanged = true;
          }
        });
        if (chaptersMapChanged) {
          localStorage.setItem(getUserKey('tanios_active_chapters'), JSON.stringify(activeChaptersMap));
        }
        setActiveChapters(activeChaptersMap);

        if (storedMissions) {
          const parsed = JSON.parse(storedMissions);
          const missionDate = parsed[0]?.dateKey;
          if (missionDate === todayKey) {
            // Same day — restore done/not-done state as-is
            missionsToUse = parsed;
          } else {
            // New day — fresh missions, streak/XP are preserved separately
            missionsToUse = generateMissionsFromProfile(profile.board, profile.grade, profile.subjects, activeChaptersMap);
            localStorage.setItem(getUserKey('tanios_missions'), JSON.stringify(missionsToUse));
          }
        } else {
          // No stored missions yet (fresh profile or wiped) — generate now
          missionsToUse = generateMissionsFromProfile(profile.board, profile.grade, profile.subjects, activeChaptersMap);
          localStorage.setItem(getUserKey('tanios_missions'), JSON.stringify(missionsToUse));
        }

        setMissions(missionsToUse);

        // Sync exam / one-click grade with profile
        setExamBoard(
          profile.board === 'CBSE' ? 'CBSE (Central Board)'
          : profile.board === 'RBSE' ? 'RBSE (Rajasthan Board)'
          : profile.board
        );
        setExamGrade(`Class ${profile.grade}`);
        setOneClickGrade(profile.grade);
      } else {
        // No profile found → new user or just logged out → show setup form
        setProfileSetupDone(false);
        setProfileBoard('');
        setProfileClass('');
        setProfileSubjects([]);
        setSelectedSubjects([]);
        setSetupSubjects('');
        setMissions([]);
        setMcqAttempts([]);
        setNetScore(0);
      }

    } catch (e) {
      console.warn('Could not load local storage states:', e);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.uid, currentUser?.email]);


  // Update level whenever XP changes
  useEffect(() => {
    // Level calculation: Level 1 (0-199 XP), Level 2 (200-499 XP), Level 3 (500+ XP)
    let newLevel = 1;
    if (xp >= 500) newLevel = 3;
    else if (xp >= 200) newLevel = 2;
    setLevel(newLevel);

    // Auto-award badges based on milestones
    let updatedBadges = [...badges];
    if (xp >= 300 && !updatedBadges.includes('board_topper')) {
      updatedBadges.push('board_topper');
      triggerBadgeAward('board_topper', updatedBadges);
    }
    if (streak >= 5 && !updatedBadges.includes('consistency_king')) {
      updatedBadges.push('consistency_king');
      triggerBadgeAward('consistency_king', updatedBadges);
    }
  }, [xp, streak]);

  // Listen to doubt solved event from Chat page to dynamically update XP!
  useEffect(() => {
    const handleXpUpdate = () => {
      const currentXP = parseInt(localStorage.getItem('tanios_xp') || '0', 10);
      setXp(currentXP);
    };
    window.addEventListener('tanios_xp_update', handleXpUpdate);
    return () => window.removeEventListener('tanios_xp_update', handleXpUpdate);
  }, []);



  // Award XP function with animation trigger
  const awardXp = (amount, reason) => {
    const newXp = xp + amount;
    setXp(newXp);
    saveState('tanios_xp', newXp);

    setXpAwardedMsg(`+${amount} XP Earned! (${reason}) ✨`);
    setTimeout(() => setXpAwardedMsg(''), 4000);
  };

  const triggerBadgeAward = (badgeId, nextBadges) => {
    setBadges(nextBadges);
    saveState('tanios_badges', nextBadges);
    const badgeNames = {
      board_topper: 'Board Topper 🥇',
      consistency_king: 'Consistency King 👑'
    };
    setXpAwardedMsg(`🏆 UNLOCKED BADGE: ${badgeNames[badgeId] || badgeId}!`);
    setTimeout(() => setXpAwardedMsg(''), 5000);
  };

  // Complete mission — marks done, awards XP, handles streak
  const toggleMission = (id) => {
    // Find the mission being completed
    const target = missions.find(m => m.id === id);
    if (!target || target.done) return; // already done or not found

    // Count non-login missions that are NOT yet done (before this click)
    const pendingNonLogin = missions.filter(m => m.type !== 'login' && !m.done);
    const isLastMission = pendingNonLogin.length === 1 && pendingNonLogin[0].id === id;

    const updated = missions.map(m =>
      m.id === id ? { ...m, done: true } : m
    );
    setMissions(updated);
    saveState('tanios_missions', updated);

    // Award XP for this mission
    awardXp(target.xp, 'Completed Target Task');

    // ── Update systematic syllabus chapter progress ──
    if (target.subject && target.chapter) {
      const subject = target.subject;
      const currentChapter = target.chapter;
      const grade = profileClass || '10';
      const board = profileBoard || 'CBSE';

      // 1. Load progress map from localStorage
      const storedProgress = localStorage.getItem(getUserKey('tanios_chapter_progress'));
      const progressMap = storedProgress ? JSON.parse(storedProgress) : {};
      
      if (!progressMap[subject]) {
        progressMap[subject] = {};
      }
      
      // 2. Increment progress count
      const currentCount = progressMap[subject][currentChapter] || 0;
      const nextCount = currentCount + 1;
      progressMap[subject][currentChapter] = nextCount;
      localStorage.setItem(getUserKey('tanios_chapter_progress'), JSON.stringify(progressMap));

      // 3. Calculate exam target pacing
      const now = new Date();
      const EXAM_DATES = {
        CBSE: { '10': { month: 1, day: 15 }, '12': { month: 1, day: 15 }, '8': { month: 2, day: 1 }, '9': { month: 2, day: 1 }, '11': { month: 2, day: 1 } },
        RBSE: { '10': { month: 2, day: 5 }, '12': { month: 2, day: 5 }, '8': { month: 2, day: 10 }, '9': { month: 2, day: 10 }, '11': { month: 2, day: 10 } }
      };
      const classNum = grade.toString().replace(/\D/g, '') || '10';
      const examInfo = EXAM_DATES[board]?.[classNum] || EXAM_DATES['CBSE']['10'];

      let examYear = now.getFullYear();
      const examDate = new Date(examYear, examInfo.month, examInfo.day);
      if (examDate <= now) {
        examYear += 1;
        examDate.setFullYear(examYear);
      }
      const diffMs = examDate - now;
      const diffDays = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

      const chaptersList = CLASS_SYLLABUS[grade]?.[subject] || CLASS_SYLLABUS[grade.toString()]?.[subject] || [];
      const totalChapters = chaptersList.length || 1;
      const chapterIdx = chaptersList.indexOf(currentChapter);
      
      const chaptersRemaining = Math.max(1, totalChapters - (chapterIdx !== -1 ? chapterIdx + 1 : 1) + 1);
      const daysPerChapter = Math.max(1, Math.round(diffDays / chaptersRemaining));

      // If they completed all days allocated for this chapter, advance to next chapter automatically!
      if (nextCount >= daysPerChapter) {
        const nextChapterIdx = chapterIdx + 1;
        if (nextChapterIdx < chaptersList.length) {
          const nextChapter = chaptersList[nextChapterIdx];
          
          // Update activeChapters state and localStorage
          const updatedActiveChapters = { ...activeChapters, [subject]: nextChapter };
          setActiveChapters(updatedActiveChapters);
          localStorage.setItem(getUserKey('tanios_active_chapters'), JSON.stringify(updatedActiveChapters));

          // Set up a celebration message
          setTimeout(() => {
            alert(`🎉 Chapter Completed! You've successfully finished all topics for "${currentChapter}" on time! TaniOS has advanced you to the next chapter: "${nextChapter}" to keep you perfectly on track for your exams!`);
          }, 1000);
        } else {
          // Finished the entire syllabus for this subject!
          setTimeout(() => {
            alert(`🏆 CONGRATULATIONS! You have completed the entire syllabus for "${subject}"! TaniOS will now put you in Full Revision Mode for this subject.`);
          }, 1000);
        }
      }
    }

    // Update consistency score
    const newCons = Math.min(100, consistency + 2);
    setConsistency(newCons);
    saveState('tanios_consistency', newCons);

    // ── STREAK LOGIC: increment streak only when ALL non-login missions are done ──
    if (isLastMission) {
      const todayKey = new Date().toISOString().slice(0, 10);
      const lastStreakDay = localStorage.getItem(getUserKey('tanios_streak_day')) || '';

      if (lastStreakDay !== todayKey) {
        // First time completing all missions today → increment streak
        const newStreak = streak + 1;
        setStreak(newStreak);
        saveState('tanios_streak', newStreak);
        localStorage.setItem(getUserKey('tanios_streak_day'), todayKey);
        // Extra XP bonus for completing all daily missions
        setTimeout(() => awardXp(10, '🔥 All Daily Missions Complete!'), 600);
      }
    }
  };

  const fetchDynamicMission = async (mission) => {
    setMissionLoading(true);
    setMissionError('');
    setDynamicMissionContent(null);

    const subject = mission.subject || 'General Science';
    const grade = profileClass || '10';
    const board = profileBoard || 'CBSE';

    // ── Calculate days remaining dynamically ──
    const now = new Date();
    const EXAM_DATES = {
      CBSE: {
        '10': { month: 1, day: 15 },
        '12': { month: 1, day: 15 },
        '8':  { month: 2, day: 1 },
        '9':  { month: 2, day: 1 },
        '11': { month: 2, day: 1 },
      },
      RBSE: {
        '10': { month: 2, day: 5 },
        '12': { month: 2, day: 5 },
        '8':  { month: 2, day: 10 },
        '9':  { month: 2, day: 10 },
        '11': { month: 2, day: 10 },
      },
    };
    const classNum = grade.toString().replace(/\D/g, '') || '10';
    const examInfo = EXAM_DATES[board]?.[classNum] || EXAM_DATES['CBSE']['10'];

    let examYear = now.getFullYear();
    const examDate = new Date(examYear, examInfo.month, examInfo.day);
    if (examDate <= now) {
      examYear += 1;
      examDate.setFullYear(examYear);
    }
    const diffMs = examDate - now;
    const diffDays = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

    // ── Calculate chapter indexing & dynamic pacing for complete syllabus coverage ──
    const chaptersList = CLASS_SYLLABUS[grade]?.[subject] || CLASS_SYLLABUS[grade.toString()]?.[subject] || [];
    const totalChapters = chaptersList.length || 1;
    const currentChapter = mission.chapter || 'General Syllabus';
    const chapterIdx = chaptersList.indexOf(currentChapter);
    const resolvedChapterIdx = chapterIdx !== -1 ? chapterIdx + 1 : 1;
    
    // Chapters remaining including the current one
    const chaptersRemaining = Math.max(1, totalChapters - resolvedChapterIdx + 1);
    // Calculated days allocated per remaining chapter to finish on time
    const daysPerChapter = Math.max(1, Math.round(diffDays / chaptersRemaining));

    // Retrieve progress
    const storedProgress = localStorage.getItem(getUserKey('tanios_chapter_progress'));
    const progressMap = storedProgress ? JSON.parse(storedProgress) : {};
    const completedTopicsInChapter = progressMap[subject]?.[currentChapter] || 0;
    const currentTopicDay = completedTopicsInChapter + 1;

    let prompt = `You are an elite syllabus-expert personal AI teacher built for Class ${grade} ${board} board students.

SYSTEMATIC TOPIC-TEACHING MCQ LAW:
Your goal is to fully teach a student a specific core topic of the subject ${subject}, chapter: "${currentChapter}" using EXACTLY ONE highly educational Multiple Choice Question (MCQ).

SYLLABUS PACING SUMMARY:
* Subject: ${subject}
* Total Chapters in Syllabus: ${totalChapters}
* Current Chapter: "${currentChapter}" (Chapter ${resolvedChapterIdx} of ${totalChapters})
* Days Remaining until Exams: ${diffDays} Days
* Target Completion Pace: Exactly ${daysPerChapter} days allocated to complete each remaining chapter to guarantee 100% syllabus completion on time.
* Chapter Study Day Progress: Today is Day ${currentTopicDay} out of ${daysPerChapter} allocated days for "${currentChapter}".

Systematic Pacing Directive:
Please teach the student exactly the chronological sub-topic that corresponds to the fractional progress of Day ${currentTopicDay} of ${daysPerChapter} through "${currentChapter}".
- If today is Day 1, teach the absolute foundational concept or introductory definitions of "${currentChapter}". E.g., for Chemistry Ch 1, 'Introduction to chemical reactions and writing equations'; for Math Ch 1, 'Introduction to Real/Rational Numbers'.
- If today is in the middle (e.g. Day ${Math.max(1, Math.round(daysPerChapter / 2))} of ${daysPerChapter}), teach a core intermediate concept. E.g. for Chemistry Ch 1, 'Types of Chemical Reactions - Combination & Decomposition'; for Math Ch 1, 'Fundamental Theorem of Arithmetic'.
- If today is near the end (e.g. Day ${daysPerChapter} of ${daysPerChapter}), teach the final/advanced concept or practical application/critical exam-repeated question of this chapter.
This ensures the student systematically covers all topics and finishes the chapter exactly on time!

Your output must be a single master Multiple Choice Question (MCQ) that:
1. Question: Renders a highly detailed, clear, concept-introducing scenario or problem. Wrap any math formulas, variables, or chemical equations in LaTeX $ delimiters (e.g. $A + B \\rightarrow AB$).
2. Options: The options (A, B, C, D) should represent distinct sub-topics or conceptual states, clearly teaching the key distinctions.
3. Explanation: Provide an absolute MASTERCLASS topper explanation. This explanation must be a beautiful, comprehensive, Markdown-styled mini-lesson that fully teaches the entire topic, including:
   - "💡 Core Concepts & Definitions" (detailed bullets, with formulas in KaTeX $)
   - "🥇 Topper Tricks & Sign Conventions"
   - "⚠️ Common Mistakes to Avoid in Exams"
   - Why the selected correct option is correct and why other options are incorrect.

Your output MUST be a valid JSON object with the following keys. Do not include any conversational text or markdown code blocks (no \`\`\`json). Output raw JSON only.

JSON Structure:
{
  "topic": "Specific Topic Name (e.g. Balancing Chemical Equations Masterclass)",
  "questionText": "Highly detailed, conceptual, and concept-introducing question text. Wrap all math/equations in $ delimiters.",
  "options": [
    { "key": "A", "desc": "Option A explanation. Wrap any math/formulas in $." },
    { "key": "B", "desc": "Option B explanation." },
    { "key": "C", "desc": "Option C explanation." },
    { "key": "D", "desc": "Option D explanation." }
  ],
  "correctKey": "A, B, C, or D",
  "explanation": "Markdown-styled comprehensive mini-lesson masterclass teaching the entire topic. Use markdown headers (###), bold, list bullets, and KaTeX $ for all math/scientific expressions to make it gorgeous and extremely premium."
}`;

    try {
      const response = await generateAIContent(prompt);
      if (response.error || !response.text) {
        throw new Error(response.message || 'AI generation failed');
      }

      // Securely extract and parse the JSON block
      let cleanText = response.text.trim();
      // Remove any markdown code block wrap: ```json ... ``` or ``` ... ```
      cleanText = cleanText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
      
      const parsed = JSON.parse(cleanText);
      setDynamicMissionContent(parsed);
    } catch (e) {
      console.warn("⚠️ Dynamic mission generation failed, using fallback:", e.message);
      setMissionError(e.message);
      // Fallback is handled automatically in the UI rendering by checking if dynamicMissionContent is null
    } finally {
      setMissionLoading(false);
    }
  };

  const startStudyMission = (mission) => {
    setMissionAnswer(null);
    setMissionSubmitted(false);
    setShowShortAnswer(false);
    setQuizStep(0);
    setQuizAnswers({});
    setActiveMission(mission);
    
    // Asynchronously fetch dynamic AI content for this mission
    fetchDynamicMission(mission);

    logActivity(
      currentUser?.uid || 'guest',
      currentUser?.displayName || currentUser?.email || 'Student',
      'study_session',
      `Started study mission: ${mission.label}`
    ).catch(err => console.error("Activity logging failed", err));
  };

  // Add a custom weakness
  const addWeakness = (e) => {
    e.preventDefault();
    if (!newWeakSubject || !newWeakChapter) return;
    const newW = {
      id: `w_${Date.now()}`,
      subject: newWeakSubject,
      chapter: newWeakChapter,
      score: 35 // starts weak
    };
    const updated = [...weaknesses, newW];
    setWeaknesses(updated);
    saveState('tanios_weaknesses', updated);
    setNewWeakSubject('');
    setNewWeakChapter('');
    setShowAddWeakness(false);
    awardXp(10, 'Tracked a Learning Gap');
  };

  // Delete a weakness (healed or mistake)
  const removeWeakness = (id) => {
    const updated = weaknesses.filter(w => w.id !== id);
    setWeaknesses(updated);
    saveState('tanios_weaknesses', updated);
  };

  // Trigger healing by generating a simple explanation right on the page
  const healWeakness = async (w) => {
    setActiveOneClickTool('Explain Easy');
    setOneClickTopic(`${w.subject}: ${w.chapter}`);
    setOneClickGrade('10');
    setOneClickResult('');
    // Automatically trigger generation for extreme speed!
    setTimeout(() => {
      const genBtn = document.getElementById('quick-gen-btn');
      genBtn?.click();
    }, 100);
  };

  // ── TRIGGER ONE-CLICK GENERATION ──
  const handleOneClickGenerate = async (e) => {
    e.preventDefault();
    if (!oneClickTopic.trim()) return;

    setOneClickLoading(true);
    setOneClickResult('');
    setOneClickStatus('thinking');

    const prompt = generateOneClickPrompt(activeOneClickTool, oneClickTopic, oneClickGrade);
    const response = await generateAIContent(prompt, (status) => setOneClickStatus(status || ''));

    setOneClickLoading(false);
    setOneClickStatus('');

    if (response.error || !response.text) {
      setOneClickResult(`⚠️ Generation failed: ${response.message || 'Please try again.'}`);
    } else {
      setOneClickResult(fixMathFormatting(response.text));
      // Award XP
      awardXp(15, `Generated AI ${activeOneClickTool}`);
    }
  };

  const handleCopyOneClick = () => {
    navigator.clipboard.writeText(oneClickResult);
    setOneClickCopied(true);
    setTimeout(() => setOneClickCopied(false), 2000);
  };

  // ── TRIGGER EXAM ROADMAP GENERATION ──
  const handleGenerateRoadmap = async (e) => {
    e.preventDefault();
    setExamLoading(true);
    setExamResult('');
    setExamStatus('thinking');

    const prompt = generateExamRoadmapPrompt(examBoard, examGrade, examSubject, examDays);
    const response = await generateAIContent(prompt, (status) => setExamStatus(status || ''));

    setExamLoading(false);
    setExamStatus('');

    if (response.error || !response.text) {
      setExamResult(`⚠️ Roadmap creation failed: ${response.message || 'Please check your connection.'}`);
    } else {
      const formattedText = fixMathFormatting(response.text);
      setExamResult(formattedText);
      awardXp(30, 'Unlocked Board Revision Roadmap');
      if (currentUser) {
        saveDocument(
          currentUser.uid || currentUser.email,
          'revision',
          `Board Roadmap: ${examSubject} (${examBoard} Class ${examGrade.replace('Class ', '')})`,
          formattedText
        ).catch(err => console.warn('Save roadmap failed (non-blocking):', err));
      }
    }
  };

  const handleCopyRoadmap = () => {
    navigator.clipboard.writeText(examResult);
    setRoadmapCopied(true);
    setTimeout(() => setRoadmapCopied(false), 2000);
  };

  // Level thresholds and titles
  const levelData = {
    1: { name: 'Aspirant 🌟', next: 200, icon: '⚡' },
    2: { name: 'Scholar 📚', next: 500, icon: '🎓' },
    3: { name: 'Board Topper 👑', next: 1000, icon: '🏆' }
  };

  const currentLevelInfo = levelData[level] || levelData[1];
  const progressPercent = Math.min(100, (xp / currentLevelInfo.next) * 100);

  // Badge list descriptions
  const badgeMeta = {
    doubt_destroyer: { label: 'Doubt Destroyer ⚔️', desc: 'Solved your first AI doubt!' },
    board_topper: { label: 'Board Scholar 🥇', desc: 'Reached 300+ Study XP!' },
    consistency_king: { label: 'Streak Warrior 🔥', desc: 'Maintained a 5+ day streak!' }
  };

  // Quick Action configuration
  const quickActions = [
    { label: 'Explain Easy', desc: 'Simplifies complex definitions with analogies.', icon: '💡', color: '#3b82f6' },
    { label: 'Generate Notes', desc: 'Produces a board-focused comprehensive summary.', icon: '📑', color: '#10b981' },
    { label: 'Board Questions', desc: 'Fetches repeated past CBSE/RBSE questions.', icon: '🎓', color: '#f59e0b' },
    { label: 'Important Questions', desc: 'Extracts critical scoring questions.', icon: '❓', color: '#8b5cf6' },
    { label: 'Revision Sheet', desc: 'High-density summary with tables and equations.', icon: '📝', color: '#f43f5e' },
    { label: 'Mind Map', desc: 'Displays visual hierarchical text diagram.', icon: '🧠', color: '#06b6d4' },
    { label: '5-Minute Study', desc: 'Super fast bullet points and mnemonics.', icon: '⏱️', color: '#ec4899' },
  ];

  return (
    <div className="page-content">
      {/* Scope specific styling for premium look & interactions */}
      <style>{`
        .home-grid {
          display: grid;
          grid-template-columns: 1.8fr 1.2fr;
          gap: 1.5rem;
          margin-top: 1.5rem;
        }
        @media (max-width: 1024px) {
          .home-grid {
            grid-template-columns: 1fr;
          }
        }
        .gamified-header-card {
          background: linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(245, 158, 11, 0.1));
          border: 1px solid rgba(99, 102, 241, 0.2);
          border-radius: var(--radius);
          padding: 2rem;
          position: relative;
          overflow: hidden;
          margin-bottom: 1.5rem;
        }
        .gamified-header-title {
          font-size: 1.8rem;
          font-weight: 800;
          color: var(--text);
          margin-bottom: 0.5rem;
          line-height: 1.2;
        }
        .gamified-header-subtitle {
          color: var(--text-secondary);
          font-size: 0.95rem;
          max-width: 700px;
          margin-bottom: 1.25rem;
        }
        .xp-alert {
          position: fixed;
          top: 80px;
          right: 20px;
          z-index: 9999;
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
          padding: 0.75rem 1.25rem;
          border-radius: var(--radius-sm);
          font-weight: 700;
          font-size: 0.9rem;
          box-shadow: 0 10px 25px rgba(16, 185, 129, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.1);
          animation: slideInRight 0.3s cubic-bezier(.4,0,.2,1) both;
        }
        .pulse-streak {
          animation: float 3s ease-in-out infinite;
        }
        .badge-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
          gap: 0.75rem;
          margin-top: 1rem;
        }
        .badge-item {
          background: var(--bg-tertiary);
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          padding: 0.5rem;
          text-align: center;
          font-size: 0.75rem;
          font-weight: 600;
          opacity: 0.9;
          transition: all 0.2s;
        }
        .badge-item:hover {
          transform: scale(1.05);
          border-color: var(--primary);
        }
        .badge-item.locked {
          opacity: 0.4;
          filter: grayscale(1);
        }
        .mission-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.85rem 1rem;
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          margin-bottom: 0.75rem;
          transition: all 0.2s;
        }
        .mission-item:hover {
          border-color: var(--primary);
        }
        .mission-item.completed {
          background: rgba(16, 185, 129, 0.04);
          border-color: rgba(16, 185, 129, 0.2);
          opacity: 0.85;
        }
        .quick-action-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
          gap: 0.75rem;
          margin-bottom: 1.5rem;
        }
        .quick-action-btn {
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          padding: 1rem 0.5rem;
          border-radius: var(--radius-sm);
          text-align: center;
          cursor: pointer;
          transition: all 0.2s;
        }
        .quick-action-btn:hover {
          transform: translateY(-3px);
          border-color: var(--primary);
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.15);
        }
        .exam-banner {
          background: linear-gradient(135deg, rgba(245, 158, 11, 0.12), rgba(239, 68, 68, 0.08));
          border: 1px solid rgba(245, 158, 11, 0.25);
          border-radius: var(--radius);
          padding: 1.5rem;
          margin-bottom: 1.5rem;
        }
        .weakness-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.75rem 1rem;
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          margin-bottom: 0.5rem;
        }
        .weakness-badge {
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 700;
        }

        /* 📱 MOBILE RESPONSIVENESS & SCROLLABILITY PATCH ── */
        @media (max-width: 768px) {
          .gamified-header-card {
            padding: 1.25rem 1rem !important;
            overflow: hidden !important;
          }
          .gamified-header-title {
            font-size: 1.35rem !important;
          }
          .gamified-header-subtitle {
            font-size: 0.85rem !important;
            max-width: 100% !important;
          }
          .countdown-box {
            min-width: 0 !important;
            width: 100% !important;
            flex-shrink: 1 !important;
          }
          .profile-setup-grid {
            grid-template-columns: 1fr !important;
          }
          .exam-form-grid {
            grid-template-columns: 1fr 1fr !important;
          }
          .oneclick-form-row {
            flex-direction: column !important;
          }
          .oneclick-form-row > div {
            width: 100% !important;
            min-width: 0 !important;
          }
          .mission-header-row {
            flex-wrap: wrap !important;
            gap: 0.5rem !important;
          }
          /* Home grid collapses to 1 column */
          .home-grid {
            grid-template-columns: 1fr !important;
            gap: 1rem !important;
          }
          /* Countdown box full width on mobile */
          .home-grid > div:first-child > div,
          [style*="minWidth: '180px'"],
          [style*="min-width: 180px"] {
            min-width: 0 !important;
            width: 100% !important;
          }
          .mission-item {
            flex-direction: row;
            flex-wrap: wrap;
            align-items: flex-start !important;
            gap: 0.5rem !important;
            padding: 0.75rem !important;
          }
          .mission-item > button {
            align-self: flex-start;
            flex-shrink: 0;
          }
          .mission-item > div:nth-child(2) {
            flex: 1;
            min-width: 0;
          }
          .mission-item > div:last-child {
            flex-shrink: 0;
          }
          /* Quick action grid tighter */
          .quick-action-grid {
            grid-template-columns: repeat(auto-fill, minmax(90px, 1fr)) !important;
            gap: 0.5rem !important;
          }
          /* One-click form: stack on mobile */
          .quick-action-grid + div form > div:first-child {
            flex-direction: column !important;
          }
          /* Cards must not overflow */
          .card {
            overflow: hidden !important;
            max-width: 100% !important;
            box-sizing: border-box !important;
            width: 100% !important;
          }
          /* Exam form: single column */
          form[style*="grid-template-columns"] {
            grid-template-columns: 1fr !important;
          }
          /* Limit all flex containers */
          .home-grid section,
          .home-grid > div {
            max-width: 100% !important;
            min-width: 0 !important;
            overflow: hidden !important;
          }
          /* Profile setup grid: 1 col */
          div[style*="grid-template-columns: '1fr 1fr'"],
          div[style*="gridTemplateColumns: '1fr 1fr'"] {
            grid-template-columns: 1fr !important;
          }
          /* Flex rows that contain minWidth items */
          div[style*="justify-content: space-between"] {
            flex-wrap: wrap !important;
            gap: 0.5rem !important;
          }
          /* Countdown box */
          div[style*="minWidth: '180px'"] {
            min-width: 0 !important;
            width: 100% !important;
            box-sizing: border-box !important;
          }
        }

        @media (max-width: 480px) {
          .quick-action-grid {
            grid-template-columns: repeat(3, 1fr) !important;
            gap: 0.4rem !important;
          }
          .quick-action-btn {
            padding: 0.65rem 0.2rem !important;
          }
          .quick-action-btn div:first-child {
            font-size: 1.2rem !important;
            margin-bottom: 0.15rem !important;
          }
          .quick-action-btn div:last-child {
            font-size: 0.65rem !important;
          }
          .weakness-row {
            flex-direction: column;
            align-items: flex-start !important;
            gap: 0.6rem !important;
          }
          .weakness-row > div:last-child {
            width: 100%;
            display: flex;
            justify-content: flex-start;
            align-items: center;
            gap: 0.5rem;
          }
          .gamified-header-card .btn {
            flex: 1 1 auto !important;
            text-align: center !important;
            justify-content: center !important;
          }
          .gamified-header-title {
            font-size: 1.2rem !important;
          }
          /* Force profile grid to 1 col */
          div[style*="gridTemplateColumns"] {
            grid-template-columns: 1fr !important;
          }
        }

        /* ── INTERACTIVE DAILY TARGET MODAL FULLSCREEN & RESPONSIVE STYLES ── */
        .daily-mission-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(10, 10, 12, 0.98);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
          padding: 0;
          opacity: 1;
          transform: none;
          animation: fadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) both;
          overflow-y: auto;
        }
        .daily-mission-card {
          width: 100%;
          height: 100%;
          max-width: 100%;
          max-height: 100%;
          border-radius: 0;
          background: #0c0c0e;
          border: none;
          box-shadow: none;
          padding: 2rem 1.25rem;
          position: relative;
          display: flex;
          flex-direction: column;
          overflow-y: auto;
          animation: scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) both;
          box-sizing: border-box;
        }
        @media (min-width: 769px) {
          .daily-mission-overlay {
            padding: 2rem;
            background: rgba(10, 10, 12, 0.85);
          }
          .daily-mission-card {
            width: 90%;
            height: auto;
            max-width: 850px;
            max-height: 85vh;
            border-radius: 20px;
            background: rgba(20, 20, 25, 0.95);
            border: 1px solid rgba(108, 99, 255, 0.2);
            box-shadow: 0 25px 50px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05);
            padding: 2.5rem 2rem;
            margin: auto;
            box-sizing: border-box;
          }
        }
      `}</style>

      {/* Floating XP Alert for premium micro-feedback */}
      {xpAwardedMsg && (
        <div className="xp-alert">
          {xpAwardedMsg}
        </div>
      )}

      {/* ── ALIVE GREETINGS & HERO SECTION ── */}
      <div className="gamified-header-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="gamified-header-title">
              {isGuest ? 'Unlock TaniOS AI Study System' : `Welcome back, ${firstName}`}! 👋
            </div>
            <p className="gamified-header-subtitle">
              TaniOS studies <strong>with</strong> you, not just answers questions. Track your weaknesses, crush daily targets, and score board topper grades!
            </p>
            
            {/* Dynamic context alert box — syncs with student's profile subjects */}
            {(() => {
              // Pick a subject from the student's profile to make the message relevant
              const today = new Date();
              const subjectPool = profileSubjects.length > 0 ? profileSubjects : ['your subjects'];
              const pickedSubject = subjectPool[today.getDate() % subjectPool.length];
              const completedToday = missions.filter(m => m.type !== 'login' && m.done).length;
              const totalNonLogin = missions.filter(m => m.type !== 'login').length;

              let alertMsg;
              let alertColor = 'var(--accent)';
              if (!profileSetupDone) {
                alertMsg = <>💡 <strong>Getting Started:</strong> Set up your study profile below to unlock <strong>personalized daily missions</strong> and start earning XP!</>;
              } else if (totalNonLogin > 0 && completedToday === totalNonLogin) {
                alertMsg = <>🎉 <strong>All Done!</strong> You crushed every mission today! Come back tomorrow for fresh {pickedSubject} challenges.</>;
                alertColor = 'var(--success)';
              } else {
                alertMsg = <>💡 <strong>Companion Update:</strong> You have <strong>{totalNonLogin - completedToday} {pickedSubject} task{totalNonLogin - completedToday !== 1 ? 's' : ''}</strong> pending today. Complete them to build your streak!</>;
              }
              return (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  background: 'rgba(255,255,255,0.06)',
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-sm)',
                  borderLeft: `4px solid ${alertColor}`,
                  fontSize: '0.85rem',
                  marginBottom: '1rem'
                }}>
                  <AlertCircle size={16} color={alertColor} style={{ flexShrink: 0 }} />
                  <span style={{ color: 'var(--text)' }}>{alertMsg}</span>
                </div>
              );
            })()}

            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button onClick={() => {
                const element = document.getElementById('mission-center');
                element?.scrollIntoView({ behavior: 'smooth' });
              }} className="btn btn-primary">
                <Target size={16} /> Complete Daily Mission
              </button>
              <Link to="/chat" className="btn btn-primary" style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)', border: 'none', color: 'white', boxShadow: '0 4px 15px rgba(139, 92, 246, 0.3)' }}>
                <MessageSquare size={16} /> AI Doubt Solver
              </Link>
              <Link to="/notes" className="btn btn-secondary">
                <FileText size={16} /> Generate AI Notes
              </Link>
            </div>
          </div>

          {/* Exam Countdown banner — real-time sync with Indian board exam dates */}
          {(() => {
            if (!profileSetupDone) return null;
            // ── REAL INDIAN BOARD EXAM DATE DATABASE ──
            // These are approximate official start dates. Updated yearly.
            const EXAM_DATES = {
              CBSE: {
                '10': { month: 1, day: 15, label: 'CBSE Class 10 Board Exam' },   // ~Feb 15
                '12': { month: 1, day: 15, label: 'CBSE Class 12 Board Exam' },   // ~Feb 15
                '8':  { month: 2, day: 1,  label: 'Class 8 Annual Exam' },         // ~March 1
                '9':  { month: 2, day: 1,  label: 'Class 9 Annual Exam' },         // ~March 1
                '11': { month: 2, day: 1,  label: 'Class 11 Annual Exam' },        // ~March 1
              },
              RBSE: {
                '10': { month: 2, day: 5,  label: 'RBSE Class 10 Board Exam' },   // ~March 5
                '12': { month: 2, day: 5,  label: 'RBSE Class 12 Board Exam' },   // ~March 5
                '8':  { month: 2, day: 10, label: 'Class 8 Annual Exam' },         // ~March 10
                '9':  { month: 2, day: 10, label: 'Class 9 Annual Exam' },         // ~March 10
                '11': { month: 2, day: 10, label: 'Class 11 Annual Exam' },        // ~March 10
              },
            };

            const board = profileBoard || 'CBSE';
            // Extract just the number from profileClass (could be "10", "10th", "Class 10" etc)
            const classNum = (profileClass || '10').toString().replace(/\D/g, '') || '10';
            const examInfo = EXAM_DATES[board]?.[classNum] || EXAM_DATES['CBSE']['10'];

            const now = new Date();
            // Build the target exam date — Indian academic year ends in Feb-March
            // If we're past April, the next exam is in the following calendar year
            let examYear = now.getFullYear();
            const examDate = new Date(examYear, examInfo.month, examInfo.day);
            // If the exam date has already passed this year, target next year
            if (examDate <= now) {
              examYear += 1;
              examDate.setFullYear(examYear);
            }

            const diffMs = examDate - now;
            const diffDays = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

            // Color based on urgency
            let countdownColor = 'var(--accent)';
            if (diffDays <= 7) countdownColor = '#ef4444';        // red — exam week!
            else if (diffDays <= 30) countdownColor = '#f59e0b';  // amber — 1 month
            else if (diffDays <= 90) countdownColor = 'var(--accent)'; // normal

            return (
              <div className="countdown-box" style={{
                background: 'rgba(0,0,0,0.15)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '12px',
                padding: '1rem',
                textAlign: 'center',
                minWidth: '150px',
                flexShrink: 0,
              }}>
                <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>
                  {board} Target {examYear}
                </span>
                <div style={{ fontSize: '1.75rem', fontWeight: 900, color: countdownColor, margin: '0.25rem 0' }}>
                  {diffDays} Day{diffDays !== 1 ? 's' : ''}
                </div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', lineHeight: 1.3, display: 'block' }}>
                  {examInfo.label}
                </span>
                <span style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', opacity: 0.6, marginTop: '0.25rem', display: 'block' }}>
                  {examDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </div>
            );
          })()}
        </div>
      </div>

      {/* ── TWO COLUMN MAIN COMMAND WORKSPACE ── */}
      <div className="home-grid">
        
        {/* LEFT COLUMN: ACTIVE TOOLS & ROADMAPS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* A. MISSION CONTROL WIDGET */}
          <section className="card" id="mission-center" style={{ borderLeft: '4px solid var(--primary)' }}>
            {!profileSetupDone ? (
              <div style={{ padding: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                  <div style={{
                    background: 'rgba(99, 102, 241, 0.1)',
                    width: '36px', height: '36px',
                    borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <Target color="var(--primary)" size={20} />
                  </div>
                  <div>
                    <h2 style={{ fontSize: '1.25rem', margin: 0, color: 'var(--text)' }}>Set Up Your Study Profile</h2>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0 0' }}>
                      Lock in your board & subjects to unlock personalized study missions and target tasks.
                    </p>
                  </div>
                </div>

                <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '1.5rem' }}>
                  <div className="profile-setup-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label className="input-label" style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text)', display: 'block', marginBottom: '0.35rem' }}>
                        Select Board
                      </label>
                      <select 
                        className="input-field" 
                        value={setupBoard} 
                        onChange={e => setSetupBoard(e.target.value)} 
                        style={{ padding: '0.6rem 0.75rem', fontSize: '0.88rem', background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: '6px', width: '100%' }}
                      >
                        <option value="CBSE">CBSE (Central Board)</option>
                        <option value="RBSE">RBSE (Rajasthan Board)</option>
                        <option value="ICSE">ICSE Board</option>
                        <option value="UP Board">UP Board</option>
                        <option value="Bihar Board">Bihar Board</option>
                      </select>
                    </div>
                    <div>
                      <label className="input-label" style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text)', display: 'block', marginBottom: '0.35rem' }}>
                        Class Grade
                      </label>
                      <select 
                        className="input-field" 
                        value={setupClass} 
                        onChange={e => setSetupClass(e.target.value)} 
                        style={{ padding: '0.6rem 0.75rem', fontSize: '0.88rem', background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: '6px', width: '100%' }}
                      >
                        <option value="8">Class 8</option>
                        <option value="9">Class 9</option>
                        <option value="10">Class 10</option>
                        <option value="11">Class 11</option>
                        <option value="12">Class 12</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="input-label" style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text)', display: 'block', marginBottom: '0.5rem' }}>
                      Select Your Subjects
                    </label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
                      {standardSubjects.map(sub => {
                        const isSelected = selectedSubjects.includes(sub.name);
                        return (
                          <button
                            key={sub.name}
                            type="button"
                            onClick={() => {
                              if (isSelected) {
                                setSelectedSubjects(selectedSubjects.filter(s => s !== sub.name));
                              } else {
                                setSelectedSubjects([...selectedSubjects, sub.name]);
                              }
                            }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              padding: '0.45rem 0.75rem',
                              borderRadius: '20px',
                              fontSize: '0.8rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                              background: isSelected ? 'rgba(99, 102, 241, 0.15)' : 'var(--bg-tertiary)',
                              border: isSelected ? '2px solid var(--primary)' : '2px solid var(--border)',
                              color: isSelected ? 'var(--text)' : 'var(--text-secondary)',
                            }}
                          >
                            <span>{sub.icon}</span>
                            <span>{sub.name}</span>
                          </button>
                        );
                      })}
                    </div>

                    <div style={{ marginTop: '0.75rem' }}>
                      <label className="input-label" style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.35rem' }}>
                        Other Subjects (comma separated, e.g. Sanskrit, Computer, Physical Education)
                      </label>
                      <input
                        type="text"
                        className="input-field"
                        placeholder="e.g. Sanskrit, Physical Education"
                        value={setupSubjects}
                        onChange={e => setSetupSubjects(e.target.value)}
                        style={{ padding: '0.5rem 0.75rem', fontSize: '0.85rem', width: '100%', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text)' }}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="btn btn-primary"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      fontSize: '0.9rem',
                      fontWeight: 700,
                      background: 'linear-gradient(135deg, var(--primary), var(--accent))',
                      border: 'none',
                      color: 'white',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      boxShadow: '0 4px 15px rgba(99, 102, 241, 0.3)',
                      transition: 'all 0.2s'
                    }}
                  >
                    <Sparkles size={16} /> Generate Customized Study Dashboard & Claim +10 XP
                  </button>
                </form>
              </div>
            ) : (
              <>
                <div className="mission-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Target color="var(--primary)" size={20} />
                    <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Complete Today’s Study Mission</h2>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <button
                      onClick={() => setProfileSetupDone(false)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        textDecoration: 'underline',
                        padding: 0,
                      }}
                    >
                      Edit Profile ⚙️
                    </button>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                      {missions.filter(m => m.done).length} / {missions.length} Complete
                    </span>
                  </div>
                </div>

                <div style={{ height: '6px', background: 'var(--bg-tertiary)', borderRadius: '99px', overflow: 'hidden', marginBottom: '1.25rem' }}>
                  <div style={{
                    height: '100%',
                    width: `${missions.length > 0 ? (missions.filter(m => m.done).length / missions.length) * 100 : 0}%`,
                    background: 'linear-gradient(90deg, var(--primary), var(--success))',
                    borderRadius: '99px',
                    transition: 'width 0.4s ease'
                  }} />
                </div>

                {/* ── ACTIVE CHAPTERS SELECTOR ── */}
                <div style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  borderRadius: '12px',
                  padding: '1rem',
                  marginBottom: '1.25rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <span style={{ fontSize: '0.85rem' }}>🎯</span>
                    <strong style={{ fontSize: '0.82rem', color: '#fff' }}>Set Your Active Class Chapters:</strong>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem' }}>
                    {profileSubjects.map(subj => {
                      const currentCh = activeChapters[subj] || '';
                      const chapters = CLASS_SYLLABUS[profileClass]?.[subj] || CLASS_SYLLABUS[profileClass.toString()]?.[subj] || [];
                      
                      // Calculate days remaining dynamically
                      const now = new Date();
                      const EXAM_DATES = {
                        CBSE: { '10': { month: 1, day: 15 }, '12': { month: 1, day: 15 }, '8': { month: 2, day: 1 }, '9': { month: 2, day: 1 }, '11': { month: 2, day: 1 } },
                        RBSE: { '10': { month: 2, day: 5 }, '12': { month: 2, day: 5 }, '8': { month: 2, day: 10 }, '9': { month: 2, day: 10 }, '11': { month: 2, day: 10 } }
                      };
                      const classNum = (profileClass || '10').toString().replace(/\D/g, '') || '10';
                      const examInfo = EXAM_DATES[profileBoard]?.[classNum] || EXAM_DATES['CBSE']['10'];

                      let examYear = now.getFullYear();
                      const examDate = new Date(examYear, examInfo.month, examInfo.day);
                      if (examDate <= now) {
                        examYear += 1;
                        examDate.setFullYear(examYear);
                      }
                      const diffMs = examDate - now;
                      const diffDays = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

                      const totalChapters = chapters.length || 1;
                      const chapterIdx = chapters.indexOf(currentCh);
                      const resolvedChapterIdx = chapterIdx !== -1 ? chapterIdx + 1 : 1;
                      const chaptersRemaining = Math.max(1, totalChapters - resolvedChapterIdx + 1);
                      const daysPerChapter = Math.max(1, Math.round(diffDays / chaptersRemaining));

                      // Retrieve progress
                      const progressMap = JSON.parse(localStorage.getItem(getUserKey('tanios_chapter_progress')) || '{}');
                      const completedTopics = progressMap[subj]?.[currentCh] || 0;
                      
                      return (
                        <div key={subj} style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '8px', padding: '0.5rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '65%' }}>
                              {subj}
                            </span>
                            <span style={{ fontSize: '0.62rem', color: 'var(--success)', fontWeight: 700 }} title="Topics completed in this chapter / Days allocated to complete it">
                              Day {completedTopics}/{daysPerChapter} ⏱️
                            </span>
                          </div>
                          {chapters.length > 0 ? (
                            <select
                              value={currentCh}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (!val) return; // Prevent empty selection
                                const updated = { ...activeChapters, [subj]: val };
                                setActiveChapters(updated);
                                localStorage.setItem(getUserKey('tanios_active_chapters'), JSON.stringify(updated));
                                const newMissions = generateMissionsFromProfile(profileBoard, profileClass, profileSubjects, updated);
                                setMissions(newMissions);
                                localStorage.setItem(getUserKey('tanios_missions'), JSON.stringify(newMissions));
                              }}
                              style={{ width: '100%', fontSize: '0.72rem', background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: '4px', padding: '0.2rem' }}
                            >
                              {chapters.map(ch => (
                                <option key={ch} value={ch}>{ch}</option>
                              ))}
                            </select>
                          ) : (
                            <input
                              type="text"
                              value={currentCh}
                              placeholder="Type active topic..."
                              onChange={(e) => {
                                const val = e.target.value;
                                const updated = { ...activeChapters, [subj]: val };
                                setActiveChapters(updated);
                                localStorage.setItem(getUserKey('tanios_active_chapters'), JSON.stringify(updated));
                                const newMissions = generateMissionsFromProfile(profileBoard, profileClass, profileSubjects, updated);
                                setMissions(newMissions);
                                localStorage.setItem(getUserKey('tanios_missions'), JSON.stringify(newMissions));
                              }}
                              style={{ width: '100%', fontSize: '0.72rem', background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: '4px', padding: '0.2rem 0.4rem' }}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div>
                {missions.map(mission => (
                    <div key={mission.id} className={`mission-item ${mission.done ? 'completed' : ''}`}>
                      <button 
                        onClick={() => {
                          if (mission.type === 'login') {
                            toggleMission(mission.id);
                          } else if (!mission.done) {
                            startStudyMission(mission);
                          }
                        }}
                        disabled={mission.done}
                        style={{ background: 'none', border: 'none', color: mission.done ? 'var(--success)' : 'var(--text-secondary)', cursor: mission.done ? 'default' : 'pointer', flexShrink: 0 }}
                      >
                        <CheckCircle2 size={20} style={mission.done ? {} : { opacity: 0.4 }} />
                      </button>
                      <div 
                        onClick={() => {
                          if (!mission.done && mission.type !== 'login') {
                            startStudyMission(mission);
                          }
                        }}
                        style={{ flex: 1, minWidth: 0, cursor: (!mission.done && mission.type !== 'login') ? 'pointer' : 'default' }}
                      >
                        <div style={{
                          fontSize: '0.88rem',
                          fontWeight: 600,
                          textDecoration: mission.done ? 'line-through' : 'none',
                          color: mission.done ? 'var(--text-secondary)' : 'var(--text)',
                          wordBreak: 'break-word',
                        }}>
                          {mission.label}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                        <span style={{ fontSize: '0.72rem', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 700, whiteSpace: 'nowrap' }}>
                          +{mission.xp} XP
                        </span>
                        {!mission.done && mission.type !== 'login' && (
                          <button 
                            onClick={() => startStudyMission(mission)}
                            className="btn btn-secondary" 
                            style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem', whiteSpace: 'nowrap' }}
                          >
                            Start <Play size={10} />
                          </button>
                        )}
                        {mission.done && mission.type !== 'login' && (
                          <span style={{ fontSize: '0.72rem', color: 'var(--success)', fontWeight: 700 }}>✓ Done</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </section>

          {/* B. ONE-CLICK OUTPUTS HUB (FAST SHORTCUT COMPANION GENERATOR) */}
          <section className="card" id="oneclick-section">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <Zap color="#f59e0b" size={20} />
              <h2 style={{ fontSize: '1.25rem', margin: 0 }}>One-Click Study Generators</h2>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
              No prompting required. Get instant, board-focused outputs customized for Indian syllabus in seconds.
            </p>

            <div className="quick-action-grid">
              {quickActions.map(action => (
                <button
                  key={action.label}
                  onClick={() => {
                    setActiveOneClickTool(action.label);
                    setOneClickResult('');
                    setOneClickTopic('');
                  }}
                  className="quick-action-btn"
                  style={activeOneClickTool === action.label ? { borderColor: 'var(--primary)', background: 'var(--primary-light)' } : {}}
                >
                  <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>{action.icon}</div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text)' }}>{action.label}</div>
                </button>
              ))}
            </div>

            {/* Display active tool generation window */}
            {activeOneClickTool && (
              <div style={{
                background: 'var(--bg-tertiary)',
                borderRadius: '10px',
                padding: '1.25rem',
                border: '1px solid var(--border)',
                animation: 'fadeUp 0.3s cubic-bezier(.4,0,.2,1) both'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 style={{ fontSize: '1rem', color: 'var(--primary)', margin: 0 }}>
                    ⚡ Companion Tool: {activeOneClickTool}
                  </h3>
                  <button 
                    onClick={() => setActiveOneClickTool(null)}
                    style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 700 }}
                  >
                    Close [X]
                  </button>
                </div>

                <form onSubmit={handleOneClickGenerate}>
                  <div className="oneclick-form-row" style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                    <div style={{ flex: 1, minWidth: '150px' }}>
                      <label className="input-label" style={{ fontSize: '0.7rem' }}>Topic or Chapter Name</label>
                      <input 
                        type="text" 
                        className="input-field" 
                        required 
                        placeholder="e.g. Life Processes, Trigonometry, Acids Bases"
                        value={oneClickTopic}
                        onChange={e => setOneClickTopic(e.target.value)}
                        style={{ padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}
                      />
                    </div>
                    <div style={{ width: '120px' }}>
                      <label className="input-label" style={{ fontSize: '0.7rem' }}>Class Grade</label>
                      <select 
                        className="input-field"
                        value={oneClickGrade}
                        onChange={e => setOneClickGrade(e.target.value)}
                        style={{ padding: '0.5rem 0.75rem', fontSize: '0.85rem', width: '100%' }}
                      >
                        <option value="8">Class 8</option>
                        <option value="9">Class 9</option>
                        <option value="10">Class 10</option>
                        <option value="11">Class 11</option>
                        <option value="12">Class 12</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button 
                      id="quick-gen-btn"
                      type="submit" 
                      className="btn btn-primary" 
                      style={{ padding: '0.5rem 1.25rem', fontSize: '0.82rem', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                      disabled={oneClickLoading || !oneClickTopic}
                    >
                      {oneClickLoading ? (
                        <>
                          <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                          {oneClickStatus && oneClickStatus !== 'thinking' ? oneClickStatus : `Generating ${activeOneClickTool}...`}
                        </>
                      ) : (
                        `Instant Generate ${activeOneClickTool}`
                      )}
                    </button>
                    <button 
                      type="button" 
                      className="btn btn-secondary"
                      onClick={() => navigate(`/chat?prompt=${encodeURIComponent(`Give me a detailed board summary of "${oneClickTopic}" focused on Class ${oneClickGrade} including definitions, board patterns, and solved questions.`)}`)}
                      style={{ padding: '0.5rem 1rem', fontSize: '0.82rem' }}
                    >
                      Open in Tutor Chat 💬
                    </button>
                  </div>
                </form>

                {/* Show Generated One-Click Material */}
                {oneClickResult && (
                  <div style={{
                    marginTop: '1.25rem',
                    padding: '1rem',
                    background: 'var(--bg-secondary)',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    maxHeight: '400px',
                    overflowY: 'auto'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Generated Success</span>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button onClick={handleCopyOneClick} className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          {oneClickCopied ? <Check size={12} color="var(--success)" /> : <Copy size={12} />}
                          {oneClickCopied ? 'Copied' : 'Copy'}
                        </button>
                      </div>
                    </div>
                    <div className="generated-content" style={{ fontSize: '0.88rem', lineHeight: 1.7, background: 'transparent', border: 'none', padding: 0, margin: 0, boxShadow: 'none' }}>
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm, remarkMath]}
                        rehypePlugins={[rehypeKatex]}
                        components={markdownComponents}
                      >{oneClickResult}</ReactMarkdown>
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* C. EXAM MODE ROADMAP ENGINE (BOARD COUNTDOWN SYSTEM) */}
          <section className="card" style={{ borderLeft: '4px solid var(--accent)', marginTop: '0px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <GraduationCap color="var(--accent)" size={20} />
              <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Active Board Exam Mode</h2>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
              Got an upcoming board exam? Lock in your targets. The AI will instantly engineer a revision roadmap, daily high-yield topics, and repeated board questions.
            </p>

            <form onSubmit={handleGenerateRoadmap} className="exam-form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
              <div>
                <label className="input-label" style={{ fontSize: '0.7rem' }}>Select Board</label>
                <select className="input-field" value={examBoard} onChange={e => setExamBoard(e.target.value)} style={{ padding: '0.5rem', fontSize: '0.85rem', width: '100%' }}>
                  <option value="CBSE (Central Board)">CBSE (Central Board)</option>
                  <option value="RBSE (Rajasthan Board)">RBSE (Rajasthan Board)</option>
                  <option value="UP Board">UP Board (Hindi/Eng Medium)</option>
                  <option value="Bihar Board">Bihar Board (BSEB)</option>
                </select>
              </div>
              <div>
                <label className="input-label" style={{ fontSize: '0.7rem' }}>Class</label>
                <select className="input-field" value={examGrade} onChange={e => setExamGrade(e.target.value)} style={{ padding: '0.5rem', fontSize: '0.85rem', width: '100%' }}>
                  <option value="Class 10">Class 10</option>
                  <option value="Class 11">Class 11</option>
                  <option value="Class 12">Class 12</option>
                  <option value="Class 9">Class 9</option>
                  <option value="Class 8">Class 8</option>
                </select>
              </div>
              <div>
                <label className="input-label" style={{ fontSize: '0.7rem' }}>Focus Subject</label>
                <select className="input-field" value={examSubject} onChange={e => setExamSubject(e.target.value)} style={{ padding: '0.5rem', fontSize: '0.85rem', width: '100%' }}>
                  <option value="Science">Science / Physics / Chem</option>
                  <option value="Mathematics">Mathematics</option>
                  <option value="Social Science">Social Science</option>
                  <option value="English">English Core</option>
                </select>
              </div>
              <div>
                <label className="input-label" style={{ fontSize: '0.7rem' }}>Days Remaining</label>
                <select className="input-field" value={examDays} onChange={e => setExamDays(e.target.value)} style={{ padding: '0.5rem', fontSize: '0.85rem', width: '100%' }}>
                  <option value="15">15 Days (Sprint)</option>
                  <option value="30">30 Days (Standard)</option>
                  <option value="45">45 Days (Full Revision)</option>
                </select>
              </div>
              <div style={{ gridColumn: '1 / -1', marginTop: '0.5rem' }}>
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  style={{ width: '100%', padding: '0.65rem', backgroundColor: 'var(--accent)', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                  disabled={examLoading}
                >
                  {examLoading ? (
                    <>
                      <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                      {examStatus && examStatus !== 'thinking' ? examStatus : 'Engineering Board Roadmap...'}
                    </>
                  ) : (
                    <><Sparkles size={16} /> Generate Day-by-Day Exam Roadmap</>
                  )}
                </button>
              </div>
            </form>

            {/* Display generated roadmap */}
            {examResult && (
              <div style={{
                background: 'var(--bg-tertiary)',
                borderRadius: '10px',
                padding: '1.25rem',
                border: '1px solid var(--border)',
                marginTop: '1rem',
                maxHeight: '500px',
                overflowY: 'auto'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                  <strong style={{ color: 'var(--accent)', fontSize: '0.9rem' }}>🎯 Customized Board Study Roadmap ({examBoard})</strong>
                  <button onClick={handleCopyRoadmap} className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    {roadmapCopied ? <Check size={12} color="var(--success)" /> : <Copy size={12} />}
                    {roadmapCopied ? 'Copied Roadmap' : 'Copy Roadmap'}
                  </button>
                </div>
                <div className="generated-content" style={{ fontSize: '0.88rem', lineHeight: 1.7, background: 'transparent', border: 'none', padding: 0, margin: 0, boxShadow: 'none' }}>
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm, remarkMath]}
                    rehypePlugins={[rehypeKatex]}
                    components={markdownComponents}
                  >{examResult}</ReactMarkdown>
                </div>
              </div>
            )}
          </section>

        </div>

        {/* RIGHT COLUMN: STATE STATS, WEAKNESS CLINIC & BADGES */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* 1. DOPAMINE GAMIFICATION DASHBOARD */}
          <section className="card" style={{ background: 'linear-gradient(180deg, var(--bg-secondary) 0%, var(--bg-tertiary) 100%)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
              <Trophy color="var(--accent)" size={20} />
              <h2 style={{ fontSize: '1.1rem', margin: 0 }}>Dopamine & consistency</h2>
            </div>

            {/* A. Streak with Fire icon animation */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem', background: 'rgba(255,255,255,0.04)', padding: '0.75rem 1rem', borderRadius: '10px' }}>
              <div className="pulse-streak" style={{
                width: '3rem', height: '3rem',
                background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(245, 158, 11, 0.15))',
                borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <Flame size={24} color="#ef4444" fill="#ef4444" />
              </div>
              <div>
                <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text)' }}>
                  {streak} Day Streak!
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  Complete daily tasks to stay consistent.
                </span>
              </div>
            </div>

            {/* B. Daily Target MCQ Marks Score Card */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem', background: 'rgba(255,255,255,0.04)', padding: '0.75rem 1rem', borderRadius: '10px', borderLeft: netScore >= 0 ? '4px solid #10b981' : '4px solid #ef4444' }}>
              <div style={{
                width: '3rem', height: '3rem',
                background: netScore >= 0 
                  ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(5, 150, 105, 0.15))'
                  : 'linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(220, 38, 38, 0.15))',
                borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.5rem'
              }}>
                🎯
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <div style={{ fontSize: '1.35rem', fontWeight: 800, color: netScore >= 0 ? '#10b981' : '#f87171' }}>
                    {netScore >= 0 ? `+${netScore}` : netScore} Marks
                  </div>
                  <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.06)', padding: '0.15rem 0.45rem', borderRadius: '4px' }}>
                    {netScore >= 100 ? 'Board Topper 🏆' : netScore >= 50 ? 'Excellent 🎓' : netScore >= 0 ? 'Aspirant ⚡' : 'Needs Practice 🩹'}
                  </span>
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginTop: '0.15rem' }}>
                  Syllabus test score card (+10 correct / -5 incorrect)
                </span>
              </div>
            </div>

            {/* B. XP Progress Bar */}
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                <span style={{ color: 'var(--text)' }}>Level {level}: {currentLevelInfo.name}</span>
                <span style={{ color: 'var(--primary)' }}>{xp} / {currentLevelInfo.next} XP</span>
              </div>
              <div style={{ height: '8px', background: 'rgba(255,255,255,0.06)', borderRadius: '99px', overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${progressPercent}%`,
                  background: 'linear-gradient(90deg, var(--primary), var(--accent))',
                  borderRadius: '99px',
                  transition: 'width 0.4s ease'
                }} />
              </div>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block', marginTop: '0.25rem' }}>
                Earn XP by completing checklist tasks and solving doubts!
              </span>
            </div>

            {/* C. Consistency Score with real-time 7-Day Matrix */}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Consistency Score</span>
                <strong style={{ color: 'var(--success)', fontSize: '0.88rem' }}>{consistency}%</strong>
              </div>
              <div style={{ display: 'flex', gap: '6px', justifyContent: 'space-between' }}>
                {(() => {
                  // Build last 7 days ending with today, using real dates
                  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                  const today = new Date();
                  const days = [];
                  for (let i = 6; i >= 0; i--) {
                    const d = new Date(today);
                    d.setDate(today.getDate() - i);
                    days.push({
                      label: dayNames[d.getDay()],
                      date: d.getDate(),
                      isToday: i === 0,
                      // A day is "active" if it falls within the current streak window
                      // streak=3 means today + 2 previous days were active
                      isActive: streak > 0 && i < streak,
                    });
                  }
                  return days.map((day, idx) => (
                    <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                      <div style={{
                        width: day.isToday ? '20px' : '16px',
                        height: day.isToday ? '20px' : '16px',
                        borderRadius: '50%',
                        background: day.isActive
                          ? 'var(--success)'
                          : day.isToday
                            ? 'rgba(99, 102, 241, 0.3)'
                            : 'rgba(255,255,255,0.06)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '8px', color: '#fff', fontWeight: 900,
                        border: day.isToday ? '2px solid var(--primary)' : 'none',
                        transition: 'all 0.2s ease',
                      }}>
                        {day.isActive ? '✓' : ''}
                      </div>
                      <span style={{
                        fontSize: '0.6rem',
                        color: day.isToday ? 'var(--primary)' : 'var(--text-secondary)',
                        fontWeight: day.isToday ? 700 : 400,
                      }}>
                        {day.label}
                      </span>
                      <span style={{
                        fontSize: '0.55rem',
                        color: day.isToday ? 'var(--text)' : 'var(--text-secondary)',
                        fontWeight: day.isToday ? 600 : 400,
                        opacity: 0.7,
                      }}>
                        {day.date}
                      </span>
                    </div>
                  ));
                })()}
              </div>
            </div>

            {/* D. Badges locker */}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text)' }}>Unlocked Achievements</span>
              <div className="badge-grid">
                {Object.keys(badgeMeta).map(badgeId => {
                  const hasBadge = badges.includes(badgeId);
                  return (
                    <div 
                      key={badgeId} 
                      className={`badge-item ${hasBadge ? '' : 'locked'}`}
                      title={badgeMeta[badgeId].desc}
                    >
                      <div>{badgeMeta[badgeId].label}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>



          {/* 3. MISTAKE CLINIC & CONCEPT REVISION RECAP */}
          <section className="card" style={{ borderLeft: '4px solid var(--accent)', marginTop: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '1.1rem' }}>🧠</span>
              <h2 style={{ fontSize: '1.1rem', margin: 0 }}>My MCQ Mistake Locker</h2>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '1rem' }}>
              Review your previous conceptual targets. Re-read masterclasses for topics you answered incorrectly.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '400px', overflowY: 'auto', paddingRight: '0.25rem' }}>
              {mcqAttempts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                  📖 No topic history logged yet. Complete study missions to fill your revision locker!
                </div>
              ) : (
                mcqAttempts.map(att => (
                  <AttemptItem key={att.id} att={att} />
                ))
              )}
            </div>
          </section>

        </div>

      </div>

      {/* ── Glassmorphic AI Loader Overlay (Specifically for Board Roadmap Mode) ── */}
      {examLoading && createPortal(
        <div className="global-ai-loader-overlay">
          <div className="global-ai-loader-card">
            <div className="global-ai-loader-glow-orb"></div>
            <div className="global-ai-loader-icon-wrapper">
              <Sparkles className="global-ai-loader-icon" size={32} />
            </div>
            <h3>TaniOS AI is crafting...</h3>
            <p>Please wait a moment while the AI compiles high-yield study materials for you.</p>
            <div className="global-ai-loader-bar">
              <div className="global-ai-loader-bar-fill"></div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── INTERACTIVE DAILY STUDY MISSIONS MODAL ── */}
      {activeMission && createPortal(
        <div className="daily-mission-overlay">
          <div className="daily-mission-card">
            {/* Background Glow Orb */}
            <div style={{
              position: 'absolute', top: '-40px', right: '-40px',
              width: '120px', height: '120px',
              background: 'radial-gradient(circle, rgba(108, 99, 255, 0.25) 0%, rgba(108,99,255,0) 70%)',
              borderRadius: '50%', pointerEvents: 'none'
            }} />

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '0.75rem' }}>
              <div>
                <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: '0.2rem' }}>
                  🧠 CONCEPT TEACHING MASTERCLASS
                </span>
                <h4 style={{ margin: 0, color: '#fff', fontSize: '1.1rem', fontWeight: 800 }}>
                  {activeMission.subject || 'General Study'} : {activeMission.chapter || 'Chapter'}
                </h4>
              </div>
              <button 
                onClick={() => {
                  setActiveMission(null);
                  setDynamicMissionContent(null);
                }}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', opacity: 0.7 }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Content Area */}
            <div style={{ marginBottom: '1.75rem', flex: 1, overflowY: 'auto', maxHeight: '70vh', paddingRight: '0.25rem' }}>
              {missionLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', gap: '1.5rem', textAlign: 'center' }}>
                  <Loader2 size={40} style={{ color: 'var(--primary)', animation: 'spin 1.5s linear infinite' }} />
                  <div>
                    <h4 style={{ margin: '0 0 0.5rem 0', color: '#fff', fontSize: '1.1rem', fontWeight: 800 }}>TaniOS AI Study Engine</h4>
                    <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                      Engineering a high-yield concept-teaching MCQ masterclass for <strong>{activeMission.subject}</strong>...
                    </p>
                  </div>
                </div>
              ) : (() => {
                const data = dynamicMissionContent || fallbackTeachingMCQ;
                const options = data.options || fallbackTeachingMCQ.options;
                return (
                  <div>
                    {/* Topic Badge */}
                    <div style={{
                      display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                      background: 'rgba(99, 102, 241, 0.1)',
                      border: '1px solid rgba(99, 102, 241, 0.2)',
                      borderRadius: '20px', padding: '0.35rem 0.85rem',
                      fontSize: '0.78rem', color: '#a78bfa', fontWeight: 700,
                      marginBottom: '1rem'
                    }}>
                      🎯 Target Topic: {data.topic || "Syllabus Core Concept"}
                    </div>

                    {/* Question Card */}
                    <div style={{
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid rgba(255, 255, 255, 0.05)',
                      borderRadius: '12px', padding: '1.25rem',
                      marginBottom: '1.25rem', fontSize: '0.95rem',
                      fontWeight: 700, color: '#fff', lineHeight: 1.5
                    }}>
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm, remarkMath]}
                        rehypePlugins={[rehypeKatex]}
                        components={markdownComponents}
                      >{data.questionText}</ReactMarkdown>
                    </div>

                    {/* Options Grid */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
                      {options.map(opt => {
                        const isSelected = missionAnswer === opt.key;
                        return (
                          <button
                            key={opt.key}
                            onClick={() => !missionSubmitted && setMissionAnswer(opt.key)}
                            disabled={missionSubmitted}
                            style={{
                              display: 'flex', alignItems: 'center', gap: '1rem',
                              width: '100%', padding: '0.85rem 1.25rem',
                              background: isSelected ? 'rgba(108, 99, 255, 0.12)' : 'rgba(255, 255, 255, 0.01)',
                              border: isSelected ? '1px solid var(--primary)' : '1px solid rgba(255,255,255,0.05)',
                              borderRadius: '10px', color: '#fff', textAlign: 'left',
                              cursor: missionSubmitted ? 'default' : 'pointer',
                              transition: 'all 0.2s'
                            }}
                          >
                            <div style={{
                              width: '24px', height: '24px', borderRadius: '50%',
                              background: isSelected ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: '0.75rem', fontWeight: 800, color: isSelected ? '#fff' : 'var(--text-secondary)',
                              flexShrink: 0
                            }}>
                              {opt.key}
                            </div>
                            <span style={{ fontSize: '0.82rem', fontWeight: 600, lineHeight: 1.4 }}>
                              <ReactMarkdown
                                remarkPlugins={[remarkGfm, remarkMath]}
                                rehypePlugins={[rehypeKatex]}
                                components={markdownComponents}
                              >{opt.desc || opt.text}</ReactMarkdown>
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Explanation / Masterclass Feedback */}
                    {missionSubmitted && (
                      <div style={{
                        marginTop: '1.25rem', padding: '1.25rem',
                        background: missionAnswer === data.correctKey ? 'rgba(16, 185, 129, 0.04)' : 'rgba(239, 68, 68, 0.04)',
                        border: missionAnswer === data.correctKey ? '1px solid rgba(16, 185, 129, 0.15)' : '1px solid rgba(239, 68, 68, 0.15)',
                        borderRadius: '12px', fontSize: '0.85rem', lineHeight: 1.6, color: 'var(--text-secondary)'
                      }}>
                        {missionAnswer === data.correctKey ? (
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', color: '#10b981', fontWeight: 800, fontSize: '0.95rem' }}>
                              🎉 <span>Correct Answer! Topic Masterclass Unlocked</span>
                            </div>
                            <div style={{ color: 'var(--text)', background: 'rgba(255,255,255,0.01)', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.03)' }}>
                              <ReactMarkdown
                                remarkPlugins={[remarkGfm, remarkMath]}
                                rehypePlugins={[rehypeKatex]}
                                components={markdownComponents}
                              >{data.explanation}</ReactMarkdown>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div style={{ color: '#f87171', fontWeight: 800, marginBottom: '0.25rem', fontSize: '0.9rem' }}>
                              ❌ Incorrect Option selected
                            </div>
                            <span>
                              That option does not teach this topic correctly. Click the button below to clear your choice, review the options, and select the correct teaching statement!
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Modal Bottom Actions */}
            {!missionLoading && (
              <div style={{ display: 'flex', gap: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '1.25rem', justifyContent: 'flex-end' }}>
                {!missionSubmitted ? (
                  <button
                    onClick={() => {
                      if (missionAnswer) {
                        setMissionSubmitted(true);

                        // ── Log MCQ attempt in dynamic user mistakes locker ──
                        const data = dynamicMissionContent || fallbackTeachingMCQ;
                        const isCorrect = missionAnswer === data.correctKey;
                        const selectedOptDesc = data.options.find(o => o.key === missionAnswer)?.desc || '';
                        const correctOptDesc = data.options.find(o => o.key === data.correctKey)?.desc || '';

                        try {
                          const stored = localStorage.getItem(getUserKey('tanios_mcq_attempts'));
                          const attempts = stored ? JSON.parse(stored) : [];

                          const existing = attempts.find(a => a.subject === activeMission.subject && a.topic === (data.topic || "Core Concept"));

                          let firstIncorrectKey = null;
                          let firstIncorrectDesc = null;

                          if (existing) {
                            if (existing.firstIncorrectKey) {
                              firstIncorrectKey = existing.firstIncorrectKey;
                              firstIncorrectDesc = existing.firstIncorrectDesc;
                            } else if (!existing.isCorrect) {
                              firstIncorrectKey = existing.selectedKey;
                              firstIncorrectDesc = existing.selectedDesc;
                            }
                          } else if (!isCorrect) {
                            firstIncorrectKey = missionAnswer;
                            firstIncorrectDesc = selectedOptDesc;
                          }

                          const newAttempt = {
                            id: `attempt_${Date.now()}`,
                            subject: activeMission.subject,
                            chapter: activeMission.chapter,
                            topic: data.topic || "Core Concept",
                            questionText: data.questionText,
                            selectedKey: missionAnswer,
                            selectedDesc: selectedOptDesc,
                            correctKey: data.correctKey,
                            correctDesc: correctOptDesc,
                            isCorrect,
                            firstIncorrectKey,
                            firstIncorrectDesc,
                            timestamp: Date.now(),
                            explanation: data.explanation
                          };

                          const filtered = attempts.filter(a => !(a.subject === newAttempt.subject && a.topic === newAttempt.topic));
                          filtered.unshift(newAttempt);
                          
                          localStorage.setItem(getUserKey('tanios_mcq_attempts'), JSON.stringify(filtered));
                          setMcqAttempts(filtered);

                          // ── Target Scoring Update ──
                          const storedNetScore = localStorage.getItem(getUserKey('tanios_net_score'));
                          const currentNetScore = storedNetScore ? parseInt(storedNetScore, 10) : 0;
                          const scoreDelta = isCorrect ? 10 : -5;
                          const nextNetScore = currentNetScore + scoreDelta;
                          localStorage.setItem(getUserKey('tanios_net_score'), nextNetScore.toString());
                          setNetScore(nextNetScore);

                          if (isCorrect) {
                            awardXp(10, 'Correct MCQ Answer');
                            setXpAwardedMsg(`+10 Marks Earned! 🎯`);
                            setTimeout(() => setXpAwardedMsg(''), 3000);
                          } else {
                            setXpAwardedMsg(`Penalty Applied: -5 Marks! ❌`);
                            setTimeout(() => setXpAwardedMsg(''), 3000);
                          }
                        } catch (err) {
                          console.warn("Could not save MCQ attempt", err);
                        }
                      }
                    }}
                    disabled={!missionAnswer}
                    className="btn btn-primary"
                    style={{
                      flex: 1, padding: '0.8rem 1rem', fontSize: '0.88rem', fontWeight: 800,
                      cursor: missionAnswer ? 'pointer' : 'not-allowed', opacity: missionAnswer ? 1 : 0.5
                    }}
                  >
                    Check & Learn Concept ➔
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      const data = dynamicMissionContent || fallbackTeachingMCQ;
                      if (missionAnswer !== data.correctKey) {
                        // User got it wrong, let them try again
                        setMissionSubmitted(false);
                        setMissionAnswer(null);
                        return;
                      }
                      // Correct selection: Mark completed!
                      toggleMission(activeMission.id);
                      setActiveMission(null);
                      setDynamicMissionContent(null);
                    }}
                    className="btn btn-primary"
                    style={{
                      flex: 1, padding: '0.8rem 1rem', fontSize: '0.88rem', fontWeight: 800,
                      background: (missionAnswer === (dynamicMissionContent || fallbackTeachingMCQ)?.correctKey)
                        ? 'linear-gradient(135deg, #10b981, #059669)'
                        : 'linear-gradient(135deg, var(--primary), var(--accent))'
                    }}
                  >
                    {(missionAnswer === (dynamicMissionContent || fallbackTeachingMCQ)?.correctKey)
                      ? "Submit & Complete Mission"
                      : "Try Another Option ➔"}
                  </button>
                )}
                <button
                  onClick={() => {
                    setActiveMission(null);
                    setDynamicMissionContent(null);
                  }}
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    color: 'var(--text-secondary)',
                    borderRadius: '8px', padding: '0.6rem 1rem',
                    fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
