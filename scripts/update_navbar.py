import os

with open('src/components/layout/Navbar.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

old_nav = """        {/* Navigation Links */}
        <nav className="hidden md:flex items-center space-x-6 text-sm font-medium text-slate-300">
          <Link href="/matches" className="hover:text-emerald-400 transition">Fixtures & Scores</Link>
          <Link href="/teams" className="hover:text-emerald-400 transition">Teams</Link>
          <Link href="/rankings" className="hover:text-emerald-400 transition">Leaderboards</Link>
          <Link href="/transfers" className="hover:text-emerald-400 transition">Transfers</Link>
          {user && (
            <Link href="/dashboard" className="text-emerald-400 font-semibold hover:text-emerald-300 transition">
              Dashboard
            </Link>
          )}
        </nav>"""

new_nav = """        {/* Navigation Links */}
        <nav className="hidden md:flex items-center space-x-5 text-xs font-semibold text-slate-300">
          <Link href="/cities" className="hover:text-emerald-400 transition">Cities</Link>
          <Link href="/sports" className="hover:text-emerald-400 transition">Sports</Link>
          <Link href="/matches" className="hover:text-emerald-400 transition">Fixtures</Link>
          <Link href="/teams" className="hover:text-emerald-400 transition">Teams</Link>
          <Link href="/rankings" className="hover:text-emerald-400 transition">Leaderboards</Link>
          <Link href="/transfers" className="hover:text-emerald-400 transition">Transfers</Link>
          {user && (
            <Link href="/dashboard" className="text-emerald-400 font-bold hover:text-emerald-300 transition">
              Dashboard
            </Link>
          )}
        </nav>"""

code = code.replace(old_nav, new_nav)

with open('src/components/layout/Navbar.tsx', 'w', encoding='utf-8') as f:
    f.write(code)

print('[OK] Updated Navbar with Cities and Sports links')
