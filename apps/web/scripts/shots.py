from playwright.sync_api import sync_playwright
import os
OUT=os.environ.get('SHOTS_OUT','shots'); os.makedirs(OUT,exist_ok=True)
errors=[]
def run_flow(pg, prefix, deny=False):
    pg.goto('http://127.0.0.1:3000/'); pg.wait_for_selector('text=What would you like to get done?',timeout=30000); pg.wait_for_timeout(700)
    pg.screenshot(path=f'{OUT}/{prefix}-home.png')
    pg.get_by_text('Summarise my sales and make me a workbook').click()
    pg.wait_for_timeout(1900); pg.screenshot(path=f'{OUT}/{prefix}-reasoning-streaming.png')
    pg.wait_for_selector('text=Allow OpenLobs to create the workbook?',timeout=30000); pg.wait_for_timeout(700)
    pg.screenshot(path=f'{OUT}/{prefix}-approval-requested.png')
    if deny:
        pg.get_by_role('button',name='Deny').click()
        pg.wait_for_selector('text=nothing was written to your computer',timeout=30000); pg.wait_for_timeout(1500)
        pg.screenshot(path=f'{OUT}/{prefix}-denied.png'); return
    pg.get_by_role('button',name='Allow once').click()
    pg.wait_for_selector('text=Your workbook is ready',timeout=30000); pg.wait_for_timeout(2000)
    pg.screenshot(path=f'{OUT}/{prefix}-verified-and-answer.png')
with sync_playwright() as p:
    b=p.chromium.launch()
    def ctx(w,h,scheme,dpr=2):
        c=b.new_context(viewport={'width':w,'height':h},device_scale_factor=dpr,color_scheme=scheme)
        pg=c.new_page()
        pg.on('console',lambda m: errors.append(m.text) if m.type=='error' else None)
        pg.on('pageerror',lambda e: errors.append(str(e)))
        return pg
    run_flow(ctx(390,844,'light'),'m-light')
    run_flow(ctx(390,844,'dark'),'m-dark')
    run_flow(ctx(390,844,'light'),'m-light-deny',deny=True)
    # desktop
    pg=ctx(1280,800,'light',1)
    pg.goto('http://127.0.0.1:3000/'); pg.wait_for_selector('text=What would you like to get done?',timeout=30000); pg.wait_for_timeout(700)
    pg.screenshot(path=f'{OUT}/d-light-home.png')
    pg.get_by_text('Summarise my sales and make me a workbook').click()
    pg.wait_for_selector('text=Allow OpenLobs to create the workbook?',timeout=30000); pg.wait_for_timeout(600)
    pg.screenshot(path=f'{OUT}/d-light-approval.png')
    # icons page
    pg=ctx(390,844,'light'); pg.goto('http://127.0.0.1:3000/icons'); pg.wait_for_selector('text=OpenLobs set',timeout=30000); pg.wait_for_timeout(600)
    pg.screenshot(path=f'{OUT}/m-light-icons.png',full_page=False)
    pg=ctx(390,844,'dark'); pg.goto('http://127.0.0.1:3000/icons'); pg.wait_for_selector('text=OpenLobs set',timeout=30000); pg.wait_for_timeout(600)
    pg.screenshot(path=f'{OUT}/m-dark-icons.png')
    print('console errors:',errors[:6])
    b.close()
