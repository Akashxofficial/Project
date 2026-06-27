import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import { 
  BookOpen, MessageSquare, Clock, FileText, GraduationCap, ArrowRight,
  Flame, Star, Trophy, Award, Target, CheckCircle2, ChevronRight, 
  AlertCircle, RefreshCw, Plus, Trash2, Sparkles, Zap, Play, Copy, Check, Calendar,
  Loader2, X, Lock
} from 'lucide-react';
import { generateAIContent, generateOneClickPrompt, fixMathFormatting } from '../lib/ai';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { useAuth } from '../context/AuthContext';
import { useStudy } from '../context/StudyContext';
import { saveDocument, logActivity } from '../lib/firebase';
import MathRenderer from '../components/MathRenderer';

// Redesigned clean layout production build trigger
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
  text: ({ children }) => <MathRenderer text={children} />,
  code: ({ className, children, ...props }) => {
    const isInline = !className && typeof children === 'string' && !children.includes('\n');
    if (isInline) {
      if (typeof children === 'string' && children.includes('$')) {
        return <MathRenderer text={children} />;
      }
      return <code className="md-inline-code" {...props}>{children}</code>;
    }
    return (
      <div className="md-code-block">
        <code className={className} {...props}>{children}</code>
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
  { name: 'History', icon: '📜', color: '#a855f7' },
  { name: 'Civics', icon: '🏛️', color: '#3b82f6' },
  { name: 'Geography', icon: '🗺️', color: '#10b981' },
  { name: 'Economics', icon: '📈', color: '#f59e0b' },
  { name: 'Sanskrit', icon: '🕉️', color: '#f97316' },
  { name: 'English', icon: '📖', color: '#a855f7' },
  { name: 'Hindi', icon: '🇮🇳', color: '#ef4444' },
  { name: 'Computer Science', icon: '💻', color: '#06b6d4' },
  { name: 'Accountancy', icon: '📊', color: '#f43f5e' },
  { name: 'Business Studies', icon: '🏢', color: '#a855f7' },
  { name: 'Informatics Practices', icon: '🖥️', color: '#06b6d4' }
];

const CLASS_SYLLABUS = {
  '8': {
    'Mathematics': [
      'Chapter 1: Rational Numbers',
      'Chapter 2: Linear Equations in One Variable',
      'Chapter 3: Understanding Quadrilaterals',
      'Chapter 4: Data Handling',
      'Chapter 5: Squares and Square Roots',
      'Chapter 6: Cubes and Cube Roots',
      'Chapter 7: Comparing Quantities',
      'Chapter 8: Algebraic Expressions and Identities',
      'Chapter 9: Visualising Solid Shapes',
      'Chapter 10: Mensuration',
      'Chapter 11: Exponents and Powers',
      'Chapter 12: Direct and Inverse Proportions',
      'Chapter 13: Factorisation',
      'Chapter 14: Introduction to Graphs'
    ],
    'Science': [
      'Chapter 1: Crop Production and Management',
      'Chapter 2: Microorganisms: Friend and Foe',
      'Chapter 3: Synthetic Fibres and Plastics',
      'Chapter 4: Materials: Metals and Non-Metals',
      'Chapter 5: Coal and Petroleum',
      'Chapter 6: Combustion and Flame',
      'Chapter 7: Conservation of Plants and Animals',
      'Chapter 8: Cell - Structure and Functions',
      'Chapter 9: Reproduction in Animals',
      'Chapter 10: Force and Pressure',
      'Chapter 11: Friction',
      'Chapter 12: Sound',
      'Chapter 13: Chemical Effects of Electric Current',
      'Chapter 14: Some Natural Phenomena',
      'Chapter 15: Light',
      'Chapter 16: Stars and the Solar System',
      'Chapter 17: Pollution of Air and Water'
    ],
    'History': [
      'Chapter 1: How, When and Where',
      'Chapter 2: From Trade to Territory: The Company Establishes Power',
      'Chapter 3: Ruling the Countryside',
      'Chapter 4: Tribals, Dikus and the Vision of a Golden Age',
      'Chapter 5: When People Rebel: 1857 and After',
      'Chapter 6: Weavers, Iron Smelters and Factory Owners',
      'Chapter 7: Civilising the Native, Educating the Nation',
      'Chapter 8: Women, Caste and Reform',
      'Chapter 9: The Making of the National Movement: 1870s-1947',
      'Chapter 10: India After Independence'
    ],
    'Geography': [
      'Chapter 1: Resources',
      'Chapter 2: Land, Soil, Water, Natural Vegetation and Wildlife Resources',
      'Chapter 3: Mineral and Power Resources',
      'Chapter 4: Agriculture',
      'Chapter 5: Industries',
      'Chapter 6: Human Resources'
    ],
    'Civics': [
      'Chapter 1: The Indian Constitution',
      'Chapter 2: Understanding Secularism',
      'Chapter 3: Why Do We Need a Parliament?',
      'Chapter 4: Understanding Laws',
      'Chapter 5: Judiciary',
      'Chapter 6: Understanding Our Criminal Justice System',
      'Chapter 7: Confronting Marginalisation',
      'Chapter 8: Public Facilities',
      'Chapter 9: Law and Social Justice'
    ],
    'Sanskrit': [
      'Chapter 1: Subhashitani',
      'Chapter 2: Billasya Vani Na Kadapi Me Shruta',
      'Chapter 3: Digibharatam',
      'Chapter 4: Sadaiv Purato Nidhehi Charnam',
      'Chapter 5: Kantakneva Kantakam',
      'Chapter 6: Griham Shunyam Sutam Vina',
      'Chapter 7: Bharatjantaham',
      'Chapter 8: Sansar Sagar Asya Nayakah',
      'Chapter 9: Saptabhaginya',
      'Chapter 10: Nitinavneetamp',
      'Chapter 11: Savitribai Phule',
      'Chapter 12: Kah Rakshati Kah Rakshitah',
      'Chapter 13: Kshitau Rajate Bharatswarnabhumi',
      'Chapter 14: Aryabhata'
    ],
    'English': [
      // Honeydew (Main Reader)
      'Chapter 1: The Best Christmas Present in the World (Prose)',
      'Chapter 2: The Tsunami (Prose)',
      'Chapter 3: Glimpses of the Past (Prose)',
      "Chapter 4: Bepin Choudhury's Lapse of Memory (Prose)",
      'Chapter 5: The Summit Within (Prose)',
      "Chapter 6: This is Jody's Fawn (Prose)",
      'Chapter 7: A Visit to Cambridge (Prose)',
      'Chapter 8: A Short Monsoon Diary (Prose)',
      'Chapter 9: The Great Stone Face - I (Prose)',
      'Chapter 10: The Great Stone Face - II (Prose)',
      // Honeydew Poems
      'Chapter 11: The Ant and the Cricket (Poem)',
      'Chapter 12: Geography Lesson (Poem)',
      'Chapter 13: Macavity: The Mystery Cat (Poem)',
      'Chapter 14: The Last Bargain (Poem)',
      'Chapter 15: The School Boy (Poem)',
      'Chapter 16: The Duck and the Kangaroo (Poem)',
      'Chapter 17: When I Set Out for Lyonnesse (Poem)',
      'Chapter 18: On the Grasshopper and Cricket (Poem)',
      // It So Happened (Supplementary Reader)
      'Chapter 19: How the Camel Got His Hump (Supplementary)',
      'Chapter 20: Children at Work (Supplementary)',
      'Chapter 21: The Selfish Giant (Supplementary)',
      'Chapter 22: The Treasure Within (Supplementary)',
      'Chapter 23: Princess September (Supplementary)',
      'Chapter 24: The Fight (Supplementary)',
      'Chapter 25: Jalebis (Supplementary)',
      'Chapter 26: Ancient Education System of India (Supplementary)'
    ],
    'Hindi': [
      // Vasant - III (Main)
      'Chapter 1: Dhwani (Suryakant Tripathi Nirala)',
      'Chapter 2: Lakh ki Chudiyan (Kamtanath)',
      'Chapter 3: Bus ki Yatra (Harishankar Parsai)',
      'Chapter 4: Deewanon ki Hasti (Bhagwati Charan Verma)',
      'Chapter 5: Chithiyon ki Anokhi Duniya (Arvind Kumar Singh)',
      'Chapter 6: Bhagwan ke Dakiye (Ramdhari Singh Dinkar)',
      'Chapter 7: Kya Nirash Hua Jaye (Hazari Prasad Dwivedi)',
      'Chapter 8: Yeh Sabse Kathin Samay Nahi (Jaya Jadaun)',
      'Chapter 9: Kabir ki Sakhiyan',
      'Chapter 10: Kamchor (Ismat Chughtai)',
      'Chapter 11: Sudama Charit (Narottam Das)',
      'Chapter 12: Jahaan Pahiya Hai (P. Sainath)',
      'Chapter 13: Akbari Lota (Annapurnanand Verma)',
      'Chapter 14: Soor ke Pad (Surdas)',
      'Chapter 15: Paani ki Kahani (Ramchandra Tiwari)',
      'Chapter 16: Baaj aur Saanp (Nirmal Verma)',
      'Chapter 17: Topi (Sanjay)',
      // Durva - III (Supplementary)
      'Chapter 18: Gudiya (Sup - Durva)',
      'Chapter 19: Do Gorillay (Sup - Durva)',
      'Chapter 20: Chita aur Sher ka Bacccha (Sup - Durva)',
      'Chapter 21: Mahi ki Udaan (Sup - Durva)',
      'Chapter 22: Sandesh Chahta Hun Main (Sup - Durva)',
      'Chapter 23: Ek Khiladi ki Kuch Yaadein (Sup - Durva)',
      'Chapter 24: Bullet Train (Sup - Durva)',
      'Chapter 25: Haath (Sup - Durva)'
    ],
    'Computer Science': [
      'Chapter 1: Computer Systems - Hardware and Software',
      'Chapter 2: Introduction to MS Access (Databases)',
      'Chapter 3: HTML Basics - Tags, Images, Lists',
      'Chapter 4: Algorithms and Flowcharts',
      'Chapter 5: Introduction to Programming',
      'Chapter 6: Cyber Safety and Security',
      'Chapter 7: Spreadsheet (MS Excel) Advanced Features',
      'Chapter 8: Internet and Its Uses'
    ],
    'Informatics Practices': [
      'Chapter 1: Computer Systems and Functions',
      'Chapter 2: Data Representation',
      'Chapter 3: Introduction to Databases',
      'Chapter 4: Basics of HTML',
      'Chapter 5: Cyber Safety'
    ],
    'Accountancy': [
      'Chapter 1: Basics of Accounting',
      'Chapter 2: Accounting Equation',
      'Chapter 3: Ledger and Trial Balance',
      'Chapter 4: Financial Statements: Trading Account'
    ],
    'Business Studies': [
      'Chapter 1: Introduction to Business and Trade',
      'Chapter 2: Basics of Business and Commerce',
      'Chapter 3: Economic Activities and Business',
      'Chapter 4: Introduction to Management'
    ],
    'Economics': [
      'Chapter 1: Basics of Economics',
      'Chapter 2: Economic Resources and Scarcity',
      'Chapter 3: Market and Trade',
      'Chapter 4: Indian Economic Institutions'
    ]
  },

  // . CLASS 9 . (NCERT 2025-26 Rationalized)
  '9': {
    'Mathematics': [
      'Chapter 1: Number Systems',
      'Chapter 2: Polynomials',
      'Chapter 3: Coordinate Geometry',
      'Chapter 4: Linear Equations in Two Variables',
      'Chapter 5: Introduction to Euclid\'s Geometry',
      'Chapter 6: Lines and Angles',
      'Chapter 7: Triangles',
      'Chapter 8: Quadrilaterals',
      'Chapter 9: Circles',
      'Chapter 10: Heron\'s Formula',
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
      'Chapter 3: Why Do We Fall Ill?',
      'Chapter 4: Natural Resources',
      'Chapter 5: Improvement in Food Resources'
    ],
    'History': [
      'Chapter 1: The French Revolution',
      'Chapter 2: Socialism in Europe and the Russian Revolution',
      'Chapter 3: Nazism and the Rise of Hitler',
      'Chapter 4: Forest Society and Colonialism',
      'Chapter 5: Pastoralists in the Modern World'
    ],
    'Geography': [
      'Chapter 1: India - Size and Location',
      'Chapter 2: Physical Features of India',
      'Chapter 3: Drainage',
      'Chapter 4: Climate',
      'Chapter 5: Natural Vegetation and Wild Life',
      'Chapter 6: Population'
    ],
    'Civics': [
      'Chapter 1: What is Democracy? Why Democracy?',
      'Chapter 2: Constitutional Design',
      'Chapter 3: Electoral Politics',
      'Chapter 4: Working of Institutions',
      'Chapter 5: Democratic Rights'
    ],
    'Economics': [
      'Chapter 1: The Story of Village Palampur',
      'Chapter 2: People as Resource',
      'Chapter 3: Poverty as a Challenge',
      'Chapter 4: Food Security in India'
    ],
    'Sanskrit': [
      'Chapter 1: Bharatiyavasantgiti',
      'Chapter 2: Swarnakakah',
      'Chapter 3: Godohanam',
      'Chapter 4: Kalpataruh',
      'Chapter 5: Suktimauktikam',
      'Chapter 6: Bhranto Balah',
      'Chapter 7: Pratyabhigyanam',
      'Chapter 8: Lauhatula',
      'Chapter 9: Siktasetuh',
      'Chapter 10: Jatayoh Shauryam',
      'Chapter 11: Paryavaranam',
      'Chapter 12: Vangmanahpranaswarupam'
    ],
    'English': [
      // Beehive (Main Textbook)
      'Chapter 1: The Fun They Had (Beehive)',
      'Chapter 2: The Sound of Music (Beehive)',
      'Chapter 3: The Little Girl (Beehive)',
      'Chapter 4: A Truly Beautiful Mind (Beehive)',
      'Chapter 5: The Snake and the Mirror (Beehive)',
      'Chapter 6: My Childhood (Beehive)',
      'Chapter 7: Reach for the Top (Beehive)',
      'Chapter 8: Kathmandu (Beehive)',
      'Chapter 9: If I Were You (Beehive)',
      // Beehive Poems
      'Chapter 10: The Road Not Taken (Poem)',
      'Chapter 11: Wind (Poem)',
      'Chapter 12: Rain on the Roof (Poem)',
      'Chapter 13: The Lake Isle of Innisfree (Poem)',
      'Chapter 14: A Legend of the Northland (Poem)',
      'Chapter 15: No Men Are Foreign (Poem)',
      'Chapter 16: On Killing a Tree (Poem)',
      'Chapter 17: A Slumber Did My Spirit Seal (Poem)',
      // Moments (Supplementary Reader)
      'Chapter 18: The Lost Child (Moments)',
      'Chapter 19: The Adventures of Toto (Moments)',
      'Chapter 20: Iswaran the Storyteller (Moments)',
      'Chapter 21: In the Kingdom of Fools (Moments)',
      'Chapter 22: The Happy Prince (Moments)',
      'Chapter 23: Weathering the Storm in Ersama (Moments)',
      'Chapter 24: The Last Leaf (Moments)',
      'Chapter 25: A House Is Not a Home (Moments)',
      'Chapter 26: The Beggar (Moments)'
    ],
    'Hindi': [
      // Kshitij - I (Main)
      'Chapter 1: Do Bailon Ki Katha (Premchand)',
      'Chapter 2: Lhasa Ki Aur (Rahul Sankrityayan)',
      'Chapter 3: Upbhoktavad Ki Sanskriti (S. C. Dubey)',
      'Chapter 4: Sawale Sapno Ki Yaad (Jabir Husain)',
      'Chapter 5: Nana Saheb Ki Putri Devi Manu (Chapala Devi)',
      'Chapter 6: Premchand Ke Phate Joote (Harishankar Parsai)',
      'Chapter 7: Mere Bachpan Ke Din (Mahadevi Varma)',
      'Chapter 8: Ek Kutta Aur Ek Maina (Hazari Prasad Dwivedi)',
      // Poetry - Kshitij
      'Chapter 9: Sakhiyan aur Sabad (Kabir)',
      'Chapter 10: Vakh (Laldyad)',
      'Chapter 11: Sawaiye (Raskhan)',
      'Chapter 12: Kaidi Aur Kokila (Makhanlal Chaturvedi)',
      'Chapter 13: Gram Shree (Sumitranandan Pant)',
      'Chapter 14: Chandra Gahna Se Lautati Ber (Kedarnath Agarwal)',
      'Chapter 15: Megh Aaye (Sarveshwar Dayal Saxena)',
      'Chapter 16: Yamraj Ki Disha (Chandrakant Devtale)',
      'Chapter 17: Bachche Kaam Par Ja Rahe Hain (Rajesh Joshi)',
      // Kritika (Supplementary)
      'Chapter 18: Is Jal Pralay Mein (Fanishwar Nath Renu)',
      'Chapter 19: Mere Sang Ki Auratein (Mridula Garg)',
      'Chapter 20: Reedh Ki Haddi (Jagdish Chandra Mathur)',
      'Chapter 21: Maati Wali (Vidya Sagar Nautiyal)',
      'Chapter 22: Kis Tarah Aakhirkar Main Hindi Mein Aaya (Sharad Joshi)'
    ],
    'Computer Science': [
      'Chapter 1: Introduction to IT-ITeS Industry',
      'Chapter 2: Data Entry and Keyboarding Skills',
      'Chapter 3: Digital Documentation (Word Processing)',
      'Chapter 4: Electronic Spreadsheet',
      'Chapter 5: Digital Presentation',
      'Chapter 6: Digital Communication',
      'Chapter 7: Cyber Security Basics'
    ],
    'Informatics Practices': [
      'Chapter 1: Computer System Overview',
      'Chapter 2: Working with Computer Data',
      'Chapter 3: Introduction to Python',
      'Chapter 4: Database Concepts',
      'Chapter 5: Emerging Technologies'
    ],
    'Accountancy': [
      'Chapter 1: Introduction to Accounting',
      'Chapter 2: Basic Accounting Terms',
      'Chapter 3: Theory Base of Accounting',
      'Chapter 4: Recording of Transactions - Journal',
      'Chapter 5: Ledger',
      'Chapter 6: Trial Balance'
    ],
    'Business Studies': [
      'Chapter 1: Business, Trade and Commerce',
      'Chapter 2: Forms of Business Organisation',
      'Chapter 3: Business Services',
      'Chapter 4: Social Responsibility of Business'
    ],
    'Economics': [
      'Chapter 1: The Story of Village Palampur',
      'Chapter 2: People as Resource',
      'Chapter 3: Poverty as a Challenge',
      'Chapter 4: Food Security in India'
    ]
  },

  // . CLASS 10 . (NCERT 2025-26 Rationalized)
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
      'Chapter 8: Heredity',
      'Chapter 9: Light - Reflection and Refraction',
      'Chapter 10: The Human Eye and the Colourful World',
      'Chapter 11: Electricity',
      'Chapter 12: Magnetic Effects of Electric Current',
      'Chapter 13: Our Environment'
    ],
    'Physics': [
      'Chapter 1: Light - Reflection and Refraction',
      'Chapter 2: The Human Eye and the Colourful World',
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
      'Chapter 4: Heredity',
      'Chapter 5: Our Environment'
    ],
    'History': [
      'Chapter 1: The Rise of Nationalism in Europe',
      'Chapter 2: Nationalism in India',
      'Chapter 3: The Making of a Global World',
      'Chapter 4: The Age of Industrialisation',
      'Chapter 5: Print Culture and the Modern World'
    ],
    'Geography': [
      'Chapter 1: Resources and Development',
      'Chapter 2: Forest and Wildlife Resources',
      'Chapter 3: Water Resources',
      'Chapter 4: Agriculture',
      'Chapter 5: Minerals and Energy Resources',
      'Chapter 6: Manufacturing Industries',
      'Chapter 7: Lifelines of National Economy'
    ],
    'Civics': [
      'Chapter 1: Power Sharing',
      'Chapter 2: Federalism',
      'Chapter 3: Gender, Religion and Caste',
      'Chapter 4: Political Parties',
      'Chapter 5: Outcomes of Democracy'
    ],
    'Economics': [
      'Chapter 1: Development',
      'Chapter 2: Sectors of the Indian Economy',
      'Chapter 3: Money and Credit',
      'Chapter 4: Globalisation and the Indian Economy',
      'Chapter 5: Consumer Rights'
    ],
    'Sanskrit': [
      'Chapter 1: Shuchiparyavaranam',
      'Chapter 2: Buddhirbalvati Sada',
      'Chapter 3: Shishulalanam',
      'Chapter 4: Janani Tulyavatsala',
      'Chapter 5: Subhashitani',
      'Chapter 6: Sauhardam Prakriteh Shobha',
      'Chapter 7: Vichitrah Sakshi',
      'Chapter 8: Suktayah',
      'Chapter 9: Pranaebhyopi Priyah Suhrid',
      'Chapter 10: Kautukah'
    ],
    'English': [
      // First Flight (Main Textbook)
      'Chapter 1: A Letter to God (First Flight)',
      'Chapter 2: Nelson Mandela: Long Walk to Freedom (First Flight)',
      'Chapter 3: Two Stories about Flying (First Flight)',
      'Chapter 4: From the Diary of Anne Frank (First Flight)',
      'Chapter 5: Glimpses of India (First Flight)',
      'Chapter 6: Mijbil the Otter (First Flight)',
      'Chapter 7: Madam Rides the Bus (First Flight)',
      'Chapter 8: The Sermon at Benares (First Flight)',
      'Chapter 9: The Proposal (First Flight)',
      // Poems - First Flight
      'Chapter 10: Dust of Snow (Poem)',
      'Chapter 11: Fire and Ice (Poem)',
      'Chapter 12: A Tiger in the Zoo (Poem)',
      'Chapter 13: How to Tell Wild Animals (Poem)',
      'Chapter 14: The Ball Poem (Poem)',
      'Chapter 15: Amanda! (Poem)',
      'Chapter 16: The Trees (Poem)',
      'Chapter 17: Fog (Poem)',
      'Chapter 18: The Tale of Custard the Dragon (Poem)',
      'Chapter 19: For Anne Gregory (Poem)',
      // Footprints Without Feet (Supplementary)
      'Chapter 20: A Triumph of Surgery (Footprints)',
      "Chapter 21: The Thief's Story (Footprints)",
      'Chapter 22: The Midnight Visitor (Footprints)',
      'Chapter 23: A Question of Trust (Footprints)',
      'Chapter 24: Footprints Without Feet (Footprints)',
      'Chapter 25: The Making of a Scientist (Footprints)',
      'Chapter 26: The Necklace (Footprints)',
      'Chapter 27: Bholi (Footprints)',
      'Chapter 28: The Book That Saved the Earth (Footprints)'
    ],
    'Hindi': [
      // Kshitij - II
      'Chapter 1: Surdas ke Pad',
      'Chapter 2: Ram Lakshman Parashuram Samvad (Tulsidas)',
      'Chapter 3: Dev - Savaiya aur Kavitt',
      'Chapter 4: Aatmakathya (Jaishankar Prasad)',
      'Chapter 5: Utsah aur At Nahi Rahi Hai (Suryakant Tripathi Nirala)',
      'Chapter 6: Yeh Danturit Muskan aur Fasal (Nagarjun)',
      'Chapter 7: Chhaya Mat Chhuna (Girija Kumar Mathur)',
      'Chapter 8: Kanyadan (Rituraj)',
      'Chapter 9: Sangatkar (Manglesh Dabral)',
      'Chapter 10: Netaji Ka Chashma (Swayam Prakash)',
      'Chapter 11: Balgobin Bhagat (Ramvriksha Benipuri)',
      'Chapter 12: Lakhnavi Andaz (Yashpal)',
      'Chapter 13: Ek Kahani Yeh Bhi (Mannu Bhandari)',
      'Chapter 14: Naubat Khane Mein Ibadat (Yatindra Mishra)',
      'Chapter 15: Sanskriti (Bhadant Anand Kausalyayan)',
      // Kritika - II (Supplementary)
      'Chapter 16: Mata Ka Anchal (Shivpujan Sahay)',
      'Chapter 17: George Pancham Ki Naak (Kamaleswar)',
      'Chapter 18: Sana-Sana Hath Jodi (Madhu Kankariya)',
      'Chapter 19: Ahi Thaiya Jhulni Herani Ho Rama (Shivamurti)',
      'Chapter 20: Main Kyon Likhta Hun? (Agyeya)'
    ],
    'Computer Science': [
      'Chapter 1: Internet Basics and Networking',
      'Chapter 2: HTML - I (Basic Tags, Images, Links)',
      'Chapter 3: HTML - II (Tables, Lists, Forms)',
      'Chapter 4: Cascading Style Sheets (CSS)',
      'Chapter 5: Digital Documentation Advanced',
      'Chapter 6: Electronic Spreadsheet Advanced',
      'Chapter 7: Database Management System Basics',
      'Chapter 8: Cyber Ethics and Safety'
    ],
    'Informatics Practices': [
      'Chapter 1: Networking and Internet',
      'Chapter 2: HTML and Web Design',
      'Chapter 3: Programming Basics',
      'Chapter 4: Database Fundamentals',
      'Chapter 5: Cyber Security and Ethics'
    ],
    'Accountancy': [
      'Chapter 1: Introduction to Accounting',
      'Chapter 2: Theory Base of Accounting',
      'Chapter 3: Recording of Transactions - I',
      'Chapter 4: Recording of Transactions - II',
      'Chapter 5: Bank Reconciliation Statement',
      'Chapter 6: Trial Balance and Rectification of Errors',
      'Chapter 7: Depreciation, Provisions and Reserves',
      'Chapter 8: Bill of Exchange',
      'Chapter 9: Financial Statements - I (Without Adjustments)',
      'Chapter 10: Financial Statements - II (With Adjustments)',
      'Chapter 11: Accounts from Incomplete Records',
      'Chapter 12: Applications of Computers in Accounting',
      'Chapter 13: Computerised Accounting System'
    ],
    'Business Studies': [
      'Chapter 1: Business, Trade and Commerce',
      'Chapter 2: Forms of Business Organisation',
      'Chapter 3: Private, Public and Global Enterprises',
      'Chapter 4: Business Services',
      'Chapter 5: Emerging Modes of Business',
      'Chapter 6: Social Responsibility of Business',
      'Chapter 7: Sources of Business Finance',
      'Chapter 8: Small Business',
      'Chapter 9: Internal Trade',
      'Chapter 10: International Business - I'
    ],
    'Economics': [
      'Chapter 1: Development',
      'Chapter 2: Sectors of the Indian Economy',
      'Chapter 3: Money and Credit',
      'Chapter 4: Globalisation and the Indian Economy',
      'Chapter 5: Consumer Rights'
    ]
  },

  // . CLASS 11 . (NCERT 2025-26 Rationalized)
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
      'Chapter 5: Thermodynamics',
      'Chapter 6: Equilibrium',
      'Chapter 7: Redox Reactions',
      'Chapter 8: Organic Chemistry: Some Basic Principles and Techniques',
      'Chapter 9: Hydrocarbons',
      'Chapter 10: Environmental Chemistry'
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
      'Chapter 16: Excretory Products and Their Elimination',
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
      // Hornbill (Main Textbook)
      'Chapter 1: The Portrait of a Lady (Hornbill)',
      'Chapter 2: We Are Not Afraid to Die... if We Can All Be Together (Hornbill)',
      'Chapter 3: Discovering Tut: The Saga Continues (Hornbill)',
      'Chapter 4: Landscape of the Soul (Hornbill)',
      'Chapter 5: The Ailing Planet: the Green Movement\'s Role (Hornbill)',
      'Chapter 6: The Browning Version (Hornbill)',
      'Chapter 7: The Adventure (Hornbill)',
      'Chapter 8: Silk Road (Hornbill)',
      // Hornbill Poems
      'Chapter 9: A Photograph (Poem)',
      'Chapter 10: The Laburnum Top (Poem)',
      'Chapter 11: The Voice of the Rain (Poem)',
      'Chapter 12: Childhood (Poem)',
      'Chapter 13: Father to Son (Poem)',
      // Snapshots (Supplementary Reader)
      'Chapter 14: The Summer of the Beautiful White Horse (Snapshots)',
      'Chapter 15: The Address (Snapshots)',
      "Chapter 16: Ranga's Marriage (Snapshots)",
      'Chapter 17: Albert Einstein at School (Snapshots)',
      "Chapter 18: Mother's Day (Snapshots)",
      'Chapter 19: The Ghat of the Only World (Snapshots)',
      'Chapter 20: Birth (Snapshots)',
      'Chapter 21: The Tale of Melon City (Snapshots)'
    ],
    'Computer Science': [
      'Chapter 1: Computer Systems and Organisation',
      'Chapter 2: Introduction to Python',
      'Chapter 3: Python Fundamentals - Data Types and Control Flow',
      'Chapter 4: Functions',
      'Chapter 5: File Handling in Python',
      'Chapter 6: Exception Handling',
      'Chapter 7: Database Concepts and SQL',
      'Chapter 8: Introduction to Computer Networks',
      'Chapter 9: Cyber Safety'
    ],
    'Informatics Practices': [
      'Chapter 1: Computer System',
      'Chapter 2: Introduction to Python',
      'Chapter 3: Python Variables and Data Types',
      'Chapter 4: Functions and Modules',
      'Chapter 5: Database Query using SQL',
      'Chapter 6: Introduction to Computer Networks',
      'Chapter 7: Emerging Technologies and Trends'
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
      'Chapter 8: Small Business and Entrepreneurship',
      'Chapter 9: Internal Trade',
      'Chapter 10: International Business - I',
      'Chapter 11: International Business - II'
    ],
    'Economics': [
      // Statistics Part
      'Chapter 1: Introduction',
      'Chapter 2: Collection of Data',
      'Chapter 3: Organisation of Data',
      'Chapter 4: Presentation of Data',
      'Chapter 5: Measures of Central Tendency',
      'Chapter 6: Measures of Dispersion',
      'Chapter 7: Correlation',
      'Chapter 8: Index Numbers',
      // Microeconomics Part
      'Chapter 9: Introduction to Economics and Microeconomics',
      'Chapter 10: Consumer Equilibrium and Demand',
      'Chapter 11: Producer Behaviour and Supply',
      'Chapter 12: Forms of Market and Price Determination under Perfect Competition',
      'Chapter 13: Market Equilibrium'
    ],
    'Hindi': [
      // Aroh - I (Main)
      'Chapter 1: Namak Ka Daroga (Premchand)',
      'Chapter 2: Miyan Naseeruddin (Krishna Sobti)',
      'Chapter 3: Apnu Ke Saath Dhai Saal (Satyajit Ray)',
      'Chapter 4: Vidai-Sambhashan (Balmukund Gupt)',
      'Chapter 5: Galta Loha (Shekhar Joshi)',
      'Chapter 6: Spiti Mein Baarish (Krishna Nand)',
      'Chapter 7: Rajni (Manu Bhandari)',
      'Chapter 8: Jamun Ka Ped (Krishan Chander)',
      'Chapter 9: Bharat Mata (Jawaharlal Nehru)',
      'Chapter 10: Ateet Mein Dabe Paon (Om Thanvi)',
      'Chapter 11: Kabir ke Pad',
      'Chapter 12: Meera ke Pad',
      'Chapter 13: Path ke Davedar (Subramaniya Bharati)',
      'Chapter 14: Veh Aankhein (Sumitrananandan Pant)',
      'Chapter 15: Ghar ki Yaad (Bhawani Prasad Mishra)',
      'Chapter 16: Champa Kale Kale Achhar (Trilochan)',
      'Chapter 17: Ghazal (Dushyant Kumar)',
      'Chapter 18: He Bhookh! Mat Machal (Akka Mahadevi)',
      'Chapter 19: Sabse Khatarnak (Avtar Singh Pash)',
      'Chapter 20: Aao, Milkar Bachayein (Nirmala Putul)',
      // Vitan - I (Supplementary)
      'Chapter 21: Bharatiya Gaayikaon Mein: Lata Mangeshkar (Kumar Gandharva)',
      'Chapter 22: Rajasthan Ki Rajat Boondein (Anupam Mishra)',
      'Chapter 23: Alo Aandhari (Baby Halder)',
      'Chapter 24: Bedu Pako Barahmasa (Girvesh Nand)'
    ]
  },

  // . CLASS 12 . (NCERT 2025-26 Rationalized)
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
      'Chapter 10: Biomolecules',
      'Chapter 11: Polymers',
      'Chapter 12: Chemistry in Everyday Life'
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
      'Chapter 9: Biotechnology: Principles and Processes',
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
      // Flamingo (Main Textbook)
      'Chapter 1: The Last Lesson (Flamingo)',
      'Chapter 2: Lost Spring (Flamingo)',
      'Chapter 3: Deep Water (Flamingo)',
      'Chapter 4: The Rattrap (Flamingo)',
      'Chapter 5: Indigo (Flamingo)',
      'Chapter 6: Poets and Pancakes (Flamingo)',
      'Chapter 7: The Interview (Flamingo)',
      'Chapter 8: Going Places (Flamingo)',
      // Flamingo Poems
      'Chapter 9: My Mother at Sixty-Six (Poem)',
      'Chapter 10: Keeping Quiet (Poem)',
      'Chapter 11: A Thing of Beauty (Poem)',
      'Chapter 12: A Roadside Stand (Poem)',
      "Chapter 13: Aunt Jennifer's Tigers (Poem)",
      // Vistas (Supplementary Reader)
      'Chapter 14: The Third Level (Vistas)',
      'Chapter 15: The Tiger King (Vistas)',
      'Chapter 16: The Enemy (Vistas)',
      'Chapter 17: On the Face of It (Vistas)',
      'Chapter 18: Memories of Childhood (Vistas)',
      'Chapter 19: The Interview (Vistas)',
      'Chapter 20: Journey to the End of the Earth (Vistas)',
      'Chapter 21: Evans Tries an O-Level (Vistas)',
      'Chapter 22: Should Wizard Hit Mommy? (Vistas)'
    ],
    'Computer Science': [
      'Chapter 1: Python Revision Tour - I',
      'Chapter 2: Python Revision Tour - II',
      'Chapter 3: Working with Functions',
      'Chapter 4: Using Python Libraries',
      'Chapter 5: File Handling',
      'Chapter 6: Exception Handling',
      'Chapter 7: Data Handling using Pandas - I',
      'Chapter 8: Data Handling using Pandas - II',
      'Chapter 9: Plotting Data using Matplotlib',
      'Chapter 10: Computer Networks',
      'Chapter 11: Database Query using SQL',
      'Chapter 12: Boolean Algebra',
      'Chapter 13: Communication Technologies'
    ],
    'Informatics Practices': [
      'Chapter 1: Python Pandas - I (Data Frames and Series)',
      'Chapter 2: Python Pandas - II (Data Operations)',
      'Chapter 3: Data Visualization using Matplotlib',
      'Chapter 4: Database Query using SQL - I',
      'Chapter 5: Database Query using SQL - II',
      'Chapter 6: Computer Networks',
      'Chapter 7: Societal Impacts of IT'
    ],
    'Accountancy': [
      // Part I: Partnership Accounts
      'Chapter 1: Accounting for Partnership Firms - Fundamental Concepts',
      'Chapter 2: Goodwill: Nature and Valuation',
      'Chapter 3: Reconstitution of a Partnership Firm: Admission of a Partner',
      'Chapter 4: Reconstitution of a Partnership Firm: Retirement/Death of a Partner',
      'Chapter 5: Dissolution of Partnership Firm',
      // Part II: Company Accounts
      'Chapter 6: Accounting for Share Capital',
      'Chapter 7: Issue and Redemption of Debentures',
      'Chapter 8: Financial Statements of a Company',
      'Chapter 9: Analysis of Financial Statements',
      'Chapter 10: Accounting Ratios',
      'Chapter 11: Cash Flow Statement'
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
      'Chapter 12: Consumer Protection',
      'Chapter 13: Entrepreneurship Development'
    ],
    'Economics': [
      // Macroeconomics
      'Chapter 1: Introduction to Macroeconomics',
      'Chapter 2: National Income Accounting',
      'Chapter 3: Money and Banking',
      'Chapter 4: Determination of Income and Employment',
      'Chapter 5: Government Budget and the Economy',
      'Chapter 6: Open Economy Macroeconomics',
      // Indian Economic Development
      'Chapter 7: Indian Economy on the Eve of Independence',
      'Chapter 8: Indian Economy 1950-1990',
      'Chapter 9: Economic Reforms since 1991',
      'Chapter 10: Poverty',
      'Chapter 11: Human Capital Formation in India',
      'Chapter 12: Rural Development',
      'Chapter 13: Employment Growth, Informalisation and Other Issues',
      'Chapter 14: Infrastructure',
      'Chapter 15: Environment and Sustainable Development',
      'Chapter 16: Comparative Development Experiences of India and its Neighbours'
    ],
    'Hindi': [
      // Aroh - II (Main)
      'Chapter 1: Aatmparichay / Ek Geet (Harivansh Rai Bachchan)',
      'Chapter 2: Patang (Alok Dhanwa)',
      'Chapter 3: Kavita Ke Bahane / Baat Seedhi Thi Par (Kunwar Narayan)',
      'Chapter 4: Camere Mein Band Apahij (Raghuvir Sahay)',
      'Chapter 5: Usha (Shamsher Bahadur Singh)',
      'Chapter 6: Badal Raag (Suryakant Tripathi Nirala)',
      'Chapter 7: Kavitavali / Laxman-Murcha aur Ram ki Shakti Pooja (Tulsidas)',
      'Chapter 8: Rubaaiyaan / Ghazal (Firaq Gorakhpuri)',
      'Chapter 9: Chota Mera Khet / Bangulo Ke Pankh (Umashankhar Joshi)',
      'Chapter 10: Bhaktin (Mahadevi Varma)',
      'Chapter 11: Bazar Darshan (Jainendra Kumar)',
      'Chapter 12: Kaale Megha Paani De (Dharmavir Bharati)',
      'Chapter 13: Pahelwan Ki Dholak (Phanishwar Nath Renu)',
      'Chapter 14: Shirish Ke Phool (Hazari Prasad Dwivedi)',
      'Chapter 15: Shram Vibhajan aur Jati Pratha / Meri Kalpna ka Adarsh Samaj (B. R. Ambedkar)',
      // Vitan - II (Supplementary)
      'Chapter 16: Silver Wedding (Manohar Shyam Joshi)',
      'Chapter 17: Jooje (Anand Yadav)',
      'Chapter 18: Ateet Mein Dabe Paon (Om Thanvi)',
      'Chapter 19: Diary Ke Panne (Anne Frank)'
    ]
  }
};

