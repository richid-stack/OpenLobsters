import os
from playwright.sync_api import sync_playwright
OUT=os.environ.get('SHOTS_OUT','shots'); os.makedirs(OUT, exist_ok=True)
BASE='http://127.0.0.1:3000'
errors=[]
with sync_playwright() as p:
    b=p.chromium.launch()
    def ctx(w,h,scheme,dpr=2):
        c=b.new_context(viewport={'width':w,'height':h},device_scale_factor=dpr,color_scheme=scheme)
        pg=c.new_page()
        pg.on('console',lambda m: errors.append(m.text) if m.type=='error' else None)
        pg.on('pageerror',lambda e: errors.append(str(e)))
        return pg
    pg=ctx(390,844,'light')
    pg.goto(BASE+'/models'); pg.wait_for_selector('text=Bring your own models',timeout=30000); pg.wait_for_timeout(700)
    pg.screenshot(path=f'{OUT}/p1-models-list.png')
    # add a custom provider pointing at the local fake provider
    pg.get_by_text('Add another OpenAI-compatible provider').click()
    pg.get_by_placeholder('Name (for example, Work gateway)').fill('Mock gateway')
    pg.get_by_placeholder('https://your-server.example.com/v1').fill('http://127.0.0.1:4010/v1')
    pg.get_by_role('button',name='Add',exact=True).click()
    pg.get_by_placeholder('Paste your key').fill('test-key')
    pg.get_by_role('button',name='Get models').click()
    pg.wait_for_selector('text=mock-reasoner',timeout=20000)
    pg.get_by_text('mock-reasoner').first.click()
    pg.get_by_role('button',name='Test',exact=True).click()
    pg.wait_for_selector('text=Tool calling',timeout=60000); pg.wait_for_timeout(500)
    pg.screenshot(path=f'{OUT}/p2-connected-and-tested.png')
    # chat through it
    pg.goto(BASE+'/'); pg.wait_for_selector('text=What would you like to get done?',timeout=30000); pg.wait_for_timeout(500)
    pg.screenshot(path=f'{OUT}/p3-chat-model-in-header.png')
    pg.get_by_text('Hello, what can you do?').click()
    pg.wait_for_selector('text=Hello from the mock model.',timeout=30000); pg.wait_for_timeout(900)
    pg.screenshot(path=f'{OUT}/p4-reply-from-real-provider-path.png')
    # model picker
    pg.get_by_label('Choose a model').click(); pg.wait_for_selector('text=Choose a model',timeout=10000); pg.wait_for_timeout(500)
    pg.screenshot(path=f'{OUT}/p5-model-picker.png')
    pg.keyboard.press('Escape'); pg.wait_for_timeout(300)
    # missing-key error path: OpenRouter, a model id by hand, no key
    pg.goto(BASE+'/models'); pg.wait_for_selector('text=Bring your own models',timeout=30000)
    pg.get_by_text('OpenRouter',exact=True).first.click()
    pg.get_by_placeholder('Add a model id by hand').fill('some-lab/some-model')
    pg.get_by_placeholder('Add a model id by hand').press('Enter')
    pg.goto(BASE+'/'); pg.wait_for_selector('text=What would you like to get done?',timeout=30000)
    pg.get_by_text('Hello, what can you do?').click()
    pg.wait_for_selector('text=Add an API key for OpenRouter',timeout=20000); pg.wait_for_timeout(500)
    pg.screenshot(path=f'{OUT}/p6-missing-key-error.png')
    # dark and desktop
    pg2=ctx(390,844,'dark'); pg2.goto(BASE+'/models'); pg2.wait_for_selector('text=Bring your own models',timeout=30000); pg2.wait_for_timeout(600)
    pg2.get_by_text('OpenRouter',exact=True).first.click(); pg2.wait_for_timeout(500)
    pg2.screenshot(path=f'{OUT}/p7-models-dark-open.png')
    pg3=ctx(1280,800,'light',1); pg3.goto(BASE+'/models'); pg3.wait_for_selector('text=Bring your own models',timeout=30000); pg3.wait_for_timeout(600)
    pg3.screenshot(path=f'{OUT}/p8-models-desktop.png')
    print('console errors:',[e for e in errors if 'Failed to load resource' not in e][:6])
    b.close()
