export type SectionId =
  | "music"
  | "projects"
  | "education"
  | "contact"
  | "experience"
  | "interests"
  | "nowplaying"
  | "skills"
  | "journal"
  | "sports";

export interface Section {
  id: SectionId;
  title: string;
  cmd: string;
  accent: string;
  body: string;
}

export const SECTIONS: Record<SectionId, Section> = {
  // ─── SKILLS (mouse) ─── shaped like a Rohan.json file ───
  skills: {
  id: "skills",
  title: "SKILLS",
  cmd: "cat ~/Rohan.json",
  accent: "#7aa8d8",
  body: `software engineering
────────────────────────────
languages
  · TypeScript   · JavaScript
  · Python       · Java
  · Swift        · Go
  · Rust         · C / C++
  · SQL / NoSQL

frameworks & libraries
  · React        · Next.js
  · Node.js      · Express.js
  · Spring Boot  · PyTorch

cloud & devops
  · AWS          · Azure
  · Terraform    · GitHub Actions
  · Jenkins

currently obsessed with
  · distributed systems
  · scalable system design
  · making things fast`,
},

  

  // ─── MUSIC (tiny guitar) ─── currently playing + influences ───
  music: {
    id: "music",
    title: "MUSIC",
    cmd: "cat ~/music.md",
    accent: "#b8302a",
    body: `i play / i make
────────────────────────────
guitar · piano · singing · songwriting

on heavy rotation lately
  · Tracy Chapman    — Fast Car
  · Bazzi            — Beautiful

who i grew up on
  · Shawn Mendes
  · Justin Bieber
  · Michael Jackson
  · Tracy Chapman

→ click the headphones to hear the song 
  I'm listening to`,
  },

  // ─── PROJECTS (macbook) ─── full project list ───
    projects: {
    id: "projects",
    title: "PROJECTS",
    cmd: "ls -la ~/projects",
    accent: "#d8d2c4",
    body: `selected work
────────────────────────────
something's brewing
  the most excited I've been about anything I've built.
  agentic AI · hardware · software
 
open source
────────────────────────────
Apple FoundationDB  ·  PR #13241
  Added type annotations to the fdb Python bindings
  (~300 lines changed across 4 files).
  Python · Typing · Open Source
  → github.com/apple/foundationdb/pull/13241
 
Apache Beam  ·  merged
  Documentation improvements to apache/beam main.
  Open Source · Documentation
 
Meta Pyrefly  ·  in progress
  Contributing to Meta's Rust-based Python type checker.
  Rust · Python · Compilers · Open Source
 
personal
────────────────────────────
Kronos  
  Real-time group LeetCode tracker — season leaderboards,
  friend feeds, streak calendars, and solution viewing.
  React · TypeScript · Go · AWS · Postgres · Terraform
  → usekronos.tech

Grover's Algorithm SAT Solver
  Quantum 3-SAT solver using Grover's algorithm with
  phase-kickback oracles and amplitude amplification.
  Python · Qiskit · Quantum Algorithms

Distributed KV Store
  Fault-tolerant distributed key-value store with
  consensus and replication.
  Go · Distributed Systems · Raft

Federated Learning Platform
  Privacy-preserving federated ML across edge devices.
  Rust · C++ · Python · PyTorch · Prometheus · Distributed Systems

LeetCode Tracker
  AI-powered tracker w/ leaderboard + personalized challenges
  (200+ visits · 28+ problems solved by users).
  TypeScript · React · MongoDB · Clerk · Gemini · LeetCode API

AI Polls
  AI-powered voting platform with RAG chatbot + custom email auth.
  SpringBoot · OpenAI · ONNX · Git · System Design · SQL

PremierCashBack
  AI-driven credit card cashback optimizer.
  React · React Native · Tailwind · ClerkAPI · StripeAPI · Postgres · OpenAI

Precision Project Pilot
  Tool that helps engineers scope projects by generating
  structured, high-quality AI prompts from requirements.
  TypeScript · React · OpenAI

RAG RMP
  Rate My Professor RAG assistant for ISU —
  semantic search over professor reviews with LLM-powered Q&A.
  Python · RAG · Pinecone · OpenAI
 
FDA API  ·  Ivy College of Business
  Internal tool for bulk FDA data retrieval —
  built for a professor's business research.
  React · Python · Data Engineering
 
MemoraAI
  AI-powered flashcard platform.
  React · Next.js · OpenAI · Tailwind · Clerk · Stripe · Firebase
 
Asteroid Detection
  NASA-classified NEO tracker with RAG-powered space hazard insights.
  React · Next.js · NASA API · MUI · OpenAI · Pinecone · Python
 
MongoScraper
  Web scraper persisting URL data into MongoDB for API-free dev.
  React · Node.js · MongoDB · Puppeteer
 
CS 362 (OOAD) Capstone
  40+ exhaustive use cases + custom JSON parser to model a university.
  Java · Agile · UML · System Design · Git
 
→ github.com/sah-rohan`,
  },

  // ─── EDUCATION (bookshelf) ─── ISU + coursework ───
  education: {
    id: "education",
    title: "EDUCATION",
    cmd: "cat ~/education.md",
    accent: "#c8a85a",
    body: `Iowa State University
Aug 2023 – May 2027
────────────────────────────
B.S. Computer Science
Minor in Applied Mathematics

Coursework
  Math 2650  Multivariable Calculus
  Math 2670  Differential Equations
  COMS 2270  Object-Oriented Programming
  COMS 2280  Data Structures
  COMS 2300  Discrete Math for Computing
  COMS 3090  Software Development Practices
  COMS 3110  Analysis of Algorithms
  COMS 3190  User Interfaces
  COMS 3210  Computer Architecture & Org
  COMS 3270  Advanced C / C++
  COMS 3310  Theory of Computing
  COMS 3420  Principles of Programming Languages
  COMS 3520  Operating Systems
  COMS 3620  Object-Oriented Analysis & Design
  COMS 3630  Introduction to Databases
  COMS 4190  Software Testing
  COMS 4020  Senior Design w/ Business Client
  COMS 4540  Distributed Systems`
  ,
  },
experience: {
  id: "experience",
  title: "EXPERIENCE",
  cmd: "cat ~/work.log",
  accent: "#e0e0e0",
  body: `work history
────────────────────────────
John Deere                                Present
  Student Software Engineer
  🚜  Full-stack SWE at John Deere Financial
  TypeScript · React · Next.js · AWS · DynamoDB · PostgreSQL
  Prisma · Express.js · Terraform · Jenkins · Jest · Python

UCSF                                      Present
  Undergraduate Research Assistant
  🩺  Digital twins for healthcare + semi-automated meta-analysis
  Python · Azure OpenAI · GCP · Pinecone · scikit-learn · NumPy

Indu Sah Foundation                       Present
  Founding Software Engineer (Solo)
  🌏  Built and own the entire codebase (~16.2k lines) for a
      Nepalese-American humanitarian non-profit.
  → indusahfoundation.org
  Go · Gin · React · PostgreSQL · Redis · Terraform · Azure · Stripe

Ivy College of Business                   Fall 24 / Spring 25
  Software Engineering Research Assistant
  🧳  Full-stack SWE + research for public-good business initiatives
  Java · Spring Boot · React · Next.js · MongoDB

Iowa State University                     Spring 25
  Undergraduate Teaching Assistant
  📚  TA for CS 1270 — Python problem solving
  Python

Senate Campaign                           Summer 24
  Data Science Intern
  📊  Built historic voter data automation software
  JavaScript · Excel

Iowa State University                     Fall 23 / Spring 24
  Undergraduate Research Assistant
  🛰️  LiDAR sensor defense via deep learning
  Python · PyTorch · Jupyter

MindZone Learning                         Summer 22 / Summer 23
  Academic Tutor
  📝  Math · reading · science`,
},

  // ─── CONTACT (phone) ───
  contact: {
    id: "contact",
    title: "CONTACT",
    cmd: "open contact.app",
    accent: "#7aa8d8",
    body: `get in touch
────────────────────────────
email     rohan.k.sah@gmail.com
github    github.com/sah-rohan
linkedin  linkedin.com/in/rohan-sah

open to collabs, coffee chats,
and interesting opportunities.`,
  },

  // ─── INTERESTS (shoes) ───
  interests: {
    id: "interests",
    title: "INTERESTS",
    cmd: "cat ~/interests.md",
    accent: "#6dbf7a",
    body: `outside the screen
────────────────────────────
running
  · 5K PR     17:00

rubik's cube
  · 3×3 best  28s

reading right now
  · System Design Interview — Alex Xu
  · The Let Them Theory     — Mel Robbins

building little things
that don't have to ship.`,
  },

  // ─── MANIFESTATION JOURNAL (notebook on desk) ───
  journal: {
    id: "journal",
    title: "MANIFESTATION JOURNAL",
    cmd: "cat ~/journal.md",
    accent: "#d4a060",
    body: `quiet bets on the future
  ────────────────────────────
  software
    · ship infrastructure real engineers
      rely on without knowing my name
    · contribute to 6 open-source projects
      used by thousands this summer
    · grow into an engineer who consistently
      builds low-latency tools that scale
    · build a unicorn 

  music
    · finish recording a small EP
    · write one song that gets someone
      through a hard night
    · play a live set somewhere that
      actually means something to me
    · keep learning piano voicings /
      every week

  life
    · run a sub-3 marathon
    · crack sub-20s on the cube
    · read more than I scroll
    · be the kind of person my
      younger self would have looked up to`,
  },

  // ─── SPORTS (tennis racket) — personal takes & GOATs ───
  sports: {
    id: "sports",
    title: "SPORTS",
    cmd: "cat ~/sports.md",
    accent: "#e0a44a",
    body: `hot takes & GOATs
────────────────────────────
tennis
  · favorite       Carlos Alcaraz
  · GOAT           Roger Federer
  · best forehand  Rafa Nadal

football (soccer)
  · favorite       Lionel Messi
  · world cup pick Argentina (back-to-back)
  · dark horse     Brazil

basketball
  · GOAT           Michael Jordan
  · current king   Nikola Jokić
  · favorite       Stephen Curry

other
  · running heroes Kipchoge · Hassan`,
  },

  // ─── NOW PLAYING (headphones) — live Spotify integration ───
  nowplaying: {
    id: "nowplaying",
    title: "NOW PLAYING",
    cmd: "spotify --now-playing",
    accent: "#1db954",
    // Modal renders a custom UI; this is just terminal-typing fallback.
    body: `── currently listening ──
[ track ]   Fast Car
[ artist ]  Tracy Chapman
[ album ]   Tracy Chapman
[ state ]   ▶ playing

(Spotify Web API integration
 pending — drop SPOTIFY_CLIENT_ID,
 SPOTIFY_CLIENT_SECRET, and
 SPOTIFY_REFRESH_TOKEN into .env.local
 and the modal goes live.)`,
  },
};