const fallbackMCQsBySubject = {
  science: {
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
  },
  economics: {
    topic: "Factors of Production: Capital Classification Masterclass",
    questionText: "Which of the following best describes the main difference between 'Fixed Capital' and 'Working Capital' in the factors of production?",
    options: [
      { key: "A", desc: "Fixed capital consists of natural resources like land and water, while working capital consists of hired farm laborers." },
      { key: "B", desc: "Fixed capital (such as tools, machines, and buildings) can be used in production over many years, whereas working capital (such as raw materials and money in hand) is consumed or used up within a single production cycle." },
      { key: "C", desc: "Fixed capital refers only to the money kept as permanent bank deposits, while working capital refers only to heavy automated farm tractors." },
      { key: "D", desc: "Fixed capital is exclusively used by large-scale urban manufacturing units, while working capital is exclusively used by small rural farmers." }
    ],
    correctKey: "B",
    explanation: `### 📊 Factors of Production Masterclass

To produce any goods or services, we must organize four essential requirements, known as **factors of production**: **Land**, **Labour**, **Physical Capital**, and **Human Capital**. 

Let's focus on **Physical Capital**, which is the variety of inputs required at every stage of production. It is broadly classified into two categories:

#### 1. 🏗️ Fixed Capital
* **Definition:** Assets, tools, machinery, and buildings that can be used in production over **many years** (not consumed immediately).
* **Examples:** A farmer's simple plough, generators, turbines, tractors, computers, and workshop buildings.
* **Key Concept:** These do not get exhausted in a single production cycle; they are long-term capital investments.

#### 2. 💸 Working Capital
* **Definition:** Inputs, raw materials, and money that are **used up or consumed** during a single production cycle.
* **Examples:** Raw materials (like clay for a potter, yarn for a weaver, or seeds for a farmer) and cash in hand to make daily payments and purchase other necessary inputs.
* **Key Concept:** Unlike fixed capital, working capital is fully consumed in the process of producing the final output and must be constantly replenished.

#### ⚠️ Common Exam Mistakes to Avoid:
* **Confusing raw materials as fixed capital:** Raw materials are consumed completely to make the final product. Hence, they are *working capital*, not fixed capital.
* **Forgetting natural resources:** Remember that 'Land' includes all natural resources (water, forests, minerals), while 'Capital' refers strictly to man-made assets.`
  },
  mathematics: {
    topic: "Number Systems: Rational vs. Irrational Numbers Masterclass",
    questionText: "Which of the following statements is mathematically correct regarding rational and irrational numbers?",
    options: [
      { key: "A", desc: "The product of any two irrational numbers is always an irrational number." },
      { key: "B", desc: "Every real number is either rational or irrational, and any rational number can be written as $p/q$ where $p$ and $q$ are integers and $q \\neq 0$." },
      { key: "C", desc: "The square root of any positive integer is always an irrational number." },
      { key: "D", desc: "A decimal expansion that is non-terminating must always represent an irrational number." }
    ],
    correctKey: "B",
    explanation: `### 📐 Number Systems Masterclass

The set of all **Real Numbers** ($\mathbb{R}$) is composed of two completely distinct sets: **Rational Numbers** ($\mathbb{Q}$) and **Irrational Numbers**.

#### 1. 🔢 Rational Numbers
* **Definition:** Any number that can be expressed in the form $\\frac{p}{q}$, where $p$ and $q$ are integers and $q \\neq 0$.
* **Decimal Expansion:** The decimal representation of a rational number is either **terminating** (e.g., $\\frac{1}{2} = 0.5$) or **non-terminating repeating/recurring** (e.g., $\\frac{1}{3} = 0.333...$ or $0.\\bar{3}$).

#### 2. 🌀 Irrational Numbers
* **Definition:** Any number that cannot be written in the form $\\frac{p}{q}$ for integers $p$ and $q$ ($q \\neq 0$).
* **Decimal Expansion:** The decimal representation of an irrational number is **non-terminating and non-repeating** (e.g., $\\pi = 3.14159...$ or $\\sqrt{2} = 1.41421...$).
* **Root Rule:** The square root of any positive integer that is *not a perfect square* (like $\\sqrt{2}, \\sqrt{3}, \\sqrt{5}$) is always irrational.

#### ⚠️ Common Exam Pitfalls:
* **Product of irrationals:** The product of two irrationals is *not always* irrational. For example, $\\sqrt{2} \\times \\sqrt{2} = 2$ (which is rational!).
* **Non-terminating decimals:** Non-terminating decimal expansions can be rational if they repeat! Only *non-repeating* non-terminating decimals are irrational.`
  },
  english: {
    topic: "Grammar: Active vs. Passive Voice Masterclass",
    questionText: "Which of the following options correctly represents the passive voice of the sentence: 'The teacher is teaching the students'?",
    options: [
      { key: "A", desc: "'The students are taught by the teacher.'" },
      { key: "B", desc: "'The students are being taught by the teacher.'" },
      { key: "C", desc: "'The students were being taught by the teacher.'" },
      { key: "D", desc: "'The students will be taught by the teacher.'" }
    ],
    correctKey: "B",
    explanation: `### 📝 Active & Passive Voice Masterclass

Active and passive voice represent different ways of structuring a sentence depending on whether the **doer** (subject) or the **receiver** (object) is the main focus.

#### 1. ⚙️ Active Voice
* **Structure:** Subject + Verb + Object
* **Focus:** The subject performs the action.
* **Example:** *The teacher (Subject)* + *is teaching (Verb in Present Continuous)* + *the students (Object)*.

#### 2. 🔄 Passive Voice
* **Structure:** Object + auxiliary verb (be) + being (for continuous) + past participle (V3) + by + Subject
* **Focus:** The action or the receiver of the action.
* **Tense Transformation (Present Continuous):** 
  * Active: \`is/am/are + V-ing\`
  * Passive: \`is/am/are + being + V3 (past participle)\`
* **Applying to our sentence:** *The students* (plural object becomes new subject) + *are* (matches plural) + *being* (indicates continuous action) + *taught* (V3 of teach) + *by the teacher*.
* **Result:** *"The students are being taught by the teacher."*

#### ⚠️ Common Exam Pitfalls:
* **Forgetting 'being' in continuous tenses:** Leaving out 'being' turns the sentence into simple present tense, changing the meaning.
* **Incorrect tense changes:** Do not change the tense! Present continuous must remain in the present continuous timeline (do not change 'are being taught' to 'were being taught').`
  },
  hindi: {
    topic: "हिन्दी व्याकरण: सकर्मक और अकर्मक क्रिया मास्टरक्लास",
    questionText: "निम्नलिखित में से 'सकर्मक क्रिया' (Transitive Verb) का सही और स्पष्ट उदाहरण कौन सा है?",
    options: [
      { key: "A", desc: "'अमित गहरी नींद में सो रहा है।'" },
      { key: "B", desc: "'समीर पुस्तक पढ़ रहा है।'" },
      { key: "C", desc: "'सुंदर पक्षी आकाश में उड़ते हैं।'" },
      { key: "D", desc: "'छोटा बच्चा जोर-जोर से रोता है।'" }
    ],
    correctKey: "B",
    explanation: `### ✍️ हिन्दी व्याकरण: क्रिया विचार

वाक्य में किसी कार्य के करने या होने का बोध कराने वाले शब्द **क्रिया** कहलाते हैं। कर्म के आधार पर क्रिया के मुख्य रूप से दो भेद होते हैं:

#### 1. 🎯 सकर्मक क्रिया (Transitive Verb)
* **परिभाषा:** जिस क्रिया के कार्य का फल सीधे **कर्म (Object)** पर पड़ता है, उसे सकर्मक क्रिया कहते हैं। इसमें क्रिया के साथ कर्म का होना आवश्यक होता है।
* **पहचान ट्रिक:** क्रिया से पहले 'क्या' या 'किसको' लगाकर प्रश्न पूछें। यदि कोई उत्तर (कर्म) मिलता है, तो क्रिया सकर्मक है।
  * *उदाहरण:* समीर **क्या** पढ़ रहा है? उत्तर: **पुस्तक** (कर्म)। अतः 'पढ़ना' सकर्मक क्रिया है।

#### 2. 🍃 अकर्मक क्रिया (Intransitive Verb)
* **परिभाषा:** जिस क्रिया के कार्य का फल सीधे **कर्ता (Subject)** पर पड़ता है और कर्म की आवश्यकता नहीं होती, उसे अकर्मक क्रिया कहते हैं।
  * *उदाहरण:* अमित सो रहा है। (यहाँ सोने का प्रभाव सीधे अमित पर है, कोई कर्म नहीं है। 'क्या सो रहा है?' का कोई उत्तर नहीं है)।
  * *उदाहरण:* पक्षी आकाश में उड़ते हैं। ('उड़ना' अकर्मक है, आकाश तो आधार/अधिकरण कारक है, कर्म नहीं)।

#### ⚠️ परीक्षा में होने वाली सामान्य गलतियाँ:
* **स्थान को कर्म समझना:** 'पक्षी आकाश में उड़ते हैं' में 'आकाश' स्थान (अधिकरण) है, कर्म नहीं। क्रिया 'उड़ना' हमेशा अकर्मक होती है।
* **क्रिया पहचान:** रोना, हँसना, सोना, जागना, दौड़ना हमेशा अकर्मक क्रियाएँ होती हैं, जबकि लिखना, पढ़ना, खाना, पीना सकर्मक क्रियाएँ हैं।`
  }
};

