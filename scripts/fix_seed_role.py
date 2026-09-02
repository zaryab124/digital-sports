import os

with open('prisma/seed.ts', 'r', encoding='utf-8') as f:
    code = f.read()

code = code.replace(
    "create: { name: code.replace(/_/g, ' '), code },",
    "create: { name: code.replace(/_/g, ' '), code, description: `${code.replace(/_/g, ' ')} Role` },"
)

with open('prisma/seed.ts', 'w', encoding='utf-8') as f:
    f.write(code)

print('[OK] Updated prisma/seed.ts role create')
