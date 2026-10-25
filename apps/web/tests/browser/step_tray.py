import os
import re
from playwright.sync_api import sync_playwright
OUT=os.environ.get('SHOTS_OUT','shots'); os.makedirs(OUT, exist_ok=True); BASE=os.environ.get('OPENLOBS_URL','http://localhost:3000'); errors=[]; checks=[]
def ok(name, cond):
    checks.append((name, bool(cond))); print(('PASS ' if cond else 'FAIL ')+name)
def on_top(pg, locator):
    # The thing a finger would actually hit at the middle of the element is the element itself.
    box=locator.bounding_box()
    return bool(box) and pg.evaluate("([x,y,sel]) => { const e=document.elementFromPoint(x,y); const t=document.querySelector(sel); return !!e && !!t && (e===t || t.contains(e)) }", [box['x']+box['width']/2, box['y']+box['height']/2, '[aria-label="Scroll to bottom"]'])
def in_view(pg, locator):
    box=locator.bounding_box()
    vh=pg.evaluate('innerHeight')
    return bool(box) and box['y']>=0 and box['y']+box['height']<=vh-110   # clear of the message box
with sync_playwright() as p:
    b=p.chromium.launch()
    def ctx(w=390,h=844,scheme='light',dpr=2):
        c=b.new_context(viewport={'width':w,'height':h},device_scale_factor=dpr,color_scheme=scheme); pg=c.new_page()
        pg.on('console',lambda m: errors.append(m.text) if m.type=='error' else None); pg.on('pageerror',lambda e: errors.append(str(e))); return pg
    counter=[0]
    def start(pg):
        counter[0]+=1
        pg.goto(BASE+'/sign-in'); pg.wait_for_selector('text=Sign in to OpenLobs',timeout=30000); pg.get_by_text('Create an account').click()
        pg.get_by_placeholder('Your name').fill('Tray Tester'); pg.get_by_placeholder('Email').fill(f'tray{counter[0]}@example.com'); pg.get_by_placeholder('Password').fill('correct horse battery')
        pg.get_by_role('button',name='Create account').click(); pg.wait_for_selector('text=What would you like to get done?',timeout=30000); pg.wait_for_timeout(500)
        pg.get_by_text('Turn sample sales data into a workbook').click()
    line=lambda pg: pg.locator('[data-status-line]')
    tray=lambda pg: pg.get_by_role('region', name='Steps in this run')

    pg=ctx(); start(pg)
    pg.wait_for_selector('button[data-status-line]',timeout=20000); pg.wait_for_timeout(300)
    ok('while working, the status line is a button showing a step count', re.search(r'\d+ steps?', line(pg).inner_text()) is not None)
    pg.screenshot(path=f'{OUT}/t1-line-with-count.png')
    line(pg).click(); tray(pg).wait_for(timeout=5000); pg.wait_for_timeout(450)
    ok('tapping it opens the tray', tray(pg).is_visible())
    ok('the tray has a close button and a drag handle', pg.get_by_label('Close steps').is_visible() and pg.locator('[data-tray-handle]').count()==1)
    pg.screenshot(path=f'{OUT}/t2-tray-open-midrun.png')
    # wait for the approval: the tray stays open and shows it
    pg.get_by_text('Needs your approval').first.wait_for(timeout=30000); pg.wait_for_timeout(500)
    ok('the status line turns into a review prompt when approval is needed', 'Review' in line(pg).inner_text())
    pg.screenshot(path=f'{OUT}/t3-tray-with-approval-step.png')
    # tap the waiting row: the tray closes and the chat jumps to the approval
    tray(pg).get_by_role('button', name=re.compile('Ready to create the workbook')).click(); pg.wait_for_timeout(500)
    ok('choosing a step closes the tray', tray(pg).count()==0)
    allow=pg.get_by_role('button', name='Allow once')
    ok('and brings the approval into view, clear of the message box', in_view(pg, allow))
    ok('the target is tinted for a moment', pg.locator('.ol-flash').count()>=1)
    pg.screenshot(path=f'{OUT}/t4-jumped-to-approval.png')
    # scroll away, then use the status line itself to get back
    pg.get_by_text('Summarise this sales data').first.evaluate('e => e.scrollIntoView({ block: "start" })'); pg.wait_for_timeout(900)
    line(pg).click(); pg.wait_for_timeout(700)
    ok('tapping the review line jumps straight to the approval, not to a list', in_view(pg, allow) and tray(pg).count()==0)
    pg.screenshot(path=f'{OUT}/t5-review-line-jump.png')
    allow.click(); pg.wait_for_selector('text=Your workbook is ready',timeout=30000); pg.wait_for_timeout(1800)
    ok('after the run it collapses to one line with the tool count', re.search(r'Worked with 3 tools', line(pg).inner_text()) is not None)
    pg.screenshot(path=f'{OUT}/t6-done-collapsed.png')
    line(pg).click(); tray(pg).wait_for(timeout=5000); pg.wait_for_timeout(450)
    ok('the finished tray marks the checked result as verified', tray(pg).get_by_text('Verified').count()>=1)
    ok('the tray lists every step in order', tray(pg).locator('li').count()==3)
    pg.screenshot(path=f'{OUT}/t7-tray-finished.png')
    # jump to the first tool step, far above
    tray(pg).get_by_role('button', name=re.compile('^Analysed the data')).first.click(); pg.wait_for_timeout(900)
    flash=pg.locator('.ol-flash')
    ok('choosing the first tool step scrolls the chat back up to it', flash.count()>=1 and in_view(pg, flash.first))
    ok('the tray is out of the way afterwards', tray(pg).count()==0)
    back=pg.get_by_label('Scroll to bottom')
    pg.wait_for_timeout(300)
    ok('after jumping up, the scroll-to-bottom button shows and is really on top (not hidden)', back.count()==1 and in_view(pg, back) and on_top(pg, back))
    pg.screenshot(path=f'{OUT}/t8b-scroll-to-bottom-button.png')
    back.click(); pg.wait_for_timeout(1200)
    ok('pressing it returns to the latest message and the button goes away', pg.get_by_label('Scroll to bottom').count()==0 and pg.get_by_text('Your workbook is ready').is_visible())
    pg.screenshot(path=f'{OUT}/t8-jumped-to-first-step.png')
    # keyboard: Escape closes and focus returns to the status line
    line(pg).click(); tray(pg).wait_for(timeout=5000); pg.wait_for_timeout(300)
    ok('focus moves into the tray when it opens', pg.evaluate("document.activeElement && document.activeElement.getAttribute('aria-label')")=='Steps in this run')
    pg.keyboard.press('Escape'); pg.wait_for_timeout(450)
    ok('Escape closes the tray', tray(pg).count()==0)
    ok('and focus returns to the status line', pg.evaluate("document.activeElement && document.activeElement.hasAttribute('data-status-line')"))
    # drag the handle down to close
    line(pg).click(); tray(pg).wait_for(timeout=5000); pg.wait_for_timeout(300)
    hb=pg.locator('[data-tray-handle]').bounding_box(); cx=hb['x']+hb['width']/2; cy=hb['y']+hb['height']/2
    pg.mouse.move(cx,cy); pg.mouse.down(); pg.mouse.move(cx,cy+30); pg.mouse.move(cx,cy+130); pg.mouse.up(); pg.wait_for_timeout(500)
    ok('dragging the handle down closes the tray', tray(pg).count()==0)
    # a short drag springs back instead of closing
    line(pg).click(); tray(pg).wait_for(timeout=5000); pg.wait_for_timeout(300)
    hb=pg.locator('[data-tray-handle]').bounding_box(); cx=hb['x']+hb['width']/2; cy=hb['y']+hb['height']/2
    pg.mouse.move(cx,cy); pg.mouse.down(); pg.mouse.move(cx,cy+20); pg.mouse.up(); pg.wait_for_timeout(500)
    ok('a small drag springs back and keeps it open', tray(pg).count()==1)
    # sending a new message puts the tray away
    pg.get_by_placeholder('Ask OpenLobs to do something').fill('Hello'); pg.keyboard.press('Enter'); pg.wait_for_timeout(700)
    ok('sending a message closes the tray', tray(pg).count()==0)
    # nothing scrolls sideways any more
    ok('no horizontal scrolling in the page or the status area', pg.evaluate("document.documentElement.scrollWidth <= innerWidth") and pg.locator('.no-scrollbar').count()==0)
    # a plain answer has nothing to open
    pgb=ctx(); pgb.goto(BASE+'/'); pgb.wait_for_selector('text=What would you like to get done?',timeout=30000)
    pgb.get_by_text('Hello, what can you do?').click(); pgb.wait_for_selector('text=paste your own table',timeout=30000); pgb.wait_for_timeout(800)
    ok('a reply with no steps shows a plain, non-interactive line', pgb.locator('button[data-status-line]').count()==0)

    # dark and desktop
    pgd=ctx(scheme='dark'); start(pgd)
    pgd.wait_for_selector('button[data-status-line]',timeout=20000)
    pgd.get_by_role('button', name='Allow once').wait_for(timeout=30000); pgd.get_by_role('button', name='Allow once').click()
    pgd.wait_for_selector('text=Your workbook is ready',timeout=30000); pgd.wait_for_timeout(1500)
    line(pgd).click(); tray(pgd).wait_for(timeout=5000); pgd.wait_for_timeout(450)
    pgd.screenshot(path=f'{OUT}/t9-tray-dark.png')
    pgk=ctx(1280,800,'light',1); start(pgk)
    pgk.get_by_role('button', name='Allow once').wait_for(timeout=30000); pgk.get_by_role('button', name='Allow once').click()
    pgk.wait_for_selector('text=Your workbook is ready',timeout=30000); pgk.wait_for_timeout(1500)
    line(pgk).click(); tray(pgk).wait_for(timeout=5000); pgk.wait_for_timeout(450)
    pgk.screenshot(path=f'{OUT}/t10-tray-desktop.png')
    print('console errors:',[e for e in errors if 'Failed to load resource' not in e][:6])
    print('SUMMARY', sum(1 for _,v in checks if v), '/', len(checks))
    b.close()
