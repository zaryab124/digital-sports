import sys, os, base64

if len(sys.argv) < 3:
    print('Usage: writer.py <file_path> <b64_content>')
    sys.exit(1)

path = sys.argv[1]
b64_data = sys.argv[2]
content = base64.b64decode(b64_data.encode('utf-8')).decode('utf-8')

os.makedirs(os.path.dirname(path), exist_ok=True)
with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print('Successfully wrote:', path)
