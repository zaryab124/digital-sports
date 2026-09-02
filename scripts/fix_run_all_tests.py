import os

with open('tests/run-all-tests.ts', 'r', encoding='utf-8') as f:
    code = f.read()

code = code.replace(
    "assert(canManageCity(verifyToken(jampurToken)!, jampur!.id), 'City Admin has management privileges for assigned city');",
    "assert(await canManageCity(verifyToken(jampurToken)!, jampur!.id), 'City Admin has management privileges for assigned city');"
)

with open('tests/run-all-tests.ts', 'w', encoding='utf-8') as f:
    f.write(code)

print('[OK] Updated tests/run-all-tests.ts')
