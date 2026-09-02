import os

def w(p, c):
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, 'w', encoding='utf-8') as f:
        f.write(c.strip() + '\n')
    print('[OK] Generated:', p)