const getFallbackMCQ = (subject = '') => {
  const s = subject.toLowerCase();
  if (s.includes('economic') || s.includes('commerce') || s.includes('business') || s.includes('accountancy') || s.includes('social') || s.includes('history') || s.includes('geography') || s.includes('civic') || s.includes('political')) {
    return fallbackMCQsBySubject.economics;
  }
  if (s.includes('math')) {
    return fallbackMCQsBySubject.mathematics;
  }
  if (s.includes('english')) {
    return fallbackMCQsBySubject.english;
  }
  if (s.includes('hindi') || s.includes('sanskrit')) {
    return fallbackMCQsBySubject.hindi;
  }
  return fallbackMCQsBySubject.science;
};



const AttemptItem = ({ att }) => {
  const [expanded, setExpanded] = useState(false);
  
  return (
    <div style={{
      background: 'var(--bg-secondary)',
      border: '1px solid var(--border)',
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
          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text)', marginTop: '0.15rem' }}>{att.topic}</div>
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
          borderTop: '1px solid var(--border)',
          fontSize: '0.8rem',
          lineHeight: 1.5,
          color: 'var(--text-secondary)'
        }} onClick={e => e.stopPropagation()}>
          <div style={{ background: 'var(--bg-tertiary)', padding: '0.6rem', borderRadius: '6px', marginBottom: '0.75rem', border: '1px solid var(--border)' }}>
            <strong style={{ color: 'var(--text)', fontSize: '0.75rem', display: 'block', marginBottom: '0.25rem' }}>Question:</strong>
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
                  text: ({ children }) => <MathRenderer text={children} />,
                  code: ({ className, children, ...props }) => {
                    const isInline = !className && typeof children === 'string' && !children.includes('\n');
                    if (isInline) {
                      if (typeof children === 'string' && children.includes('$')) {
                        return <MathRenderer text={children} />;
                      }
                      return <code className="md-inline-code" {...props}>{children}</code>;
                    }
                    return <div className="md-code-block"><code className={className} {...props}>{children}</code></div>;
                  },
                }}
                children={String(att?.explanation || '')}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};



