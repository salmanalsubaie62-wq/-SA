const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const url = 'file:///home/user/-SA/SA_TEAM/PROJECTS/SA-COMPANY-DASHBOARD/SOURCE/index.html';
  const errs = [];
  for (const [name, vp] of [['desktop', { width: 1280, height: 900 }], ['mobile', { width: 390, height: 844 }]]) {
    const p = await b.newPage({ viewport: vp });
    p.on('console', m => { if (m.type() === 'error') errs.push(name + ': ' + m.text()); });
    p.on('pageerror', e => errs.push(name + ' pageerror: ' + e.message));
    await p.goto(url);
    const info = await p.evaluate(() => ({
      kpis: [...document.querySelectorAll('.kpi .num')].map(x => x.textContent),
      reportCards: document.querySelectorAll('#report-cards .card').length,
      projectCards: document.querySelectorAll('#project-cards .card').length,
      empRows: document.querySelectorAll('#employees-body tr').length,
      overflowX: document.documentElement.scrollWidth > window.innerWidth,
      dir: document.documentElement.dir
    }));
    console.log(name, JSON.stringify(info));
    await p.screenshot({ path: `/tmp/claude-0/-home-user--SA/b48c2f9c-44a1-5145-8c89-4f6000d2188d/scratchpad/${name}-overview.png`, deviceScaleFactor: name === 'desktop' ? 1 : 2 });
    await p.click('text=التقارير اليومية');
    await p.screenshot({ path: `/tmp/claude-0/-home-user--SA/b48c2f9c-44a1-5145-8c89-4f6000d2188d/scratchpad/${name}-reports.png`, fullPage: false });
    await p.click('text=المشاريع');
    const pc = await p.evaluate(() => document.querySelectorAll('#project-cards .card').length);
    console.log(name, 'projects tab cards', pc);
    await p.click('text=الإيرادات');
    console.log(name, 'finance empty:', await p.evaluate(() => document.getElementById('finance-body').textContent.slice(0, 60)));
    await p.close();
  }
  console.log('ERRORS:', JSON.stringify(errs));
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
