with open(r'c:\Projects\ForensicToolProject\api.py', 'r', encoding='utf-8') as f:
    for i, line in enumerate(f, 1):
        for char in line:
            if ord(char) > 127:
                print(f"Line {i}: {char!r} in {line.strip()}")
                break
