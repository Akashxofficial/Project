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

const fallbackMindMap = {
  topic: "Chemical Reactions: Types of Reactions",
  branches: [
    {
      title: "Combination Reactions",
      description: "Two or more reactants combine to form a single product.",
      points: [
        "General form: $A + B \\rightarrow AB$",
        "Example: Burning of coal: $C(s) + O_2(g) \\rightarrow CO_2(g)$",
        "Example: Formation of water: $2H_2(g) + O_2(g) \\rightarrow 2H_2O(l)$"
      ]
    },
    {
      title: "Decomposition Reactions",
      description: "A single reactant breaks down into two or more simpler products.",
      points: [
        "General form: $AB \\rightarrow A + B$",
        "Requires energy in form of heat (Thermal), light (Photolytic), or electricity (Electrolytic).",
        "Example: Heating Calcium Carbonate: $CaCO_3(s) \\xrightarrow{\\text{Heat}} CaO(s) + CO_2(g)$"
      ]
    },
    {
      title: "Displacement Reactions",
      description: "A more reactive element displaces a less reactive element from its salt solution.",
      points: [
        "General form: $A + BC \\rightarrow AC + B$",
        "Example: Iron nail in copper sulphate: $Fe(s) + CuSO_4(aq) \\rightarrow FeSO_4(aq) + Cu(s)$",
        "Blue color of $CuSO_4$ fades to light green due to formation of $FeSO_4$."
      ]
    }
  ],
  verificationQuestion: "Which of the following reaction represents a thermal decomposition reaction?",
  options: [
    { key: "A", desc: "$2H_2(g) + O_2(g) \\rightarrow 2H_2O(l)$" },
    { key: "B", desc: "$CaCO_3(s) \\xrightarrow{\\text{Heat}} CaO(s) + CO_2(g)$" },
    { key: "C", desc: "$Fe(s) + CuSO_4(aq) \\rightarrow FeSO_4(aq) + Cu(s)$" },
    { key: "D", desc: "$NaOH(aq) + HCl(aq) \\rightarrow NaCl(aq) + H_2O(l)$" }
  ],
  correctKey: "B",
  explanation: "Heating Calcium Carbonate ($CaCO_3$) decomposes it into Calcium Oxide ($CaO$) and Carbon Dioxide ($CO_2$). Since it requires heat energy, it is a thermal decomposition reaction.",
  shortQuestion: "Why are decomposition reactions called the opposite of combination reactions? Explain with reference to chemical equations.",
  shortAnswer: "In a combination reaction, two or more substances combine to form a single new substance (e.g., $C + O_2 \\rightarrow CO_2$). In contrast, in a decomposition reaction, a single compound breaks down into two or more simpler substances (e.g., $CaCO_3 \\rightarrow CaO + CO_2$). Therefore, they are exact opposites."
};

const fallbackRevision = {
  title: "Refraction & Lens Power Summary",
  revisionPoints: [
    "**Refractive Index ($n$):** Ratio of light speeds: $n = \\frac{c}{v}$.",
    "**Snell's Law:** Ratio of sines is constant: $\\frac{\\sin i}{\\sin r} = n_{21}$.",
    "**Power of Lens ($P$):** Reciprocal of focal length: $P = \\frac{1}{f}$ (f must be in meters). SI Unit is Dioptre (D).",
    "**Lens Sign Conventions:** Convex lenses have positive focal length ($+f$), Concave lenses have negative ($-f$)."
  ],
  formulas: [
    { name: "Refractive Index", formula: "$n = \\frac{c}{v}$" },
    { name: "Snell's Law", formula: "$\\frac{\\sin i}{\\sin r} = n_{21}$" },
    { name: "Power of Lens", formula: "$P = \\frac{1}{f \\text{ (in meters)}}$" }
  ],
  commonMistakes: [
    "Forgetting to convert focal length to meters in Lens Power calculations.",
    "Incorrectly assigning positive focal length to a concave lens."
  ],
  topperTips: [
    "Always specify the unit 'Dioptre' or 'D' and specify lens convexity/concavity directly.",
    "Draw accurate light ray diagrams to score full marks in numericals."
  ],
  questionText: "If a doctor prescribes a lens of power $+2.0\\text{ D}$, what is its focal length and lens type?",
  options: [
    { key: 'A', desc: "$f = -0.5\\text{ m}$, Concave" },
    { key: 'B', desc: "$f = +0.5\\text{ m}$, Convex" },
    { key: 'C', desc: "$f = +2.0\\text{ m}$, Convex" },
    { key: 'D', desc: "$f = -2.0\\text{ m}$, Concave" }
  ],
  correctKey: 'B',
  explanation: "Power is positive $+2.0\\text{ D}$, so the lens is Convex. Focal length: $f = \\frac{1}{P} = \\frac{1}{2.0} = 0.5\\text{ m} = +0.5\\text{ m}$.",
  shortQuestion: "What is 1 Dioptre of power of a lens? Write its relation to focal length.",
  shortAnswer: "One dioptre is the power of a lens whose focal length is exactly 1 meter ($1\\text{ D} = 1\\text{ m}^{-1}$). It is represented as $P = \\frac{1}{f}$, where $f$ is focal length in meters."
};

const fallbackActiveRecall = {
  topic: "Life Processes: Nutrition & Digestion",
  cards: [
    {
      id: 1,
      question: "What is the function of gastric juice ($HCl$, pepsin, mucus) in the stomach?",
      answer: "Gastric juice contains: \n1. **Hydrochloric Acid ($HCl$):** Creates an acidic medium ($pH \\approx 1.8$) necessary for the activation of pepsin, and kills harmful bacteria.\n2. **Pepsin:** An enzyme that digests proteins into peptones.\n3. **Mucus:** Protects the inner lining of the stomach from the corrosive action of the acid."
    },
    {
      id: 2,
      question: "Why is the length of the small intestine longer in herbivores compared to carnivores?",
      answer: "Herbivores eat grass/cellulose which takes longer to digest, requiring a longer small intestine with more surface area for enzymes to act. Carnivores eat meat which is easier to digest, so their small intestine is shorter."
    },
    {
      id: 3,
      question: "What are villi, and what is their role in absorption?",
      answer: "Villi are tiny, finger-like projections lining the inner walls of the small intestine. They increase the surface area for rapid absorption of digested food. They are richly supplied with blood vessels that carry nutrients to all cells of the body."
    }
  ]
};

