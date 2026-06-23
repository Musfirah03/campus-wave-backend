require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Course = require('../models/Course');
const User = require('../models/User');
const bcrypt = require('bcryptjs');

// ─── Seed data ────────────────────────────────────────────────────────────────
// Format: { code, title, description, department, semester }
// Codes: <ABBR><SEM><NUM> e.g. CS101, SE203, EE305

const COURSES = [
  // ── Computer Science ─────────────────────────────────────────────────────────
  { code: 'CS101', title: 'Programming Fundamentals',       description: 'Introduction to problem-solving and programming using C++', department: 'Computer Science', semester: '1' },
  { code: 'CS102', title: 'Calculus I',                      description: 'Limits, derivatives, and their applications', department: 'Computer Science', semester: '1' },
  { code: 'CS103', title: 'Physics for Computing',           description: 'Classical mechanics and electromagnetism for engineers', department: 'Computer Science', semester: '1' },
  { code: 'CS104', title: 'English Communication',           description: 'Academic writing, presentations, and professional communication', department: 'Computer Science', semester: '1' },

  { code: 'CS201', title: 'Object-Oriented Programming',     description: 'OOP concepts in Java: classes, inheritance, polymorphism', department: 'Computer Science', semester: '2' },
  { code: 'CS202', title: 'Data Structures',                 description: 'Arrays, linked lists, stacks, queues, trees, and graphs', department: 'Computer Science', semester: '2' },
  { code: 'CS203', title: 'Discrete Mathematics',            description: 'Logic, sets, functions, relations, and combinatorics', department: 'Computer Science', semester: '2' },
  { code: 'CS204', title: 'Linear Algebra',                  description: 'Vectors, matrices, eigenvalues, and linear transformations', department: 'Computer Science', semester: '2' },

  { code: 'CS301', title: 'Database Systems',                description: 'Relational databases, SQL, normalization, and transactions', department: 'Computer Science', semester: '3' },
  { code: 'CS302', title: 'Computer Networks',               description: 'Network models, protocols, TCP/IP, and network security', department: 'Computer Science', semester: '3' },
  { code: 'CS303', title: 'Operating Systems',               description: 'Processes, memory management, file systems, and scheduling', department: 'Computer Science', semester: '3' },
  { code: 'CS304', title: 'Probability & Statistics',        description: 'Probability theory, distributions, and statistical inference', department: 'Computer Science', semester: '3' },

  { code: 'CS401', title: 'Design & Analysis of Algorithms', description: 'Sorting, searching, dynamic programming, and complexity analysis', department: 'Computer Science', semester: '4' },
  { code: 'CS402', title: 'Software Engineering',            description: 'SDLC, requirements, design patterns, and agile methods', department: 'Computer Science', semester: '4' },
  { code: 'CS403', title: 'Theory of Automata',              description: 'Finite automata, regular expressions, and context-free grammars', department: 'Computer Science', semester: '4' },
  { code: 'CS404', title: 'Web Technologies',                description: 'HTML, CSS, JavaScript, REST APIs, and modern frameworks', department: 'Computer Science', semester: '4' },

  { code: 'CS501', title: 'Artificial Intelligence',         description: 'Search algorithms, knowledge representation, and machine learning basics', department: 'Computer Science', semester: '5' },
  { code: 'CS502', title: 'Computer Architecture',           description: 'CPU design, memory hierarchy, pipelining, and parallelism', department: 'Computer Science', semester: '5' },
  { code: 'CS503', title: 'Compiler Construction',           description: 'Lexical analysis, parsing, semantic analysis, and code generation', department: 'Computer Science', semester: '5' },
  { code: 'CS504', title: 'Human-Computer Interaction',      description: 'UX principles, usability testing, and interface design', department: 'Computer Science', semester: '5' },

  { code: 'CS601', title: 'Machine Learning',                description: 'Supervised/unsupervised learning, neural networks, and model evaluation', department: 'Computer Science', semester: '6' },
  { code: 'CS602', title: 'Information Security',            description: 'Cryptography, network security, authentication, and ethical hacking', department: 'Computer Science', semester: '6' },
  { code: 'CS603', title: 'Distributed Systems',             description: 'Distributed architectures, consistency, fault tolerance, and microservices', department: 'Computer Science', semester: '6' },
  { code: 'CS604', title: 'Professional Ethics in IT',       description: 'Ethics, intellectual property, privacy, and professional conduct', department: 'Computer Science', semester: '6' },

  { code: 'CS701', title: 'Cloud Computing',                 description: 'Cloud architectures, AWS/GCP services, and containerization', department: 'Computer Science', semester: '7' },
  { code: 'CS702', title: 'Big Data Analytics',              description: 'Hadoop, Spark, NoSQL, and large-scale data processing', department: 'Computer Science', semester: '7' },
  { code: 'CS703', title: 'Mobile Application Development',  description: 'Native and cross-platform mobile apps using React Native', department: 'Computer Science', semester: '7' },
  { code: 'CS704', title: 'Final Year Project I',            description: 'Project proposal, literature review, and initial implementation', department: 'Computer Science', semester: '7' },

  { code: 'CS801', title: 'Deep Learning',                   description: 'CNNs, RNNs, transformers, and deep learning applications', department: 'Computer Science', semester: '8' },
  { code: 'CS802', title: 'Research Methodology',            description: 'Research design, academic writing, and data analysis methods', department: 'Computer Science', semester: '8' },
  { code: 'CS803', title: 'Final Year Project II',           description: 'Project completion, testing, and final presentation', department: 'Computer Science', semester: '8' },
  { code: 'CS804', title: 'Blockchain & Decentralised Apps', description: 'Blockchain fundamentals, smart contracts, and dApps', department: 'Computer Science', semester: '8' },

  // ── Software Engineering ───────────────────────────────────────────────────
  { code: 'SE101', title: 'Programming Fundamentals',        description: 'Core programming concepts and problem-solving using Python', department: 'Software Engineering', semester: '1' },
  { code: 'SE102', title: 'Calculus & Analytical Geometry',  description: 'Differential and integral calculus with applications', department: 'Software Engineering', semester: '1' },
  { code: 'SE103', title: 'Technical Writing',               description: 'Writing technical documents, reports, and proposals', department: 'Software Engineering', semester: '1' },
  { code: 'SE104', title: 'Introduction to Software Engineering', description: 'Overview of software processes, roles, and the industry', department: 'Software Engineering', semester: '1' },

  { code: 'SE201', title: 'Object-Oriented Programming',     description: 'OOP with Java: design patterns and best practices', department: 'Software Engineering', semester: '2' },
  { code: 'SE202', title: 'Data Structures & Algorithms',    description: 'Core data structures and algorithm analysis', department: 'Software Engineering', semester: '2' },
  { code: 'SE203', title: 'Software Requirements Engineering', description: 'Elicitation, specification, and validation of requirements', department: 'Software Engineering', semester: '2' },
  { code: 'SE204', title: 'Discrete Mathematics',            description: 'Mathematical foundations for software engineering', department: 'Software Engineering', semester: '2' },

  { code: 'SE301', title: 'Database Systems',                description: 'Relational model, SQL, and database design', department: 'Software Engineering', semester: '3' },
  { code: 'SE302', title: 'Software Design & Architecture',  description: 'UML, design patterns, and architectural styles', department: 'Software Engineering', semester: '3' },
  { code: 'SE303', title: 'Web Development',                 description: 'Full-stack web development with HTML, CSS, JS, and Node.js', department: 'Software Engineering', semester: '3' },
  { code: 'SE304', title: 'Probability & Statistics',        description: 'Statistical methods for software quality and metrics', department: 'Software Engineering', semester: '3' },

  { code: 'SE401', title: 'Software Architecture',           description: 'Microservices, event-driven, and cloud-native architecture', department: 'Software Engineering', semester: '4' },
  { code: 'SE402', title: 'Algorithms & Complexity',         description: 'Advanced algorithm design and computational complexity', department: 'Software Engineering', semester: '4' },
  { code: 'SE403', title: 'Software Testing & QA',           description: 'Testing strategies, test automation, and quality assurance', department: 'Software Engineering', semester: '4' },
  { code: 'SE404', title: 'Human-Computer Interaction',      description: 'Usability, accessibility, and user-centred design', department: 'Software Engineering', semester: '4' },

  { code: 'SE501', title: 'Artificial Intelligence',         description: 'AI techniques and their applications in software systems', department: 'Software Engineering', semester: '5' },
  { code: 'SE502', title: 'Project Management',              description: 'Planning, scheduling, risk management, and agile practices', department: 'Software Engineering', semester: '5' },
  { code: 'SE503', title: 'DevOps & CI/CD',                  description: 'Docker, Kubernetes, CI/CD pipelines, and infrastructure as code', department: 'Software Engineering', semester: '5' },
  { code: 'SE504', title: 'Operating Systems',               description: 'OS concepts relevant to software performance and deployment', department: 'Software Engineering', semester: '5' },

  { code: 'SE601', title: 'Mobile Application Development',  description: 'Cross-platform mobile development with React Native and Flutter', department: 'Software Engineering', semester: '6' },
  { code: 'SE602', title: 'Cloud Services & Serverless',     description: 'AWS, GCP, serverless functions, and managed cloud services', department: 'Software Engineering', semester: '6' },
  { code: 'SE603', title: 'Security Engineering',            description: 'Secure coding, OWASP top 10, and application security testing', department: 'Software Engineering', semester: '6' },
  { code: 'SE604', title: 'Professional Ethics',             description: 'Engineering ethics, intellectual property, and legal frameworks', department: 'Software Engineering', semester: '6' },

  { code: 'SE701', title: 'Agile & Scrum Methodologies',     description: 'Scrum, Kanban, and large-scale agile frameworks', department: 'Software Engineering', semester: '7' },
  { code: 'SE702', title: 'Big Data & Analytics',            description: 'Data pipelines, Spark, and analytical dashboards', department: 'Software Engineering', semester: '7' },
  { code: 'SE703', title: 'Machine Learning for SE',         description: 'Applying ML to code analysis, bug prediction, and automation', department: 'Software Engineering', semester: '7' },
  { code: 'SE704', title: 'Final Year Project I',            description: 'Project scoping, design, and prototype development', department: 'Software Engineering', semester: '7' },

  { code: 'SE801', title: 'Emerging Technologies',           description: 'IoT, AR/VR, blockchain, and future software paradigms', department: 'Software Engineering', semester: '8' },
  { code: 'SE802', title: 'Software Metrics & Process Improvement', description: 'Measurement-driven process improvement and CMMI', department: 'Software Engineering', semester: '8' },
  { code: 'SE803', title: 'Research Methodology',            description: 'Conducting and publishing applied software engineering research', department: 'Software Engineering', semester: '8' },
  { code: 'SE804', title: 'Final Year Project II',           description: 'Project completion, deployment, and evaluation', department: 'Software Engineering', semester: '8' },

  // ── Electrical Engineering ─────────────────────────────────────────────────
  { code: 'EE101', title: 'Circuit Analysis I',              description: 'Kirchhoff\'s laws, resistive circuits, and node/mesh analysis', department: 'Electrical Engineering', semester: '1' },
  { code: 'EE102', title: 'Calculus I',                      description: 'Differential calculus and its engineering applications', department: 'Electrical Engineering', semester: '1' },
  { code: 'EE103', title: 'Engineering Drawing',             description: 'Technical drawing, AutoCAD basics, and 2D/3D sketching', department: 'Electrical Engineering', semester: '1' },
  { code: 'EE104', title: 'Physics I',                       description: 'Mechanics, waves, thermodynamics, and modern physics', department: 'Electrical Engineering', semester: '1' },

  { code: 'EE201', title: 'Circuit Analysis II',             description: 'AC circuits, phasors, Laplace transforms, and filters', department: 'Electrical Engineering', semester: '2' },
  { code: 'EE202', title: 'Calculus II',                     description: 'Integral calculus, sequences, and series', department: 'Electrical Engineering', semester: '2' },
  { code: 'EE203', title: 'Programming for Engineers',       description: 'MATLAB and Python for engineering problem-solving', department: 'Electrical Engineering', semester: '2' },
  { code: 'EE204', title: 'Physics II',                      description: 'Electromagnetism, optics, and quantum mechanics basics', department: 'Electrical Engineering', semester: '2' },

  { code: 'EE301', title: 'Signals & Systems',               description: 'Continuous and discrete-time signals, Fourier and Z-transforms', department: 'Electrical Engineering', semester: '3' },
  { code: 'EE302', title: 'Electronics I',                   description: 'Diodes, BJTs, MOSFETs, and basic amplifier circuits', department: 'Electrical Engineering', semester: '3' },
  { code: 'EE303', title: 'Linear Algebra',                  description: 'Matrix methods for circuit and signal analysis', department: 'Electrical Engineering', semester: '3' },
  { code: 'EE304', title: 'Electromagnetic Theory',          description: 'Maxwell\'s equations, wave propagation, and transmission lines', department: 'Electrical Engineering', semester: '3' },

  { code: 'EE401', title: 'Digital Logic Design',            description: 'Boolean algebra, combinational/sequential circuits, and FPGAs', department: 'Electrical Engineering', semester: '4' },
  { code: 'EE402', title: 'Electronics II',                  description: 'Operational amplifiers, feedback, and power electronics basics', department: 'Electrical Engineering', semester: '4' },
  { code: 'EE403', title: 'Control Systems I',               description: 'Transfer functions, stability analysis, and PID control', department: 'Electrical Engineering', semester: '4' },
  { code: 'EE404', title: 'Probability & Stochastic Processes', description: 'Random variables and noise analysis in electrical systems', department: 'Electrical Engineering', semester: '4' },

  { code: 'EE501', title: 'Communication Systems',           description: 'AM/FM modulation, digital communications, and channel coding', department: 'Electrical Engineering', semester: '5' },
  { code: 'EE502', title: 'Power Systems I',                 description: 'Power generation, transmission, and distribution basics', department: 'Electrical Engineering', semester: '5' },
  { code: 'EE503', title: 'Microprocessors & Microcontrollers', description: 'ARM architecture, embedded C, and peripheral interfacing', department: 'Electrical Engineering', semester: '5' },
  { code: 'EE504', title: 'Control Systems II',              description: 'State-space methods, digital control, and modern control theory', department: 'Electrical Engineering', semester: '5' },

  { code: 'EE601', title: 'Power Electronics',               description: 'Converters, inverters, and motor drives', department: 'Electrical Engineering', semester: '6' },
  { code: 'EE602', title: 'Digital Signal Processing',       description: 'FIR/IIR filters, FFT, and real-time DSP applications', department: 'Electrical Engineering', semester: '6' },
  { code: 'EE603', title: 'VLSI Design',                     description: 'CMOS circuits, RTL design, and FPGA implementation', department: 'Electrical Engineering', semester: '6' },
  { code: 'EE604', title: 'Instrumentation & Measurement',   description: 'Sensors, transducers, and data acquisition systems', department: 'Electrical Engineering', semester: '6' },

  { code: 'EE701', title: 'Wireless Communications',         description: '4G/5G, OFDM, MIMO, and wireless channel modelling', department: 'Electrical Engineering', semester: '7' },
  { code: 'EE702', title: 'Power Systems II',                description: 'Load flow, fault analysis, and protection systems', department: 'Electrical Engineering', semester: '7' },
  { code: 'EE703', title: 'Renewable Energy Systems',        description: 'Solar, wind, and hybrid energy system design', department: 'Electrical Engineering', semester: '7' },
  { code: 'EE704', title: 'Final Year Project I',            description: 'Project proposal, simulation, and prototype design', department: 'Electrical Engineering', semester: '7' },

  { code: 'EE801', title: 'Embedded Systems Design',         description: 'RTOS, low-power design, and IoT applications', department: 'Electrical Engineering', semester: '8' },
  { code: 'EE802', title: 'Smart Grid Technologies',         description: 'Advanced metering, demand response, and grid modernisation', department: 'Electrical Engineering', semester: '8' },
  { code: 'EE803', title: 'Engineering Management',          description: 'Project management, economics, and professional practice', department: 'Electrical Engineering', semester: '8' },
  { code: 'EE804', title: 'Final Year Project II',           description: 'Project completion, testing, and technical report', department: 'Electrical Engineering', semester: '8' },

  // ── Mechanical Engineering ────────────────────────────────────────────────
  { code: 'ME101', title: 'Engineering Mechanics',           description: 'Statics: forces, moments, equilibrium, and free-body diagrams', department: 'Mechanical Engineering', semester: '1' },
  { code: 'ME102', title: 'Calculus I',                      description: 'Differential calculus for engineering applications', department: 'Mechanical Engineering', semester: '1' },
  { code: 'ME103', title: 'Engineering Drawing & CAD',       description: 'Technical drawing principles and SolidWorks basics', department: 'Mechanical Engineering', semester: '1' },
  { code: 'ME104', title: 'Chemistry for Engineers',         description: 'Chemical bonding, thermochemistry, and materials chemistry', department: 'Mechanical Engineering', semester: '1' },

  { code: 'ME201', title: 'Thermodynamics I',                description: 'Laws of thermodynamics, properties of pure substances, and cycles', department: 'Mechanical Engineering', semester: '2' },
  { code: 'ME202', title: 'Calculus II',                     description: 'Integral calculus and multivariate calculus', department: 'Mechanical Engineering', semester: '2' },
  { code: 'ME203', title: 'Mechanics of Materials',          description: 'Stress, strain, bending, torsion, and failure theories', department: 'Mechanical Engineering', semester: '2' },
  { code: 'ME204', title: 'Engineering Physics',             description: 'Oscillations, waves, and modern physics', department: 'Mechanical Engineering', semester: '2' },

  { code: 'ME301', title: 'Fluid Mechanics I',               description: 'Fluid statics, continuity, Bernoulli, and pipe flow', department: 'Mechanical Engineering', semester: '3' },
  { code: 'ME302', title: 'Manufacturing Processes',         description: 'Casting, machining, welding, and surface treatment', department: 'Mechanical Engineering', semester: '3' },
  { code: 'ME303', title: 'Linear Algebra & Differential Equations', description: 'ODE methods for mechanical system modelling', department: 'Mechanical Engineering', semester: '3' },
  { code: 'ME304', title: 'Materials Science',               description: 'Crystal structure, phase diagrams, and material selection', department: 'Mechanical Engineering', semester: '3' },

  { code: 'ME401', title: 'Heat Transfer',                   description: 'Conduction, convection, radiation, and heat exchanger design', department: 'Mechanical Engineering', semester: '4' },
  { code: 'ME402', title: 'Machine Design I',                description: 'Failure theories, fatigue, bolted joints, and shafts', department: 'Mechanical Engineering', semester: '4' },
  { code: 'ME403', title: 'Dynamics',                        description: 'Kinematics and kinetics of particles and rigid bodies', department: 'Mechanical Engineering', semester: '4' },
  { code: 'ME404', title: 'Fluid Mechanics II',              description: 'Turbulence, compressible flow, and turbomachinery basics', department: 'Mechanical Engineering', semester: '4' },

  { code: 'ME501', title: 'CAD/CAM & CNC',                  description: 'Advanced SolidWorks, CAM toolpaths, and CNC programming', department: 'Mechanical Engineering', semester: '5' },
  { code: 'ME502', title: 'Thermodynamics II',               description: 'Gas mixtures, psychrometrics, and combustion', department: 'Mechanical Engineering', semester: '5' },
  { code: 'ME503', title: 'Mechanical Vibrations',           description: 'Free/forced vibration, damping, and vibration control', department: 'Mechanical Engineering', semester: '5' },
  { code: 'ME504', title: 'Manufacturing Engineering',       description: 'Lean manufacturing, quality control, and process planning', department: 'Mechanical Engineering', semester: '5' },

  { code: 'ME601', title: 'Finite Element Analysis',         description: 'FEA theory, ANSYS applications, and structural simulation', department: 'Mechanical Engineering', semester: '6' },
  { code: 'ME602', title: 'Machine Design II',               description: 'Gears, bearings, springs, clutches, and brakes', department: 'Mechanical Engineering', semester: '6' },
  { code: 'ME603', title: 'HVAC Systems',                    description: 'Heating, ventilation, air-conditioning design and analysis', department: 'Mechanical Engineering', semester: '6' },
  { code: 'ME604', title: 'Industrial Engineering',          description: 'Work study, production planning, and operations management', department: 'Mechanical Engineering', semester: '6' },

  { code: 'ME701', title: 'Robotics & Automation',           description: 'Robot kinematics, dynamics, control, and industrial automation', department: 'Mechanical Engineering', semester: '7' },
  { code: 'ME702', title: 'Power Plant Engineering',         description: 'Steam, gas, and combined-cycle power plant design', department: 'Mechanical Engineering', semester: '7' },
  { code: 'ME703', title: 'Computational Fluid Dynamics',    description: 'CFD fundamentals and simulations using OpenFOAM', department: 'Mechanical Engineering', semester: '7' },
  { code: 'ME704', title: 'Final Year Project I',            description: 'Project definition, literature review, and concept design', department: 'Mechanical Engineering', semester: '7' },

  { code: 'ME801', title: 'Mechatronics',                    description: 'Sensors, actuators, PLCs, and integrated mechanical-electronic systems', department: 'Mechanical Engineering', semester: '8' },
  { code: 'ME802', title: 'Renewable & Alternative Energy',  description: 'Solar thermal, wind turbines, and energy storage systems', department: 'Mechanical Engineering', semester: '8' },
  { code: 'ME803', title: 'Engineering Management',          description: 'Project management, economics, and professional engineering ethics', department: 'Mechanical Engineering', semester: '8' },
  { code: 'ME804', title: 'Final Year Project II',           description: 'Prototype fabrication, testing, and final report submission', department: 'Mechanical Engineering', semester: '8' },

  // ── Civil Engineering ──────────────────────────────────────────────────────
  { code: 'CV101', title: 'Engineering Mechanics',           description: 'Statics for civil structures: trusses and frames', department: 'Civil Engineering', semester: '1' },
  { code: 'CV102', title: 'Calculus I',                      description: 'Differential calculus and geometry', department: 'Civil Engineering', semester: '1' },
  { code: 'CV103', title: 'Engineering Drawing',             description: 'Plan, section, and elevation drawings for civil structures', department: 'Civil Engineering', semester: '1' },
  { code: 'CV104', title: 'Chemistry & Environment',         description: 'Environmental chemistry and pollution fundamentals', department: 'Civil Engineering', semester: '1' },

  { code: 'CV201', title: 'Structural Analysis I',           description: 'Beams, frames, and influence lines', department: 'Civil Engineering', semester: '2' },
  { code: 'CV202', title: 'Calculus II',                     description: 'Integral calculus and differential equations for engineers', department: 'Civil Engineering', semester: '2' },
  { code: 'CV203', title: 'Construction Materials',          description: 'Properties and testing of concrete, steel, and timber', department: 'Civil Engineering', semester: '2' },
  { code: 'CV204', title: 'Engineering Physics',             description: 'Mechanics, waves, and optics for civil applications', department: 'Civil Engineering', semester: '2' },

  { code: 'CV301', title: 'Fluid Mechanics',                 description: 'Hydrostatics, open-channel flow, and hydraulic machinery', department: 'Civil Engineering', semester: '3' },
  { code: 'CV302', title: 'Soil Mechanics I',                description: 'Soil classification, compaction, permeability, and consolidation', department: 'Civil Engineering', semester: '3' },
  { code: 'CV303', title: 'Linear Algebra & Statistics',     description: 'Matrix methods and statistical analysis for civil data', department: 'Civil Engineering', semester: '3' },
  { code: 'CV304', title: 'Surveying',                       description: 'Levelling, traversing, GPS, and total station techniques', department: 'Civil Engineering', semester: '3' },

  { code: 'CV401', title: 'Structural Analysis II',          description: 'Indeterminate structures, stiffness method, and matrix analysis', department: 'Civil Engineering', semester: '4' },
  { code: 'CV402', title: 'Soil Mechanics II',               description: 'Shear strength, slope stability, and earth pressure', department: 'Civil Engineering', semester: '4' },
  { code: 'CV403', title: 'Concrete Technology',             description: 'Concrete mix design, durability, and quality control', department: 'Civil Engineering', semester: '4' },
  { code: 'CV404', title: 'Hydraulics',                      description: 'Pipe networks, pumps, and hydraulic structures', department: 'Civil Engineering', semester: '4' },

  { code: 'CV501', title: 'Foundation Engineering',          description: 'Shallow and deep foundations, bearing capacity, and settlement', department: 'Civil Engineering', semester: '5' },
  { code: 'CV502', title: 'Environmental Engineering',       description: 'Water treatment, wastewater management, and air quality', department: 'Civil Engineering', semester: '5' },
  { code: 'CV503', title: 'Transportation Engineering',      description: 'Highway design, traffic engineering, and pavement design', department: 'Civil Engineering', semester: '5' },
  { code: 'CV504', title: 'Steel Structures',                description: 'Design of steel beams, columns, and connections', department: 'Civil Engineering', semester: '5' },

  { code: 'CV601', title: 'Reinforced Concrete Design',      description: 'ACI code-based design of beams, slabs, and columns', department: 'Civil Engineering', semester: '6' },
  { code: 'CV602', title: 'Geotechnical Engineering',        description: 'Retaining walls, embankments, and ground improvement', department: 'Civil Engineering', semester: '6' },
  { code: 'CV603', title: 'Water Supply & Sanitation',       description: 'Water distribution networks and sewerage system design', department: 'Civil Engineering', semester: '6' },
  { code: 'CV604', title: 'Construction Project Management', description: 'Planning, scheduling, CPM, PERT, and cost control', department: 'Civil Engineering', semester: '6' },

  { code: 'CV701', title: 'Bridge Engineering',              description: 'Design and analysis of bridge superstructures and substructures', department: 'Civil Engineering', semester: '7' },
  { code: 'CV702', title: 'Irrigation & Hydrology',          description: 'Hydrological cycle, runoff estimation, and irrigation systems', department: 'Civil Engineering', semester: '7' },
  { code: 'CV703', title: 'Earthquake Engineering',          description: 'Seismic hazard, structural response, and earthquake-resistant design', department: 'Civil Engineering', semester: '7' },
  { code: 'CV704', title: 'Final Year Project I',            description: 'Site investigation, design, and technical report', department: 'Civil Engineering', semester: '7' },

  { code: 'CV801', title: 'Advanced Structural Analysis',    description: 'Plastic analysis, finite element methods, and structural optimisation', department: 'Civil Engineering', semester: '8' },
  { code: 'CV802', title: 'Construction Management',         description: 'Contracts, claims, safety management, and building codes', department: 'Civil Engineering', semester: '8' },
  { code: 'CV803', title: 'Engineering Ethics & Law',        description: 'Professional ethics, environmental law, and liability', department: 'Civil Engineering', semester: '8' },
  { code: 'CV804', title: 'Final Year Project II',           description: 'Final design, construction drawing, and project defence', department: 'Civil Engineering', semester: '8' },

  // ── Business Administration ───────────────────────────────────────────────
  { code: 'BA101', title: 'Principles of Management',        description: 'Planning, organising, leading, and controlling in organisations', department: 'Business Administration', semester: '1' },
  { code: 'BA102', title: 'Business Communication',          description: 'Written and verbal communication for business professionals', department: 'Business Administration', semester: '1' },
  { code: 'BA103', title: 'Business Mathematics',            description: 'Algebra, matrices, and quantitative methods for business', department: 'Business Administration', semester: '1' },
  { code: 'BA104', title: 'Microeconomics',                  description: 'Supply, demand, market structures, and consumer behaviour', department: 'Business Administration', semester: '1' },

  { code: 'BA201', title: 'Principles of Accounting',        description: 'Double-entry bookkeeping, financial statements, and journal entries', department: 'Business Administration', semester: '2' },
  { code: 'BA202', title: 'Marketing Fundamentals',          description: 'The 4Ps, segmentation, targeting, and positioning', department: 'Business Administration', semester: '2' },
  { code: 'BA203', title: 'Business Statistics',             description: 'Descriptive statistics, probability, and hypothesis testing', department: 'Business Administration', semester: '2' },
  { code: 'BA204', title: 'Macroeconomics',                  description: 'GDP, inflation, monetary policy, and fiscal policy', department: 'Business Administration', semester: '2' },

  { code: 'BA301', title: 'Financial Accounting',            description: 'Financial statement preparation and analysis', department: 'Business Administration', semester: '3' },
  { code: 'BA302', title: 'Organisational Behaviour',        description: 'Individual, group, and organisational dynamics', department: 'Business Administration', semester: '3' },
  { code: 'BA303', title: 'Business Law',                    description: 'Contract law, company law, and regulatory frameworks', department: 'Business Administration', semester: '3' },
  { code: 'BA304', title: 'Operations Management',           description: 'Production planning, inventory, and supply chain basics', department: 'Business Administration', semester: '3' },

  { code: 'BA401', title: 'Management Accounting',           description: 'Cost-volume-profit analysis, budgeting, and variance analysis', department: 'Business Administration', semester: '4' },
  { code: 'BA402', title: 'Human Resource Management',       description: 'Recruitment, performance management, and employee relations', department: 'Business Administration', semester: '4' },
  { code: 'BA403', title: 'Research Methods in Business',    description: 'Quantitative and qualitative research design for business', department: 'Business Administration', semester: '4' },
  { code: 'BA404', title: 'Business Ethics & CSR',           description: 'Ethical decision-making and corporate social responsibility', department: 'Business Administration', semester: '4' },

  { code: 'BA501', title: 'Financial Management',            description: 'Capital structure, valuation, and investment decisions', department: 'Business Administration', semester: '5' },
  { code: 'BA502', title: 'Strategic Management',            description: 'SWOT, Porter\'s five forces, competitive advantage, and strategy execution', department: 'Business Administration', semester: '5' },
  { code: 'BA503', title: 'Entrepreneurship & Innovation',   description: 'Startup ecosystems, business model canvas, and growth strategies', department: 'Business Administration', semester: '5' },
  { code: 'BA504', title: 'Digital Marketing',               description: 'SEO, social media marketing, analytics, and e-commerce', department: 'Business Administration', semester: '5' },

  { code: 'BA601', title: 'International Business',          description: 'Globalisation, trade theory, and multinational strategies', department: 'Business Administration', semester: '6' },
  { code: 'BA602', title: 'Supply Chain Management',         description: 'Logistics, procurement, demand forecasting, and lean supply chains', department: 'Business Administration', semester: '6' },
  { code: 'BA603', title: 'Corporate Governance',            description: 'Board structures, agency theory, and regulatory compliance', department: 'Business Administration', semester: '6' },
  { code: 'BA604', title: 'Project Management',              description: 'PMI framework, risk management, and project leadership', department: 'Business Administration', semester: '6' },

  { code: 'BA701', title: 'Business Policy & Strategy',      description: 'Case-based strategic analysis and decision-making', department: 'Business Administration', semester: '7' },
  { code: 'BA702', title: 'Leadership & Change Management',  description: 'Leadership styles, organisational change, and culture', department: 'Business Administration', semester: '7' },
  { code: 'BA703', title: 'E-Commerce & Digital Business',   description: 'Online business models, platforms, and digital transformation', department: 'Business Administration', semester: '7' },
  { code: 'BA704', title: 'Final Year Project I',            description: 'Business plan development and feasibility study', department: 'Business Administration', semester: '7' },

  { code: 'BA801', title: 'Emerging Markets & Global Trends', description: 'Developing economies, geopolitics, and emerging business opportunities', department: 'Business Administration', semester: '8' },
  { code: 'BA802', title: 'Business Analytics',              description: 'Data-driven decision making using Excel, Power BI, and Python', department: 'Business Administration', semester: '8' },
  { code: 'BA803', title: 'Mergers, Acquisitions & Valuation', description: 'M&A process, due diligence, and firm valuation methods', department: 'Business Administration', semester: '8' },
  { code: 'BA804', title: 'Final Year Project II',           description: 'Research presentation, business plan pitch, and final report', department: 'Business Administration', semester: '8' },

  // ── Accounting & Finance ──────────────────────────────────────────────────
  { code: 'AF101', title: 'Financial Accounting I',          description: 'Introduction to accounting concepts and the accounting cycle', department: 'Accounting & Finance', semester: '1' },
  { code: 'AF102', title: 'Business Mathematics',            description: 'Financial arithmetic, interest calculations, and algebra', department: 'Accounting & Finance', semester: '1' },
  { code: 'AF103', title: 'Principles of Economics',         description: 'Micro and macro economic fundamentals for finance', department: 'Accounting & Finance', semester: '1' },
  { code: 'AF104', title: 'Business Communication',          description: 'Professional writing, presentations, and business correspondence', department: 'Accounting & Finance', semester: '1' },

  { code: 'AF201', title: 'Financial Accounting II',         description: 'Partnership accounts, companies, and financial reporting', department: 'Accounting & Finance', semester: '2' },
  { code: 'AF202', title: 'Business Statistics',             description: 'Statistical tools for accounting and financial data analysis', department: 'Accounting & Finance', semester: '2' },
  { code: 'AF203', title: 'Microeconomics',                  description: 'Market structures, elasticity, and consumer theory', department: 'Accounting & Finance', semester: '2' },
  { code: 'AF204', title: 'Business Law',                    description: 'Contract, company, and commercial law', department: 'Accounting & Finance', semester: '2' },

  { code: 'AF301', title: 'Cost Accounting',                 description: 'Costing methods: job order, process, and activity-based costing', department: 'Accounting & Finance', semester: '3' },
  { code: 'AF302', title: 'Financial Management I',          description: 'Time value of money, risk-return, and capital budgeting', department: 'Accounting & Finance', semester: '3' },
  { code: 'AF303', title: 'Taxation',                        description: 'Income tax, sales tax, and withholding tax under Pakistan law', department: 'Accounting & Finance', semester: '3' },
  { code: 'AF304', title: 'Auditing I',                      description: 'Audit planning, evidence, and internal controls', department: 'Accounting & Finance', semester: '3' },

  { code: 'AF401', title: 'Management Accounting',           description: 'Budgeting, standard costing, and performance measurement', department: 'Accounting & Finance', semester: '4' },
  { code: 'AF402', title: 'Financial Management II',         description: 'Capital structure, dividend policy, and working capital', department: 'Accounting & Finance', semester: '4' },
  { code: 'AF403', title: 'Corporate Law',                   description: 'Companies Act, securities law, and corporate governance', department: 'Accounting & Finance', semester: '4' },
  { code: 'AF404', title: 'Auditing II',                     description: 'External audit procedures, reporting, and ISAs', department: 'Accounting & Finance', semester: '4' },

  { code: 'AF501', title: 'Advanced Financial Accounting',   description: 'Group accounts, consolidation, and IFRS application', department: 'Accounting & Finance', semester: '5' },
  { code: 'AF502', title: 'Investment Analysis',             description: 'Security analysis, portfolio theory, and valuation', department: 'Accounting & Finance', semester: '5' },
  { code: 'AF503', title: 'Financial Reporting',             description: 'Preparing and interpreting IFRS-compliant financial statements', department: 'Accounting & Finance', semester: '5' },
  { code: 'AF504', title: 'Risk Management',                 description: 'Financial risk types, derivatives, and hedging strategies', department: 'Accounting & Finance', semester: '5' },

  { code: 'AF601', title: 'Corporate Finance',               description: 'M&A, LBOs, firm valuation, and restructuring', department: 'Accounting & Finance', semester: '6' },
  { code: 'AF602', title: 'Banking & Financial Institutions', description: 'Commercial banking, Islamic finance, and financial regulation', department: 'Accounting & Finance', semester: '6' },
  { code: 'AF603', title: 'Forensic Accounting',             description: 'Fraud detection, litigation support, and financial investigations', department: 'Accounting & Finance', semester: '6' },
  { code: 'AF604', title: 'Ethics in Accounting',            description: 'ICAP code of ethics, independence, and professional conduct', department: 'Accounting & Finance', semester: '6' },

  { code: 'AF701', title: 'International Financial Reporting', description: 'IFRS vs GAAP, foreign currency, and multinational reporting', department: 'Accounting & Finance', semester: '7' },
  { code: 'AF702', title: 'Portfolio Management',            description: 'Asset allocation, performance evaluation, and fund management', department: 'Accounting & Finance', semester: '7' },
  { code: 'AF703', title: 'Public Sector Accounting',        description: 'Government accounting, IPSAS, and public financial management', department: 'Accounting & Finance', semester: '7' },
  { code: 'AF704', title: 'Final Year Project I',            description: 'Financial research design and literature review', department: 'Accounting & Finance', semester: '7' },

  { code: 'AF801', title: 'Advanced Auditing & Assurance',   description: 'Audit risk, complex audits, and audit quality', department: 'Accounting & Finance', semester: '8' },
  { code: 'AF802', title: 'FinTech & Digital Finance',       description: 'Blockchain in accounting, robo-advisors, and digital payments', department: 'Accounting & Finance', semester: '8' },
  { code: 'AF803', title: 'Research Methodology',            description: 'Quantitative and qualitative research for accounting and finance', department: 'Accounting & Finance', semester: '8' },
  { code: 'AF804', title: 'Final Year Project II',           description: 'Research completion, data analysis, and dissertation defence', department: 'Accounting & Finance', semester: '8' },

  // ── Mass Communication ────────────────────────────────────────────────────
  { code: 'MC101', title: 'Introduction to Mass Communication', description: 'Overview of media, communication models, and the media landscape', department: 'Mass Communication', semester: '1' },
  { code: 'MC102', title: 'English Composition',             description: 'Academic writing, grammar, and essay structure', department: 'Mass Communication', semester: '1' },
  { code: 'MC103', title: 'Media History',                   description: 'Evolution of print, broadcast, and digital media', department: 'Mass Communication', semester: '1' },
  { code: 'MC104', title: 'Critical Thinking & Logic',       description: 'Argumentation, logical fallacies, and media literacy', department: 'Mass Communication', semester: '1' },

  { code: 'MC201', title: 'Media Writing',                   description: 'News writing, feature writing, and storytelling for media', department: 'Mass Communication', semester: '2' },
  { code: 'MC202', title: 'Introduction to Broadcasting',    description: 'Radio and television production fundamentals', department: 'Mass Communication', semester: '2' },
  { code: 'MC203', title: 'Photography & Visual Communication', description: 'DSLR basics, composition, and photojournalism', department: 'Mass Communication', semester: '2' },
  { code: 'MC204', title: 'Communication Theory',            description: 'Agenda-setting, uses & gratifications, and framing theory', department: 'Mass Communication', semester: '2' },

  { code: 'MC301', title: 'Journalism & Reporting',          description: 'News gathering, source development, and investigative techniques', department: 'Mass Communication', semester: '3' },
  { code: 'MC302', title: 'Video Production',                description: 'Pre-production, filming, and editing with Premiere Pro', department: 'Mass Communication', semester: '3' },
  { code: 'MC303', title: 'Public Relations',                description: 'PR strategies, media relations, and crisis communication', department: 'Mass Communication', semester: '3' },
  { code: 'MC304', title: 'Digital Media & Social Networks', description: 'Social media platforms, content strategy, and digital journalism', department: 'Mass Communication', semester: '3' },

  { code: 'MC401', title: 'Media Ethics & Law',              description: 'Press freedom, defamation, privacy, and PEMRA regulations', department: 'Mass Communication', semester: '4' },
  { code: 'MC402', title: 'Broadcast Journalism',            description: 'News anchoring, scripting, and live reporting', department: 'Mass Communication', semester: '4' },
  { code: 'MC403', title: 'Advertising Fundamentals',        description: 'Ad campaign planning, copywriting, and media buying', department: 'Mass Communication', semester: '4' },
  { code: 'MC404', title: 'Research Methods in Media',       description: 'Content analysis, surveys, and media research design', department: 'Mass Communication', semester: '4' },

  { code: 'MC501', title: 'Investigative Journalism',        description: 'Data journalism, FOI requests, and long-form investigation', department: 'Mass Communication', semester: '5' },
  { code: 'MC502', title: 'Documentary Production',          description: 'Documentary research, scripting, directing, and post-production', department: 'Mass Communication', semester: '5' },
  { code: 'MC503', title: 'Development Communication',       description: 'Communication for social change, NGOs, and health campaigns', department: 'Mass Communication', semester: '5' },
  { code: 'MC504', title: 'Social Media Strategy',           description: 'Influencer marketing, analytics, and platform algorithms', department: 'Mass Communication', semester: '5' },

  { code: 'MC601', title: 'Political Communication',         description: 'Election coverage, political campaigns, and propaganda analysis', department: 'Mass Communication', semester: '6' },
  { code: 'MC602', title: 'Media Management',                description: 'Media economics, newsroom management, and digital revenue models', department: 'Mass Communication', semester: '6' },
  { code: 'MC603', title: 'Content Creation & Podcasting',   description: 'Audio storytelling, podcast production, and distribution', department: 'Mass Communication', semester: '6' },
  { code: 'MC604', title: 'Corporate Communication',         description: 'Internal communication, branding, and stakeholder management', department: 'Mass Communication', semester: '6' },

  { code: 'MC701', title: 'International Media & Global Journalism', description: 'Cross-border reporting, foreign correspondents, and global news flows', department: 'Mass Communication', semester: '7' },
  { code: 'MC702', title: 'Crisis Communication',            description: 'Managing media during disasters, scandals, and reputational crises', department: 'Mass Communication', semester: '7' },
  { code: 'MC703', title: 'Media Entrepreneurship',          description: 'Launching digital media startups and sustainable media business models', department: 'Mass Communication', semester: '7' },
  { code: 'MC704', title: 'Final Year Project I',            description: 'Research design and initial production for capstone media project', department: 'Mass Communication', semester: '7' },

  { code: 'MC801', title: 'AI & the Future of Media',        description: 'Automated journalism, deepfakes, and AI tools for media professionals', department: 'Mass Communication', semester: '8' },
  { code: 'MC802', title: 'Multimedia Journalism',           description: 'Integrated storytelling across text, audio, video, and interactive formats', department: 'Mass Communication', semester: '8' },
  { code: 'MC803', title: 'Research Methodology',            description: 'Advanced research methods for media and communication studies', department: 'Mass Communication', semester: '8' },
  { code: 'MC804', title: 'Final Year Project II',           description: 'Capstone production completion, screening, and academic defence', department: 'Mass Communication', semester: '8' },

  // ── Psychology ────────────────────────────────────────────────────────────
  { code: 'PY101', title: 'Introduction to Psychology',      description: 'History, major schools, and core concepts of psychology', department: 'Psychology', semester: '1' },
  { code: 'PY102', title: 'English & Academic Writing',      description: 'Academic essay writing and psychological report structure', department: 'Psychology', semester: '1' },
  { code: 'PY103', title: 'Statistics I',                    description: 'Descriptive statistics and probability for psychology', department: 'Psychology', semester: '1' },
  { code: 'PY104', title: 'Philosophy of Mind',              description: 'Consciousness, mental causation, and philosophy-psychology interface', department: 'Psychology', semester: '1' },

  { code: 'PY201', title: 'Developmental Psychology',        description: 'Lifespan development: cognitive, social, and emotional growth', department: 'Psychology', semester: '2' },
  { code: 'PY202', title: 'Research Methods I',              description: 'Experimental design, variables, and psychological research ethics', department: 'Psychology', semester: '2' },
  { code: 'PY203', title: 'Biological Psychology',           description: 'Neurons, the brain, hormones, and behaviour', department: 'Psychology', semester: '2' },
  { code: 'PY204', title: 'Social Psychology',               description: 'Attitudes, conformity, persuasion, and group dynamics', department: 'Psychology', semester: '2' },

  { code: 'PY301', title: 'Cognitive Psychology',            description: 'Perception, memory, attention, language, and problem-solving', department: 'Psychology', semester: '3' },
  { code: 'PY302', title: 'Research Methods II',             description: 'Survey design, qualitative methods, and data coding', department: 'Psychology', semester: '3' },
  { code: 'PY303', title: 'Personality Psychology',          description: 'Trait theories, psychodynamic, humanistic, and social-cognitive approaches', department: 'Psychology', semester: '3' },
  { code: 'PY304', title: 'Statistics II',                   description: 'Inferential statistics, t-tests, ANOVA, and correlation', department: 'Psychology', semester: '3' },

  { code: 'PY401', title: 'Abnormal Psychology',             description: 'Classification, aetiology, and treatment of psychological disorders', department: 'Psychology', semester: '4' },
  { code: 'PY402', title: 'Clinical Psychology I',           description: 'Therapeutic approaches: CBT, psychoanalytic, and humanistic', department: 'Psychology', semester: '4' },
  { code: 'PY403', title: 'Learning & Memory',               description: 'Classical/operant conditioning, memory systems, and forgetting', department: 'Psychology', semester: '4' },
  { code: 'PY404', title: 'Motivation & Emotion',            description: 'Theories of motivation, emotional regulation, and wellbeing', department: 'Psychology', semester: '4' },

  { code: 'PY501', title: 'Counselling Psychology',          description: 'Counselling skills, therapeutic alliance, and brief interventions', department: 'Psychology', semester: '5' },
  { code: 'PY502', title: 'Psychopathology',                 description: 'DSM-5 criteria, differential diagnosis, and case conceptualisation', department: 'Psychology', semester: '5' },
  { code: 'PY503', title: 'Psychological Assessment & Testing', description: 'Intelligence, personality, and neuropsychological assessment tools', department: 'Psychology', semester: '5' },
  { code: 'PY504', title: 'Health Psychology',               description: 'Stress, coping, chronic illness, and behaviour change models', department: 'Psychology', semester: '5' },

  { code: 'PY601', title: 'Organisational Psychology',       description: 'Work motivation, leadership, job satisfaction, and organisational culture', department: 'Psychology', semester: '6' },
  { code: 'PY602', title: 'Forensic Psychology',             description: 'Criminal profiling, eyewitness testimony, and mental health law', department: 'Psychology', semester: '6' },
  { code: 'PY603', title: 'Neuropsychology',                 description: 'Brain-behaviour relationships and neuropsychological rehabilitation', department: 'Psychology', semester: '6' },
  { code: 'PY604', title: 'Child & Adolescent Psychology',   description: 'Childhood disorders, parenting styles, and adolescent identity', department: 'Psychology', semester: '6' },

  { code: 'PY701', title: 'Positive Psychology',             description: 'Happiness, strengths, resilience, and flourishing', department: 'Psychology', semester: '7' },
  { code: 'PY702', title: 'Community Psychology',            description: 'Prevention, empowerment, and community-based mental health', department: 'Psychology', semester: '7' },
  { code: 'PY703', title: 'Multicultural Psychology',        description: 'Culture, ethnicity, gender, and diversity in psychological practice', department: 'Psychology', semester: '7' },
  { code: 'PY704', title: 'Final Year Project I',            description: 'Research proposal, ethics application, and pilot study', department: 'Psychology', semester: '7' },

  { code: 'PY801', title: 'Cross-Cultural Psychology',       description: 'Universal vs. culture-specific psychological processes', department: 'Psychology', semester: '8' },
  { code: 'PY802', title: 'Applied Behaviour Analysis',      description: 'ABA principles, functional assessment, and behaviour intervention plans', department: 'Psychology', semester: '8' },
  { code: 'PY803', title: 'Research Methodology',            description: 'Advanced research design, meta-analysis, and academic writing', department: 'Psychology', semester: '8' },
  { code: 'PY804', title: 'Final Year Project II',           description: 'Data collection, analysis, report writing, and viva voce', department: 'Psychology', semester: '8' },

  // ── Mathematics ──────────────────────────────────────────────────────────
  { code: 'MA101', title: 'Calculus I',                      description: 'Limits, continuity, derivatives, and their applications', department: 'Mathematics', semester: '1' },
  { code: 'MA102', title: 'Linear Algebra I',                description: 'Vectors, matrices, systems of equations, and determinants', department: 'Mathematics', semester: '1' },
  { code: 'MA103', title: 'Introduction to Programming',     description: 'Python for mathematical computation and visualisation', department: 'Mathematics', semester: '1' },
  { code: 'MA104', title: 'English Composition',             description: 'Academic writing for mathematics and scientific communication', department: 'Mathematics', semester: '1' },

  { code: 'MA201', title: 'Calculus II',                     description: 'Integration techniques, sequences, series, and multivariable calculus', department: 'Mathematics', semester: '2' },
  { code: 'MA202', title: 'Linear Algebra II',               description: 'Eigenvalues, diagonalisation, and inner product spaces', department: 'Mathematics', semester: '2' },
  { code: 'MA203', title: 'Discrete Mathematics',            description: 'Logic, sets, combinatorics, graph theory, and number theory', department: 'Mathematics', semester: '2' },
  { code: 'MA204', title: 'Statistics I',                    description: 'Descriptive statistics, probability, and discrete distributions', department: 'Mathematics', semester: '2' },

  { code: 'MA301', title: 'Real Analysis I',                 description: 'Sequences, series, continuity, and differentiation on R', department: 'Mathematics', semester: '3' },
  { code: 'MA302', title: 'Abstract Algebra I',              description: 'Groups, subgroups, cosets, and Lagrange\'s theorem', department: 'Mathematics', semester: '3' },
  { code: 'MA303', title: 'Ordinary Differential Equations', description: 'First and second-order ODEs, systems, and Laplace transforms', department: 'Mathematics', semester: '3' },
  { code: 'MA304', title: 'Statistics II',                   description: 'Continuous distributions, estimation, and hypothesis testing', department: 'Mathematics', semester: '3' },

  { code: 'MA401', title: 'Real Analysis II',                description: 'Riemann integral, metric spaces, and uniform convergence', department: 'Mathematics', semester: '4' },
  { code: 'MA402', title: 'Abstract Algebra II',             description: 'Rings, fields, polynomial rings, and field extensions', department: 'Mathematics', semester: '4' },
  { code: 'MA403', title: 'Numerical Methods',               description: 'Root finding, interpolation, numerical integration, and ODEs', department: 'Mathematics', semester: '4' },
  { code: 'MA404', title: 'Probability Theory',              description: 'Probability spaces, random variables, and limit theorems', department: 'Mathematics', semester: '4' },

  { code: 'MA501', title: 'Complex Analysis',                description: 'Analytic functions, Cauchy\'s theorem, residues, and conformal mapping', department: 'Mathematics', semester: '5' },
  { code: 'MA502', title: 'Topology',                        description: 'Metric spaces, topological spaces, compactness, and connectedness', department: 'Mathematics', semester: '5' },
  { code: 'MA503', title: 'Mathematical Statistics',         description: 'Sufficient statistics, maximum likelihood, and Bayesian estimation', department: 'Mathematics', semester: '5' },
  { code: 'MA504', title: 'Graph Theory',                    description: 'Graphs, trees, connectivity, colouring, and network algorithms', department: 'Mathematics', semester: '5' },

  { code: 'MA601', title: 'Functional Analysis',             description: 'Normed spaces, Banach and Hilbert spaces, and bounded operators', department: 'Mathematics', semester: '6' },
  { code: 'MA602', title: 'Number Theory',                   description: 'Divisibility, congruences, quadratic reciprocity, and cryptographic applications', department: 'Mathematics', semester: '6' },
  { code: 'MA603', title: 'Operations Research',             description: 'Linear programming, simplex method, and game theory', department: 'Mathematics', semester: '6' },
  { code: 'MA604', title: 'Mathematical Modelling',          description: 'Building and analysing mathematical models for real-world problems', department: 'Mathematics', semester: '6' },

  { code: 'MA701', title: 'Partial Differential Equations',  description: 'Heat, wave, and Laplace equations; Fourier methods', department: 'Mathematics', semester: '7' },
  { code: 'MA702', title: 'Optimisation Theory',             description: 'Convex optimisation, KKT conditions, and gradient methods', department: 'Mathematics', semester: '7' },
  { code: 'MA703', title: 'Stochastic Processes',            description: 'Markov chains, Poisson processes, and Brownian motion', department: 'Mathematics', semester: '7' },
  { code: 'MA704', title: 'Final Year Project I',            description: 'Mathematical research proposal, literature review, and problem formulation', department: 'Mathematics', semester: '7' },

  { code: 'MA801', title: 'Differential Geometry',           description: 'Curves, surfaces, curvature, and Riemannian geometry', department: 'Mathematics', semester: '8' },
  { code: 'MA802', title: 'Applied Mathematics',             description: 'Fluid dynamics, elasticity, and mathematical physics', department: 'Mathematics', semester: '8' },
  { code: 'MA803', title: 'Research Methodology',            description: 'Mathematical writing, proof techniques, and publishing in mathematics', department: 'Mathematics', semester: '8' },
  { code: 'MA804', title: 'Final Year Project II',           description: 'Research completion, thesis writing, and oral examination', department: 'Mathematics', semester: '8' },
];

// ─── Seed function ────────────────────────────────────────────────────────────
async function seed() {
  await connectDB();

  // Find or create a system teacher account
  const SYSTEM_EMAIL = 'system.teacher@campuswave.edu.pk';
  let teacher = await User.findOne({ email: SYSTEM_EMAIL });
  if (!teacher) {
    const hash = await bcrypt.hash('SystemTeacher@CW2025!', 12);
    teacher = await User.create({
      fullName:   'System Teacher',
      email:      SYSTEM_EMAIL,
      password:   hash,
      role:       'teacher',
      department: 'General',
      semester:   '1',
      section:    'A',
    });
    console.log('Created system teacher account.');
  }

  let created = 0;
  let skipped = 0;

  for (const c of COURSES) {
    const existing = await Course.findOne({ code: c.code });
    if (existing) { skipped++; continue; }
    await Course.create({ ...c, teacher: teacher._id });
    created++;
  }

  console.log(`Seed complete — ${created} courses created, ${skipped} already existed.`);
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
