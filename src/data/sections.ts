export type SectionId =
  | "music"
  | "projects"
  | "education"
  | "contact"
  | "experience"
  | "interests";

export interface Section {
  id: SectionId;
  title: string;
  cmd: string;
  accent: string;
  body: string;
}

export const SECTIONS: Record<SectionId, Section> = {
  music: {
    id: "music",
    title: "MUSIC",
    cmd: "cat ~/music.md",
    accent: "#b8302a",
    body: `passion / guitar
────────────────────────────
Acoustic guitar — 6 years.
Fingerpicking, jazz voicings,
slow ballads at 1am.

Currently learning
  · Lover, You Should've Come Over
  · Holocene (open tuning)

On rotation
  · John Mayer · Bon Iver
  · Nick Drake · Phoebe Bridgers`,
  },
  projects: {
    id: "projects",
    title: "PROJECTS",
    cmd: "ls -la ~/projects",
    accent: "#d8d2c4",
    body: `selected work
────────────────────────────
01  portfolio-v2      [active]
02  rubiks-solver     [shipped]
03  run-tracker       [shipped]
04  apollo            [internal]
05  music-tab-gen     [wip]

stack
  React · Next · Node · Python

→ github.com/sah-rohan`,
  },
  education: {
    id: "education",
    title: "EDUCATION",
    cmd: "cat ~/education.md",
    accent: "#c8a85a",
    body: `school
────────────────────────────
B.S. Computer Science
Iowa State University
expected 2027

coursework
  · Algorithms · Systems
  · Databases · Distributed
  · Linear Algebra
  · Software Engineering

honors
  · Dean's List
  · CS scholarship`,
  },
  contact: {
    id: "contact",
    title: "CONTACT",
    cmd: "open contact.app",
    accent: "#7aa8d8",
    body: `get in touch
────────────────────────────
rohan@example.com

github.com/sah-rohan
linkedin.com/in/rohan-sah

open to collabs, coffee,
and interesting problems.`,
  },
  experience: {
    id: "experience",
    title: "EXPERIENCE",
    cmd: "cat ~/work.log",
    accent: "#e0e0e0",
    body: `work history
────────────────────────────
2025  Software Intern
      Apollo · Summer
      embedded · firmware · ml

2024  Research Assistant
      Iowa State CS Lab

2023  Teaching Assistant
      CS 101 · Iowa State

→ resume.pdf`,
  },
  interests: {
    id: "interests",
    title: "INTERESTS",
    cmd: "cat ~/interests.md",
    accent: "#6dbf7a",
    body: `outside the screen
────────────────────────────
running
  · 5K PR     22:14
  · half PR   1:54:30
  · ankeny trail regular

rubik's cube
  · 3x3 avg   28s
  · learning OLL

reading
  · Calvino · Murakami
  · Hofstadter

building little things
that don't have to ship.`,
  },
};