const fallbackQuiz = {
  quizTitle: "Chemistry Core MCQ Quiz",
  questions: [
    {
      questionText: "Which of the following is a decomposition reaction?",
      options: [
        { key: 'A', desc: "$2\\text{H}_2 + \\text{O}_2 \\longrightarrow 2\\text{H}_2\\text{O}$ (Combination)" },
        { key: 'B', desc: "$\\text{CaCO}_3 \\longrightarrow \\text{CaO} + \\text{CO}_2$ (Decomposition)" },
        { key: 'C', desc: "$\\text{Zn} + \\text{CuSO}_4 \\longrightarrow \\text{ZnSO}_4 + \\text{Cu}$ (Displacement)" },
        { key: 'D', desc: "None of the above" }
      ],
      correctKey: 'B',
      explanation: "A single reactant decomposes into multiple products. $\\text{CaCO}_3$ splits into $\\text{CaO}$ and $\\text{CO}_2$."
    },
    {
      questionText: "The pH value of an acidic solution is:",
      options: [
        { key: 'A', desc: "Less than 7" },
        { key: 'B', desc: "Equal to 7" },
        { key: 'C', desc: "Greater than 7" },
        { key: 'D', desc: "Varies dynamically" }
      ],
      correctKey: 'A',
      explanation: "pH < 7 is acidic, pH = 7 is neutral, and pH > 7 is basic."
    },
    {
      questionText: "Which of the following metals is stored under kerosene oil to prevent accidental fires?",
      options: [
        { key: 'A', desc: "Gold" },
        { key: 'B', desc: "Sodium" },
        { key: 'C', desc: "Copper" },
        { key: 'D', desc: "Silver" }
      ],
      correctKey: 'B',
      explanation: "Sodium is highly reactive with air and water, so it is kept under kerosene."
    },
    {
      questionText: "The functional group present in ethanol ($\\text{CH}_3\\text{CH}_2\\text{OH}$) is:",
      options: [
        { key: 'A', desc: "Aldehyde ($-\\text{CHO}$)" },
        { key: 'B', desc: "Alcohol ($-\\text{OH}$)" },
        { key: 'C', desc: "Carboxylic Acid ($-\\text{COOH}$)" },
        { key: 'D', desc: "Ketone ($-\\text{CO}-$)" }
      ],
      correctKey: 'B',
      explanation: "Ethanol ends in -ol and contains the hydroxyl ($-\\text{OH}$) functional group of alcohols."
    },
    {
      questionText: "Bronze is a metallic alloy primarily composed of:",
      options: [
        { key: 'A', desc: "Copper and Zinc" },
        { key: 'B', desc: "Copper and Tin" },
        { key: 'C', desc: "Lead and Tin" },
        { key: 'D', desc: "Iron and Carbon" }
      ],
      correctKey: 'B',
      explanation: "Bronze is made of copper and tin, while brass is made of copper and zinc."
    },
    {
      questionText: "Which of the following is a neutral oxide?",
      options: [
        { key: 'A', desc: "Carbon Monoxide ($CO$)" },
        { key: 'B', desc: "Carbon Dioxide ($CO_2$)" },
        { key: 'C', desc: "Sulphur Dioxide ($SO_2$)" },
        { key: 'D', desc: "Calcium Oxide ($CaO$)" }
      ],
      correctKey: 'A',
      explanation: "Carbon Monoxide ($CO$) and Nitrous Oxide ($N_2O$) are neutral oxides, while non-metal oxides like $CO_2$ and $SO_2$ are acidic, and metal oxides like $CaO$ are basic."
    }
  ]
};



