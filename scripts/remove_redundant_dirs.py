import shutil
import os

if os.path.exists('src/app/api/cities/[id]'):
    shutil.rmtree('src/app/api/cities/[id]')
    print('[OK] Removed redundant src/app/api/cities/[id]')

if os.path.exists('src/app/api/sports/[id]'):
    shutil.rmtree('src/app/api/sports/[id]')
    print('[OK] Removed redundant src/app/api/sports/[id]')
