# digital-sports

🏆 **Digital Sports Community Platform** - Multi-city sports ecosystem, team management, real-time match scheduling, official digital scorebook, player transfer market, dynamic rankings, and municipal community hubs.

## 🚀 Key Features

- **Multi-Role Authentication & RBAC**: Granular roles (Super Admin, Regional Admin, City Admin, Certified Official, Captain, Player, Fan) with geographic municipal boundaries.
- **Dynamic City & Sports Ecosystem**: Multi-city hubs (Jampur, Dera Ghazi Khan, Rajanpur, Taunsa, Multan, Muzaffargarh, Layyah) and dynamic sport directories (Cricket, Football, Volleyball, Badminton, Table Tennis, Snooker).
- **Squad Management & Registration**: Roster enrollment wizard, Rs. 1,000 yearly team fee, payment receipt verification desk, permanent historical alumni records (`FORMER` status).
- **Player Transfer Market**: 8-stage transfer lifecycle with Rs. 100 transfer fee, release NOC, receiving captain acceptance, admin roster migration, anti-dual-membership enforcement.
- **Real-Time Match Scheduling**: Match challenge proposals, dual captain agreement negotiation, municipal admin sanctioning, and multi-view schedules.
- **Official Digital Scorebook**: Mobile-optimized score touchpad for 6 sports, ball-by-ball / goal-by-goal event logging, pre-match toss verification, and permanent result locking.
- **Automated Statistics & Ranking Engine**: Recalculates stats from locked official matches only, algorithmic tier promotions (`DEVELOPING`, `INTERMEDIATE`, `ADVANCED`, `EXCELLENT`, `ELITE`), municipal and regional leaderboards.
- **Municipal Community Layer**: City news feed, upcoming fixtures, recent results, victory photo showcase, photo moderation, and city switcher.
- **Super Admin Control Center**: 13 real-time dashboard metrics, 13 administrative modules, dynamic fee and ranking rule configurations with zero hardcoding.
- **Real-Time Notification & SSE Engine**: Server-Sent Events stream (`/api/realtime`), 14 persistent notification models, notification bell with unread counters, and live scoreboard widgets.

## 🛠 Tech Stack

- **Framework**: Next.js 14 (App Router, Server Components & Dynamic Route Handlers)
- **Database & ORM**: SQLite / PostgreSQL with Prisma ORM
- **Styling**: Tailwind CSS & Lucide Icons
- **Authentication**: Bcrypt (cost 12), JWT Session Tokens, RBAC Authorization Matrix
- **Real-Time**: Native Server-Sent Events (SSE) & In-Memory Event Bus

## 🧪 Testing & Verification

```bash
# Run all automated test suites (320 tests, 100% pass)
npx tsx tests/run-all-tests.ts

# Production build
npm run build
```

## 📦 Getting Started

```bash
# Install dependencies
npm install

# Initialize database
npx prisma db push
npx tsx prisma/seed.ts

# Start development server
npm run dev
```
