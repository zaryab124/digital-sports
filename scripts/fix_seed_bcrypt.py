import os

with open('prisma/seed.ts', 'r', encoding='utf-8') as f:
    code = f.read()

code = code.replace("import bcrypt from 'bcrypt';", "import bcrypt from 'bcryptjs';")

with open('prisma/seed.ts', 'w', encoding='utf-8') as f:
    f.write(code)

print('[OK] Updated prisma/seed.ts import to bcryptjs')
