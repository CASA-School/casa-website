import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';
import pg from 'pg';

const DATABASE_URL = process.env.DATABASE_URL;
test.describe('contextual booking lists', () => {
  test.skip(!DATABASE_URL, 'needs the local database and an owner');
  let db: pg.Client, token = '', hash = '', intensive = '', evening = '', exam = '';
  const people: string[] = [], bookings: string[] = [], starts: string[] = [];
  const surname = `Kontexttest${randomUUID().slice(0, 8)}`;
  const january = '2027-01';
  test.beforeAll(async () => {
    db = new pg.Client({ connectionString: DATABASE_URL }); await db.connect();
    const owner = (await db.query(`SELECT id FROM staff_users WHERE role = 'owner' AND is_active LIMIT 1`)).rows[0]?.id;
    test.skip(!owner, 'no owner');
    intensive = (await db.query(`SELECT id FROM course_types WHERE slug = 'intensive-german'`)).rows[0]?.id;
    evening = (await db.query(`SELECT id FROM course_types WHERE slug = 'evening-german'`)).rows[0]?.id;
    const examType = (await db.query(`SELECT id FROM exam_types WHERE level = 'C1' LIMIT 1`)).rows[0]?.id;
    test.skip(!intensive || !evening || !examType, 'needs course and exam catalogue');
    token = randomBytes(32).toString('base64url'); hash = createHash('sha256').update(token).digest('hex');
    await db.query(`INSERT INTO staff_sessions (staff_user_id, token_hash, expires_at) VALUES ($1, $2, now() + interval '30 minutes')`, [owner, hash]);
    const courses: string[] = [];
    for (const [type, start, end, session, level] of [
      [intensive, '2027-01-04', '2027-02-26', 'morning', 'A1.1'],
      [intensive, '2027-01-11', '2027-03-05', 'afternoon', 'B1.1'],
      [evening, '2027-02-02', '2027-04-22', 'evening', 'B2.2'],
      [intensive, '2027-03-08', '2027-04-30', 'morning', 'A2.1'],
    ]) {
      const id = (await db.query(`INSERT INTO course_instances (course_type_id,start_date,end_date,capacity,schedule,session,on_website) VALUES ($1,$2,$3,14,'{"days":["Mon","Tue"],"time":"09:00-12:30"}',$4,false) RETURNING id`, [type, start, end, session])).rows[0].id;
      starts.push(id);
      courses.push((await db.query(`INSERT INTO courses (course_instance_id,level_code,session) VALUES ($1,$2,$3) RETURNING id`, [id, level, session])).rows[0].id);
    }
    exam = (await db.query(`INSERT INTO exam_sessions (exam_type_id,starts_at,ends_at,capacity) VALUES ($1,'2027-01-23 09:00+01','2027-01-23 14:00+01',14) RETURNING id`, [examType])).rows[0].id;
    const person = async (name: string) => {
      const id = (await db.query(`INSERT INTO people (first_name,last_name,created_by) VALUES ($1,$2,'e2e:context') RETURNING id`, [name, surname])).rows[0].id;
      people.push(id); return id;
    };
    const booking = async (pid: string, type: string | null, status = 'confirmed', sitting: string | null = null) => {
      const id = (await db.query(`INSERT INTO bookings (person_id,course_type_id,status,exam_session_id,exam_parts) VALUES ($1,$2,$3,$4,CASE WHEN $4::uuid IS NULL THEN NULL ELSE 'full' END) RETURNING id`, [pid, type, status, sitting])).rows[0].id;
      bookings.push(id); return id;
    };
    const period = async (bid: string, index: number) => db.query(`INSERT INTO booking_periods (booking_id,course_id,course_instance_id,level_code,start_date,end_date) SELECT $1,c.id,c.course_instance_id,c.level_code,i.start_date,i.end_date FROM courses c JOIN course_instances i ON i.id=c.course_instance_id WHERE c.id=$2`, [bid, courses[index]]);
    const ada = await person('Ada');
    for (const [prefix, kind, primary] of [['personal', 'personal', false], ['agency', 'agency', true]] as const) {
      const address = `${prefix}.${surname.toLowerCase()}@example.invalid`;
      await db.query(`INSERT INTO emails (person_id,address,normalized,kind,is_primary) VALUES ($1,$2,$2,$3,$4)`, [ada, address, kind, primary]);
    }
    const reserved = await booking(ada, intensive, 'reserved');
    await period(reserved, 0); await period(reserved, 1); // The two filters must match one period, never two different ones.
    const second = await booking(ada, intensive);
    await period(second, 0); // Two bookings, one learner.
    for (const [bid, amount] of [[reserved, 100], [second, 40]] as const) await db.query(`INSERT INTO booking_charges (booking_id,kind,description,amount) VALUES ($1,'tuition','E2E context',$2)`, [bid, amount]);
    await period(await booking(await person('Zoe'), intensive), 1);
    await period(await booking(await person('Mike'), intensive, 'cancelled'), 1);
    const lateJoiner = await booking(await person('Eva'), evening);
    await period(lateJoiner, 2);
    await db.query(`UPDATE booking_periods SET start_date='2027-03-02' WHERE booking_id=$1`, [lateJoiner]);
    await booking(await person('Ian'), null, 'reserved', exam);
    for (let n = 1; n <= 81; n++) {
      const bid = await booking(await person(`Lernende${String(n).padStart(2, '0')}`), intensive);
      await period(bid, 0);
      if (n === 79) await db.query(`UPDATE booking_periods SET course_id=NULL,course_instance_id=NULL,day_time_code='morning' WHERE booking_id=$1`, [bid]);
      if (n === 81) await db.query(`UPDATE booking_periods SET group_index=2 WHERE booking_id=$1`, [bid]);
    }
    await db.query(`UPDATE courses SET groups=2 WHERE id=$1`, [courses[0]]);
    await db.query(`INSERT INTO course_days (course_id,group_index,on_date,starts_at,ends_at) VALUES ($1,1,'2027-01-04','09:00','12:30'),($1,2,'2027-01-04','13:30','17:00')`, [courses[0]]);
  });
  test.afterAll(async () => {
    if (!db) return;
    if (bookings.length) await db.query(`DELETE FROM bookings WHERE id = ANY($1::uuid[])`, [bookings]);
    if (people.length) await db.query(`DELETE FROM people WHERE id = ANY($1::uuid[])`, [people]);
    if (starts.length) await db.query(`DELETE FROM course_instances WHERE id = ANY($1::uuid[])`, [starts]);
    if (exam) await db.query(`DELETE FROM exam_sessions WHERE id=$1`, [exam]);
    if (hash) await db.query(`DELETE FROM staff_sessions WHERE token_hash=$1`, [hash]);
    await db.end();
  });
  test.beforeEach(async ({ context, baseURL }) => {
    await context.addCookies([{ name: 'casa_workspace_session', value: token, url: baseURL! }, { name: 'casa_ws_lang', value: 'en', url: baseURL! }]);
  });
  const url = (extra = '') => `/admin/bookings?q=${surname}${extra}`;
  const choose = async (page: import('@playwright/test').Page, label: string, value: string) => {
    await page.getByRole('combobox', { name: label, exact: true }).selectOption(value, { force: true });
    await expect(page.locator('.ws-list-filters')).not.toHaveAttribute('aria-busy', 'true');
  };
  test('category navigation replaces status tabs; counts and pagination cover the full result', async ({ page }) => {
    await page.goto(url(), { waitUntil: 'networkidle' });
    const views = page.getByRole('navigation', { name: 'Views' });
    await expect(views.getByRole('link', { name: 'All bookings 87', exact: true })).toHaveAttribute('aria-current', 'page');
    await expect(views.getByRole('link', { name: 'Intensive 85', exact: true })).toBeVisible();
    await expect(views.getByRole('link', { name: /^Current/ })).toHaveCount(0);
    await expect(page.locator('tr[data-interactive]')).toHaveCount(80);
    await expect(page.getByRole('navigation', { name: 'Pagination' })).toContainText('1–80 of 87');
    await page.getByRole('link', { name: 'Next', exact: true }).click();
    await expect(page.locator('tr[data-interactive]')).toHaveCount(7);
    await expect(page.getByRole('navigation', { name: 'Pagination' })).toContainText('81–87 of 87');
    await expect(page.locator('tr[data-group]').filter({ hasText: 'January 2027' })).toContainText('86');
  });
  test('monthly demand deduplicates learners and periods, excludes cancellations, and separates reservations', async ({ page }) => {
    await page.goto(url(`&category=intensive&month=${january}`), { waitUntil: 'networkidle' });
    const demand = page.getByRole('region', { name: 'Course demand' });
    await expect(page.getByRole('status').filter({ hasText: '85 bookings' })).toBeVisible();
    await expect(demand).toContainText('83 students · 1 reserved');
    await expect(demand).toContainText('82 bookings, 1 reserved'); // Morning: Ada twice plus 80 other learners.
    await expect(demand).toContainText('3 bookings, 1 reserved'); // Afternoon: Ada, Zoe and a learner in group 2; Mike cancelled.
  });
  test('a morning level and an afternoon level cannot satisfy the same period', async ({ page }) => {
    await page.goto(url('&category=intensive&session=morning&level=B1&month=2027-01'));
    await expect(page.getByRole('status').filter({ hasText: '0 bookings' })).toBeVisible();
    await expect(page.locator('tr[data-interactive]')).toHaveCount(0);
  });
  test('the booked group’s lesson time takes precedence over the course default', async ({ page }) => {
    await page.goto(url('&category=intensive&session=afternoon&level=A1.1&start=2027-01-04'), { waitUntil: 'networkidle' });
    await expect(page.locator('tr[data-interactive]')).toHaveCount(1);
    await expect(page.locator('tr[data-interactive]')).toContainText('Lernende81');
    await expect(page.locator('tr[data-interactive]').getByRole('img', { name: 'Afternoon' })).toBeVisible();
  });
  test('a custom date range and a level must match the same booked period', async ({ page }) => {
    await page.goto(url('&category=intensive&level=B1&from=2027-01-04&to=2027-01-04'));
    await expect(page.locator('tr[data-interactive]')).toHaveCount(0);
    await page.goto(url('&category=intensive&level=B1&from=2027-01-11&to=2027-01-11'));
    await expect(page.locator('tr[data-interactive]')).toHaveCount(3);
  });
  test('late joiners are counted by their own entry month, not the original course month', async ({ page }) => {
    await page.goto(url('&category=evening&month=2027-03&start=2027-03-02'), { waitUntil: 'networkidle' });
    await expect(page.locator('tr[data-interactive]')).toHaveCount(1);
    await expect(page.locator('tr[data-interactive]')).toContainText('Eva');
    await expect(page.getByRole('region', { name: 'Course demand' })).toContainText('1 student · 0 reserved');
    await page.goto(url('&category=evening&month=2027-02'));
    await expect(page.locator('tr[data-interactive]')).toHaveCount(0);
  });
  test('imported unlinked periods retain their recorded time of day', async ({ page }) => {
    await page.goto(`/admin/bookings?category=intensive&session=morning&level=A1.1&month=2027-01&q=${surname}%20Lernende79`, { waitUntil: 'networkidle' });
    await expect(page.locator('tr[data-interactive]')).toHaveCount(1);
    await expect(page.locator('tr[data-interactive]')).toContainText('Lernende79');
    await expect(page.locator('tr[data-interactive]').getByRole('img', { name: 'Morning' })).toBeVisible();
  });
  test('branded menus expose contextual choices and readable option widths', async ({ page }) => {
    await page.goto(url('&category=intensive&session=morning&month=2027-01'), { waitUntil: 'networkidle' });
    const levels = page.getByRole('combobox', { name: 'Starting level', exact: true });
    // Real catalogue levels vary with live local data; A1.1 and this actual date must remain available.
    await expect(levels.locator('option[value="A1.1"]')).toHaveCount(1);
    const dates = page.getByRole('combobox', { name: 'Course start', exact: true });
    await expect(dates.locator('option[value="2027-01-04"]')).toHaveCount(1);
    await choose(page, 'Starting level', 'A1.1');
    await page.getByRole('button', { name: /^Start month:/ }).click();
    const option = page.getByRole('menuitem', { name: 'January 2027', exact: true });
    await expect(option).toBeVisible();
    expect(await option.locator('span').first().evaluate(e => e.scrollWidth <= e.clientWidth)).toBe(true);
    await page.keyboard.press('Escape');
    await page.getByRole('navigation', { name: 'Views' }).getByRole('link', { name: /^Evening/ }).click();
    await expect(page).toHaveURL(/category=evening/);
    for (const key of ['session', 'level', 'month', 'start']) expect(new URL(page.url()).searchParams.has(key)).toBe(false);
    await expect(page.getByRole('combobox', { name: 'Time of day', exact: true }).locator('option')).toHaveText(['All times', 'Evening']);
    await expect(page.getByRole('combobox', { name: 'Starting level', exact: true }).locator('option[value="B2.2"]')).toHaveCount(1);
  });
  test('exams use exam levels and sittings without course time controls', async ({ page }) => {
    await page.goto(url('&category=exam&month=2027-01'), { waitUntil: 'networkidle' });
    await expect(page.getByRole('combobox', { name: 'Time of day', exact: true })).toHaveCount(0);
    await expect(page.getByRole('combobox', { name: 'Starting level', exact: true }).locator('option[value="C1"]')).toHaveCount(1);
    await expect(page.getByRole('combobox', { name: 'Course start', exact: true }).locator('option[value="2027-01-23"]')).toHaveCount(1);
    await expect(page.getByRole('region', { name: 'Course demand' })).toContainText('1 student · 1 reserved');
    await expect(page.locator('tr.booking-exam')).toHaveCount(1);
  });
  test('scheduled starts remain selectable before the first booking arrives', async ({ page }) => {
    await page.goto(url('&category=intensive&session=morning&level=A2.1&month=2027-03'), { waitUntil: 'networkidle' });
    await expect(page.getByRole('combobox', { name: 'Course start', exact: true }).locator('option[value="2027-03-08"]')).toHaveCount(1);
    await expect(page.getByRole('region', { name: 'Course demand' })).toContainText('0 students · 0 reserved');
  });
  test('email searches preserve the ranked personal-contact rule', async ({ page }) => {
    await page.goto(`/admin/bookings?category=intensive&q=personal.${surname.toLowerCase()}@example.invalid`);
    await expect(page.locator('tr[data-interactive]')).toHaveCount(2);
    await page.goto(`/admin/bookings?category=intensive&q=agency.${surname.toLowerCase()}@example.invalid`);
    await expect(page.locator('tr[data-interactive]')).toHaveCount(0);
  });
  test('sidebar status narrows the selected course context', async ({ page }) => {
    await page.goto(url('&category=intensive&month=2027-01'), { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: /^Filters/ }).click();
    const panel = page.getByRole('dialog', { name: 'Filter bookings' });
    await panel.getByRole('button', { name: 'Work out', exact: true }).click();
    await expect(panel).toContainText('140,00');
    await panel.getByRole('combobox', { name: 'Booking status' }).selectOption('reserved', { force: true });
    await panel.getByRole('button', { name: 'Apply', exact: true }).click();
    await expect(page).toHaveURL(/filter=reserved/);
    await expect(page).toHaveURL(/category=intensive/);
    await expect(page.locator('tr[data-interactive]')).toHaveCount(1);
    await expect(page.getByRole('region', { name: 'Course demand' })).toContainText('1 student · 1 reserved');
    await page.getByRole('button', { name: /^Filters/ }).click();
    await panel.getByRole('button', { name: 'Work out', exact: true }).click();
    await expect(panel).toContainText('100,00');
    await expect(panel.getByRole('link').filter({ hasText: '100,00' })).toHaveAttribute('href', /filter=reserved/);
  });
  test('compact controls and rows fit phone, tablet and desktop', async ({ page, context, baseURL }) => {
    await context.addCookies([{ name: 'casa_ws_lang', value: 'de', url: baseURL! }]);
    for (const [width, height] of [[320,740], [768,1024], [1440,1000]]) {
      await page.setViewportSize({ width, height });
      await page.goto(url('&category=intensive&month=2027-01'), { waitUntil: 'networkidle' });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await expect(page.locator('table')).toHaveAttribute('data-density', 'compact');
      expect(await page.locator('tr[data-interactive] td').first().evaluate(e => parseFloat(getComputedStyle(e).paddingTop))).toBeLessThanOrEqual(10);
      if (width === 320) expect((await page.locator('.ws-list-bar > nav').boundingBox())!.width).toBeGreaterThan(230);
      if (width === 1440) await page.screenshot({ path: 'output/contextual-bookings/booking-context-desktop.png' });
      if (width === 320) await page.screenshot({ path: 'output/contextual-bookings/booking-context-phone.png' });
    }
  });
});
