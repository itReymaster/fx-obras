import urllib.request, ssl, urllib.error

ssl._create_default_https_context = ssl._create_unverified_context

# Test HTTPS
try:
    response = urllib.request.urlopen('https://localhost:5175/', timeout=3)
    print(f'✓ HTTPS Working (Status: {response.status})')
except Exception as e:
    print(f'✗ HTTPS Error: {type(e).__name__}')

# Test HTTP  
try:
    response = urllib.request.urlopen('http://localhost:5175/', timeout=3)
    print(f'✓ HTTP Working (Status: {response.status})')
except Exception as e:
    print(f'✗ HTTP Error: {type(e).__name__}')
