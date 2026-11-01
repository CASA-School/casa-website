import { createHash, randomBytes } from 'node:crypto';
import { devices, expect, firefox, test, webkit, type Page } from '@playwright/test';
import pg from 'pg';

const DATABASE_URL = process.env.DATABASE_URL;
test.describe('installable workspace', () => {
  test.skip(!DATABASE_URL, 'needs the local database and a staff account');
  let db: pg.Client, token = '', hash = '';
  test.beforeAll(async () => {
    db = new pg.Client({ connectionString: DATABASE_URL }); await db.connect();
    const owner = (await db.query(`SELECT id FROM staff_users WHERE role='owner' AND is_active LIMIT 1`)).rows[0]?.id;
    test.skip(!owner, 'no staff owner');
    token = randomBytes(32).toString('base64url'); hash = createHash('sha256').update(token).digest('hex');
    await db.query(`INSERT INTO staff_sessions (staff_user_id,token_hash,expires_at) VALUES ($1,$2,now()+interval '30 minutes')`, [owner, hash]);
  });
  test.afterAll(async () => { if (db) { if (hash) await db.query(`DELETE FROM staff_sessions WHERE token_hash=$1`, [hash]); await db.end(); } });
  test.beforeEach(async ({ context, baseURL }) => {
    await context.addCookies([{ name:'casa_workspace_session',value:token,url:baseURL! }, { name:'casa_ws_lang',value:'en',url:baseURL! }]);
  });
  const account = (page: Page) => page.getByRole('button', { name:'Your account',exact:true });
  const menu = async (page: Page) => { if (await account(page).getAttribute('aria-expanded') !== 'true') await account(page).click(); return page.getByRole('menuitem', { name:'Install app',exact:true }); };
  const draft = async (page: Page) => page.evaluate(() => {
    const input=document.createElement('input'); input.id='pwa-test-draft'; input.value='My unsaved work'; input.setAttribute('aria-label','Test draft'); document.body.append(input);
  });
  const fakePrompt = async (page: Page, outcome:'accepted'|'dismissed') => page.evaluate(outcome => {
    const state=window as typeof window & { nativePromptCount?:number; promptPrevented?:boolean; finishPrompt?:()=>void };
    state.nativePromptCount=0;
    const event=new Event('beforeinstallprompt',{cancelable:true});
    const choice=new Promise<{outcome:string}>(resolve=>{state.finishPrompt=()=>resolve({outcome});});
    Object.assign(event,{prompt:()=>{state.nativePromptCount!++;return choice.then(()=>undefined);},userChoice:choice});
    window.dispatchEvent(event); state.promptPrevented=event.defaultPrevented;
  },outcome);
  const finishPrompt=async(page:Page)=>page.evaluate(()=>(window as typeof window & {finishPrompt:()=>void}).finishPrompt());

  test('separate manifest and metadata are valid, with real icons and unchanged public identity', async ({ page, request }) => {
    const response=await request.get('/admin/manifest.json');
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('application/manifest+json');
    const manifest=await response.json();
    expect(manifest).toMatchObject({name:'CASA Workspace',id:'/admin',start_url:'/admin',scope:'/',display:'standalone'});
    for (const icon of manifest.icons) expect((await request.get(icon.src)).status()).toBe(200);
    const publicManifest=await (await request.get('/manifest.webmanifest')).json();
    expect(publicManifest).toMatchObject({name:'CASA Bremen – Internationale Sprachschule',start_url:'/',display:'browser'});
    await page.goto('/admin/account',{waitUntil:'networkidle'});
    await expect(page.locator('link[rel="manifest"]')).toHaveCount(1);
    await expect(page.locator('link[rel="manifest"]')).toHaveAttribute('href','/admin/manifest.json');
    await expect(page.locator('meta[name="application-name"]')).toHaveAttribute('content','CASA Workspace');
    await expect(page.locator('meta[name="apple-mobile-web-app-title"]')).toHaveAttribute('content','CASA Workspace');
    const cdp=await page.context().newCDPSession(page);
    const loaded=await cdp.send('Page.getAppManifest');
    expect(loaded.errors).toEqual([]);
    const eligibility=await cdp.send('Page.getInstallabilityErrors');
    await test.info().attach('installability.json',{body:JSON.stringify(eligibility),contentType:'application/json'});
    expect(eligibility.installabilityErrors).toEqual([]);
    await cdp.detach();
  });
  test('the native installation prompt is requested once, only from the account menu', async ({ page }) => {
    await page.goto('/admin/account',{waitUntil:'networkidle'});
    await fakePrompt(page,'accepted');
    expect(await page.evaluate(()=>(window as typeof window & {promptPrevented:boolean}).promptPrevented)).toBe(true);
    expect(await page.evaluate(()=>(window as typeof window & {nativePromptCount:number}).nativePromptCount)).toBe(0);
    await (await menu(page)).click();
    expect(await page.evaluate(()=>(window as typeof window & {nativePromptCount:number}).nativePromptCount)).toBe(1);
    await expect(account(page)).toBeFocused();
    await finishPrompt(page);
    await account(page).click();
    await expect(page.getByRole('menuitem',{name:'Install app',exact:true})).toHaveCount(0);
  });
  test('dismissing installation does not nag or reuse the consumed native event', async ({ page }) => {
    await page.goto('/admin/account',{waitUntil:'networkidle'}); await fakePrompt(page,'dismissed');
    await (await menu(page)).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(account(page)).toBeFocused();
    await finishPrompt(page);
    await (await menu(page)).click();
    await expect(page.getByRole('dialog',{name:'Install CASA Workspace'})).toBeVisible();
    expect(await page.evaluate(()=>(window as typeof window & {nativePromptCount:number}).nativePromptCount)).toBe(1);
    await page.getByRole('button',{name:'Got it',exact:true}).click();
    await expect(account(page)).toBeFocused();
  });
  test('iPhone manual installation help fits a phone and restores focus', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator,'userAgent',{value:'Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 Version/26.0 Mobile Safari/604.1'});
      window.addEventListener('beforeinstallprompt',e=>e.stopImmediatePropagation(),true);
    });
    await page.setViewportSize({width:390,height:844});
    await page.goto('/admin/account',{waitUntil:'networkidle'});
    await (await menu(page)).click();
    const help=page.getByRole('dialog',{name:'Install CASA Workspace'});
    await expect(help).toContainText('Add to Home Screen');
    await expect(help).toContainText('Open as Web App');
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await help.screenshot({path:'output/workspace-pwa/install-iphone.png'});
    await help.getByRole('button',{name:'Got it',exact:true}).click();
    await expect(account(page)).toBeFocused();
  });
  test('Safari on Mac gets Dock installation guidance', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator,'userAgent',{value:'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 Version/26.0 Safari/605.1.15'});
      window.addEventListener('beforeinstallprompt',e=>e.stopImmediatePropagation(),true);
    });
    await page.goto('/admin/account',{waitUntil:'networkidle'});
    await (await menu(page)).click();
    const help=page.getByRole('dialog',{name:'Install CASA Workspace'});
    await expect(help).toContainText('File → Add to Dock');
    await help.screenshot({path:'output/workspace-pwa/install-desktop.png'});
  });
  test('standalone app windows do not offer installation again', async ({ page }) => {
    await page.addInitScript(() => {
      const original=window.matchMedia.bind(window);
      window.matchMedia=query=>query==='(display-mode: standalone)'?Object.defineProperty(original(query),'matches',{value:true}):original(query);
    });
    await page.goto('/admin/account',{waitUntil:'networkidle'});
    await account(page).click();
    await expect(page.getByRole('menuitem',{name:'Install app',exact:true})).toHaveCount(0);
  });
  test('going offline and reconnecting retains inputs without queuing writes', async ({ page,context }) => {
    await page.goto('/admin/account',{waitUntil:'networkidle'}); await draft(page);
    let posts=0; page.on('request',r=>{if(r.method()==='POST')posts++;});
    await context.setOffline(true);
    await expect(page.getByRole('status').filter({hasText:'You are offline'})).toBeVisible();
    await expect(page.getByLabel('Test draft')).toHaveValue('My unsaved work');
    await page.getByRole('complementary',{name:'Workspace connection'}).screenshot({path:'output/workspace-pwa/offline-notice.png'});
    await context.setOffline(false);
    await expect(page.getByRole('status').filter({hasText:'You are offline'})).toHaveCount(0);
    await expect(page.getByLabel('Test draft')).toHaveValue('My unsaved work');
    expect(posts).toBe(0);
    expect(await page.evaluate(async()=>({workers:(await navigator.serviceWorker.getRegistrations()).length,caches:(await caches.keys()).length}))).toEqual({workers:0,caches:0});
  });
  test('a newer build does not reload or discard an open input; reload requires confirmation', async ({ page }) => {
    let version='development';
    await page.route('**/admin/app-version',route=>route.fulfill({json:{data:{version},error:null}}));
    await page.goto('/admin/account',{waitUntil:'networkidle'}); await draft(page);
    version='next-build'; await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
    await expect(page.getByRole('status').filter({hasText:'New version available'})).toBeVisible();
    await expect(page.getByLabel('Test draft')).toHaveValue('My unsaved work');
    await page.getByRole('complementary',{name:'Workspace connection'}).screenshot({path:'output/workspace-pwa/update-notice.png'});
    await page.getByRole('button',{name:'Reload',exact:true}).click();
    const confirmation=page.getByRole('dialog',{name:'Reload Workspace?'});
    await expect(confirmation).toContainText('Unsaved inputs will be lost');
    await confirmation.getByRole('button',{name:'Cancel',exact:true}).click();
    await expect(page.getByLabel('Test draft')).toHaveValue('My unsaved work');
    await page.getByRole('button',{name:'Reload',exact:true}).click();
    await page.getByRole('button',{name:'Reload now',exact:true}).click();
    await expect(page.getByLabel('Test draft')).toHaveCount(0);
  });
  test('failed version checks leave work in place', async ({ page }) => {
    await page.route('**/admin/app-version',route=>route.fulfill({status:503,json:{data:null,error:{code:'unavailable'}}}));
    await page.goto('/admin/account',{waitUntil:'networkidle'}); await draft(page);
    await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
    await expect(page.getByLabel('Test draft')).toHaveValue('My unsaved work');
    await expect(page.getByRole('complementary',{name:'Workspace connection'})).toHaveCount(0);
  });
  test('the installed launch URL still needs a session and the version API refuses anonymous requests', async ({ page,context }) => {
    const signedIn=await page.request.get('/admin/app-version');
    expect(signedIn.status()).toBe(200); expect(signedIn.headers()['cache-control']).toBe('private, no-store');
    expect(await signedIn.json()).toEqual({data:{version:'development'},error:null});
    await context.clearCookies();
    await page.goto('/admin'); await expect(page).toHaveURL(/\/admin\/sign-in/);
    const denied=await page.request.get('/admin/app-version');
    expect(denied.status()).toBe(401); expect(denied.headers()['cache-control']).toBe('private, no-store');
  });
  for (const [name,engine,options] of [
    ['WebKit',webkit,devices['iPhone 13']],
    ['Firefox',firefox,{viewport:{width:1440,height:1000}}],
  ] as const) test(`${name} keeps installation help and connection handling usable`,async({context,baseURL})=>{
    const browser=await engine.launch();
    try {
      const other=await browser.newContext(options);
      await other.addCookies(await context.cookies());
      const page=await other.newPage();
      await page.goto(`${baseURL}/admin/account`,{waitUntil:'networkidle'});
      await expect(page.locator('link[rel="manifest"]')).toHaveAttribute('href','/admin/manifest.json');
      await (await menu(page)).click();
      const help=page.getByRole('dialog',{name:'Install CASA Workspace'});
      await expect(help).toContainText(name==='WebKit'?'Add to Home Screen':'Chrome or Edge');
      if(name==='WebKit') await help.screenshot({path:'output/workspace-pwa/install-webkit.png'});
      await help.getByRole('button',{name:'Got it',exact:true}).click();
      await expect(account(page)).toBeFocused();
      await draft(page); await other.setOffline(true);
      await expect(page.getByRole('status').filter({hasText:'You are offline'})).toBeVisible();
      await expect(page.getByLabel('Test draft')).toHaveValue('My unsaved work');
      await other.setOffline(false);
      await expect(page.getByRole('status').filter({hasText:'You are offline'})).toHaveCount(0);
    } finally {await browser.close();}
  });
  test('signing out in an app window revokes the session', async ({ page }) => {
    await page.addInitScript(() => {
      const original=window.matchMedia.bind(window);
      window.matchMedia=query=>query==='(display-mode: standalone)'?Object.defineProperty(original(query),'matches',{value:true}):original(query);
    });
    await page.goto('/admin/account',{waitUntil:'networkidle'});
    await account(page).click();
    await page.getByRole('menuitem',{name:'Sign out',exact:true}).click();
    await expect(page).toHaveURL(/\/admin\/sign-in/);
    expect((await page.request.get('/admin/app-version')).status()).toBe(401);
    await page.goto('/admin/account');
    await expect(page).toHaveURL(/\/admin\/sign-in/);
  });

});