export default function Home() {
  const { currentUser, subscription, setShowLoginModal } = useAuth();
  const [showUpgradePopup, setShowUpgradePopup] = useState(false);
  const navigate = useNavigate();

  const firstName = currentUser?.displayName?.split(' ')[0] || 'Student';
  const isGuest = !currentUser || currentUser.isGuest || currentUser.email === 'guest@tanios.ai';

  // ── USER-SPECIFIC LOCAL STORAGE SANDBOX ──
  const userId = currentUser?.uid || currentUser?.email || 'guest';
  const getUserKey = (baseKey) => `${baseKey}_${userId}`;

  const getLocalDateKey = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const getYesterdayDateKey = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  // ── 1. DOPAMINE GAMIFICATION STATE — pulled from global StudyContext ──
  // This gives real-time sync across all pages without manual refresh.
  const study = useStudy();
  const xp            = study.xp;
  const setXp         = study.setXp || (() => {});
  const streak        = study.streak;
  const setStreak     = study.setStreak;
  const level         = study.level;
  const consistency   = study.consistency;
  const setConsistency = study.setConsistency;
  const badges        = study.badges;
  const setBadges     = study.setBadges;
  const xpAwardedMsg  = study.xpAwardedMsg;
  const setXpAwardedMsg = study.setXpAwardedMsg;

  // ── 1.5. STUDENT PROFILE STATE ──
  const [profileBoard, setProfileBoard] = useState('');
  const [profileClass, setProfileClass] = useState('');
  const [profileSubjects, setProfileSubjects] = useState([]);
  const [profileExamDate, setProfileExamDate] = useState('');
  const [activeChapters, setActiveChapters] = useState({});
  const [profileSetupDone, setProfileSetupDone] = useState(false);
  const [showProfileSetup, setShowProfileSetup] = useState(false);
  const [showChaptersConfig, setShowChaptersConfig] = useState(false);

  const openChaptersConfig = () => {
    setShowChaptersConfig(true);
    profileSubjects.forEach(subj => {
      const currentCh = activeChapters[subj];
      if (currentCh) {
        fetchInlineSubTopics(subj, currentCh);
      }
    });
  };

  const handleToggleChaptersConfig = () => {
    const nextState = !showChaptersConfig;
    setShowChaptersConfig(nextState);
    if (nextState) {
      profileSubjects.forEach(subj => {
        const currentCh = activeChapters[subj];
        if (currentCh) {
          fetchInlineSubTopics(subj, currentCh);
        }
      });
    }
  };
  const [showOneClickTools, setShowOneClickTools] = useState(false);
  const [showMistakeLocker, setShowMistakeLocker] = useState(false);
  const [showTimelineModal, setShowTimelineModal] = useState(false);
  const [timelineData, setTimelineData]   = useState(null); // { totalDays, subjects: [{name,chapters,daysPerCh}] }

  // Temp state for profile setup form
  const [setupBoard, setSetupBoard] = useState('CBSE');
  const [setupClass, setSetupClass] = useState('10');
  const [setupSubjects, setSetupSubjects] = useState('');
  const [selectedSubjects, setSelectedSubjects] = useState([]);
  const [setupExamDate, setSetupExamDate] = useState('');

  // ── 2. STUDY MISSIONS STATE (starts EMPTY — generated from profile) ──
  const [missions, setMissions] = useState([]);

  // Interactive Daily Mission Modal states
  const [activeMission, setActiveMission] = useState(null);
  const [missionAnswer, setMissionAnswer] = useState(null);
  const [missionSubmitted, setMissionSubmitted] = useState(false);
  const [quizStep, setQuizStep] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [showShortAnswer, setShowShortAnswer] = useState(false);

  // Dynamic Topic Customizer states
  const [selectedSubTopicsMap, setSelectedSubTopicsMap] = useState(() => {
    try {
      const stored = localStorage.getItem(getUserKey('tanios_selected_subtopics'));
      return stored ? JSON.parse(stored) : {};
    } catch (e) {
      return {};
    }
  });
  const [inlineSubTopics, setInlineSubTopics] = useState({});
  const [customTopicInput, setCustomTopicInput] = useState('');

  // ── DYNAMIC AI STUDY MISSIONS STATE ──
  const [dynamicMissionContent, setDynamicMissionContent] = useState(null);
  const [missionLoading, setMissionLoading] = useState(false);
  const [missionError, setMissionError] = useState('');
  const [mcqAttempts, setMcqAttempts] = useState([]);
  const netScore    = study.netScore;
  const setNetScore = study.setNetScore;

  const completedNonLogin = missions.filter(m => m.type !== 'login' && m.done).length;
  const isPro = subscription?.active;

  // 1-Day Free Trial logic: allow all targets on the first day, lock on subsequent days
  const freeStudyDayKey = getUserKey('tanios_free_study_day');
  const storedFreeStudyDay = localStorage.getItem(freeStudyDayKey);
  const todayDateString = getLocalDateKey();
  const isFreeTierLocked = !isPro && storedFreeStudyDay && storedFreeStudyDay !== todayDateString;

  // Subject-aware dynamic fallback MCQ based on active mission
  const fallback = getFallbackMCQ(activeMission?.subject || '');

  const isMultiQuestion = !!(dynamicMissionContent && Array.isArray(dynamicMissionContent.questions) && dynamicMissionContent.questions.length > 0);
  const quizQuestions = isMultiQuestion
    ? dynamicMissionContent.questions
    : [dynamicMissionContent || fallback];
  const currentQuestionIdx = Math.min(quizStep, quizQuestions.length - 1);

  // ── 3. WEAKNESSES STATE (starts EMPTY — student adds their own) ──
  const [weaknesses, setWeaknesses] = useState([]);
  const [newWeakSubject, setNewWeakSubject] = useState('');
  const [newWeakChapter, setNewWeakChapter] = useState('');
  const [showAddWeakness, setShowAddWeakness] = useState(false);

  // ── 4. ONE-CLICK OUTPUT PANEL STATE ──
  const [activeOneClickTool, setActiveOneClickTool] = useState(null);
  const [oneClickTopic, setOneClickTopic] = useState('');
  const [oneClickGrade, setOneClickGrade] = useState('10');
  const [oneClickBoard, setOneClickBoard] = useState('CBSE');
  const [oneClickLoading, setOneClickLoading] = useState(false);
  const [oneClickStatus, setOneClickStatus] = useState('');
  const [oneClickResult, setOneClickResult] = useState('');
  const [oneClickCopied, setOneClickCopied] = useState(false);

  // ── EXAM MODE ROADMAP STATE REMOVED ──

  // ── MISSION GENERATOR (generates from student's actual subjects) ──
  const generateMissionsFromProfile = (board, grade, subjects, activeChaptersMap = {}, examDateStr = '') => {
    if (!subjects || subjects.length === 0) return [];

    const cleanGrade = (grade || '10').toString().replace(/\D/g, '') || '10';

    // Calculate total days remaining for pacing context
    const now = new Date();
    let examDateForPacing;
    if (examDateStr) {
      examDateForPacing = new Date(examDateStr);
    } else {
      const EXAM_DATES = {
        CBSE: { '10': { month: 1, day: 15 }, '12': { month: 1, day: 15 }, '8': { month: 2, day: 1 }, '9': { month: 2, day: 1 }, '11': { month: 2, day: 1 } },
        RBSE: { '10': { month: 2, day: 5 }, '12': { month: 2, day: 5 }, '8': { month: 2, day: 10 }, '9': { month: 2, day: 10 }, '11': { month: 2, day: 10 } },
      };
      const ei = EXAM_DATES[board]?.[cleanGrade] || { month: 1, day: 15 };
      examDateForPacing = new Date(now.getFullYear(), ei.month, ei.day);
      if (examDateForPacing <= now) examDateForPacing.setFullYear(now.getFullYear() + 1);
    }
    const totalDaysLeft = Math.max(30, Math.ceil((examDateForPacing - now) / (1000 * 60 * 60 * 24)));

    const getChapterForSubject = (subj) => {
      // 1. Use manually set active chapter if exists
      if (activeChaptersMap && activeChaptersMap[subj]) {
        return activeChaptersMap[subj];
      }
      // 2. Try known CLASS_SYLLABUS
      const chaptersList = CLASS_SYLLABUS[cleanGrade]?.[subj];
      if (chaptersList && chaptersList.length > 0) {
        return chaptersList[0];
      }
      // 3. Custom subject — generate generic chapter 1
      return `Chapter 1: Introduction to ${subj}`;
    };

    const dateKey = getLocalDateKey();

    const generated = subjects.map((subj, idx) => {
      const activeCh = getChapterForSubject(subj);
      const chClean = activeCh.replace(/^Chapter \d+:\s*/, '');
      return {
        id: `m_${idx + 1}`,
        type: 'teaching_mcq',
        label: `Learn ${subj}: ${chClean} (Topic Masterclass)`,
        xp: 30,
        done: false,
        dateKey,
        subject: subj,
        chapter: activeCh,
      };
    });

    generated.push({
      id: 'm_checkin',
      type: 'login',
      label: 'Daily consistency check-in',
      xp: 15,
      done: false,
      dateKey,
    });

    return generated;
  };

  // ── Auto-generate chapter list for custom subjects not in CLASS_SYLLABUS ──
  const buildChapterListForSubject = (subj, grade, examDateStr) => {
    const cleanGrade = (grade || '10').toString().replace(/\D/g, '') || '10';
    const known = CLASS_SYLLABUS[cleanGrade]?.[subj];
    if (known && known.length > 0) return known;

    // Custom subject: estimate ~10-15 chapters proportional to exam time
    const now = new Date();
    let examDate;
    if (examDateStr) {
      examDate = new Date(examDateStr);
    } else {
      examDate = new Date(now.getFullYear() + 1, 1, 15);
    }
    const daysLeft = Math.max(30, Math.ceil((examDate - now) / (1000 * 60 * 60 * 24)));
    const estimatedChapters = Math.min(15, Math.max(5, Math.round(daysLeft / 14)));

    return Array.from({ length: estimatedChapters }, (_, i) =>
      `Chapter ${i + 1}: ${subj} — Part ${i + 1}`
    );
  };

  // ── SAVE PROFILE ──
  const handleSaveProfile = (e) => {
    e.preventDefault();
    
    if (isGuest) {
      setShowLoginModal(true);
      return;
    }
    
    const quickSubjectsList = [...selectedSubjects];
    const customList = setupSubjects.split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !quickSubjectsList.some(q => q.toLowerCase() === s.toLowerCase()));
    
    const subjectsArray = [...quickSubjectsList, ...customList];
    
    if (subjectsArray.length === 0) {
      alert("Please select or enter at least one subject to customize your missions.");
      return;
    }

    if (!isPro && subjectsArray.length > 2) {
      alert("Free members can only choose up to 2 subjects. Please upgrade to TaniOS Pro to select 3 or more subjects!");
      setShowUpgradePopup(true);
      return;
    }

    if (!isPro) {
      const unlockedFreeSubjectsKey = getUserKey('tanios_free_unlocked_subjects');
      const storedUnlocked = localStorage.getItem(unlockedFreeSubjectsKey);
      let unlockedSubjects = storedUnlocked ? JSON.parse(storedUnlocked) : [];
      
      subjectsArray.forEach(subj => {
        if (!unlockedSubjects.some(s => s.toLowerCase() === subj.toLowerCase())) {
          if (unlockedSubjects.length < 2) {
            unlockedSubjects.push(subj);
          }
        }
      });
      localStorage.setItem(unlockedFreeSubjectsKey, JSON.stringify(unlockedSubjects));
    }

    // ── Calculate timeline: days per chapter per subject ──
    const now = new Date();
    let examDate;
    if (setupExamDate) {
      examDate = new Date(setupExamDate);
    } else {
      const EXAM_DATES = {
        CBSE: { '10': { month: 1, day: 15 }, '12': { month: 1, day: 15 }, '8': { month: 2, day: 1 }, '9': { month: 2, day: 1 }, '11': { month: 2, day: 1 } },
        RBSE: { '10': { month: 2, day: 5 }, '12': { month: 2, day: 5 }, '8': { month: 2, day: 10 }, '9': { month: 2, day: 10 }, '11': { month: 2, day: 10 } },
      };
      const cleanSetupClassNum = (setupClass || '10').toString().replace(/\D/g, '') || '10';
      const ei = EXAM_DATES[setupBoard]?.[cleanSetupClassNum] || { month: 1, day: 15 };
      examDate = new Date(now.getFullYear(), ei.month, ei.day);
      if (examDate <= now) examDate.setFullYear(now.getFullYear() + 1);
    }
    const totalDaysLeft = Math.max(30, Math.ceil((examDate - now) / (1000 * 60 * 60 * 24)));
    const daysPerSubject = Math.floor(totalDaysLeft / subjectsArray.length);

    setProfileBoard(setupBoard);
    setProfileClass(setupClass);
    setProfileSubjects(subjectsArray);
    setProfileExamDate(setupExamDate);
    setProfileSetupDone(true);
    setShowProfileSetup(false);

    // ── Initialize active chapters — properly handle custom subjects ──
    const initialActiveChapters = {};
    subjectsArray.forEach(subj => {
      const cleanSetupClass = (setupClass || '10').toString().replace(/\D/g, '') || '10';
      // Use buildChapterListForSubject which handles both known & custom subjects
      const chaptersList = buildChapterListForSubject(subj, cleanSetupClass, setupExamDate);
      initialActiveChapters[subj] = chaptersList.length > 0 ? chaptersList[0] : `Chapter 1: Introduction to ${subj}`;
    });
    setActiveChapters(initialActiveChapters);
    localStorage.setItem(getUserKey('tanios_active_chapters'), JSON.stringify(initialActiveChapters));

    // Persist profile
    const profile = { board: setupBoard, grade: setupClass, subjects: subjectsArray, examDate: setupExamDate };
    localStorage.setItem(getUserKey('tanios_profile'), JSON.stringify(profile));

    // Generate missions (pass examDate for accurate pacing)
    const newMissions = generateMissionsFromProfile(setupBoard, setupClass, subjectsArray, initialActiveChapters, setupExamDate);
    setMissions(newMissions);
    saveState('tanios_missions', newMissions);

    setOneClickGrade(setupClass);
    setOneClickBoard(setupBoard);

    awardXp(10, 'Profile Setup Complete');

    // Show styled timeline modal (sync — React 18 batches all these setState calls)
    const summaryItems = subjectsArray.map(subj => {
      const chList = buildChapterListForSubject(subj, (setupClass || '10').toString().replace(/\D/g, '') || '10', setupExamDate);
      const daysPerCh = Math.max(5, Math.round(daysPerSubject / (chList.length || 1)));
      return { name: subj, chapters: chList.length, daysPerCh };
    });
    setTimelineData({ totalDays: totalDaysLeft, subjects: summaryItems });
    // setShowTimelineModal(true);
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
      const storedWeaknesses  = localStorage.getItem(getUserKey('tanios_weaknesses'));
      const storedMissions    = localStorage.getItem(getUserKey('tanios_missions'));
      const storedProfile     = localStorage.getItem(getUserKey('tanios_profile'));
      const storedAttempts    = localStorage.getItem(getUserKey('tanios_mcq_attempts'));
      const storedInline      = localStorage.getItem(getUserKey('tanios_inline_subtopics'));

      // XP / streak / consistency / badges / netScore are loaded by StudyContext — no duplicates here.
      setMcqAttempts(storedAttempts ? JSON.parse(storedAttempts) : []);
      setInlineSubTopics(storedInline ? JSON.parse(storedInline) : {});

      // ── Weaknesses ──
      setWeaknesses(storedWeaknesses ? JSON.parse(storedWeaknesses) : []);

      // ── Profile & Missions ──
      if (storedProfile) {
        const profile = JSON.parse(storedProfile);
        setProfileBoard(profile.board);
        setProfileClass(profile.grade);
        setProfileSubjects(profile.subjects);
        setProfileExamDate(profile.examDate || '');
        setProfileSetupDone(true);
        setSetupBoard(profile.board);
        setSetupClass(profile.grade);
        setSetupExamDate(profile.examDate || '');

        const unlockedFreeSubjectsKey = getUserKey('tanios_free_unlocked_subjects');
        if (!isPro && !localStorage.getItem(unlockedFreeSubjectsKey) && profile.subjects) {
          const initialUnlocked = profile.subjects.slice(0, 2);
          localStorage.setItem(unlockedFreeSubjectsKey, JSON.stringify(initialUnlocked));
        }

        // Restore subject chip selections for the edit form
        const standardList = [
          'Physics', 'Chemistry', 'Mathematics', 'Biology',
          'History', 'Civics', 'Geography', 'Sanskrit', 'English', 'Hindi', 'Computer Science',
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
        const todayKey = getLocalDateKey();
        let missionsToUse;
        const storedActiveChapters = localStorage.getItem(getUserKey('tanios_active_chapters'));
        const activeChaptersMap = storedActiveChapters ? JSON.parse(storedActiveChapters) : {};

        // Auto-initialize missing or invalid subjects with Chapter 1 by default
        let chaptersMapChanged = false;
        profile.subjects.forEach(subj => {
          const cleanProfileGrade = (profile.grade || '10').toString().replace(/\D/g, '') || '10';
          const knownChapters = CLASS_SYLLABUS[cleanProfileGrade]?.[subj];
          // For custom subjects not in CLASS_SYLLABUS, generate generic chapters
          const chaptersList = (knownChapters && knownChapters.length > 0)
            ? knownChapters
            : Array.from({ length: 8 }, (_, i) => `Chapter ${i + 1}: ${subj} — Part ${i + 1}`);
          const currentCh = activeChaptersMap[subj];

          if (!currentCh) {
            activeChaptersMap[subj] = chaptersList[0];
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

        // Auto-complete check-in if not yet done today
        const checkinMission = missionsToUse.find(m => m.id === 'm_checkin');
        if (checkinMission && !checkinMission.done) {
          setTimeout(() => {
            toggleMission('m_checkin');
          }, 100);
        }

        // Sync one-click grade with profile
        setOneClickGrade(profile.grade);
        setOneClickBoard(profile.board || 'CBSE');

        // Pre-fetch subtopics in the background for active chapters of all subjects
        profile.subjects.forEach(subj => {
          const currentCh = activeChaptersMap[subj];
          if (currentCh) {
            const savedSelected = JSON.parse(localStorage.getItem(getUserKey('tanios_selected_subtopics')) || '{}');
            const hasSubtopics = savedSelected[subj]?.[currentCh]?.length > 0;
            if (!hasSubtopics) {
              fetchInlineSubTopics(subj, currentCh).catch(err =>
                console.warn("Background prefetch failed for", subj, err)
              );
            }
          }
        });
      } else {
        // No profile found → new user or just logged out → show setup form
        setProfileSetupDone(false);
        setProfileBoard('');
        setProfileClass('');
        setProfileSubjects([]);
        setSelectedSubjects([]);
        setSetupSubjects('');
        setProfileExamDate('');
        setSetupExamDate('');
        setMissions([]);
        setMcqAttempts([]);
        setNetScore(0);
      }

    } catch (e) {
      console.warn('Could not load local storage states:', e);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.uid, currentUser?.email]);


  // Auto-award badges based on milestones when XP changes
  useEffect(() => {

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

  // XP updates are now handled by StudyContext (cross-tab + same-tab via storage event)
  // The legacy tanios_xp_update listener is registered there, so no duplicate needed here.

  // Automatically open tools when one is activated (e.g. from mistake clinic)
  useEffect(() => {
    if (activeOneClickTool) {
      setShowOneClickTools(true);
    }
  }, [activeOneClickTool]);



  // awardXp delegates to the global StudyContext so all pages share the same XP state.
  const awardXp = study.awardXp;

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
  function toggleMission(id) {
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

    // If on free tier, establish the free study day on the first target completed
    if (!isPro && target.type !== 'login') {
      const freeStudyDayKey = getUserKey('tanios_free_study_day');
      if (!localStorage.getItem(freeStudyDayKey)) {
        const todayKey = getLocalDateKey();
        localStorage.setItem(freeStudyDayKey, todayKey);
      }
    }

    // Award XP for this mission
    let isIncorrectMCQ = false;
    if (target.type === 'teaching_mcq') {
      try {
        const stored = localStorage.getItem(getUserKey('tanios_mcq_attempts'));
        const attempts = stored ? JSON.parse(stored) : [];
        const matchingAttempt = attempts.find(a => 
          a.missionId === target.id && 
          a.dateKey === target.dateKey &&
          (a.firstIncorrectKey !== null || a.isCorrect === false)
        );
        if (matchingAttempt) {
          isIncorrectMCQ = true;
        }
      } catch (e) {
        console.warn("Could not check MCQ attempts in toggleMission:", e);
      }
    }

    if (isIncorrectMCQ) {
      awardXp(0, 'Mission Completed! (No XP for incorrect attempts)');
    } else {
      awardXp(target.xp, 'Completed Target Task');
    }

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

      // 2b. Persist completed topics list
      const storedCompleted = localStorage.getItem(getUserKey('tanios_completed_topics'));
      const completedMap = storedCompleted ? JSON.parse(storedCompleted) : {};
      if (!completedMap[subject]) {
        completedMap[subject] = {};
      }
      const currentCompleted = completedMap[subject][currentChapter] || [];
      const savedSelected = JSON.parse(localStorage.getItem(getUserKey('tanios_selected_subtopics')) || '{}');
      const activeSelected = savedSelected[subject]?.[currentChapter] || [];
      const newCompleted = [...new Set([...currentCompleted, ...activeSelected])];
      completedMap[subject][currentChapter] = newCompleted;
      localStorage.setItem(getUserKey('tanios_completed_topics'), JSON.stringify(completedMap));

      // 3. Calculate exam target pacing
      const now = new Date();
      let examDate;
      if (profileExamDate) {
        examDate = new Date(profileExamDate);
      } else {
        const EXAM_DATES = {
          CBSE: { '10': { month: 1, day: 15 }, '12': { month: 1, day: 15 }, '8': { month: 2, day: 1 }, '9': { month: 2, day: 1 }, '11': { month: 2, day: 1 } },
          RBSE: { '10': { month: 2, day: 5 }, '12': { month: 2, day: 5 }, '8': { month: 2, day: 10 }, '9': { month: 2, day: 10 }, '11': { month: 2, day: 10 } }
        };
        const classNum = grade.toString().replace(/\D/g, '') || '10';
        const examInfo = EXAM_DATES[board]?.[classNum] || EXAM_DATES['CBSE']['10'];

        let examYear = now.getFullYear();
        examDate = new Date(examYear, examInfo.month, examInfo.day);
        if (examDate <= now) {
          examYear += 1;
          examDate.setFullYear(examYear);
        }
      }
      const diffMs = examDate - now;
      const diffDays = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

      const cleanGrade = (grade || '10').toString().replace(/\D/g, '') || '10';
      const chaptersList = CLASS_SYLLABUS[cleanGrade]?.[subject] || [];
      const totalChapters = chaptersList.length || 1;
      const chapterIdx = chaptersList.indexOf(currentChapter);
      
      const chaptersRemaining = Math.max(1, totalChapters - (chapterIdx !== -1 ? chapterIdx + 1 : 1) + 1);
      const daysPerChapter = Math.max(5, Math.round(diffDays / chaptersRemaining));

      let isChapterComplete = false;
      const savedInline = JSON.parse(localStorage.getItem(getUserKey('tanios_inline_subtopics')) || '{}');
      const chapterTopics = savedInline[subject]?.[currentChapter]?.topics || [];
      if (chapterTopics.length > 0) {
        isChapterComplete = chapterTopics.every(t => newCompleted.includes(t));
      } else {
        isChapterComplete = nextCount >= daysPerChapter;
      }

      // If chapter is complete, ensure progress count is set to maximum days to sync UI visual
      if (isChapterComplete && nextCount < daysPerChapter) {
        progressMap[subject][currentChapter] = daysPerChapter;
        localStorage.setItem(getUserKey('tanios_chapter_progress'), JSON.stringify(progressMap));
      }

      // If they completed all days/topics allocated for this chapter, advance to next chapter automatically!
      if (isChapterComplete) {
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
    setConsistency(prev => Math.min(100, prev + 2));

    // ── STREAK LOGIC: increment streak only when ALL non-login missions are done ──
    if (isLastMission) {
      const todayKey = getLocalDateKey();
      const lastStreakDay = localStorage.getItem(getUserKey('tanios_streak_day')) || '';

      if (lastStreakDay !== todayKey) {
        // First time completing all missions today → increment streak
        setStreak(prev => prev + 1);
        localStorage.setItem(getUserKey('tanios_streak_day'), todayKey);
        // Extra XP bonus for completing all daily missions
        setTimeout(() => awardXp(10, '🔥 All Daily Missions Complete!'), 600);
      }
    }
  }

  const safeJsonParse = (str) => {
    // Helper to escape raw control characters inside JSON string literals
    const escapeControlCharsInStrings = (s) => {
      let result = '';
      let insideString = false;
      let i = 0;
      while (i < s.length) {
        const char = s[i];
        if (char === '"') {
          let backslashes = 0;
          let j = i - 1;
          while (j >= 0 && s[j] === '\\') {
            backslashes++;
            j--;
          }
          if (backslashes % 2 === 0) {
            insideString = !insideString;
          }
          result += char;
          i++;
        } else if (insideString) {
          if (char === '\n') {
            result += '\\n';
            i++;
          } else if (char === '\r') {
            result += '\\r';
            i++;
          } else if (char === '\t') {
            result += '\\t';
            i++;
          } else {
            result += char;
            i++;
          }
        } else {
          result += char;
          i++;
        }
      }
      return result;
    };

    let cleaned = str.trim();
    
    // Find the first valid JSON boundary (object or array)
    const firstBrace = cleaned.indexOf('{');
    const firstBracket = cleaned.indexOf('[');
    
    if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
      // It starts with an object
      let braceCount = 0;
      let insideString = false;
      let escaped = false;
      let foundEnd = false;
      
      for (let i = firstBrace; i < cleaned.length; i++) {
        const char = cleaned[i];
        if (escaped) {
          escaped = false;
          continue;
        }
        if (char === '\\') {
          escaped = true;
          continue;
        }
        if (char === '"') {
          insideString = !insideString;
          continue;
        }
        if (!insideString) {
          if (char === '{') {
            braceCount++;
          } else if (char === '}') {
            braceCount--;
            if (braceCount === 0) {
              cleaned = cleaned.substring(firstBrace, i + 1);
              foundEnd = true;
              break;
            }
          }
        }
      }
      if (!foundEnd) {
        const lastBrace = cleaned.lastIndexOf('}');
        if (lastBrace !== -1) {
          cleaned = cleaned.substring(firstBrace, lastBrace + 1);
        }
      }
    } else if (firstBracket !== -1) {
      // It starts with an array
      let bracketCount = 0;
      let insideString = false;
      let escaped = false;
      let foundEnd = false;
      
      for (let i = firstBracket; i < cleaned.length; i++) {
        const char = cleaned[i];
        if (escaped) {
          escaped = false;
          continue;
        }
        if (char === '\\') {
          escaped = true;
          continue;
        }
        if (char === '"') {
          insideString = !insideString;
          continue;
        }
        if (!insideString) {
          if (char === '[') {
            bracketCount++;
          } else if (char === ']') {
            bracketCount--;
            if (bracketCount === 0) {
              cleaned = cleaned.substring(firstBracket, i + 1);
              foundEnd = true;
              break;
            }
          }
        }
      }
      if (!foundEnd) {
        const lastBracket = cleaned.lastIndexOf(']');
        if (lastBracket !== -1) {
          cleaned = cleaned.substring(firstBracket, lastBracket + 1);
        }
      }
    } else {
      cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    }

    cleaned = escapeControlCharsInStrings(cleaned);

    // Replace invalid single quote escapes
    cleaned = cleaned.replace(/\\'/g, "'");

    try {
      // 1. First attempt: escape invalid backslashes (excluding valid JSON escapes except \t, \b, \f, \/ which get doubled)
      let tempCleaned = cleaned.replace(/\\(["\\nr])|\\/g, (match, g1) => {
        return g1 ? match : '\\\\';
      });
      return JSON.parse(tempCleaned);
    } catch (e) {
      console.warn("safeJsonParse: Initial parse failed, attempting aggressive escape cleanup:", e.message);
      
      // 2. Second attempt: aggressive character-by-character backslash correction
      let resolved = "";
      let i = 0;
      while (i < cleaned.length) {
        if (cleaned[i] === '\\') {
          const nextChar = cleaned[i + 1];
          if (!nextChar) {
            resolved += '\\\\';
            i++;
            continue;
          }
          
          // If it's a valid JSON escape character, keep it as is
          if (['"', '\\', '/', 'b', 'f', 'n', 'r', 't'].includes(nextChar)) {
            resolved += '\\' + nextChar;
            i += 2;
          } else if (nextChar === 'u') {
            // Check if it's a valid unicode escape sequence (e.g. \u2212)
            const hexPart = cleaned.substring(i + 2, i + 6);
            if (/^[0-9a-fA-F]{4}$/.test(hexPart)) {
              resolved += '\\u' + hexPart;
              i += 6;
            } else {
              // Not a valid unicode escape, double escape the backslash
              resolved += '\\\\u';
              i += 2;
            }
          } else {
            // Double escape any other invalid escape
            resolved += '\\\\' + nextChar;
            i += 2;
          }
        } else {
          resolved += cleaned[i];
          i++;
        }
      }
      
      try {
        return JSON.parse(resolved);
      } catch (e2) {
        console.error("safeJsonParse: Aggressive cleanup also failed:", e2.message);
        throw e2;
      }
    }
  };

  const fetchDynamicMission = async (mission, chosenTopics = []) => {
    setMissionLoading(true);
    setMissionError('');
    setDynamicMissionContent(null);

    const subject = mission.subject || 'General Science';
    const grade = profileClass || '10';
    const board = profileBoard || 'CBSE';

    // ── Calculate days remaining dynamically ──
    const now = new Date();
    let examDate;
    if (profileExamDate) {
      examDate = new Date(profileExamDate);
    } else {
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
      examDate = new Date(examYear, examInfo.month, examInfo.day);
      if (examDate <= now) {
        examYear += 1;
        examDate.setFullYear(examYear);
      }
    }
    const diffMs = examDate - now;
    const diffDays = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

    const cleanGrade = (grade || '10').toString().replace(/\D/g, '') || '10';
    const chaptersList = CLASS_SYLLABUS[cleanGrade]?.[subject] || [];
    const totalChapters = chaptersList.length || 1;
    const currentChapter = mission.chapter || 'General Syllabus';
    const chapterIdx = chaptersList.indexOf(currentChapter);
    const resolvedChapterIdx = chapterIdx !== -1 ? chapterIdx + 1 : 1;
    
    // Chapters remaining including the current one
    const chaptersRemaining = Math.max(1, totalChapters - resolvedChapterIdx + 1);
    // Calculated days allocated per remaining chapter to finish on time
    const daysPerChapter = Math.max(5, Math.round(diffDays / chaptersRemaining));

    // Retrieve progress
    const storedProgress = localStorage.getItem(getUserKey('tanios_chapter_progress'));
    const progressMap = storedProgress ? JSON.parse(storedProgress) : {};
    const completedTopicsInChapter = progressMap[subject]?.[currentChapter] || 0;
    const currentTopicDay = completedTopicsInChapter + 1;

    const topicsStr = chosenTopics.length > 0 
      ? chosenTopics.map(t => `"${t}"`).join(', ') 
      : `fractional progress Day ${currentTopicDay} topics of the chapter`;

    const numQuestions = Math.min(5, Math.max(1, chosenTopics.length || 1));

    const savedInline = JSON.parse(localStorage.getItem(getUserKey('tanios_inline_subtopics')) || '{}');
    const allTopicsForChapter = savedInline[subject]?.[currentChapter]?.topics || [];
    const excludedTopics = allTopicsForChapter.filter(t => !chosenTopics.includes(t));
    const excludeInstruction = excludedTopics.length > 0
      ? `\n* EXTREMELY IMPORTANT DIRECTIVE: Do NOT generate questions for any of these excluded sub-topics: ${excludedTopics.map(t => `"${t}"`).join(', ')}. Focus ONLY on the selected ones.`
      : '';

    let prompt = `You are an elite syllabus-expert personal AI teacher built specifically for Class ${grade} students of the ${board} board, with extreme expertise in curricula, past exam papers, and question patterns.
 
SYSTEMATIC TOPIC-TEACHING MCQ LAW:
Your goal is to teach a student the specific sub-topic(s): ${topicsStr} from the subject ${subject}, chapter: "${currentChapter}".
Instead of combining all sub-topics into a single broad question, you must generate a separate, highly educational Multiple Choice Question (MCQ) for each of the selected sub-topics individually.
You MUST generate exactly ${numQuestions} highly educational Multiple Choice Questions (MCQs) in the "questions" array, where each question corresponds to one of the selected sub-topics in chronological order:
${chosenTopics.length > 0 ? chosenTopics.map((topic, i) => `${i + 1}. "${topic}"`).join('\n') : `1. "${currentChapter} Core Concepts"`}
* ABSOLUTE RESTRICTION: Do NOT include, test, or reference any other concepts or sub-topics from the chapter. Generate MCQs ONLY for the specific list of selected sub-topics listed above.
Each question, options, and explanation MUST be designed with 100% precision for CBSE and RBSE board standards, focusing heavily on high-yield, exam-repeated concepts.

SYLLABUS PACING SUMMARY:
* Subject: ${subject}
* Total Chapters in Syllabus: ${totalChapters}
* Current Chapter: "${currentChapter}" (Chapter ${resolvedChapterIdx} of ${totalChapters})
* Days Remaining until Exams: ${diffDays} Days
* Target Completion Pace: Exactly ${daysPerChapter} days allocated to complete each remaining chapter to guarantee 100% syllabus completion on time.
* Chapter Study Day Progress: Today is Day ${currentTopicDay} out of ${daysPerChapter} allocated days for "${currentChapter}".

Systematic Topic-Focused Pacing Directive:
Please design the MCQs, the topic summaries, and the explanations strictly to explain and test the selected topics: ${topicsStr}.${excludeInstruction}

SPEED & CONCISENESS RULE (MANDATORY):
To ensure ultra-fast generation and instant response times (< 2 seconds), be extremely crisp, high-density, and direct. Keep each topicSummary to exactly 3 short bullet points (max 40 words total). Keep each explanation to a short, high-yield topper guide of max 120 words total containing a 1-bullet concept explanation, a 1-sentence topper trick, and a 1-sentence mistake warning.

Your output MUST be a valid JSON object with the following keys. Do not include any conversational text or markdown code blocks (no \`\`\`json). Output raw JSON only.

JSON Structure:
{
  "topic": "${currentChapter} — Concept Quiz",
  "questions": [
    {
      "topic": "Specific Sub-Topic Name corresponding to the sub-topic being tested",
      "topicSummary": "A concise 3 bullet point Markdown summary of ONLY this sub-topic. Max 40 words. Use KaTeX $ for all formulas. Shown to the student BEFORE the MCQ question to prime their understanding.",
      "questionText": "Highly detailed, conceptual, and concept-introducing question text focusing strictly on this single sub-topic. Wrap all math/equations in $ delimiters.",
      "options": [
        { "key": "A", "desc": "Option A description. Wrap any math/formulas in $." },
        { "key": "B", "desc": "Option B description." },
        { "key": "C", "desc": "Option C description." },
        { "key": "D", "desc": "Option D description." }
      ],
      "correctKey": "A, B, C, or D",
      "explanation": "Markdown-styled short mini-lesson teaching ONLY the selected sub-topic. Max 120 words. Include: 💡 Core Concept, 🥇 Topper Trick, and ⚠️ Common Mistake. Use KaTeX $ for all math/scientific expressions."
    }
  ]
}`;

    try {
      const response = await generateAIContent(prompt);
      if (response.error || !response.text) {
        throw new Error(response.message || 'AI generation failed');
      }

      const parsed = safeJsonParse(response.text);
      setDynamicMissionContent(parsed);
    } catch (e) {
      console.warn("⚠️ Dynamic mission generation failed, using fallback:", e.message);
      setMissionError(e.message);
      // Fallback is handled automatically in the UI rendering by checking if dynamicMissionContent is null
    } finally {
      setMissionLoading(false);
    }
  };

  const ensureInlineSubTopics = async (subject, chapter) => {
    const savedInline = JSON.parse(localStorage.getItem(getUserKey('tanios_inline_subtopics')) || '{}');
    if (savedInline[subject]?.[chapter]?.topics?.length > 0) {
      return savedInline[subject][chapter].topics;
    }

    const cleanProfileClass = (profileClass || '10').toString().replace(/\D/g, '') || '10';
    const prompt = `You are a CBSE and RBSE board syllabus expert. 
Generate a list of exactly 4 to 6 core chronological sub-topics or key concepts for Class ${cleanProfileClass}, ${profileBoard || 'CBSE'} Board, Subject: ${subject}, Chapter: "${chapter}".
Return ONLY a valid JSON array of strings, where each string represents a specific chronological sub-topic or key concept.
Do not include any markdown, code blocks, or conversational text. Output raw JSON only. E.g.:
["Topic 1", "Topic 2", "Topic 3", "Topic 4"]`;

    const response = await generateAIContent(prompt);
    if (response.error || (typeof response.text !== 'string' && !Array.isArray(response.text))) {
      throw new Error(response.message || 'Failed to fetch topics');
    }

    let parsed = [];
    if (Array.isArray(response.text)) {
      parsed = response.text;
    } else {
      parsed = safeJsonParse(response.text);
    }

    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    } else {
      throw new Error('Invalid sub-topics array returned');
    }
  };

  const fetchInlineSubTopics = async (subject, chapter) => {
    if (!subject || !chapter) return;

    setInlineSubTopics(prev => ({
      ...prev,
      [subject]: {
        ...(prev[subject] || {}),
        [chapter]: {
          ...(prev[subject]?.[chapter] || {}),
          loading: true,
          error: ''
        }
      }
    }));

    try {
      const parsed = await ensureInlineSubTopics(subject, chapter);

      setInlineSubTopics(prev => {
        const updated = {
          ...prev,
          [subject]: {
            ...(prev[subject] || {}),
            [chapter]: { topics: parsed, loading: false, error: '' }
          }
        };
        localStorage.setItem(getUserKey('tanios_inline_subtopics'), JSON.stringify(updated));
        return updated;
      });

      // Sync initial selection in state and localStorage
      setSelectedSubTopicsMap(prev => {
        const currentSelection = prev[subject]?.[chapter];
        if (currentSelection === undefined) {
          let completedList = [];
          try {
            const stored = localStorage.getItem(getUserKey('tanios_completed_topics'));
            const completedMap = stored ? JSON.parse(stored) : {};
            completedList = completedMap[subject]?.[chapter] || [];
          } catch (e) {}
          const remaining = parsed.filter(t => !completedList.includes(t));
          const initialSelection = remaining.length > 0 ? remaining : parsed;

          const updated = {
            ...prev,
            [subject]: {
              ...(prev[subject] || {}),
              [chapter]: initialSelection
            }
          };
          localStorage.setItem(getUserKey('tanios_selected_subtopics'), JSON.stringify(updated));
          return updated;
        }
        return prev;
      });
    } catch (err) {
      console.error(`Error loading inline topics for ${subject}:`, err);
      const fallbackList = [
        'Foundational Concepts & Definitions',
        'Core Mechanisms & Theories',
        'Advanced Applications & Practice',
        'Board Exam Repeated Questions'
      ];
      setInlineSubTopics(prev => ({
        ...prev,
        [subject]: {
          ...(prev[subject] || {}),
          [chapter]: {
            topics: fallbackList,
            loading: false,
            error: err.message || 'Failed to load sub-topics'
          }
        }
      }));
    }
  };

  const startStudyMission = async (mission) => {
    if (!isPro && mission.type !== 'login') {
      const storedUnlocked = localStorage.getItem(getUserKey('tanios_free_unlocked_subjects'));
      const unlockedSubjects = storedUnlocked ? JSON.parse(storedUnlocked) : [];
      const isSubjectLocked = !unlockedSubjects.some(
        s => s.toLowerCase() === (mission.subject || '').toLowerCase()
      );
      if (isSubjectLocked) {
        setShowUpgradePopup(true);
        return;
      }
    }

    setMissionAnswer(null);
    setMissionSubmitted(false);
    setShowShortAnswer(false);
    setQuizStep(0);
    setQuizAnswers({});
    setActiveMission(mission);
    
    // Clear and reset dynamic mission state
    setDynamicMissionContent(null);
    setMissionLoading(true);
    setMissionError('');

    // First read from the React state which represents the active checkbox selections in the UI
    let chosenTopics = selectedSubTopicsMap[mission.subject]?.[mission.chapter];

    const savedSelected = JSON.parse(localStorage.getItem(getUserKey('tanios_selected_subtopics')) || '{}');
    if (chosenTopics === undefined) {
      chosenTopics = savedSelected[mission.subject]?.[mission.chapter];
    }

    // If the mission is not done yet (active study), filter out already completed topics
    if (chosenTopics && !mission.done) {
      let completedList = [];
      try {
        const stored = localStorage.getItem(getUserKey('tanios_completed_topics'));
        const completedMap = stored ? JSON.parse(stored) : {};
        completedList = completedMap[mission.subject]?.[mission.chapter] || [];
      } catch (e) {}
      chosenTopics = chosenTopics.filter(t => !completedList.includes(t));
    }

    if (mission.type === 'teaching_mcq' || mission.type === 'study' || mission.type === 'revision') {
      try {
        if (chosenTopics && chosenTopics.length === 0) {
          alert("Please select at least one target concept to study from the Edit Chapters panel.");
          setMissionLoading(false);
          setActiveMission(null);
          return;
        }

        let parsed = [];
        try {
          parsed = await ensureInlineSubTopics(mission.subject, mission.chapter);
        } catch (e) {
          console.warn("Failed to ensure inline subtopics, using fallback:", e.message);
          parsed = [
            'Foundational Concepts & Definitions',
            'Core Mechanisms & Theories',
            'Advanced Applications & Practice',
            'Board Exam Repeated Questions'
          ];
        }

        // Save inline subtopics to state & localstorage (nested format)
        setInlineSubTopics(prev => {
          const updated = {
            ...prev,
            [mission.subject]: {
              ...(prev[mission.subject] || {}),
              [mission.chapter]: { topics: parsed, loading: false, error: '' }
            }
          };
          localStorage.setItem(getUserKey('tanios_inline_subtopics'), JSON.stringify(updated));
          return updated;
        });

        if (chosenTopics === undefined) {
          let completedList = [];
          try {
            const stored = localStorage.getItem(getUserKey('tanios_completed_topics'));
            const completedMap = stored ? JSON.parse(stored) : {};
            completedList = completedMap[mission.subject]?.[mission.chapter] || [];
          } catch (e) {}
          const remaining = parsed.filter(t => !completedList.includes(t));
          chosenTopics = remaining.length > 0 ? remaining : parsed;
        }

        // Always save chosenTopics to localStorage & selectedSubTopicsMap state when starting the mission
        // so state and localStorage are in sync (the Confirm button will hide, and MCQ gets the latest selection)
        if (!savedSelected[mission.subject]) savedSelected[mission.subject] = {};
        savedSelected[mission.subject][mission.chapter] = chosenTopics;
        localStorage.setItem(getUserKey('tanios_selected_subtopics'), JSON.stringify(savedSelected));
        
        setSelectedSubTopicsMap(prev => ({
          ...prev,
          [mission.subject]: {
            ...(prev[mission.subject] || {}),
            [mission.chapter]: chosenTopics
          }
        }));

        await fetchDynamicMission(mission, chosenTopics);
      } catch (err) {
        console.error("Default topics fallback run:", err);
        const fallbackList = [
          'Foundational Concepts & Definitions',
          'Core Mechanisms & Theories',
          'Advanced Applications & Practice',
          'Board Exam Repeated Questions'
        ];
        await fetchDynamicMission(mission, [fallbackList[0]]);
      }
    } else {
      await fetchDynamicMission(mission);
    }

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
    setOneClickGrade(profileClass || '10');
    setOneClickBoard(profileBoard || 'CBSE');
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

    const prompt = generateOneClickPrompt(activeOneClickTool, oneClickTopic, oneClickGrade, oneClickBoard);
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
          background: linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-tertiary) 100%);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: 1.75rem 2rem;
          position: relative;
          overflow: hidden;
          margin-bottom: 1.5rem;
          box-shadow: var(--shadow-sm);
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
        @keyframes xpNotificationAnim {
          0% { opacity: 0; transform: translateX(30px); }
          8% { opacity: 1; transform: translateX(0); }
          90% { opacity: 1; transform: translateX(0); }
          100% { opacity: 0; transform: translateX(10px); }
        }
        .xp-alert {
          position: fixed;
          top: 80px;
          right: 20px;
          z-index: 99999;
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
          padding: 0.75rem 1.5rem;
          border-radius: var(--radius-sm);
          font-weight: 700;
          font-size: 0.9rem;
          box-shadow: 0 10px 25px rgba(16, 185, 129, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.1);
          animation: xpNotificationAnim 3.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          pointer-events: none;
          white-space: nowrap;
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
        .mission-item.locked {
          background: rgba(255, 255, 255, 0.02) !important;
          border-color: rgba(239, 68, 68, 0.15) !important;
          opacity: 0.7;
          cursor: pointer;
        }
        .mission-item.locked:hover {
          border-color: rgba(239, 68, 68, 0.4) !important;
          background: rgba(239, 68, 68, 0.04) !important;
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
          padding: 1rem 0.75rem;
          border-radius: var(--radius-sm);
          text-align: center;
          cursor: pointer;
          transition: all 0.22s cubic-bezier(0.34,1.56,0.64,1);
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .quick-action-btn:hover {
          transform: translateY(-4px);
          border-color: var(--primary);
          box-shadow: 0 6px 20px rgba(99, 102, 241, 0.2);
          background: var(--bg-tertiary);
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
            grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)) !important;
            gap: 0.5rem !important;
          }
          .quick-action-btn {
            padding: 0.8rem 0.4rem !important;
          }
          .quick-action-btn div:first-child {
            font-size: 1.3rem !important;
            margin-bottom: 0.2rem !important;
          }
          .quick-action-btn div:last-child {
            font-size: 0.72rem !important;
            line-height: 1.25 !important;
            word-break: break-word !important;
            white-space: normal !important;
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
          background: var(--loader-bg-overlay, rgba(10, 10, 12, 0.95));
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
          background: var(--bg-secondary);
          border: none;
          box-shadow: none;
          padding: 2rem 1.25rem;
          position: relative;
          display: flex;
          flex-direction: column;
          overflow-y: auto;
          animation: scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) both;
          box-sizing: border-box;
          color: var(--text);
        }
        @media (min-width: 769px) {
          .daily-mission-overlay {
            padding: 2rem;
            background: var(--loader-bg-overlay, rgba(10, 10, 12, 0.85));
          }
          .daily-mission-card {
            width: 90%;
            height: auto;
            max-width: 850px;
            max-height: 85vh;
            border-radius: 20px;
            background: var(--bg-secondary);
            border: 1px solid var(--border);
            box-shadow: var(--shadow-lg);
            padding: 2.5rem 2rem;
            box-sizing: border-box;
          }
        }

        @keyframes shine-sweep {
          0% {
            left: -100%;
          }
          100% {
            left: 200%;
          }
        }
        @keyframes gradient-flow {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }
        @keyframes radar-ripple {
          0% {
            box-shadow: 0 0 0 0 rgba(139, 92, 246, 0.7), 0 4px 15px rgba(139, 92, 246, 0.3);
          }
          70% {
            box-shadow: 0 0 0 16px rgba(139, 92, 246, 0), 0 4px 15px rgba(139, 92, 246, 0.3);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(139, 92, 246, 0), 0 4px 15px rgba(139, 92, 246, 0.3);
          }
        }
        @keyframes icon-wiggle {
          0%, 90%, 100% {
            transform: rotate(0) scale(1);
          }
          93% {
            transform: rotate(-12deg) scale(1.15);
          }
          96% {
            transform: rotate(12deg) scale(1.15);
          }
        }
        .ai-doubt-solver-btn {
          position: relative !important;
          overflow: hidden !important;
          background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 50%, #8b5cf6 100%) !important;
          background-size: 200% auto !important;
          border: none !important;
          color: white !important;
          animation: gradient-flow 4s ease infinite, radar-ripple 2s infinite cubic-bezier(0.25, 0, 0, 1) !important;
          transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.4s cubic-bezier(0.16, 1, 0.3, 1) !important;
        }
        .ai-doubt-solver-btn::after {
          content: '' !important;
          position: absolute !important;
          top: 0 !important;
          left: -100% !important;
          width: 50% !important;
          height: 100% !important;
          background: linear-gradient(
            90deg,
            rgba(255, 255, 255, 0) 0%,
            rgba(255, 255, 255, 0.35) 50%,
            rgba(255, 255, 255, 0) 100%
          ) !important;
          transform: skewX(-25deg) !important;
          animation: shine-sweep 3.5s infinite ease-in-out !important;
          pointer-events: none !important;
          opacity: 1 !important;
          inset: auto !important;
        }
        .ai-doubt-solver-btn svg {
          animation: icon-wiggle 6s infinite ease-in-out;
          transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1) !important;
        }
        .ai-doubt-solver-btn:hover {
          transform: translateY(-3px) scale(1.04) !important;
          background-position: right center !important;
          box-shadow: 0 8px 25px rgba(139, 92, 246, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.2) !important;
          animation-play-state: paused !important;
        }
        .ai-doubt-solver-btn:hover svg {
          transform: rotate(-15deg) scale(1.2) !important;
          animation-play-state: paused !important;
        }
      `}</style>

      {/* Floating XP Alert for premium micro-feedback */}
      {xpAwardedMsg && (
        <div className="xp-alert">
          {xpAwardedMsg}
        </div>
      )}

      {/* ── Styled Timeline Modal — rendered via createPortal to escape parent stacking context ── */}
      {showTimelineModal && timelineData && createPortal(
        <div
          onClick={() => setShowTimelineModal(false)}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(6, 6, 10, 0.85)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            zIndex: 99999,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '1.5rem',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'rgba(18, 18, 24, 0.98)',
              border: '1px solid rgba(139, 92, 246, 0.3)',
              borderRadius: '20px',
              padding: '2rem',
              maxWidth: '480px',
              width: '100%',
              boxShadow: '0 24px 60px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.05)',
              animation: 'fadeUp 0.3s cubic-bezier(0.16,1,0.3,1)'
            }}
          >
            {/* Header */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.2))',
              border: '1px solid rgba(139,92,246,0.2)',
              borderRadius: '12px',
              padding: '1rem 1.25rem',
              marginBottom: '1.5rem',
              display: 'flex', alignItems: 'center', gap: '0.75rem'
            }}>
              <div style={{
                width: '40px', height: '40px', borderRadius: '10px', flexShrink: 0,
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.25rem'
              }}>✅</div>
              <div>
                <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#fff' }}>
                  Study Dashboard Created!
                </div>
                <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.55)', marginTop: '0.15rem' }}>
                  TaniOS will automatically pace your syllabus
                </div>
              </div>
            </div>

            {/* Stats row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <div style={{
                background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)',
                borderRadius: '10px', padding: '0.75rem', textAlign: 'center'
              }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#6366f1', lineHeight: 1 }}>
                  {timelineData.totalDays}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#9ca3af', marginTop: '0.25rem' }}>Days to Exam</div>
              </div>
              <div style={{
                background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.15)',
                borderRadius: '10px', padding: '0.75rem', textAlign: 'center'
              }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#10b981', lineHeight: 1 }}>
                  {timelineData.subjects.length}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#9ca3af', marginTop: '0.25rem' }}>Subjects Loaded</div>
              </div>
            </div>

            {/* Subject breakdown */}
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.6rem' }}>
                📅 Timeline Breakdown
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', maxHeight: '220px', overflowY: 'auto' }}>
                {timelineData.subjects.map((s, i) => (
                  <div key={i} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
                    borderRadius: '8px', padding: '0.55rem 0.85rem'
                  }}>
                    <span style={{ fontSize: '0.83rem', fontWeight: 600, color: '#fff' }}>
                      {s.name}
                    </span>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.7rem', color: '#9ca3af' }}>
                        {s.chapters} chapters
                      </span>
                      <span style={{
                        fontSize: '0.68rem', fontWeight: 700,
                        background: 'rgba(139,92,246,0.15)', color: '#a78bfa',
                        border: '1px solid rgba(139,92,246,0.25)',
                        padding: '0.15rem 0.45rem', borderRadius: '4px'
                      }}>
                        ~{s.daysPerCh}d/ch
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Info note */}
            <div style={{
              background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.18)',
              borderRadius: '8px', padding: '0.65rem 0.85rem',
              fontSize: '0.75rem', color: '#d1d5db',
              marginBottom: '1.25rem', lineHeight: 1.5
            }}>
              💡 <strong style={{ color: '#fbbf24' }}>Auto Pacing ON:</strong> TaniOS will advance you to the next chapter automatically when each one is completed on schedule.
            </div>

            {/* CTA Button */}
            <button
              onClick={() => setShowTimelineModal(false)}
              style={{
                width: '100%', padding: '0.85rem',
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                color: 'white', border: 'none', borderRadius: '10px',
                fontSize: '0.95rem', fontWeight: 700, cursor: 'pointer',
                boxShadow: '0 6px 20px rgba(99,102,241,0.4)',
                transition: 'all 0.2s',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
              }}
            >
              <Sparkles size={16} /> Let's Start Studying!
            </button>
          </div>
        </div>,
        document.body
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
              const completedToday = missions.filter(m => m.type !== 'login' && m.done).length;
              const totalNonLogin = missions.filter(m => m.type !== 'login').length;
              const pendingMissions = missions.filter(m => m.type !== 'login' && !m.done);
              const pendingSubjects = [...new Set(pendingMissions.map(m => m.subject).filter(Boolean))];
              const doneMissions = missions.filter(m => m.type !== 'login' && m.done);
              const doneSubjects = [...new Set(doneMissions.map(m => m.subject).filter(Boolean))];

              let alertMsg;
              let alertColor = 'var(--accent)';
              if (!profileSetupDone) {
                alertMsg = <>💡 <strong>Getting Started:</strong> Set up your study profile below to unlock <strong>personalized daily missions</strong> and start earning XP!</>;
              } else if (totalNonLogin > 0 && completedToday === totalNonLogin) {
                const subjectList = doneSubjects.length > 0 ? doneSubjects.join(', ') : 'all subjects';
                alertMsg = <>🎉 <strong>All Done!</strong> You crushed every mission today across <strong>{subjectList}</strong>! Come back tomorrow for fresh challenges.</>;
                alertColor = 'var(--success)';
              } else {
                const remaining = totalNonLogin - completedToday;
                const subjectList = pendingSubjects.length > 0
                  ? pendingSubjects.join(', ')
                  : 'your subjects';
                alertMsg = <>💡 <strong>Companion Update:</strong> You have <strong>{remaining} task{remaining !== 1 ? 's' : ''}</strong> pending today for <strong>{subjectList}</strong>. Complete them to build your streak!</>;
              }
              return (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border)',
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-sm)',
                  borderLeft: `4px solid ${alertColor}`,
                  fontSize: '0.85rem',
                  marginBottom: '1.25rem'
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
              <Link to="/chat" className="btn btn-primary ai-doubt-solver-btn">
                <MessageSquare size={16} /> AI Doubt Solver
              </Link>
              <Link to="/notes" className="btn btn-secondary">
                <FileText size={16} /> Generate AI Notes
              </Link>
            </div>
          </div>


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
                        <option value="Non-Board">Non-Board (School Exams)</option>
                      </select>
                    </div>
                    <div>
                      <label className="input-label" style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text)', display: 'block', marginBottom: '0.35rem' }}>
                        Class Grade
                      </label>
                      <select 
                        className="input-field" 
                        value={setupClass} 
                        onChange={e => {
                          const val = e.target.value;
                          setSetupClass(val);
                          if (!['10', '12'].includes(val.toString().replace(/\D/g, ''))) {
                            setSetupBoard('Non-Board');
                          } else if (setupBoard === 'Non-Board') {
                            setSetupBoard('CBSE');
                          }
                        }} 
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

                  <div style={{ marginBottom: '1rem' }}>
                    <label className="input-label" style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text)', display: 'block', marginBottom: '0.35rem' }}>
                      📅 Exam Start Date (Custom Target Pacing)
                    </label>
                    <input 
                      type="date"
                      className="input-field"
                      value={setupExamDate}
                      onChange={e => setSetupExamDate(e.target.value)}
                      required={!['10', '12'].includes(setupClass.toString().replace(/\D/g, ''))}
                      min={new Date().toISOString().split('T')[0]}
                      style={{ padding: '0.6rem 0.75rem', fontSize: '0.88rem', background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: '6px', width: '100%', boxSizing: 'border-box' }}
                    />
                    <small style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.68rem', marginTop: '0.25rem' }}>
                      {!['10', '12'].includes(setupClass.toString().replace(/\D/g, '')) 
                        ? 'Required: Select your exam start date to calculate your remaining target study pacing.'
                        : 'Optional: Overrides the standard Board exam date if customized.'}
                    </small>
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
                                if (!isPro && selectedSubjects.length >= 2) {
                                  alert("Free members can only choose up to 2 subjects. Please upgrade to TaniOS Pro to select more subjects!");
                                  setShowUpgradePopup(true);
                                  return;
                                }
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
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.1rem' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                        {missions.filter(m => m.done).length} / {missions.length} Complete
                      </span>
                      {!isPro && (
                        <span style={{ fontSize: '0.68rem', color: isFreeTierLocked ? '#ff6b6b' : '#f59e0b', fontWeight: 700 }}>
                          Free Tier: {isFreeTierLocked ? 'Trial Expired (1 Day Used)' : '1-Day Free Trial (Active)'}
                        </span>
                      )}
                    </div>
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
                {(() => {
                  const now = new Date();
                  const EXAM_DATES = {
                    CBSE: { '10': { month: 1, day: 15 }, '12': { month: 1, day: 15 }, '8': { month: 2, day: 1 }, '9': { month: 2, day: 1 }, '11': { month: 2, day: 1 } },
                    RBSE: { '10': { month: 2, day: 5 }, '12': { month: 2, day: 5 }, '8': { month: 2, day: 10 }, '9': { month: 2, day: 10 }, '11': { month: 2, day: 10 } }
                  };
                  const classNum = (profileClass || '10').toString().replace(/\D/g, '') || '10';
                  const examInfo = EXAM_DATES[profileBoard]?.[classNum] || EXAM_DATES['CBSE']['10'];

                  let examDate;
                  if (profileExamDate) {
                    examDate = new Date(profileExamDate);
                  } else {
                    let examYear = now.getFullYear();
                    examDate = new Date(examYear, examInfo.month, examInfo.day);
                    if (examDate <= now) {
                      examYear += 1;
                      examDate.setFullYear(examYear);
                    }
                  }
                  const diffMs = examDate - now;
                  const diffDays = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

                  return (
                    <div style={{
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border)',
                      borderRadius: '12px',
                      padding: '1rem',
                      marginBottom: '1.25rem'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontSize: '0.85rem' }}>🎯</span>
                          <strong style={{ fontSize: '0.82rem', color: 'var(--text)' }}>Active Syllabus Chapters:</strong>
                          <button
                            onClick={handleToggleChaptersConfig}
                            style={{
                              background: 'rgba(99, 102, 241, 0.08)',
                              border: '1px solid rgba(99, 102, 241, 0.2)',
                              color: 'var(--primary)',
                              cursor: 'pointer',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              padding: '0.2rem 0.5rem',
                              borderRadius: '4px',
                              marginLeft: '0.25rem',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem'
                            }}
                          >
                            {showChaptersConfig ? 'Close Edit ✕' : 'Edit Chapters ✏️'}
                          </button>
                        </div>
                        <span style={{ fontSize: '0.72rem', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          ⏳ {diffDays} Days Remaining
                        </span>
                      </div>
                      
                      {showChaptersConfig ? (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem', marginTop: '0.5rem' }}>
                          {profileSubjects.map(subj => {
                            const currentCh = activeChapters[subj] || '';
                            const cleanProfileClass = (profileClass || '10').toString().replace(/\D/g, '') || '10';
                            const chapters = CLASS_SYLLABUS[cleanProfileClass]?.[subj] || [];
                            
                            const totalChapters = chapters.length || 1;
                            const chapterIdx = chapters.indexOf(currentCh);
                            const resolvedChapterIdx = chapterIdx !== -1 ? chapterIdx + 1 : 1;
                            const chaptersRemaining = Math.max(1, totalChapters - resolvedChapterIdx + 1);
                            const daysPerChapter = Math.max(5, Math.round(diffDays / chaptersRemaining));

                            // Retrieve progress
                            const progressMap = JSON.parse(localStorage.getItem(getUserKey('tanios_chapter_progress')) || '{}');
                            const completedTopics = progressMap[subj]?.[currentCh] || 0;
                            
                            return (
                              <div key={subj} style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '8px', padding: '0.5rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                                  <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '65%' }} title={subj}>
                                    {subj}
                                  </span>
                                  <span style={{ fontSize: '0.62rem', color: 'var(--success)', fontWeight: 700 }} title="Topics completed in this chapter / Days allocated to complete it">
                                    Day {completedTopics}/{daysPerChapter} ⏱️
                                  </span>
                                </div>
                                {chapters.length > 0 ? (
                                  <select
                                    value={currentCh}
                                    title={currentCh}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      if (!val) return; // Prevent empty selection
                                      const updated = { ...activeChapters, [subj]: val };
                                      setActiveChapters(updated);
                                      localStorage.setItem(getUserKey('tanios_active_chapters'), JSON.stringify(updated));
                                      const newMissions = generateMissionsFromProfile(profileBoard, profileClass, profileSubjects, updated);
                                      setMissions(newMissions);
                                      localStorage.setItem(getUserKey('tanios_missions'), JSON.stringify(newMissions));
                                      fetchInlineSubTopics(subj, val);
                                    }}
                                    style={{ width: '100%', fontSize: '0.72rem', background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: '4px', padding: '0.2rem 0.4rem', textOverflow: 'ellipsis', marginBottom: '0.4rem' }}
                                  >
                                    {chapters.map(ch => (
                                      <option key={ch} value={ch} title={ch}>{ch}</option>
                                    ))}
                                  </select>
                                ) : (
                                  <input
                                    type="text"
                                    value={currentCh}
                                    title={currentCh}
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
                                    style={{ width: '100%', fontSize: '0.72rem', background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: '4px', padding: '0.2rem 0.4rem', textOverflow: 'ellipsis', marginBottom: '0.4rem' }}
                                  />
                                )}

                                {/* Inline Sub-topics selector */}
                                {currentCh && (() => {
                                  const state = inlineSubTopics[subj]?.[currentCh] || {};
                                  if (state.loading) {
                                    return (
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.25rem 0', fontSize: '0.68rem', color: 'var(--text-secondary)' }}>
                                        <Loader2 size={12} style={{ animation: 'spin 1.5s linear infinite', color: 'var(--primary)' }} />
                                        <span>Loading sub-topics...</span>
                                      </div>
                                    );
                                  }

                                  const topics = state.topics || [];
                                  if (topics.length === 0) return null;

                                  const selected = selectedSubTopicsMap[subj]?.[currentCh] || [];
                                  const completed = JSON.parse(localStorage.getItem(getUserKey('tanios_completed_topics')) || '{}')[subj]?.[currentCh] || [];

                                  return (
                                    <div style={{ marginTop: '0.4rem', borderTop: '1px dashed rgba(255,255,255,0.06)', paddingTop: '0.4rem' }}>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                                        <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                                          Target Concepts:
                                        </span>
                                        <span 
                                          style={{ fontSize: '0.62rem', color: 'var(--primary)', cursor: 'pointer', fontWeight: 700 }}
                                          onClick={() => {
                                            fetchInlineSubTopics(subj, currentCh);
                                          }}
                                        >
                                          ↻ Refresh
                                        </span>
                                      </div>
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', maxHeight: '120px', overflowY: 'auto', paddingRight: '0.2rem' }} className="custom-scrollbar">
                                        {topics.map(topic => {
                                          const isCompleted = completed.includes(topic);
                                          const isSelected = selected.includes(topic);
                                          return (
                                            <label
                                              key={topic}
                                              style={{
                                                display: 'flex',
                                                alignItems: 'flex-start',
                                                gap: '0.35rem',
                                                padding: '0.25rem 0.35rem',
                                                background: isCompleted ? 'rgba(16, 185, 129, 0.02)' : isSelected ? 'rgba(99, 102, 241, 0.03)' : 'transparent',
                                                borderRadius: '4px',
                                                cursor: isCompleted ? 'default' : 'pointer',
                                                opacity: isCompleted ? 0.6 : 1,
                                                fontSize: '0.68rem',
                                                userSelect: 'none'
                                              }}
                                            >
                                              <input
                                                type="checkbox"
                                                checked={isSelected || isCompleted}
                                                disabled={isCompleted}
                                                onChange={() => {
                                                  if (isCompleted) return;
                                                  let updatedList = [];
                                                  if (isSelected) {
                                                    updatedList = selected.filter(t => t !== topic);
                                                  } else {
                                                    updatedList = [...selected, topic];
                                                  }
                                                  const newMap = {
                                                    ...selectedSubTopicsMap,
                                                    [subj]: {
                                                      ...(selectedSubTopicsMap[subj] || {}),
                                                      [currentCh]: updatedList
                                                    }
                                                  };
                                                  setSelectedSubTopicsMap(newMap);

                                                  // Compute if this chapter should be marked done based on updatedList and completed list
                                                   const isChapterDone = updatedList.length === 0 || updatedList.every(t => completed.includes(t));

                                                   if (isChapterDone) {
                                                     const targetMission = missions.find(m => m.subject === subj && m.chapter === currentCh && m.type !== 'login');
                                                     if (targetMission && !targetMission.done) {
                                                       toggleMission(targetMission.id);
                                                     }
                                                   } else {
                                                     setMissions(prevMissions => {
                                                       const updated = prevMissions.map(m => {
                                                         if (m.subject === subj && m.chapter === currentCh && m.type !== 'login') {
                                                           return { ...m, done: false };
                                                         }
                                                         return m;
                                                       });
                                                       localStorage.setItem(getUserKey('tanios_missions'), JSON.stringify(updated));
                                                       return updated;
                                                     });
                                                   }
                                                 }}
                                                style={{ marginTop: '0.08rem', width: '12px', height: '12px', accentColor: 'var(--primary)' }}
                                              />
                                              <span style={{ 
                                                color: 'var(--text)', 
                                                textDecoration: isCompleted ? 'line-through' : 'none',
                                                lineHeight: '1.2'
                                              }}>
                                                {topic}
                                              </span>
                                            </label>
                                          );
                                        })}
                                      </div>

                                      {(() => {
                                        const savedMap = JSON.parse(localStorage.getItem(getUserKey('tanios_selected_subtopics')) || '{}');
                                        const savedSel = savedMap[subj]?.[currentCh] || [];
                                        const isDirty = selected.length !== savedSel.length || selected.some(t => !savedSel.includes(t));

                                        if (!isDirty) return null;

                                        return (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              // Save selection to localStorage
                                              const newMap = {
                                                ...selectedSubTopicsMap,
                                                [subj]: {
                                                  ...(selectedSubTopicsMap[subj] || {}),
                                                  [currentCh]: selected
                                                }
                                              };
                                              localStorage.setItem(getUserKey('tanios_selected_subtopics'), JSON.stringify(newMap));
                                              
                                              // Reactivate daily study mission for this subject/chapter if done
                                              setMissions(prevMissions => {
                                                const updated = prevMissions.map(m => {
                                                  if (m.subject === subj && m.chapter === currentCh && m.done) {
                                                    return { ...m, done: false };
                                                  }
                                                  return m;
                                                });
                                                localStorage.setItem(getUserKey('tanios_missions'), JSON.stringify(updated));
                                                return updated;
                                              });

                                              // Force UI update
                                              setSelectedSubTopicsMap(newMap);
                                            }}
                                            className="btn btn-primary"
                                            style={{
                                              width: '100%',
                                              fontSize: '0.7rem',
                                              padding: '0.25rem 0.5rem',
                                              marginTop: '0.35rem',
                                              background: 'linear-gradient(135deg, var(--primary), #4f46e5)',
                                              border: 'none',
                                              color: 'white',
                                              fontWeight: 700,
                                              display: 'flex',
                                              alignItems: 'center',
                                              justifyContent: 'center',
                                              gap: '0.2rem',
                                              boxShadow: '0 4px 6px -1px rgba(99,102,241,0.2)'
                                            }}
                                          >
                                            Confirm Topics Selection ✓
                                          </button>
                                        );
                                      })()}

                                      {/* Inline Add Custom Topic Input */}
                                      <div style={{ display: 'flex', gap: '0.25rem', marginTop: '0.35rem' }}>
                                        <input
                                          type="text"
                                          placeholder="Add custom topic..."
                                          style={{
                                            flex: 1,
                                            fontSize: '0.65rem',
                                            background: 'var(--bg-tertiary)',
                                            border: '1px solid var(--border)',
                                            borderRadius: '4px',
                                            color: 'var(--text)',
                                            padding: '0.15rem 0.35rem',
                                          }}
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                              e.preventDefault();
                                              const cleaned = e.target.value.trim();
                                              if (!cleaned) return;
                                              if (topics.some(t => t.toLowerCase() === cleaned.toLowerCase())) return;
                                              
                                              const updatedTopics = [...topics, cleaned];
                                              setInlineSubTopics(prev => {
                                                const updated = {
                                                  ...prev,
                                                  [subj]: {
                                                    ...(prev[subj] || {}),
                                                    [currentCh]: {
                                                      ...(prev[subj]?.[currentCh] || {}),
                                                      topics: updatedTopics
                                                    }
                                                  }
                                                };
                                                localStorage.setItem(getUserKey('tanios_inline_subtopics'), JSON.stringify(updated));
                                                return updated;
                                              });

                                              const newMap = {
                                                ...selectedSubTopicsMap,
                                                [subj]: {
                                                  ...(selectedSubTopicsMap[subj] || {}),
                                                  [currentCh]: [...selected, cleaned]
                                                }
                                              };
                                              setSelectedSubTopicsMap(newMap);

                                              // Adding a new uncompleted custom topic reactivates the study mission immediately
                                               setMissions(prevMissions => {
                                                 const updated = prevMissions.map(m => {
                                                   if (m.subject === subj && m.chapter === currentCh && m.type !== 'login') {
                                                     return { ...m, done: false };
                                                   }
                                                   return m;
                                                 });
                                                 localStorage.setItem(getUserKey('tanios_missions'), JSON.stringify(updated));
                                                 return updated;
                                               });
                                               e.target.value = '';
                                            }
                                          }}
                                        />
                                      </div>
                                    </div>
                                  );
                                })()}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' }}>
                          {profileSubjects.map(subj => {
                            const currentCh = activeChapters[subj] || 'Intro';
                            const cleanCh = currentCh.replace(/^Chapter \d+:\s*/, '');
                            return (
                              <div 
                                key={subj} 
                                style={{ 
                                  background: 'rgba(255,255,255,0.03)', 
                                  border: '1px solid rgba(255,255,255,0.06)', 
                                  borderRadius: '6px', 
                                  padding: '0.35rem 0.65rem', 
                                  fontSize: '0.75rem', 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  gap: '0.4rem',
                                  cursor: 'pointer'
                                }}
                                onClick={openChaptersConfig}
                                title="Click to manage active chapters"
                              >
                                <strong style={{ color: 'var(--text-secondary)' }}>{subj}:</strong>
                                <span style={{ color: 'var(--text)', fontWeight: 500 }} className="text-gradient">{cleanCh}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* ── TaniOS Pro Promo Card for Unsubscribed users ── */}
                {!isPro && (
                  isFreeTierLocked ? (
                    <div style={{
                      background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(108, 99, 255, 0.05))',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      borderRadius: '12px',
                      padding: '1.25rem',
                      marginBottom: '1.25rem',
                      textAlign: 'left',
                      position: 'relative',
                      overflow: 'hidden',
                      boxShadow: '0 4px 20px rgba(239, 68, 68, 0.15)'
                    }}>
                      <div style={{
                        position: 'absolute', top: '-20px', right: '-20px',
                        width: '80px', height: '80px',
                        background: 'radial-gradient(circle, var(--danger) 0%, rgba(239, 68, 68, 0) 70%)',
                        borderRadius: '50%'
                      }} />
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '1.25rem' }}>⚠️</span>
                        <strong style={{ fontSize: '0.88rem', color: '#ff6b6b' }}>1-Day Free Trial Expired!</strong>
                      </div>
                      <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '0 0 1rem 0', lineHeight: 1.45 }}>
                        You have completed your **1-day free trial** of study targets. Upgrade to **TaniOS Pro** to get daily study targets for all subjects, 20 daily AI doubt solves, and CBSE/RBSE board repeated question banks.
                      </p>
                      <Link to="/subscribe" className="btn btn-primary" style={{ padding: '0.45rem 1rem', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: 'linear-gradient(135deg, #ef4444 0%, #ec4899 100%)', border: 'none', color: '#fff', fontWeight: 700, borderRadius: '6px', boxShadow: '0 4px 10px rgba(239, 68, 68, 0.3)' }}>
                        Unlock Pro Premium (₹199/month) ➔
                      </Link>
                    </div>
                  ) : (
                    <div style={{
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border)',
                      borderRadius: '12px',
                      padding: '1.25rem',
                      marginBottom: '1.25rem',
                      textAlign: 'left',
                      position: 'relative',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        position: 'absolute', top: '-20px', right: '-20px',
                        width: '80px', height: '80px',
                        background: 'radial-gradient(circle, var(--primary-light) 0%, transparent 70%)',
                        borderRadius: '50%'
                      }} />
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '1.25rem' }}>👑</span>
                        <strong style={{ fontSize: '0.88rem', color: 'var(--text)' }}>Unlock TaniOS Pro Study Targets</strong>
                      </div>
                      <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '0 0 1rem 0', lineHeight: 1.45 }}>
                        You are currently on the **Free Tier (1-Day Trial active today)**. Upgrade to unlock all subjects targets daily, textbook uploads, and CBSE/RBSE board repeated question banks!
                      </p>
                      <Link to="/subscribe" className="btn btn-primary" style={{ padding: '0.45rem 1rem', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)', border: 'none', color: '#fff', fontWeight: 700, borderRadius: '6px' }}>
                        Upgrade to Pro (₹199/month) ➔
                      </Link>
                    </div>
                  )
                )}

                <div>
                  {(() => {
                    const storedUnlocked = localStorage.getItem(getUserKey('tanios_free_unlocked_subjects'));
                    const unlockedSubjects = storedUnlocked ? JSON.parse(storedUnlocked) : [];
                    return missions.map(mission => {
                      const isSubjectLocked = !isPro && mission.type !== 'login' && !mission.done && !unlockedSubjects.some(
                        s => s.toLowerCase() === (mission.subject || '').toLowerCase()
                      );
                      const isMissionLocked = (!isPro && mission.type !== 'login' && !mission.done && isFreeTierLocked) || isSubjectLocked;
                      return (
                      <div 
                        key={mission.id} 
                        className={`mission-item ${mission.done ? 'completed' : ''} ${isMissionLocked ? 'locked' : ''}`}
                        onClick={() => {
                          if (isMissionLocked) {
                            setShowUpgradePopup(true);
                          }
                        }}
                      >
                        {isMissionLocked ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowUpgradePopup(true);
                            }}
                            style={{ background: 'none', border: 'none', color: '#ff6b6b', cursor: 'pointer', flexShrink: 0 }}
                          >
                            <Lock size={18} />
                          </button>
                        ) : (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
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
                        )}

                        <div 
                          onClick={(e) => {
                            if (isMissionLocked) {
                              e.stopPropagation();
                              setShowUpgradePopup(true);
                            } else if (!mission.done && mission.type !== 'login') {
                              e.stopPropagation();
                              startStudyMission(mission);
                            }
                          }}
                          style={{ flex: 1, minWidth: 0, cursor: (isMissionLocked || (!mission.done && mission.type !== 'login')) ? 'pointer' : 'default' }}
                        >
                          <div style={{
                            fontSize: '0.88rem',
                            fontWeight: 600,
                            textDecoration: mission.done ? 'line-through' : 'none',
                            color: mission.done ? 'var(--text-secondary)' : isMissionLocked ? 'rgba(255, 255, 255, 0.4)' : 'var(--text)',
                            wordBreak: 'break-word',
                          }}>
                            {mission.label}
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                          {isMissionLocked ? (
                            <span style={{ fontSize: '0.72rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ff6b6b', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.2rem', whiteSpace: 'nowrap' }}>
                              <Lock size={10} /> Pro
                            </span>
                          ) : (
                            <span style={{ fontSize: '0.72rem', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 700, whiteSpace: 'nowrap' }}>
                              +{mission.xp} XP
                            </span>
                          )}

                          {isMissionLocked ? (
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowUpgradePopup(true);
                              }}
                              className="btn btn-secondary" 
                              style={{ 
                                padding: '0.3rem 0.6rem', 
                                fontSize: '0.75rem', 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '0.25rem', 
                                whiteSpace: 'nowrap',
                                borderColor: 'rgba(239, 68, 68, 0.3)',
                                color: '#ff6b6b',
                                background: 'rgba(239, 68, 68, 0.05)'
                              }}
                            >
                              Unlock <Lock size={10} />
                            </button>
                          ) : (
                            !mission.done && mission.type !== 'login' && (
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  startStudyMission(mission);
                                }}
                                className="btn btn-secondary" 
                                style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem', whiteSpace: 'nowrap' }}
                              >
                                Start <Play size={10} />
                              </button>
                            )
                          )}

                          {mission.done && mission.type !== 'login' && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <span style={{ fontSize: '0.72rem', color: 'var(--success)', fontWeight: 700 }}>✓ Done</span>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  startStudyMission(mission);
                                }}
                                className="btn btn-secondary" 
                                style={{ 
                                  padding: '0.2rem 0.4rem', 
                                  fontSize: '0.68rem', 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  gap: '0.25rem', 
                                  whiteSpace: 'nowrap',
                                  borderColor: 'var(--border)',
                                  color: 'var(--text)'
                                }}
                              >
                                Review <Play size={8} />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                      );
                    });
                  })()}
                </div>
              </>
            )}
          </section>

          {/* B. ONE-CLICK OUTPUTS HUB (FAST SHORTCUT COMPANION GENERATOR) */}
          <section className="card" id="oneclick-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Zap color="#f59e0b" size={20} />
                <h2 style={{ fontSize: '1.25rem', margin: 0 }}>One-Click Study Generators</h2>
              </div>
            </div>

            {/* Always show the tool grid — each button navigates to the dedicated generator page */}
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
              No prompting required — each tool opens in its own dedicated page with full AI output, copy &amp; download.
            </p>

            <div className="quick-action-grid">
              {quickActions.map(action => (
                <button
                  key={action.label}
                  onClick={() => navigate(`/study-generator?tool=${encodeURIComponent(action.label)}`)}
                  className="quick-action-btn"
                >
                  <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>{action.icon}</div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text)' }}>{action.label}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>{action.desc}</div>
                </button>
              ))}
            </div>
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem', background: 'var(--bg-secondary)', border: '1px solid var(--border)', padding: '0.75rem 1rem', borderRadius: '10px' }}>
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem', background: 'var(--bg-secondary)', border: '1px solid var(--border)', padding: '0.75rem 1rem', borderRadius: '10px', borderLeft: netScore >= 0 ? '4px solid #10b981' : '4px solid #ef4444' }}>
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
                  <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', background: 'var(--bg-tertiary)', border: '1px solid var(--border)', padding: '0.15rem 0.45rem', borderRadius: '4px' }}>
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
                  
                  const todayKey = getLocalDateKey();
                  const yesterdayKey = getYesterdayDateKey();
                  const lastStreakDay = localStorage.getItem(getUserKey('tanios_streak_day')) || '';
                  
                  let anchorIdx = -1;
                  if (lastStreakDay === todayKey) {
                    anchorIdx = 0;
                  } else if (lastStreakDay === yesterdayKey) {
                    anchorIdx = 1;
                  }

                  for (let i = 6; i >= 0; i--) {
                    const d = new Date(today);
                    d.setDate(today.getDate() - i);
                    days.push({
                      label: dayNames[d.getDay()],
                      date: d.getDate(),
                      isToday: i === 0,
                      // A day is active if it falls within the streak window anchored on the last completed day
                      isActive: streak > 0 && anchorIdx !== -1 && i >= anchorIdx && i < anchorIdx + streak,
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
                            ? 'var(--primary-light)'
                            : 'var(--bg-tertiary)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '8px', color: day.isActive ? '#fff' : 'var(--text)', fontWeight: 900,
                        border: day.isToday ? '2px solid var(--primary)' : '1px solid var(--border)',
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.1rem' }}>🧠</span>
                <h2 style={{ fontSize: '1.1rem', margin: 0 }}>My MCQ Mistake Locker</h2>
                <button
                  onClick={() => setShowMistakeLocker(!showMistakeLocker)}
                  style={{
                    background: showMistakeLocker ? 'rgba(59,130,246,0.15)' : 'rgba(59,130,246,0.1)',
                    border: '1px solid rgba(59,130,246,0.4)',
                    color: '#60a5fa',
                    cursor: 'pointer',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    padding: '0.2rem 0.6rem',
                    borderRadius: '6px',
                    marginLeft: '0.25rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    boxShadow: showMistakeLocker ? 'none' : '0 0 8px rgba(59,130,246,0.35)',
                    animation: showMistakeLocker ? 'none' : 'btnPulseBlue 2s ease-in-out infinite',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {showMistakeLocker ? 'Hide Locker ✕' : `Open Locker (${mcqAttempts.length}) 📖`}
                </button>
              </div>
            </div>

            {showMistakeLocker ? (
              <>
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
              </>
            ) : (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: 0 }}>
                Review and re-read explanations for topics you answered incorrectly. Click <strong>Open Locker 📖</strong> to view.
              </p>
            )}
          </section>

        </div>

      </div>



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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
              <div>
                <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: '0.2rem' }}>
                  🧠 CONCEPT TEACHING MASTERCLASS {isMultiQuestion && `— Question ${currentQuestionIdx + 1} of ${quizQuestions.length}`}
                </span>
                <h4 style={{ margin: 0, color: 'var(--text)', fontSize: '1.1rem', fontWeight: 800 }}>
                  {activeMission.subject || 'General Study'} : {activeMission.chapter || 'Chapter'}
                </h4>
              </div>
              <button 
                onClick={() => {
                  setActiveMission(null);
                  setDynamicMissionContent(null);
                  setQuizStep(0);
                }}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', opacity: 0.7 }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Content Area */}
            {/* Content Area */}
            <div style={{ marginBottom: '1.75rem', flex: 1, overflowY: 'auto', maxHeight: '70vh', paddingRight: '0.25rem' }}>
              {!dynamicMissionContent ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', gap: '1.5rem', textAlign: 'center' }}>
                  <Loader2 size={40} style={{ color: 'var(--primary)', animation: 'spin 1.5s linear infinite' }} />
                  <div>
                    <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text)', fontSize: '1.1rem', fontWeight: 800 }}>TaniOS AI Study Engine</h4>
                    <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                      {missionLoading 
                        ? `Engineering a high-yield concept-teaching MCQ masterclass for ${activeMission?.subject || 'Syllabus'}...`
                        : "Preparing masterclass..."}
                    </p>
                    {missionError && (
                      <div style={{ marginTop: '1rem', fontSize: '0.82rem', color: '#f87171' }}>
                        ⚠️ {missionError}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                missionLoading ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', gap: '1.5rem', textAlign: 'center' }}>
                    <Loader2 size={40} style={{ color: 'var(--primary)', animation: 'spin 1.5s linear infinite' }} />
                    <div>
                      <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text)', fontSize: '1.1rem', fontWeight: 800 }}>TaniOS AI Study Engine</h4>
                      <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                        Engineering a high-yield concept-teaching MCQ masterclass for <strong>{activeMission.subject}</strong>...
                      </p>
                    </div>
                  </div>
                ) : (() => {
                  const isMultiQuestion = !!(dynamicMissionContent && Array.isArray(dynamicMissionContent.questions) && dynamicMissionContent.questions.length > 0);
                  const quizQuestions = isMultiQuestion
                    ? dynamicMissionContent.questions
                    : [dynamicMissionContent || fallback];
                  const currentQuestionIdx = Math.min(quizStep, quizQuestions.length - 1);
                  const data = quizQuestions[currentQuestionIdx];
                  const options = data?.options || fallback.options;
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
                        🎯 Topic: {data?.topic || "Syllabus Core Concept"} {isMultiQuestion && `(${currentQuestionIdx + 1}/${quizQuestions.length})`}
                      </div>

                      {/* Topic Summary Card — shown BEFORE the MCQ question */}
                      {(() => {
                        let summaryToShow = data?.topicSummary;
                        if (!summaryToShow) {
                          const subj = (activeMission?.subject || '').toLowerCase();
                          if (subj.includes('science')) {
                            summaryToShow = `* **Chemical Reactions** involve the breaking and making of bonds between atoms to produce new substances.
* **Combination Reactions** occur when two or more reactants combine to form a single product ($A + B \\rightarrow AB$).
* **Decomposition Reactions** involve a single reactant breaking down into two or more simpler products ($AB \\rightarrow A + B$). These reactions require energy input (heat, light, or electricity).
* **Displacement Reactions** occur when a more reactive element displaces a less reactive element from its salt solution ($A + BC \\rightarrow AC + B$).`;
                          } else if (subj.includes('economic') || subj.includes('commerce') || subj.includes('business') || subj.includes('accountancy') || subj.includes('social')) {
                            summaryToShow = `* **Factors of Production** are the inputs required to produce goods and services: Land, Labour, Physical Capital, and Human Capital.
* **Physical Capital** is divided into Fixed Capital and Working Capital.
* **Fixed Capital** includes tools, machines, and buildings that can be used in production over many years.
* **Working Capital** includes raw materials and cash in hand that are used up or consumed in a single production cycle.`;
                          } else if (subj.includes('math')) {
                            summaryToShow = `* **Real Numbers** ($\\mathbb{R}$) consist of all Rational and Irrational numbers.
* **Rational Numbers** can be expressed in the form $\\frac{p}{q}$ where $p$ and $q$ are integers and $q \\neq 0$. Their decimal representation is terminating or repeating.
* **Irrational Numbers** cannot be written as $\\frac{p}{q}$. Their decimal expansion is non-terminating and non-repeating (e.g., $\\sqrt{2}$, $\\pi$).
* **Perfect Squares**: The square root of a positive integer is rational only if the integer is a perfect square; otherwise, it is irrational.`;
                          } else if (subj.includes('english')) {
                            summaryToShow = `* **Active Voice** emphasizes the performer of the action (Subject + Verb + Object).
* **Passive Voice** shifts the focus to the receiver or the action itself (Object + auxiliary verb + V3 + by + Subject).
* **Present Continuous Tense**: The active form \`is/am/are + V-ing\` transforms into the passive form \`is/am/are + being + V3\`.
* **Important Rule**: Always preserve the original tense of the active sentence during passive voice conversion.`;
                          } else if (subj.includes('hindi') || subj.includes('sanskrit')) {
                            summaryToShow = `* **क्रिया (Verb)**: जिन शब्दों से किसी कार्य के करने या होने का पता चले, उन्हें क्रिया कहते हैं।
* **सकर्मक क्रिया (Transitive Verb)**: जिस क्रिया के कार्य का फल सीधे कर्म (Object) पर पड़ता है। इसमें कर्म की आवश्यकता होती है।
* **अकर्मक क्रिया (Intransitive Verb)**: जिस क्रिया के कार्य का फल सीधे कर्ता (Subject) पर पड़ता है। इसमें कर्म नहीं होता।
* **पहचान ट्रिक**: क्रिया से पहले 'क्या' या 'किसको' लगाने पर यदि उत्तर मिले तो वह सकर्मक है, अन्यथा अकर्मक है।`;
                          } else {
                            summaryToShow = `* **Subject**: ${activeMission?.subject || 'Syllabus'}
* **Chapter**: ${activeMission?.chapter || 'Core Concepts'}
* **Active Target**: ${data?.topic || 'Syllabus Core Concept'}
* **Pacing Guide**: Chronological sub-topic study session for Class ${profileClass || '10'} ${profileBoard || 'CBSE'} board exam.
* **Learning Goal**: Study this concept, then answer the MCQ challenge below to unlock the detailed explanation masterclass!`;
                          }
                        }
                        
                        return (
                          <div style={{
                            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.06) 0%, rgba(16, 185, 129, 0.04) 100%)',
                            border: '1px solid rgba(99, 102, 241, 0.18)',
                            borderRadius: '12px', padding: '1rem 1.25rem',
                            marginBottom: '1.25rem',
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.65rem' }}>
                              <span style={{ fontSize: '1rem' }}>📖</span>
                              <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Topic Quick Summary</span>
                            </div>
                            <div className="generated-content" style={{
                              fontSize: '0.83rem',
                              lineHeight: 1.65,
                              color: 'var(--text)',
                              background: 'transparent',
                              border: 'none',
                              padding: 0,
                              marginTop: 0,
                              boxShadow: 'none'
                            }}>
                              <ReactMarkdown
                                remarkPlugins={[remarkGfm, remarkMath]}
                                rehypePlugins={[rehypeKatex]}
                                components={markdownComponents}
                                children={String(summaryToShow || '')}
                              />
                            </div>
                          </div>
                        );
                      })()}

                      {/* Question Card */}
                      <div className="generated-content" style={{
                        background: 'var(--bg-tertiary)',
                        border: '1px solid var(--border)',
                        borderRadius: '12px', padding: '1.25rem',
                        marginBottom: '1.25rem', fontSize: '0.95rem',
                        fontWeight: 700, color: 'var(--text)', lineHeight: 1.5,
                        marginTop: 0,
                        boxShadow: 'none'
                      }}>
                        <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>❓ MCQ Challenge</div>
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm, remarkMath]}
                          rehypePlugins={[rehypeKatex]}
                          components={markdownComponents}
                          children={String(data?.questionText || '')}
                        />
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
                                background: isSelected ? 'var(--primary-light)' : 'var(--bg-secondary)',
                                border: isSelected ? '1px solid var(--primary)' : '1px solid var(--border)',
                                borderRadius: '10px', color: 'var(--text)', textAlign: 'left',
                                cursor: missionSubmitted ? 'default' : 'pointer',
                                transition: 'all 0.2s'
                              }}
                            >
                              <div style={{
                                width: '24px', height: '24px', borderRadius: '50%',
                                background: isSelected ? 'var(--primary)' : 'var(--bg-tertiary)',
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
                                  components={{
                                    ...markdownComponents,
                                    p: ({ children }) => <span style={{ margin: 0, display: 'inline' }}>{children}</span>
                                  }}
                                  children={String(opt?.desc || opt?.text || '')}
                                />
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Explanation / Masterclass Feedback */}
                      {missionSubmitted && (
                        <div style={{
                          marginTop: '1.25rem', padding: '1.25rem',
                          background: missionAnswer === data?.correctKey ? 'rgba(16, 185, 129, 0.04)' : 'rgba(239, 68, 68, 0.04)',
                          border: missionAnswer === data?.correctKey ? '1px solid rgba(16, 185, 129, 0.15)' : '1px solid rgba(239, 68, 68, 0.15)',
                          borderRadius: '12px', fontSize: '0.85rem', lineHeight: 1.6, color: 'var(--text-secondary)'
                        }}>
                          {missionAnswer === data?.correctKey ? (
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', color: '#10b981', fontWeight: 800, fontSize: '0.95rem' }}>
                                🎉 <span>Correct Answer! Topic Masterclass Unlocked</span>
                              </div>
                              <div className="generated-content" style={{
                                color: 'var(--text)',
                                background: 'transparent',
                                padding: 0,
                                border: 'none',
                                marginTop: '0.5rem',
                                fontSize: '0.85rem',
                                boxShadow: 'none'
                              }}>
                                <ReactMarkdown
                                  remarkPlugins={[remarkGfm, remarkMath]}
                                  rehypePlugins={[rehypeKatex]}
                                  components={markdownComponents}
                                  children={String(data?.explanation || '')}
                                />
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
                })()
              )}
            </div>

            {/* Modal Bottom Actions */}
            {!missionLoading && dynamicMissionContent && (() => {
              const data = quizQuestions[currentQuestionIdx];
              return (
                <div style={{ display: 'flex', gap: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '1.25rem', justifyContent: 'flex-end' }}>
                  {!missionSubmitted ? (
                    <button
                      onClick={() => {
                        if (missionAnswer) {
                          setMissionSubmitted(true);

                          // ── Log MCQ attempt in dynamic user mistakes locker ──
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
                              missionId: activeMission.id,
                              dateKey: activeMission.dateKey || getLocalDateKey(),
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
                            
                            const isReviewMode = !!activeMission.done;
                            const hasPreviousWrong = existing && !existing.isCorrect;
                            const hasPreviousCorrect = existing && existing.isCorrect;
                            let scoreDelta = 0;
                            
                            if (isReviewMode) {
                              scoreDelta = 0;
                            } else {
                              if (isCorrect) {
                                if (hasPreviousCorrect || hasPreviousWrong) {
                                  scoreDelta = 0;
                                } else {
                                  scoreDelta = 10;
                                }
                              } else {
                                // Only penalize on the first wrong attempt (if no attempts existed yet)
                                scoreDelta = existing ? 0 : -5;
                              }
                            }
                            
                            const nextNetScore = currentNetScore + scoreDelta;
                            localStorage.setItem(getUserKey('tanios_net_score'), nextNetScore.toString());
                            setNetScore(nextNetScore);
                            
                            if (isCorrect) {
                              if (isReviewMode) {
                                setXpAwardedMsg(`Reviewed! (No Marks/XP in Review Mode) 💡`);
                              } else if (hasPreviousCorrect) {
                                setXpAwardedMsg(`Reviewed! (No Marks/XP for repeats) 💡`);
                              } else if (hasPreviousWrong) {
                                setXpAwardedMsg(`Corrected! (No Marks/XP for retries) 💡`);
                              } else {
                                awardXp(10, 'Correct MCQ Answer');
                                setXpAwardedMsg(`+10 Marks Earned! 🎯`);
                              }
                              setTimeout(() => setXpAwardedMsg(''), 3000);
                            } else {
                              if (isReviewMode) {
                                setXpAwardedMsg(`Incorrect Option! (Review Mode) ❌`);
                              } else if (!existing) {
                                setXpAwardedMsg(`Penalty Applied: -5 Marks! ❌`);
                              } else {
                                setXpAwardedMsg(`Incorrect Option! (Try again) ❌`);
                              }
                              setTimeout(() => setXpAwardedMsg(''), 3000);
                            }                          } catch (err) {
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
                        if (missionAnswer !== data.correctKey) {
                          // User got it wrong, let them try again
                          setMissionSubmitted(false);
                          setMissionAnswer(null);
                          return;
                        }
                        
                        // User got it right! Check if there are more questions
                        if (currentQuestionIdx < quizQuestions.length - 1) {
                          setQuizStep(prev => prev + 1);
                          setMissionSubmitted(false);
                          setMissionAnswer(null);
                        } else {
                          // Correct selection & last question: Mark completed!
                          toggleMission(activeMission.id);
                          setActiveMission(null);
                          setDynamicMissionContent(null);
                          setQuizStep(0);
                        }
                      }}
                      className="btn btn-primary"
                      style={{
                        flex: 1, padding: '0.8rem 1rem', fontSize: '0.88rem', fontWeight: 800,
                        background: (missionAnswer === data?.correctKey)
                          ? 'linear-gradient(135deg, #10b981, #059669)'
                          : 'linear-gradient(135deg, var(--primary), var(--accent))'
                      }}
                    >
                      {missionAnswer !== data?.correctKey
                        ? "Try Another Option ➔"
                        : (currentQuestionIdx < quizQuestions.length - 1
                          ? `Next Concept (${currentQuestionIdx + 2}/${quizQuestions.length}) ➔`
                          : "Submit & Complete Mission")}
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setActiveMission(null);
                      setDynamicMissionContent(null);
                      setQuizStep(0);
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
              );
            })()}
          </div>
        </div>,
        document.body
      )}

      {/* ── INTERACTIVE UPGRADE TO PRO POPUP MODAL ── */}
      {showUpgradePopup && createPortal(
        <div className="daily-mission-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="daily-mission-card" style={{
            maxWidth: '500px',
            maxHeight: '480px',
            height: 'auto',
            borderRadius: '16px',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-lg)',
            padding: '2rem',
            textAlign: 'center',
            position: 'relative'
          }}>
            {/* Close Button */}
            <button 
              onClick={() => setShowUpgradePopup(false)}
              style={{ position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', opacity: 0.7 }}
            >
              <X size={20} />
            </button>

            {/* Glowing Lock Icon */}
            <div style={{
              width: '60px', height: '60px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(108, 99, 255, 0.15) 0%, rgba(239, 68, 68, 0.15) 100%)',
              border: '1px solid rgba(108, 99, 255, 0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.75rem',
              margin: '0 auto 1.25rem auto',
              boxShadow: '0 0 20px rgba(108, 99, 255, 0.2)'
            }}>
              🔒
            </div>

            {/* Title & Desc */}
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text)', margin: '0 0 0.5rem 0' }}>
              TaniOS Pro Upgrade Required
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: '0 0 1.5rem 0' }}>
              You are currently on the **Free Tier**, which is limited to **1 free day of target missions**. Complete the upgrade to unlock all subject targets every day and continue your revision!
            </p>

            {/* Perks Grid */}
            <div style={{
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border)',
              borderRadius: '10px',
              padding: '1rem',
              textAlign: 'left',
              fontSize: '0.78rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.6rem',
              marginBottom: '1.5rem',
              color: 'var(--text-secondary)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ color: '#10b981', marginRight: '0.25rem' }}>✓</span>
                <span><strong>Targets for All Subjects:</strong> Study all subjects daily.</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ color: '#10b981', marginRight: '0.25rem' }}>✓</span>
                <span><strong>20 Daily AI Doubt Solves:</strong> High-speed detailed solutions.</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ color: '#10b981', marginRight: '0.25rem' }}>✓</span>
                <span><strong>Textbook Uploads (RAG):</strong> Direct textbook search.</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ color: '#10b981', marginRight: '0.25rem' }}>✓</span>
                <span><strong>Topper Mock Test Generators:</strong> CBSE & RBSE prep.</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <Link
                to="/subscribe"
                className="btn btn-primary"
                onClick={() => setShowUpgradePopup(false)}
                style={{
                  padding: '0.75rem', fontSize: '0.88rem', fontWeight: 800,
                  background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)',
                  border: 'none', color: '#fff', borderRadius: '8px',
                  display: 'block', textDecoration: 'none'
                }}
              >
                Unlock Pro Premium (₹199) ➔
              </Link>
              <button
                onClick={() => setShowUpgradePopup(false)}
                style={{
                  background: 'transparent', border: 'none', color: 'var(--text-secondary)',
                  fontSize: '0.8rem', cursor: 'pointer', fontWeight: 600
                }}
              >
                Close & Keep Exploring
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
