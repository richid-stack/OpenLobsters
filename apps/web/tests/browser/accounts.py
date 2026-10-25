import os
from playwright.sync_api import sync_playwright
OUT=os.environ.get('SHOTS_OUT','shots'); os.makedirs(OUT, exist_ok=True); BASE=os.environ.get('OPENLOBS_URL','http://localhost:3000'); errors=[]; checks=[]
def ok(name, cond): checks.append((name, bool(cond))); print(('PASS ' if cond else 'FAIL ')+name)
with sync_playwright() as p:
    b=p.chromium.launch()
    def ctx(w=390,h=844,scheme='light',dpr=2):
        c=b.new_context(viewport={'width':w,'height':h},device_scale_factor=dpr,color_scheme=scheme); pg=c.new_page()
        pg.on('console',lambda m: errors.append(m.text) if m.type=='error' else None); pg.on('pageerror',lambda e: errors.append(str(e))); return c,pg
    c,pg=ctx()
    pg.goto(BASE+'/sign-in'); pg.wait_for_selector('text=Sign in to OpenLobs',timeout=30000); pg.wait_for_selector('text=Continue with GitHub',timeout=15000); pg.wait_for_timeout(500)
    pg.screenshot(path=f'{OUT}/a1-sign-in.png')
    # sign up with email
    pg.get_by_text('Create an account').click(); pg.wait_for_timeout(300)
    pg.get_by_placeholder('Your name').fill('Ada Lovelace'); pg.get_by_placeholder('Email').fill('ada@example.com'); pg.get_by_placeholder('Password').fill('correct horse battery')
    pg.screenshot(path=f'{OUT}/a2-sign-up-filled.png')
    pg.get_by_role('button',name='Create account').click()
    pg.wait_for_selector('text=What would you like to get done?',timeout=30000); pg.wait_for_timeout(600)
    ok('sign-up lands on the chat screen', pg.url.rstrip('/')==BASE)
    # first chat
    pg.get_by_text('Hello, what can you do?').click()
    pg.wait_for_selector('text=paste your own table',timeout=30000); pg.wait_for_timeout(1500)
    ok('after the first reply the address becomes /chat/<id>', '/chat/' in pg.url)
    chat_url=pg.url; first_id=chat_url.split('/chat/')[1]
    pg.screenshot(path=f'{OUT}/a3-saved-chat.png')
    # reload: conversation restored
    pg.reload(); pg.wait_for_selector('text=paste your own table',timeout=30000); pg.wait_for_timeout(600)
    ok('reloading restores the conversation', pg.get_by_text('Hello, what can you do?').count()>=1)
    # sidebar with history
    pg.get_by_label('Open sidebar').first.click() if pg.get_by_label('Open sidebar').count() else pg.locator('button:has(.i-lucide-panel-left), header button').first.click()
    pg.wait_for_timeout(700)
    pg.screenshot(path=f'{OUT}/a4-sidebar-history.png')
    # signed-in only API
    api=pg.evaluate("fetch('/api/chats').then(r=>r.json())")
    ok('the chat list API returns the saved chat', any(x['id']==first_id for x in api['chats']))
    # a different person cannot open this chat
    c2,pg2=ctx()
    pg2.goto(BASE+'/sign-in'); pg2.wait_for_selector('text=Sign in to OpenLobs',timeout=30000); pg2.get_by_text('Create an account').click()
    pg2.get_by_placeholder('Your name').fill('Bob'); pg2.get_by_placeholder('Email').fill('bob@example.com'); pg2.get_by_placeholder('Password').fill('another good password')
    pg2.get_by_role('button',name='Create account').click(); pg2.wait_for_selector('text=What would you like to get done?',timeout=30000)
    st=pg2.evaluate(f"fetch('/api/chats/{first_id}').then(r=>r.status)")
    ok("another person gets 404 for Ada's chat id", st==404)
    lst=pg2.evaluate("fetch('/api/chats').then(r=>r.json())")
    ok("another person's chat list is empty", lst['chats']==[])
    # signed out can still chat, nothing saved
    c3,pg3=ctx(); pg3.goto(BASE+'/'); pg3.wait_for_selector('text=What would you like to get done?',timeout=30000)
    pg3.get_by_text('Hello, what can you do?').click(); pg3.wait_for_selector('text=paste your own table',timeout=30000); pg3.wait_for_timeout(800)
    ok('signed-out chat works and the address stays /', pg3.url.rstrip('/')==BASE)
    ok('signed-out people cannot list chats', pg3.evaluate("fetch('/api/chats').then(r=>r.status)")==401)
    # wrong password message
    c4,pg4=ctx(); pg4.goto(BASE+'/sign-in'); pg4.wait_for_selector('text=Sign in to OpenLobs',timeout=30000)
    pg4.get_by_placeholder('Email').fill('ada@example.com'); pg4.get_by_placeholder('Password').fill('not the password')
    pg4.get_by_role('button',name='Sign in',exact=True).click(); pg4.wait_for_selector('text=do not match',timeout=15000); pg4.wait_for_timeout(300)
    pg4.screenshot(path=f'{OUT}/a5-wrong-password.png')
    # OpenID Connect through the fake provider
    pg4.get_by_text('Continue with Mock SSO').click()
    pg4.wait_for_selector('text=What would you like to get done?',timeout=30000); pg4.wait_for_timeout(800)
    me=pg4.evaluate("fetch('/api/auth/get-session').then(r=>r.json())")
    ok('signing in through the OpenID Connect provider works in a real browser', me and me['user']['email']=='sso@example.com')
    # sign out via the menu (fresh load, one click)
    pg4.goto(BASE+'/'); pg4.wait_for_selector('text=What would you like to get done?',timeout=30000); pg4.wait_for_timeout(1800)
    pg4.get_by_label('Open sidebar').first.click()
    who=pg4.locator('text=SSO Person >> visible=true').first; who.wait_for(timeout=20000); pg4.wait_for_timeout(500)
    who.click(); pg4.locator('text=Sign out >> visible=true').first.wait_for(timeout=10000); pg4.wait_for_timeout(400)
    pg4.screenshot(path=f'{OUT}/a6-account-menu.png')
    pg4.locator('text=Sign out >> visible=true').first.click(); pg4.wait_for_timeout(1500)
    ok('signing out ends the session', pg4.evaluate("fetch('/api/auth/get-session').then(r=>r.text())") in ('null',''))
    # dark sign-in
    c5,pg5=ctx(scheme='dark'); pg5.goto(BASE+'/sign-in'); pg5.wait_for_selector('text=Continue with GitHub',timeout=30000); pg5.wait_for_timeout(500)
    pg5.screenshot(path=f'{OUT}/a7-sign-in-dark.png')
    # desktop signed-in
    c6,pg6=ctx(1280,800,'light',1); pg6.goto(BASE+'/sign-in'); pg6.wait_for_selector('text=Sign in to OpenLobs',timeout=30000)
    pg6.get_by_placeholder('Email').fill('ada@example.com'); pg6.get_by_placeholder('Password').fill('correct horse battery')
    pg6.get_by_role('button',name='Sign in',exact=True).click(); pg6.wait_for_selector('text=What would you like to get done?',timeout=30000); pg6.wait_for_timeout(1200)
    pg6.screenshot(path=f'{OUT}/a8-desktop-signed-in.png')
    print('console errors:',[e for e in errors if 'Failed to load resource' not in e][:6])
    print('SUMMARY', sum(1 for _,v in checks if v), '/', len(checks))
    b.close()
