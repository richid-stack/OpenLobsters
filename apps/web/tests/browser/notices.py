import os, re
from playwright.sync_api import sync_playwright
OUT=os.environ.get('SHOTS_OUT','shots'); os.makedirs(OUT, exist_ok=True)
BASE=os.environ.get('OPENLOBS_URL','http://localhost:3000')
errors=[]; checks=[]
def ok(name, cond, extra=''):
    checks.append((name, bool(cond))); print(('PASS ' if cond else 'FAIL ')+name+(f'  [{extra}]' if (extra and not cond) else ''))
with sync_playwright() as p:
    b=p.chromium.launch()
    def ctx(w=390,h=844,scheme='light',dpr=2):
        c=b.new_context(viewport={'width':w,'height':h},device_scale_factor=dpr,color_scheme=scheme); pg=c.new_page()
        pg.on('console',lambda m: errors.append(m.text) if m.type=='error' else None); pg.on('pageerror',lambda e: errors.append(str(e))); return pg
    notice=lambda pg: pg.locator('[data-status-notice]')
    def missing_key(pg):
        pg.goto(BASE+'/models'); pg.wait_for_selector('text=Bring your own models',timeout=30000)
        pg.get_by_text('OpenRouter',exact=True).first.click()
        pg.get_by_placeholder('Add a model id by hand').fill('some-lab/some-model'); pg.get_by_placeholder('Add a model id by hand').press('Enter')
        pg.goto(BASE+'/'); pg.wait_for_selector('text=What would you like to get done?',timeout=30000)
        pg.get_by_text('Hello, what can you do?').click()
    # ---- an error takes the place of the status line ----
    pg=ctx(); missing_key(pg)
    notice(pg).wait_for(timeout=20000); pg.wait_for_timeout(500)
    ok('the error appears as one block above the message box', notice(pg).count()==1)
    ok('it says what happened in plain words, as properly spaced sentences', 'That did not work. Add an API key for OpenRouter' in notice(pg).inner_text())
    ok('it is announced to screen readers as an alert', notice(pg).get_attribute('role')=='alert')
    ok('the normal status line is not shown at the same time', pg.locator('[data-status-line]').count()==0)
    ok('there is no second, separate error block', pg.get_by_text('That did not work').count()==1)
    ok('it offers Try again and Models as plain text buttons', notice(pg).get_by_role('button',name='Try again').is_visible() and notice(pg).get_by_role('button',name='Models').is_visible())
    pg.screenshot(path=f'{OUT}/n1-error-in-the-line.png')
    notice(pg).get_by_role('button',name='Try again').click(); pg.wait_for_timeout(1500)
    ok('Try again sends the request again (and, with the key still missing, fails the same way)', notice(pg).count()==1 and 'Add an API key' in notice(pg).inner_text())
    notice(pg).get_by_label('Dismiss').click(); pg.wait_for_timeout(400)
    ok('Dismiss clears it', notice(pg).count()==0)
    pg.get_by_placeholder('Ask OpenLobs to do something').fill('hi'); pg.keyboard.press('Enter'); notice(pg).wait_for(timeout=20000)
    notice(pg).get_by_role('button',name='Models').click(); pg.wait_for_url(re.compile(r'/models$'),timeout=10000)
    ok('the Models action takes you to Models', pg.url.rstrip('/').endswith('/models'))
    # ---- a model that cannot use tools: a quiet note, only when nothing else is going on ----
    pn=ctx(); pn.goto(BASE+'/models'); pn.wait_for_selector('text=Bring your own models',timeout=30000)
    pn.get_by_text('OpenRouter',exact=True).first.click(); pn.get_by_placeholder('Paste your key').fill('test-key'); pn.get_by_placeholder('https://.../v1').fill('http://127.0.0.1:4010/or/v1')
    pn.get_by_role('button',name='Get models').click(); pn.wait_for_selector('text=mistralai/mistral-sample',timeout=20000)
    pn.get_by_text('mistralai/mistral-sample').first.click()
    pn.goto(BASE+'/'); pn.wait_for_selector('text=What would you like to get done?',timeout=30000); notice(pn).wait_for(timeout=10000); pn.wait_for_timeout(400)
    ok('a chat-only model shows a note before you send anything', 'cannot use tools' in notice(pn).inner_text())
    ok('the note is information, not an alarm', notice(pn).get_attribute('role')=='status' and notice(pn).get_by_label('Dismiss').count()==0)
    pn.screenshot(path=f'{OUT}/n2-chat-only-note.png')
    pn.get_by_text('Hello, what can you do?').click(); pn.wait_for_selector('text=Hello from the mock model.',timeout=30000); pn.wait_for_timeout(900)
    ok('after the reply the note is back, and it is still just one line', notice(pn).count()==1 and pn.locator('[data-status-line]').count()==0)
    notice(pn).get_by_role('button',name='Change model').click(); pn.wait_for_url(re.compile(r'/models$'),timeout=10000)
    ok('Change model takes you to Models', pn.url.rstrip('/').endswith('/models'))
    # ---- dark and desktop ----
    pd=ctx(scheme='dark'); missing_key(pd); notice(pd).wait_for(timeout=20000); pd.wait_for_timeout(400); pd.screenshot(path=f'{OUT}/n3-error-dark.png')
    pk=ctx(1280,800,'light',1); missing_key(pk); notice(pk).wait_for(timeout=20000); pk.wait_for_timeout(400); pk.screenshot(path=f'{OUT}/n4-error-desktop.png')
    ok('no horizontal scrolling', pg.evaluate("document.documentElement.scrollWidth <= innerWidth"))
    print('console errors:',[e for e in errors if 'Failed to load resource' not in e][:6])
    print('SUMMARY', sum(1 for _,v in checks if v), '/', len(checks)); b.close()
