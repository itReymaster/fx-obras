import asyncio
from pyppeteer import launch
import ssl
import certifi

async def screenshot():
    browser = await launch({
        'headless': True,
        'args': ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security'],
        'ignoreHTTPSErrors': True
    })
    
    page = await browser.newPage()
    
    # Set insecure flag for self-signed certs
    await page.goto('https://localhost:5175/login', {
        'waitUntil': 'domcontentloaded'
    })
    
    await asyncio.sleep(2)
    
    # Take screenshot
    await page.screenshot({'path': 'app-screenshot.png', 'fullPage': True})
    print('✓ Screenshot salvo: app-screenshot.png')
    
    await browser.close()

# Run
try:
    asyncio.run(screenshot())
except Exception as e:
    print(f'Erro: {e}')
    print('Alternativa: Use seu navegador com HTTPS://192.168.15.7:5175/login')
