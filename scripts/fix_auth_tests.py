import os

with open('tests/test-auth-rbac.ts', 'r', encoding='utf-8') as f:
    code = f.read()

code = code.replace(
    "assert(updatedProfile?.bio?.includes('Provincial tournament finalist'), 'Player bio updated successfully');",
    "assert(Boolean(updatedProfile?.bio?.includes('Provincial tournament finalist')), 'Player bio updated successfully');"
)

with open('tests/test-auth-rbac.ts', 'w', encoding='utf-8') as f:
    f.write(code)

print('[OK] Updated tests/test-auth-rbac.ts')