export default function Home() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const firstName = currentUser?.displayName?.split(' ')[0] || 'Student';
  const isGuest = currentUser?.isGuest;

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

    const missionTemplates = [
      {
        type: 'mindmap',
        labelFn: (s, ch) => `Interactive Mind Map: Explore ${s} - ${ch}`,
        xp: 25,
      },
      {
        type: 'revision',
        labelFn: (s, ch) => `High-Density Revision: ${s} - ${ch}`,
        xp: 25,
      },
      {
        type: 'active_recall',
        labelFn: (s, ch) => `Active Recall Challenge: ${s} - ${ch}`,
        xp: 30,
      },
      {
        type: 'quiz',
        labelFn: (s, ch) => `Practice Quiz: Solve ${s} - ${ch}`,
        xp: 30,
      },
    ];

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
      const tmplIdx = (idx + today) % missionTemplates.length;
      const tmpl = missionTemplates[tmplIdx];
      const mission = {
        id: `m_${idx + 1}`,
        type: tmpl.type,
        label: tmpl.labelFn(subj, activeCh.replace(/^Chapter \d+:\s*/, '')),
        xp: tmpl.xp,
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

    // Persist profile
    const profile = { board: setupBoard, grade: setupClass, subjects: subjectsArray };
    localStorage.setItem('tanios_profile', JSON.stringify(profile));

    // Generate missions
    const newMissions = generateMissionsFromProfile(setupBoard, setupClass, subjectsArray, activeChapters);
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
      localStorage.setItem(key, typeof value === 'object' ? JSON.stringify(value) : value.toString());
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
      const storedXp          = localStorage.getItem('tanios_xp');
      const storedStreak      = localStorage.getItem('tanios_streak');
      const storedConsistency = localStorage.getItem('tanios_consistency');
      const storedBadges      = localStorage.getItem('tanios_badges');
      const storedWeaknesses  = localStorage.getItem('tanios_weaknesses');
      const storedMissions    = localStorage.getItem('tanios_missions');
      const storedProfile     = localStorage.getItem('tanios_profile');

      // ── Numeric counters ── default to 0 for fresh sessions
      setXp(storedXp ? parseInt(storedXp, 10) : 0);
      setStreak(storedStreak ? parseInt(storedStreak, 10) : 0);
      setConsistency(storedConsistency ? parseInt(storedConsistency, 10) : 0);

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
        const storedActiveChapters = localStorage.getItem('tanios_active_chapters');
        const activeChaptersMap = storedActiveChapters ? JSON.parse(storedActiveChapters) : {};
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
            localStorage.setItem('tanios_missions', JSON.stringify(missionsToUse));
          }
        } else {
          // No stored missions yet (fresh profile or wiped) — generate now
          missionsToUse = generateMissionsFromProfile(profile.board, profile.grade, profile.subjects, activeChaptersMap);
          localStorage.setItem('tanios_missions', JSON.stringify(missionsToUse));
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

    // Update consistency score
    const newCons = Math.min(100, consistency + 2);
    setConsistency(newCons);
    saveState('tanios_consistency', newCons);

    // ── STREAK LOGIC: increment streak only when ALL non-login missions are done ──
    if (isLastMission) {
      const todayKey = new Date().toISOString().slice(0, 10);
      const lastStreakDay = localStorage.getItem('tanios_streak_day') || '';

      if (lastStreakDay !== todayKey) {
        // First time completing all missions today → increment streak
        const newStreak = streak + 1;
        setStreak(newStreak);
        saveState('tanios_streak', newStreak);
        localStorage.setItem('tanios_streak_day', todayKey);
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

    // ── Systematic study pacing instructions based on days remaining ──
    const studyInstructions = `
Target Subject: ${subject}
Target Class/Grade: Class ${grade}
Target Board: ${board}
Days Remaining until Exams: ${diffDays} Days

SYSTEMATIC STUDY PACING LAW:
You are an elite, highly structured personal teacher. You are pacing the student's study plan so they complete their ENTIRE syllabus of this subject (${subject}) systematically by their exam date (which is in ${diffDays} days).
Pacing Logic:
1. Standard academic year has ~250 to 300 days remaining (starting in April/May). If ${diffDays} >= 220, the student is at the very beginning of the syllabus. You MUST generate questions strictly for Chapter 1 of the official Class ${grade} ${subject} syllabus (e.g. Mole Concept/Basic Concepts in Chem, physical world/units in Physics, Chapter 1 in Math, etc.).
2. If ${diffDays} is between 150 and 220, they should be in the early-middle syllabus. Generate for Chapter 2, 3 or 4.
3. If ${diffDays} is between 75 and 150, they should be in the late-middle syllabus. Generate for Chapter 5, 6, 7 or 8.
4. If ${diffDays} is under 75, they are in the final revision sprint phase. Generate for high-weightage chapters, mock revision questions, or ending chapters.

Your output task/material MUST be specifically and exclusively for the chapter calculated from this pacing logic! You must make the tasks systematically move forward day-by-day.
`;

    let prompt = '';
    const chapter = mission.chapter || 'General Syllabus';

    if (mission.type === 'mindmap') {
      prompt = `You are an elite syllabus-expert personal AI teacher built for Class ${grade} ${board} board students.
SYSTEMATIC EDUCATION LAW:
You MUST teach the student a highly structured, specific, and clear *new* concept from the syllabus of ${subject}, chapter: '${chapter}', starting from the fundamental principles.
Make sure the target is educational, teaching them something new and engaging.
In addition to the notes/material, you must ask a Multiple Choice Question (MCQ) to check understanding, AND a conceptual Short Question with a Topper model answer to test active recall.

Generate a comprehensive, highly-structured, and beautiful interactive Mind Map (Hierarchical text diagram) for this chapter and topic.
Your output MUST be a valid JSON object with the following keys. Do not include any conversational text or markdown code blocks (no \`\`\`json). Output raw JSON only.

JSON Structure:
{
  "topic": "Chapter Name and Central Concept (e.g. Chemical Reactions: Types of Reactions)",
  "branches": [
    {
      "title": "Subtopic A Title",
      "description": "A crisp, engaging overview description. Wrap any math formulas, variables, or chemical equations in LaTeX $ delimiters (e.g. $A + B \\rightarrow AB$).",
      "points": [
        "Key point 1 with LaTeX formulas.",
        "Key point 2 with LaTeX formulas.",
        "Key point 3 with LaTeX formulas."
      ]
    },
    {
      "title": "Subtopic B Title",
      "description": "Description...",
      "points": [
        "Point 1...",
        "Point 2..."
      ]
    },
    {
      "title": "Subtopic C Title",
      "description": "Description...",
      "points": [
        "Point 1...",
        "Point 2..."
      ]
    }
  ],
  "verificationQuestion": "A quick conceptual check MCQ to verify they read and understood the mind map.",
  "options": [
    { "key": "A", "desc": "Option A description" },
    { "key": "B", "desc": "Option B description" },
    { "key": "C", "desc": "Option C description" },
    { "key": "D", "desc": "Option D description" }
  ],
  "correctKey": "A, B, C, or D",
  "explanation": "Topper explanation of the validation question. Wrap math in $.",
  "shortQuestion": "A conceptual, deep, exam-style short question based on the concept taught above.",
  "shortAnswer": "A premium, step-by-step topper model answer for the short question. Keep it concise, high-yield, and clear. Wrap math/equations in $."
}`;
    } else if (mission.type === 'revision') {
      prompt = `You are an elite syllabus-expert personal AI teacher built for Class ${grade} ${board} board students.
SYSTEMATIC EDUCATION LAW:
You MUST teach the student a highly structured, specific, and clear *new* concept from the syllabus of ${subject}, chapter: '${chapter}', starting from the fundamental principles.
Make sure the target is educational, teaching them something new and engaging.
In addition to the notes/material, you must ask a Multiple Choice Question (MCQ) to check understanding, AND a conceptual Short Question with a Topper model answer to test active recall.

Generate a high-density, high-yield study sheet and a retention Multiple Choice Question (MCQ) for this topic.
Your output MUST be a valid JSON object with the following keys. Do not include any conversational text or markdown code blocks (no \`\`\`json). Output raw JSON only.

JSON Structure:
{
  "title": "A short, engaging revision title (e.g. Chapter 1: Chemical Reactions Revision Card)",
  "revisionPoints": [
    "A concise, high-density bullet point of the core concept. Wrap all formulas, variables, scientific notation, equations in LaTeX $ delimiters.",
    "Another high-density revision bullet point.",
    "Another high-density revision bullet point.",
    "One more high-density revision bullet point."
  ],
  "formulas": [
    { "name": "Formula/Equation Name (e.g. Power of Lens)", "formula": "LaTeX formula (e.g. $P = \\frac{1}{f}$)" },
    { "name": "Formula/Equation Name 2", "formula": "LaTeX formula 2" }
  ],
  "commonMistakes": [
    "Common mistake students make in this topic (e.g. Forgetting to convert focal length to meters in Lens Power calculations).",
    "Another common exam mistake."
  ],
  "topperTips": [
    "Topper tip for securing full marks (e.g. Always write SI units like Dioptre (D) and mention convexity/concavity explicitly).",
    "Another topper study tip."
  ],
  "questionText": "A quick conceptual check question based on the above revision points. Wrap all formulas/math/variables in KaTeX $ delimiters.",
  "options": [
    { "key": "A", "desc": "Option A description. Wrap any math in $ delimiters." },
    { "key": "B", "desc": "Option B description" },
    { "key": "C", "desc": "Option C description" },
    { "key": "D", "desc": "Option D description" }
  ],
  "correctKey": "A, B, C, or D",
  "explanation": "A clear, concise topper explanation of the solution. Wrap all math/equations in $ delimiters.",
  "shortQuestion": "A high-yield conceptual short answer question to test active recall of this topic.",
  "shortAnswer": "Topper model answer to the short answer question, highlighting key terms. Wrap math in $."
}`;
    } else if (mission.type === 'active_recall') {
      prompt = `You are an elite syllabus-expert personal AI teacher built for Class ${grade} ${board} board students.
SYSTEMATIC EDUCATION LAW:
You MUST teach the student a highly structured, specific, and clear *new* concept from the syllabus of ${subject}, chapter: '${chapter}', starting from the fundamental principles.
Make sure the target is educational, teaching them something new and engaging.

Generate 3 high-yield conceptual Active Recall Flashcards (conceptual short-answer questions and model answers) for this topic.
Your output MUST be a valid JSON object with the following keys. Do not include any conversational text or markdown code blocks (no \`\`\`json). Output raw JSON only.

JSON Structure:
{
  "topic": "Topic Name: Active Recall Challenge",
  "cards": [
    {
      "id": 1,
      "question": "A conceptual, deep, exam-style question. Wrap any math formulas, variables, chemical equations, or scientific notation in KaTeX dollar-sign delimiters (e.g., $v = u + at$).",
      "answer": "A premium, step-by-step model answer written in CBSE/State-board marking scheme style that gets full marks. Highlight key terms by wrapping them in bold (e.g. **pepsin**). Wrap all formulas, variables, and scientific expressions in LaTeX $ delimiters."
    },
    {
      "id": 2,
      "question": "Question 2 text...",
      "answer": "Answer 2 text..."
    },
    {
      "id": 3,
      "question": "Question 3 text...",
      "answer": "Answer 3 text..."
    }
  ]
}`;
    } else if (mission.type === 'quiz') {
      prompt = `You are an elite syllabus-expert personal AI teacher built for Class ${grade} ${board} board students.
SYSTEMATIC EDUCATION LAW:
You MUST test the student on highly structured, specific, and clear concepts from the syllabus of ${subject}, chapter: '${chapter}'.
Make sure the quiz is educational, testing their conceptual and application understanding.

Generate a 6-question high-yield, syllabus-aligned Multiple Choice Quiz (MCQ) for this topic.
Your output MUST be a valid JSON object with the following keys. Do not include any conversational text or markdown code blocks (no \`\`\`json). Output raw JSON only.

JSON Structure:
{
  "quizTitle": "Engaging title for the quiz (e.g., Chemical Reactions MCQ Challenge)",
  "questions": [
    {
      "questionText": "Question 1 text. Wrap all math, variables, equations, chemical terms in LaTeX $ delimiters.",
      "options": [
        { "key": "A", "desc": "Option A text. Wrap any math in $." },
        { "key": "B", "desc": "Option B text" },
        { "key": "C", "desc": "Option C text" },
        { "key": "D", "desc": "Option D text" }
      ],
      "correctKey": "A, B, C, or D",
      "explanation": "Brief step-by-step explanation. Wrap math in $."
    },
    {
      "questionText": "Question 2 text. Wrap all math, variables, equations, chemical terms in LaTeX $ delimiters.",
      "options": [
        { "key": "A", "desc": "Option A text" },
        { "key": "B", "desc": "Option B text" },
        { "key": "C", "desc": "Option C text" },
        { "key": "D", "desc": "Option D text" }
      ],
      "correctKey": "A, B, C, or D",
      "explanation": "Brief step-by-step explanation."
    },
    {
      "questionText": "Question 3 text...",
      "options": [
        { "key": "A", "desc": "Option A text" },
        { "key": "B", "desc": "Option B text" },
        { "key": "C", "desc": "Option C text" },
        { "key": "D", "desc": "Option D text" }
      ],
      "correctKey": "A, B, C, or D",
      "explanation": "Brief explanation."
    },
    {
      "questionText": "Question 4 text...",
      "options": [
        { "key": "A", "desc": "Option A text" },
        { "key": "B", "desc": "Option B text" },
        { "key": "C", "desc": "Option C text" },
        { "key": "D", "desc": "Option D text" }
      ],
      "correctKey": "A, B, C, or D",
      "explanation": "Brief explanation."
    },
    {
      "questionText": "Question 5 text...",
      "options": [
        { "key": "A", "desc": "Option A text" },
        { "key": "B", "desc": "Option B text" },
        { "key": "C", "desc": "Option C text" },
        { "key": "D", "desc": "Option D text" }
      ],
      "correctKey": "A, B, C, or D",
      "explanation": "Brief explanation."
    },
    {
      "questionText": "Question 6 text...",
      "options": [
        { "key": "A", "desc": "Option A text" },
        { "key": "B", "desc": "Option B text" },
        { "key": "C", "desc": "Option C text" },
        { "key": "D", "desc": "Option D text" }
      ],
      "correctKey": "A, B, C, or D",
      "explanation": "Brief explanation."
    }
  ]
}`;
    }

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
                      
                      return (
                        <div key={subj} style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '8px', padding: '0.5rem' }}>
                          <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {subj}
                          </span>
                          {chapters.length > 0 ? (
                            <select
                              value={currentCh}
                              onChange={(e) => {
                                const val = e.target.value;
                                const updated = { ...activeChapters, [subj]: val };
                                setActiveChapters(updated);
                                localStorage.setItem('tanios_active_chapters', JSON.stringify(updated));
                                const newMissions = generateMissionsFromProfile(profileBoard, profileClass, profileSubjects, updated);
                                setMissions(newMissions);
                                localStorage.setItem('tanios_missions', JSON.stringify(newMissions));
                              }}
                              style={{ width: '100%', fontSize: '0.72rem', background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: '4px', padding: '0.2rem' }}
                            >
                              <option value="">Select Chapter...</option>
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
                                localStorage.setItem('tanios_active_chapters', JSON.stringify(updated));
                                const newMissions = generateMissionsFromProfile(profileBoard, profileClass, profileSubjects, updated);
                                setMissions(newMissions);
                                localStorage.setItem('tanios_missions', JSON.stringify(newMissions));
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

          {/* 2. WEAKNESS CLINIC & HEALING REGISTRY */}
          <section className="card" style={{ borderLeft: '4px solid #ef4444' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.1rem' }}>🩹</span>
                <h2 style={{ fontSize: '1.1rem', margin: 0 }}>Weak Subjects Clinic</h2>
              </div>
              <button 
                onClick={() => setShowAddWeakness(!showAddWeakness)}
                style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '50%', width: '1.5rem', height: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', fontWeight: 'bold' }}
              >
                +
              </button>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '1rem' }}>
              Track chapters with low scores. Let TaniOS AI study with you to heal learning gaps instantly.
            </p>

            {/* Quick add weakness form */}
            {showAddWeakness && (
              <form onSubmit={addWeakness} style={{ background: 'var(--bg-tertiary)', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', border: '1px solid var(--border)' }}>
                <div style={{ marginBottom: '0.5rem' }}>
                  <input 
                    type="text" 
                    placeholder="Subject (e.g. Physics)" 
                    className="input-field" 
                    required 
                    value={newWeakSubject}
                    onChange={e => setNewWeakSubject(e.target.value)}
                    style={{ padding: '0.35rem 0.5rem', fontSize: '0.8rem' }}
                  />
                </div>
                <div style={{ marginBottom: '0.5rem' }}>
                  <input 
                    type="text" 
                    placeholder="Chapter / Topic" 
                    className="input-field" 
                    required 
                    value={newWeakChapter}
                    onChange={e => setNewWeakChapter(e.target.value)}
                    style={{ padding: '0.35rem 0.5rem', fontSize: '0.8rem' }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button type="submit" className="btn btn-primary" style={{ padding: '0.3rem 0.75rem', fontSize: '0.75rem', backgroundColor: '#ef4444', border: 'none' }}>
                    Track
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowAddWeakness(false)} style={{ padding: '0.3rem 0.75rem', fontSize: '0.75rem' }}>
                    Cancel
                  </button>
                </div>
              </form>
            )}

            <div>
              {weaknesses.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                  🎉 No weak chapters recorded! You are doing amazing.
                </div>
              ) : (
                weaknesses.map(w => (
                  <div key={w.id} className="weakness-row">
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>{w.chapter}</div>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{w.subject}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span className="weakness-badge">{w.score}% score</span>
                      <button 
                        onClick={() => healWeakness(w)}
                        title="Heal this topic now" 
                        style={{ padding: '0.25rem 0.5rem', background: '#ef4444', color: 'white', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 'bold' }}
                      >
                        Heal 🩹
                      </button>
                      <button 
                        onClick={() => removeWeakness(w.id)}
                        style={{ color: 'var(--text-secondary)', opacity: 0.4 }}
                        title="Remove tracking"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

        </div>

      </div>

      {/* C. EXAM MODE ROADMAP ENGINE (BOARD COUNTDOWN SYSTEM) */}
      <section className="card" style={{ borderLeft: '4px solid var(--accent)', marginTop: '1.5rem' }}>
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
                  ⚡ ACTIVE DAILY MISSION
                </span>
                <h4 style={{ margin: 0, color: '#fff', fontSize: '1.1rem', fontWeight: 800 }}>
                  {activeMission.type === 'concept' && `Doubt Practice: Solve ${activeMission.subject || 'Math'} Concept`}
                  {activeMission.type === 'revision' && `15-Min Revision: ${activeMission.subject || 'Physics'} Quick Recap`}
                  {activeMission.type === 'quiz' && `Quick Quiz: ${activeMission.subject || 'Chemistry'} MCQ Test`}
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
            <div style={{ marginBottom: '1.75rem', flex: 1 }}>
              {missionLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', gap: '1.5rem', textAlign: 'center' }}>
                  <Loader2 size={40} style={{ color: 'var(--primary)', animation: 'spin 1.5s linear infinite' }} />
                  <div>
                    <h4 style={{ margin: '0 0 0.5rem 0', color: '#fff', fontSize: '1.1rem', fontWeight: 800 }}>TaniOS AI Study Engine</h4>
                    <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                      Engineering high-yield board study tasks for <strong>{activeMission.subject || 'your subjects'}</strong> (Class {profileClass || '10'})...
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  {/* 1. MINDMAP (Interactive Mind Map with validation MCQ) */}
                  {activeMission.type === 'mindmap' && (() => {
                    const data = dynamicMissionContent || fallbackMindMap;
                    const branches = data.branches || fallbackMindMap.branches;
                    return (
                      <div>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '1.25rem' }}>
                          🧠 Explore the interactive mind map for <strong>{data.topic || "this topic"}</strong>:
                        </p>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                          {branches.map((branch, bIdx) => (
                            <div key={bIdx} style={{
                              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.05), rgba(167, 139, 250, 0.08))',
                              border: '1px solid rgba(99, 102, 241, 0.15)',
                              borderRadius: '12px', padding: '1rem',
                              position: 'relative'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                <span style={{ fontSize: '1rem' }}>📍</span>
                                <strong style={{ color: '#fff', fontSize: '0.9rem' }}>{branch.title}</strong>
                              </div>
                              <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                                <ReactMarkdown
                                  remarkPlugins={[remarkGfm, remarkMath]}
                                  rehypePlugins={[rehypeKatex]}
                                  components={markdownComponents}
                                >{branch.description}</ReactMarkdown>
                              </p>
                              <ul style={{ paddingLeft: '1.2rem', margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                                {branch.points.map((pt, pIdx) => (
                                  <li key={pIdx} style={{ marginBottom: '0.25rem' }}>
                                    <ReactMarkdown
                                      remarkPlugins={[remarkGfm, remarkMath]}
                                      rehypePlugins={[rehypeKatex]}
                                      components={markdownComponents}
                                    >{pt}</ReactMarkdown>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>

                        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '1.25rem' }}>
                          <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: '0.5rem' }}>
                            ⚡ MIND MAP CHECKPOINT
                          </span>
                          <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#fff', marginBottom: '0.75rem', lineHeight: 1.4 }}>
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm, remarkMath]}
                              rehypePlugins={[rehypeKatex]}
                              components={markdownComponents}
                            >{data.verificationQuestion || data.questionText}</ReactMarkdown>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                            {data.options.map(opt => {
                              const isSelected = missionAnswer === opt.key;
                              return (
                                <button
                                  key={opt.key}
                                  onClick={() => !missionSubmitted && setMissionAnswer(opt.key)}
                                  disabled={missionSubmitted}
                                  style={{
                                    display: 'flex', alignItems: 'center', gap: '1rem',
                                    width: '100%', padding: '0.75rem 1rem',
                                    background: isSelected ? 'rgba(108, 99, 255, 0.12)' : 'rgba(255, 255, 255, 0.01)',
                                    border: isSelected ? '1px solid var(--primary)' : '1px solid rgba(255,255,255,0.05)',
                                    borderRadius: '10px', color: '#fff', textAlign: 'left',
                                    cursor: missionSubmitted ? 'default' : 'pointer',
                                    transition: 'all 0.2s'
                                  }}
                                >
                                  <div style={{
                                    width: '22px', height: '22px', borderRadius: '50%',
                                    background: isSelected ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '0.72rem', fontWeight: 800, color: isSelected ? '#fff' : 'var(--text-secondary)'
                                  }}>
                                    {opt.key}
                                  </div>
                                  <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>
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

                          {missionSubmitted && (
                            <div style={{
                              marginTop: '1.25rem', padding: '1rem',
                              background: missionAnswer === data.correctKey ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                              border: missionAnswer === data.correctKey ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(239, 68, 68, 0.2)',
                              borderRadius: '10px', fontSize: '0.82rem', lineHeight: 1.5, color: 'var(--text-secondary)'
                            }}>
                              {missionAnswer === data.correctKey ? (
                                <>
                                  🎉 <strong style={{ color: '#10b981' }}>Correct Answer!</strong> <br />
                                  <div style={{ marginBottom: '1rem' }}>
                                    <ReactMarkdown
                                      remarkPlugins={[remarkGfm, remarkMath]}
                                      rehypePlugins={[rehypeKatex]}
                                      components={markdownComponents}
                                    >{data.explanation}</ReactMarkdown>
                                  </div>

                                  {/* Conceptual Short Question */}
                                  <div style={{
                                    marginTop: '1rem', paddingTop: '1rem',
                                    borderTop: '1px solid rgba(255,255,255,0.06)'
                                  }}>
                                    <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '0.35rem' }}>
                                      ⚡ ACTIVE RECALL: CONCEPTUAL SHORT QUESTION
                                    </span>
                                    <div style={{ fontWeight: 700, color: '#fff', marginBottom: '0.5rem' }}>
                                      <ReactMarkdown
                                        remarkPlugins={[remarkGfm, remarkMath]}
                                        rehypePlugins={[rehypeKatex]}
                                        components={markdownComponents}
                                      >{data.shortQuestion || "Explain how this core concept works in your own words."}</ReactMarkdown>
                                    </div>
                                    {!showShortAnswer ? (
                                      <button
                                        onClick={() => setShowShortAnswer(true)}
                                        className="btn"
                                        style={{
                                          padding: '0.4rem 0.8rem', fontSize: '0.72rem', fontWeight: 700,
                                          background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                                          color: '#fff', borderRadius: '6px', cursor: 'pointer'
                                        }}
                                      >
                                        Reveal Topper Model Answer 👁️
                                      </button>
                                    ) : (
                                      <div style={{ marginTop: '0.5rem', background: 'rgba(255,255,255,0.02)', padding: '0.5rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.04)' }}>
                                        <strong style={{ color: '#fbbf24', fontSize: '0.72rem', display: 'block', textTransform: 'uppercase', marginBottom: '0.2rem' }}>
                                          🥇 topper model answer:
                                        </strong>
                                        <div style={{ color: '#fff', fontSize: '0.78rem' }}>
                                          <ReactMarkdown
                                            remarkPlugins={[remarkGfm, remarkMath]}
                                            rehypePlugins={[rehypeKatex]}
                                            components={markdownComponents}
                                          >{data.shortAnswer || "Identify key points and compare with your mental notes."}</ReactMarkdown>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </>
                              ) : (
                                <>
                                  ❌ <strong style={{ color: '#f87171' }}>Wrong Answer.</strong> <br />
                                  Select option <strong>{data.correctKey}</strong> to solve!
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* 2. REVISION (High-Density Revision & Formula Card) */}
                  {activeMission.type === 'revision' && (() => {
                    const data = dynamicMissionContent || fallbackRevision;
                    const formulas = data.formulas || [];
                    const commonMistakes = data.commonMistakes || [];
                    const topperTips = data.topperTips || [];
                    return (
                      <div>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '1rem' }}>
                          📚 Read this high-density study card and solve the retention question:
                        </p>

                        <div style={{
                          background: 'linear-gradient(135deg, rgba(167, 139, 250, 0.05), rgba(108, 99, 255, 0.08))',
                          border: '1px solid rgba(167, 139, 250, 0.15)',
                          borderRadius: '12px', padding: '1rem 1.25rem', marginBottom: '1.25rem',
                          fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.6
                        }}>
                          <strong style={{ color: '#fff', fontSize: '0.9rem', display: 'block', marginBottom: '0.5rem' }}>
                            ⚡ {data.title}
                          </strong>
                          <ul style={{ paddingLeft: '1.25rem', margin: '0 0 1rem 0' }}>
                            {data.revisionPoints.map((pt, idx) => (
                              <li key={idx} style={{ marginBottom: '0.35rem' }}>
                                <ReactMarkdown
                                  remarkPlugins={[remarkGfm, remarkMath]}
                                  rehypePlugins={[rehypeKatex]}
                                  components={markdownComponents}
                                >{pt}</ReactMarkdown>
                              </li>
                            ))}
                          </ul>

                          {formulas.length > 0 && (
                            <div style={{ marginBottom: '1rem' }}>
                              <strong style={{ color: 'var(--accent)', fontSize: '0.75rem', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.35rem' }}>
                                📐 Core Formulas / Equations
                              </strong>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.4rem' }}>
                                {formulas.map((f, idx) => (
                                  <div key={idx} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '6px', padding: '0.4rem 0.6rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.72rem' }}>{f.name}</span>
                                    <span style={{ color: '#fff', fontSize: '0.75rem' }}>
                                      <ReactMarkdown
                                        remarkPlugins={[remarkGfm, remarkMath]}
                                        rehypePlugins={[rehypeKatex]}
                                        components={markdownComponents}
                                      >{f.formula}</ReactMarkdown>
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
                            {commonMistakes.length > 0 && (
                              <div style={{ background: 'rgba(239, 68, 68, 0.03)', border: '1px solid rgba(239, 68, 68, 0.1)', borderRadius: '8px', padding: '0.6rem' }}>
                                <span style={{ color: '#f87171', fontWeight: 800, fontSize: '0.72rem', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>
                                  ⚠️ Avoid These Exam Mistakes
                                </span>
                                <ul style={{ paddingLeft: '1rem', margin: 0, fontSize: '0.7rem', color: '#fca5a5' }}>
                                  {commonMistakes.map((m, idx) => <li key={idx} style={{ marginBottom: '0.2rem' }}>{m}</li>)}
                                </ul>
                              </div>
                            )}

                            {topperTips.length > 0 && (
                              <div style={{ background: 'rgba(245, 158, 11, 0.03)', border: '1px solid rgba(245, 158, 11, 0.1)', borderRadius: '8px', padding: '0.6rem' }}>
                                <span style={{ color: '#fbbf24', fontWeight: 800, fontSize: '0.72rem', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>
                                  🥇 Board Topper Tips
                                </span>
                                <ul style={{ paddingLeft: '1rem', margin: 0, fontSize: '0.7rem', color: '#fde047' }}>
                                  {topperTips.map((t, idx) => <li key={idx} style={{ marginBottom: '0.2rem' }}>{t}</li>)}
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>

                        <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#fff', marginBottom: '0.75rem', lineHeight: 1.4 }}>
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm, remarkMath]}
                            rehypePlugins={[rehypeKatex]}
                            components={markdownComponents}
                          >{data.questionText}</ReactMarkdown>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                          {data.options.map(opt => {
                            const isSelected = missionAnswer === opt.key;
                            return (
                              <button
                                key={opt.key}
                                onClick={() => !missionSubmitted && setMissionAnswer(opt.key)}
                                disabled={missionSubmitted}
                                style={{
                                  display: 'flex', alignItems: 'center', gap: '1rem',
                                  width: '100%', padding: '0.75rem 1rem',
                                  background: isSelected ? 'rgba(108, 99, 255, 0.12)' : 'rgba(255, 255, 255, 0.01)',
                                  border: isSelected ? '1px solid var(--primary)' : '1px solid rgba(255,255,255,0.05)',
                                  borderRadius: '10px', color: '#fff', textAlign: 'left',
                                  cursor: missionSubmitted ? 'default' : 'pointer',
                                  transition: 'all 0.2s'
                                }}
                              >
                                <div style={{
                                  width: '22px', height: '22px', borderRadius: '50%',
                                  background: isSelected ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  fontSize: '0.72rem', fontWeight: 800, color: isSelected ? '#fff' : 'var(--text-secondary)'
                                }}>
                                  {opt.key}
                                </div>
                                <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>
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

                        {missionSubmitted && (
                          <div style={{
                            marginTop: '1.25rem', padding: '1rem',
                            background: missionAnswer === data.correctKey ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                            border: missionAnswer === data.correctKey ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(239, 68, 68, 0.2)',
                            borderRadius: '10px', fontSize: '0.82rem', lineHeight: 1.5, color: 'var(--text-secondary)'
                          }}>
                            {missionAnswer === data.correctKey ? (
                              <>
                                🎉 <strong style={{ color: '#10b981' }}>Correct Answer!</strong> <br />
                                <div style={{ marginBottom: '1rem' }}>
                                  <ReactMarkdown
                                    remarkPlugins={[remarkGfm, remarkMath]}
                                    rehypePlugins={[rehypeKatex]}
                                    components={markdownComponents}
                                  >{data.explanation}</ReactMarkdown>
                                </div>

                                {/* Conceptual Short Question */}
                                <div style={{
                                  marginTop: '1rem', paddingTop: '1rem',
                                  borderTop: '1px solid rgba(255,255,255,0.06)'
                                }}>
                                  <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '0.35rem' }}>
                                    ⚡ ACTIVE RECALL: CONCEPTUAL SHORT QUESTION
                                  </span>
                                  <div style={{ fontWeight: 700, color: '#fff', marginBottom: '0.5rem' }}>
                                    <ReactMarkdown
                                      remarkPlugins={[remarkGfm, remarkMath]}
                                      rehypePlugins={[rehypeKatex]}
                                      components={markdownComponents}
                                    >{data.shortQuestion || "Explain how this core concept works in your own words."}</ReactMarkdown>
                                  </div>
                                  {!showShortAnswer ? (
                                    <button
                                      onClick={() => setShowShortAnswer(true)}
                                      className="btn"
                                      style={{
                                        padding: '0.4rem 0.8rem', fontSize: '0.72rem', fontWeight: 700,
                                        background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                                        color: '#fff', borderRadius: '6px', cursor: 'pointer'
                                      }}
                                    >
                                      Reveal Topper Model Answer 👁️
                                    </button>
                                  ) : (
                                    <div style={{ marginTop: '0.5rem', background: 'rgba(255,255,255,0.02)', padding: '0.5rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.04)' }}>
                                      <strong style={{ color: '#fbbf24', fontSize: '0.72rem', display: 'block', textTransform: 'uppercase', marginBottom: '0.2rem' }}>
                                        🥇 topper model answer:
                                      </strong>
                                      <div style={{ color: '#fff', fontSize: '0.78rem' }}>
                                        <ReactMarkdown
                                          remarkPlugins={[remarkGfm, remarkMath]}
                                          rehypePlugins={[rehypeKatex]}
                                          components={markdownComponents}
                                        >{data.shortAnswer || "Identify key points and compare with your mental notes."}</ReactMarkdown>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </>
                            ) : (
                              <>
                                ❌ <strong style={{ color: '#f87171' }}>Wrong Answer.</strong> <br />
                                Select option <strong>{data.correctKey}</strong> to proceed!
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* 3. ACTIVE RECALL FLASHCARDS (Slide challenge with Reveal answer) */}
                  {activeMission.type === 'active_recall' && (() => {
                    const data = dynamicMissionContent || fallbackActiveRecall;
                    const cards = data.cards || fallbackActiveRecall.cards;
                    const currentCard = cards[quizStep] || cards[0];
                    const isRevealed = quizAnswers[quizStep] === 'revealed';

                    return (
                      <div>
                        {quizStep < 3 ? (
                          <div>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '1.25rem' }}>
                              ⚡ Active Recall Challenge: Read the question, think of your answer, reveal the topper answer, and self-assess!
                            </p>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 700 }}>
                                Flashcard {quizStep + 1} of 3
                              </span>
                              <div style={{ width: '80px', height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', overflow: 'hidden' }}>
                                <div style={{ width: `${((quizStep + 1) / 3) * 100}%`, height: '100%', background: 'var(--accent)' }} />
                              </div>
                            </div>

                            <div style={{
                              background: 'linear-gradient(135deg, rgba(245,158,11,0.05), rgba(99,102,241,0.05))',
                              border: '1px solid rgba(245,158,11,0.15)',
                              borderRadius: '12px', padding: '1.5rem',
                              minHeight: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                              textAlign: 'center', marginBottom: '1.25rem'
                            }}>
                              <div style={{ fontSize: '1rem', fontWeight: 800, color: '#fff', lineHeight: 1.45 }}>
                                <ReactMarkdown
                                  remarkPlugins={[remarkGfm, remarkMath]}
                                  rehypePlugins={[rehypeKatex]}
                                  components={markdownComponents}
                                >{currentCard.question}</ReactMarkdown>
                              </div>
                            </div>

                            {!isRevealed ? (
                              <button
                                onClick={() => setQuizAnswers(prev => ({ ...prev, [quizStep]: 'revealed' }))}
                                style={{
                                  width: '100%', padding: '1rem',
                                  background: 'rgba(255,255,255,0.02)',
                                  border: '2px dashed rgba(255,255,255,0.1)',
                                  borderRadius: '12px', color: 'var(--primary)',
                                  fontSize: '0.85rem', fontWeight: 800,
                                  cursor: 'pointer', textAlign: 'center',
                                  transition: 'all 0.2s', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem'
                                }}
                              >
                                <span>🔍 Click to Reveal Topper Model Answer</span>
                                <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>(Formulated according to CBSE/RBSE grading schemes)</span>
                              </button>
                            ) : (
                              <div style={{
                                background: 'rgba(16, 185, 129, 0.04)',
                                border: '1px solid rgba(16, 185, 129, 0.15)',
                                borderRadius: '12px', padding: '1.25rem',
                                fontSize: '0.82rem', lineHeight: 1.6, color: 'var(--text-secondary)',
                                marginBottom: '1.25rem', position: 'relative'
                              }}>
                                <span style={{
                                  position: 'absolute', top: '-10px', left: '15px',
                                  background: '#059669', color: '#fff',
                                  fontSize: '0.6rem', fontWeight: 800, padding: '0.1rem 0.4rem',
                                  borderRadius: '4px', textTransform: 'uppercase'
                                }}>
                                  TOPPER RESPONSE
                                </span>
                                <div style={{ color: '#fff', marginTop: '0.25rem' }}>
                                  <ReactMarkdown
                                    remarkPlugins={[remarkGfm, remarkMath]}
                                    rehypePlugins={[rehypeKatex]}
                                    components={markdownComponents}
                                  >{currentCard.answer}</ReactMarkdown>
                                </div>
                                
                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem', borderTop: '1px solid rgba(16, 185, 129, 0.1)', paddingTop: '0.75rem' }}>
                                  <button
                                    onClick={() => {
                                      if (quizStep < 2) {
                                        setQuizStep(s => s + 1);
                                      } else {
                                        setQuizStep(3);
                                      }
                                    }}
                                    className="btn btn-secondary"
                                    style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                                  >
                                    I Understand, Next Card ➔
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div style={{ textAlign: 'center' }}>
                            <span style={{ fontSize: '2.5rem' }}>⚡</span>
                            <h4 style={{ color: '#10b981', margin: '0.5rem 0', fontWeight: 800, fontSize: '1.25rem' }}>
                              Active Recall Complete!
                            </h4>
                            <p style={{ margin: '0 0 1.25rem 0', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                              You reviewed all 3 topper model answers for <strong>{activeMission.subject}</strong>. Good job!
                            </p>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                              Ready to submit and unlock <strong style={{ color: '#a78bfa' }}>+30 XP</strong>?
                            </p>
                            <div style={{ display: 'flex', gap: '0.75rem' }}>
                              <button
                                onClick={() => {
                                  toggleMission(activeMission.id);
                                  setActiveMission(null);
                                  setDynamicMissionContent(null);
                                }}
                                className="btn btn-primary"
                                style={{ flex: 1, padding: '0.8rem 1rem', fontSize: '0.88rem', fontWeight: 800 }}
                              >
                                Submit & Complete Mission
                              </button>
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
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* 4. QUIZ (Syllabus Aligned Quiz with passing gate) */}
                  {activeMission.type === 'quiz' && (() => {
                    const data = dynamicMissionContent || fallbackQuiz;
                    const questions = data.questions || fallbackQuiz.questions;
                    const quizTitle = data.quizTitle || fallbackQuiz.quizTitle;

                    if (quizStep < 6) {
                      const currentQ = questions[quizStep] || fallbackQuiz.questions[quizStep];
                      const selectedOpt = quizAnswers[quizStep];
                      return (
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 700 }}>
                              Question {quizStep + 1} of 6
                            </span>
                            <div style={{ width: '80px', height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', overflow: 'hidden' }}>
                              <div style={{ width: `${((quizStep + 1) / 6) * 100}%`, height: '100%', background: 'var(--primary)' }} />
                            </div>
                          </div>

                          <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#fff', marginBottom: '1.25rem', lineHeight: 1.45 }}>
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm, remarkMath]}
                              rehypePlugins={[rehypeKatex]}
                              components={markdownComponents}
                            >{currentQ.questionText}</ReactMarkdown>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                            {currentQ.options.map(opt => {
                              const isSelected = selectedOpt === opt.key;
                              return (
                                <button
                                  key={opt.key}
                                  onClick={() => setQuizAnswers(prev => ({ ...prev, [quizStep]: opt.key }))}
                                  style={{
                                    display: 'flex', alignItems: 'center', gap: '1rem',
                                    width: '100%', padding: '0.85rem 1rem',
                                    background: isSelected ? 'rgba(108, 99, 255, 0.12)' : 'rgba(255, 255, 255, 0.01)',
                                    border: isSelected ? '1px solid var(--primary)' : '1px solid rgba(255,255,255,0.05)',
                                    borderRadius: '10px', color: '#fff', textAlign: 'left',
                                    cursor: 'pointer', transition: 'all 0.2s'
                                  }}
                                >
                                  <div style={{
                                    width: '22px', height: '22px', borderRadius: '50%',
                                    background: isSelected ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '0.72rem', fontWeight: 800, color: isSelected ? '#fff' : 'var(--text-secondary)'
                                  }}>
                                    {opt.key}
                                  </div>
                                  <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>
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

                          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                            <button
                              onClick={() => selectedOpt && setQuizStep(s => s + 1)}
                              disabled={!selectedOpt}
                              className="btn btn-primary"
                              style={{
                                padding: '0.6rem 1.25rem', fontSize: '0.82rem', fontWeight: 700,
                                cursor: selectedOpt ? 'pointer' : 'not-allowed', opacity: selectedOpt ? 1 : 0.5
                              }}
                            >
                              {quizStep === 5 ? "Review Answers" : "Next Question ➔"}
                            </button>
                          </div>
                        </div>
                      );
                    } else {
                      // Final summary results
                      let correctCount = 0;
                      questions.forEach((q, idx) => {
                        const correctKey = q.correctKey || q.correct;
                        if (quizAnswers[idx] === correctKey) correctCount++;
                      });

                      const hasPassed = correctCount >= 4;

                      if (!hasPassed) {
                        return (
                          <div style={{ textAlign: 'center' }}>
                            <span style={{ fontSize: '2.5rem' }}>❌</span>
                            <h4 style={{ color: '#f87171', margin: '0.5rem 0', fontWeight: 800, fontSize: '1.25rem' }}>
                              Practice Quiz Failed
                            </h4>
                            <p style={{ margin: '0 0 1.25rem 0', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                              You scored <strong style={{ color: '#fff' }}>{correctCount} / 6 Correct</strong> ({Math.round((correctCount / 6) * 100)}% Score).
                            </p>
                            <div style={{ background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.1)', borderRadius: '12px', padding: '1rem', margin: '1rem 0 1.5rem 0', textAlign: 'left' }}>
                              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f87171', display: 'block', marginBottom: '0.35rem' }}>
                                💡 Study Tip:
                              </span>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                                You need at least <strong>4 / 6 correct answers</strong> (66%) to pass this daily target mission. Read the explanations below, identify your learning gap, and try again!
                              </span>
                            </div>

                            {/* Brief details checklist */}
                            <div style={{
                              background: 'rgba(255,255,255,0.02)',
                              border: '1px solid rgba(255,255,255,0.05)',
                              borderRadius: '12px', padding: '1rem',
                              textAlign: 'left', marginBottom: '1.5rem',
                              display: 'flex', flexDirection: 'column', gap: '0.75rem',
                              maxHeight: '220px', overflowY: 'auto'
                            }}>
                              {questions.map((q, i) => {
                                const userAns = quizAnswers[i];
                                const correctKey = q.correctKey || q.correct;
                                const isCorrect = userAns === correctKey;
                                return (
                                  <div key={i} style={{ display: 'flex', flexDirection: 'column', fontSize: '0.78rem', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '0.5rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
                                      <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>
                                        Q{i+1}: <span style={{ color: '#fff' }}>{q.questionText.replace(/[$#*\-_]/g, '').substring(0, 50)}...</span>
                                      </span>
                                      <span style={{ color: isCorrect ? '#10b981' : '#f87171', fontWeight: 800, flexShrink: 0 }}>
                                        {isCorrect ? "✓ Correct" : `✗ Wrong (Ans: ${correctKey})`}
                                      </span>
                                    </div>
                                    {!isCorrect && (
                                      <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.25rem', fontStyle: 'italic', background: 'rgba(255,255,255,0.01)', padding: '0.25rem', borderRadius: '4px' }}>
                                        Explanation: {q.explanation}
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>

                            <div style={{ display: 'flex', gap: '0.75rem' }}>
                              <button
                                onClick={() => {
                                  setQuizStep(0);
                                  setQuizAnswers({});
                                }}
                                className="btn btn-primary"
                                style={{ flex: 1, padding: '0.8rem 1rem', fontSize: '0.88rem', fontWeight: 800 }}
                              >
                                Restart Practice Quiz 🔄
                              </button>
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
                                Close
                              </button>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div style={{ textAlign: 'center' }}>
                          <span style={{ fontSize: '2.5rem' }}>🏆</span>
                          <h4 style={{ color: '#10b981', margin: '0.5rem 0', fontWeight: 800, fontSize: '1.25rem' }}>
                            {quizTitle} Completed!
                          </h4>
                          <p style={{ margin: '0 0 1.25rem 0', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                            You scored <strong style={{ color: '#fff' }}>{correctCount} / 6 Correct</strong> ({Math.round((correctCount / 6) * 100)}% Score)
                          </p>

                          {/* Brief details checklist */}
                          <div style={{
                            background: 'rgba(255,255,255,0.02)',
                            border: '1px solid rgba(255,255,255,0.05)',
                            borderRadius: '12px', padding: '1rem',
                            textAlign: 'left', marginBottom: '1.5rem',
                            display: 'flex', flexDirection: 'column', gap: '0.5rem',
                            maxHeight: '200px', overflowY: 'auto'
                          }}>
                            {questions.map((q, i) => {
                              const userAns = quizAnswers[i];
                              const correctKey = q.correctKey || q.correct;
                              const isCorrect = userAns === correctKey;
                              return (
                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                                  <span style={{ color: 'var(--text-secondary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '70%' }}>
                                    Q{i+1}: {q.questionText.replace(/[$#*\-_]/g, '').substring(0, 50)}...
                                  </span>
                                  <span style={{ color: isCorrect ? '#10b981' : '#f87171', fontWeight: 800, flexShrink: 0 }}>
                                    {isCorrect ? "✓ Correct" : `✗ Wrong (Ans: ${correctKey})`}
                                  </span>
                                </div>
                              );
                            })}
                          </div>

                          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
                            Ready to submit and unlock <strong style={{ color: '#a78bfa' }}>+30 XP</strong>?
                          </p>

                          <div style={{ display: 'flex', gap: '0.75rem' }}>
                            <button
                              onClick={() => {
                                toggleMission(activeMission.id);
                                setActiveMission(null);
                                setDynamicMissionContent(null);
                              }}
                              className="btn btn-primary"
                              style={{ flex: 1, padding: '0.8rem 1rem', fontSize: '0.88rem', fontWeight: 800 }}
                            >
                              Submit & Complete Mission
                            </button>
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
                              Close
                            </button>
                          </div>
                        </div>
                      );
                    }
                  })()}
                </>
              )}
            </div>

            {/* Modal Bottom Actions */}
            {!missionLoading && activeMission.type !== 'quiz' && activeMission.type !== 'active_recall' && (
              <div style={{ display: 'flex', gap: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '1.25rem' }}>
                {!missionSubmitted ? (
                  <button
                    onClick={() => {
                      const data = dynamicMissionContent || (activeMission.type === 'mindmap' ? fallbackMindMap : fallbackRevision);
                      if (missionAnswer) setMissionSubmitted(true);
                    }}
                    disabled={!missionAnswer}
                    className="btn btn-primary"
                    style={{
                      flex: 1, padding: '0.8rem 1rem', fontSize: '0.88rem', fontWeight: 800,
                      cursor: missionAnswer ? 'pointer' : 'not-allowed', opacity: missionAnswer ? 1 : 0.5
                    }}
                  >
                    Check Answer
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      const data = dynamicMissionContent || (activeMission.type === 'mindmap' ? fallbackMindMap : fallbackRevision);
                      if (missionAnswer !== data.correctKey) {
                        // User got it wrong, let them try again
                        setMissionSubmitted(false);
                        setMissionAnswer(null);
                        return;
                      }

                      // Check if short question needs to be revealed
                      const needShortAnswerReveal = (activeMission.type === 'mindmap' || activeMission.type === 'revision') && !showShortAnswer;
                      if (needShortAnswerReveal) {
                        alert("⚠️ Active Recall Check: Please read the short question and click 'Reveal Topper Model Answer' first to complete your daily target.");
                        return;
                      }

                      // Correct selection: Mark completed on dashboard!
                      toggleMission(activeMission.id);
                      setActiveMission(null);
                      setDynamicMissionContent(null);
                    }}
                    className="btn btn-primary"
                    style={{
                      flex: 1, padding: '0.8rem 1rem', fontSize: '0.88rem', fontWeight: 800,
                      background: (missionAnswer === (dynamicMissionContent || (activeMission.type === 'mindmap' ? fallbackMindMap : fallbackRevision))?.correctKey)
                        ? ((activeMission.type === 'mindmap' || activeMission.type === 'revision') && !showShortAnswer
                          ? 'linear-gradient(135deg, #fbbf24, #d97706)'
                          : 'linear-gradient(135deg, #10b981, #059669)')
                        : 'linear-gradient(135deg, var(--primary), var(--accent))'
                    }}
                  >
                    {(missionAnswer === (dynamicMissionContent || (activeMission.type === 'mindmap' ? fallbackMindMap : fallbackRevision))?.correctKey)
                      ? ((activeMission.type === 'mindmap' || activeMission.type === 'revision') && !showShortAnswer
                        ? "Solve Short Question First ➔"
                        : "Submit & Complete Mission")
                      : "Try Correct Option ➔"}
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
