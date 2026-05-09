# StackMate 🤝
> Find your perfect coding partner — built for college students.

**Live Demo:** [Coming soon — deploying in Week 7]  
**Built by:** [Krish Jaiswal]

---

## 🚨 The Problem

College students who want to participate in hackathons and coding events often form mismatched teams — not because they lack skills, but because there's no structured way to find a partner whose skills complement theirs, whose goals align, and who learns at a compatible pace. They rely on random WhatsApp messages or asking friends, which leads to one person doing all the work while the other feels lost and disengaged. StackMate solves this by matching students on what actually matters: what they know, what they're learning, what they want to build, and how they work.

---

## 💡 The Solution

StackMate is a web application that matches college students with the right coding partner
based on what actually matters:

- **Complementary skills** — what you know vs. what they're learning
- **Aligned goals** — hackathon, internship, side project, or startup
- **Work style** — hours per week, sync vs async collaboration
- **Year proximity** — 1st year students have different needs than final year
- **Project interests** — Web, AI/ML, Mobile, IoT, and more

---

## 🔍 Why Not LinkedIn or Devpost?

| Platform | What it does | What's missing |
|---|---|---|
| LinkedIn | Professional network, showcase achievements | General purpose, no partner suggestions, not learning-focused |
| Devpost | Lists hackathons | No skill-based matching, can't find partners |
| WhatsApp/Discord | Post "looking for team" | Random, no profile, no matching — pure luck |

StackMate is the **only platform built specifically for student-to-student
skill-complementary matching.**

---

## ⚙️ Tech Stack

| Layer | Technology | Why I chose it |
|---|---|---|
| Frontend | HTML, CSS, Vanilla JavaScript | Full control, no framework overhead |
| Backend | Node.js + Express.js | Fast, lightweight, great for REST APIs |
| Database | MongoDB + Mongoose | Flexible schema for evolving user profiles |
| Auth | JWT (JSON Web Tokens) | Stateless, secure, industry standard |
| Real-time | Socket.io | WebSocket-based chat (in progress) |

---

## ✅ Features

### MVP (Complete)
- [x] Student registration and login with JWT authentication
- [x] 5-step structured onboarding (role, academic info, skills, goals, work style)
- [x] Smart 5-factor matching algorithm (scores partners out of 100)
- [x] Connection system with a max of 3 meaningful partnerships
- [x] Match score breakdown (skills, goals, interests, work style, year)
- [x] Incoming connection requests with accept/decline
- [x] Profile viewing and editing

### In Progress
- [ ] Real-time chat between connected partners (Socket.io)
- [ ] AI-generated match explanation (Gemini API)
- [ ] "Looking Now" availability pulse mode

### Future Features
- [ ] GitHub profile integration (validate skills with real project data)
- [ ] Skill gap analysis for connected teams
- [ ] Mobile app

---

## 🧠 Matching Algorithm

Each potential partner is scored out of **100 points** across 5 factors:

| Factor | Points | Logic |
|---|---|---|
| Complementary Skills | 30 | What you're learning = what they know (and vice versa) |
| Goal Alignment | 25 | Same short-term and long-term goals |
| Project Interests | 20 | Overlap in interest areas (Web, AI/ML, etc.) |
| Work Style | 15 | Availability hours + sync/async preference |
| Year Proximity | 10 | Same or adjacent year of study |

> **Design decision:** We match on *complementary* skills, not identical skills.
> Two people who know the same things build the same product. Two people who
> complement each other build something neither could alone.

---

## 🚀 How to Run Locally

### Prerequisites
- Node.js (v18+)
- MongoDB running locally OR a MongoDB Atlas connection string

### Steps

```bash
# 1. Clone the repository
git clone https://github.com/KJEmpireE07/stackmate.git
cd stackmate

# 2. Install dependencies
npm install

# 3. Create a .env file
cp .env.example .env
# Then edit .env with your values

# 4. Start the development server
npm run dev
```

Open `http://localhost:3000` in your browser.

### Environment Variables

```
PORT=3000
MONGO_URI=mongodb://localhost:27017/stackmate2
JWT_SECRET=your_secret_key_here
```

---

## 📁 Project Structure

```
stackmate/
├── server.js              # Express app entry point
├── middleware/
│   └── auth.js            # JWT authentication guard
├── models/
│   ├── User.js            # Student profile schema
│   └── Connection.js      # Partner connection model
├── routes/
│   ├── auth.js            # Register & login
│   ├── onboarding.js      # Save onboarding profile
│   ├── match.js           # Matching algorithm
│   ├── profile.js         # View & edit profiles
│   └── connect.js         # Send, accept, reject connections
└── public/
    ├── index.html         # Landing page
    ├── auth.html          # Login / Sign up
    ├── onboarding.html    # 5-step onboarding
    ├── dashboard.html     # Match discovery
    ├── profile.html       # Your profile
    └── partner.html       # View a partner's profile
```

---

## 📖 Development Notes

I chose JWT over sessions because it keeps the server lightweight — 
instead of storing session data, the server issues a signed token to 
the user's browser. On every request, the server just verifies the 
signature. No memory, no database lookup needed.

I capped connections at 3 to keep partnerships intentional. Without 
a limit, users would connect with everyone they see, which turns 
StackMate into just another networking app. 3 forces you to choose 
who you actually want to build with.


---

## 🔮 What I Learned Building This

Before this project, I had never built a full-stack web application. 
Building StackMate introduced me to REST API design, JWT authentication, 
and MongoDB. The biggest shift in thinking was understanding how the 
frontend and backend communicate through API calls — something I now 
see in every web app I use.

---

## 📬 Contact

Krish Jaiswal — kajejaiswal@gmail.com

Project Link: https://github.com/KJEmpireE07/stackmate
