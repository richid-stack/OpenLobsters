import os
from playwright.sync_api import sync_playwright
OUT=os.environ.get('SHOTS_OUT','shots'); os.makedirs(OUT, exist_ok=True); BASE='http://127.0.0.1:3000'; errors=[]
with sync_playwright() as p:
    b=p.chromium.launch()
    def ctx(w,h,scheme,dpr=2):
        c=b.new_context(viewport={'width':w,'height':h},device_scale_factor=dpr,color_scheme=scheme); pg=c.new_page()
        pg.on('console',lambda m: errors.append(m.text) if m.type=='error' else None); pg.on('pageerror',lambda e: errors.append(str(e))); return pg
    def setup(pg):
        pg.goto(BASE+'/models'); pg.wait_for_selector('text=Bring your own models',timeout=30000)
        pg.get_by_text('OpenRouter',exact=True).first.click()
        pg.get_by_placeholder('Paste your key').fill('test-key')
        pg.get_by_placeholder('https://.../v1').fill('http://127.0.0.1:4010/or/v1')
        pg.get_by_role('button',name='Get models').click(); pg.wait_for_selector('text=anthropic/claude-sample',timeout=20000); pg.wait_for_timeout(400)
    pg=ctx(390,844,'light'); setup(pg)
    pg.get_by_placeholder('Search models').scroll_into_view_if_needed(); pg.wait_for_timeout(300)
    pg.screenshot(path=f'{OUT}/b1-models-with-logos-light.png')
    pg.get_by_text('anthropic/claude-sample').first.click()
    pg.goto(BASE+'/'); pg.wait_for_selector('text=What would you like to get done?',timeout=30000); pg.wait_for_timeout(500)
    pg.screenshot(path=f'{OUT}/b2-chat-picker-in-message-box.png')
    pg.get_by_text('Hello, what can you do?').click(); pg.wait_for_selector('text=Hello from the mock model.',timeout=30000); pg.wait_for_timeout(900)
    pg.screenshot(path=f'{OUT}/b3-chat-reply-flat.png')
    pg.get_by_label('Choose a model').click(); pg.wait_for_selector('text=Choose a model',timeout=10000); pg.wait_for_timeout(500)
    pg.screenshot(path=f'{OUT}/b4-picker-with-logos-light.png'); pg.keyboard.press('Escape')
    pg2=ctx(390,844,'dark'); setup(pg2)
    pg2.get_by_placeholder('Search models').scroll_into_view_if_needed(); pg2.wait_for_timeout(300)
    pg2.screenshot(path=f'{OUT}/b5-models-with-logos-dark.png')
    pg2.get_by_text('openai/gpt-sample').first.click()
    pg2.goto(BASE+'/'); pg2.wait_for_selector('text=What would you like to get done?',timeout=30000)
    pg2.get_by_label('Choose a model').click(); pg2.wait_for_selector('text=Choose a model',timeout=10000); pg2.wait_for_timeout(500)
    pg2.screenshot(path=f'{OUT}/b6-picker-with-logos-dark.png')
    print('console errors:',[e for e in errors if 'Failed to load resource' not in e][:6]); b.close()
