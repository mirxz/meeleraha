#!/usr/bin/env python3
"""Build the Open Playbook API reference page.

One source of truth per kind of fact:
  - operations: open-playbook-api.openapi.json + allowlist.json  (through openapi_to_spec.py)
  - repository facts (events, components, catalog size): read from the repo at build time
  - everything else: the HAND sections below (rules, roles, stages, privacy roadmap, public log)

Usage (from the repo root): python3 tools/open-playbook-api/build_reference.py --repo . --out public/open-playbook-api.html
The default layout is the Meeleraha skin (meeleraha-reference-layout.html: site tokens and the shared frame); --layout api-reference-layout.html gives the plain generic page.
The page only draws the spec; to change the page, change this file and rebuild.
"""
import argparse, json, re, subprocess, sys, os, datetime

HERE = os.path.dirname(os.path.abspath(__file__))
ap = argparse.ArgumentParser()
ap.add_argument('--repo', required=True)
ap.add_argument('--out', required=True)
ap.add_argument('--date', default='2026-10-17')
ap.add_argument('--layout', default='meeleraha-reference-layout.html')
a = ap.parse_args()

# ---------- 1. operations from the OpenAPI draft (their generator, unchanged) ----------
import tempfile
gen = os.path.join(tempfile.mkdtemp(), 'spec.generated.json')
subprocess.check_call([sys.executable, os.path.join(HERE, 'openapi_to_spec.py'), os.path.join(HERE, 'open-playbook-api.openapi.json'),
                       '--allow', os.path.join(HERE, 'allowlist.json'), '--brand', 'MEELERAHA', '--title', 'Open Playbook API', '--out', gen],
                      stdout=subprocess.DEVNULL)
g = json.load(open(gen, encoding='utf-8'))
gen_ops = {s['title']: s for s in g['sections'] if s['id'] != 'overview'}
gen_kv = dict((k, v) for k, v in g['sections'][0]['blocks'][0]['items'])
n_ops = gen_kv['Operations in file']; fp = gen_kv['File fingerprint']; allowed = gen_kv['Allowed by us']

# ---------- 2. facts from the repo ----------
tax = json.load(open(os.path.join(a.repo, 'public/taxonomy.json'), encoding='utf-8'))
EV, CO, EN = len(tax['events']), len(tax['components']), len(tax['enums'])
kast = open(os.path.join(a.repo, 'public/kast.html'), encoding='utf-8').read()
CAT = len(json.loads(re.search(r'<script type="application/json" id="catalog">([\s\S]*?)</script>', kast).group(1)))
vm = open(os.path.join(a.repo, 'public/vaidle-mudel.js'), encoding='utf-8').read()
MV, MO, MR = re.search(r"VERSION='([^']+)',OWNER='([^']+)',REVIEWED='([^']+)'", vm).groups()
NTEST_FILES = len([f for f in os.listdir(os.path.join(a.repo, 'tests')) if f.endswith('.test.mjs')])

def P(s, t): return {'s': s, 't': t}
ALLOWED, LOOK, MANUAL, CLOSED, GAP = P('pass', 'Allowed'), P('review', 'Needs a look'), P('manual', 'Manual'), P('off', 'Closed'), P('gap', 'Gap')
YES, NO = P('pass', 'Yes'), P('off', 'No')

# ---------- 3. hand-written sections ----------
S = []
S.append({'id': 'overview', 'group': 'Start', 'title': 'Overview',
  'lede': 'The Open Playbook API makes the decision rules behind Meeleraha open, versioned and checkable, so anyone can see where a number comes from and who owns it.',
  'blocks': [
    {'type': 'kv', 'items': [['Version', '0.1, draft for review'], ['Owner', MO], ['Stage today', '0 Prototype (browser and repository)'],
        ['Playbooks in scope', '8'], ['Draft operations', '%s, all closed (stages 1 to 3)' % n_ops], ['Contracts live today', '6'],
        ['Test cases', 'about 200 in %d files' % NTEST_FILES], ['Model', 'v%s, owner %s, reviewed %s' % (MV, MO, MR)], ['Draft file fingerprint', fp]]},
    {'type': 'note', 'text': '**Verified:** the repository test suite runs green before every release, including the check that sentences, numbers and dreams never reach measurement. The counts on this page (%d events, %d components, %d enumerations, %d toolbox entries) are read from the repository when the page is built.' % (EV, CO, EN, CAT)},
    {'type': 'note', 'text': '**Not verified:** the lever prices, cost multipliers and evidence strengths in the model are assumptions and no reviewer has seen them. The 2027 pension-law text is unread. No lawyer has reviewed the wording or the measurement. The reading probabilities are rule scores, not calibrated model output. No HTTP service exists yet, and the measurement endpoint `/api/e` answered 404 when it was last checked (2026-10-17).'},
    {'type': 'note', 'text': '**What it is not:** advice, a forecast, a bot that negotiates for a person, or a way to collect data about people.'}]})

S.append({'id': 'public', 'group': 'Start', 'title': 'Building in public',
  'lede': 'Meeleraha is built in the open: each release writes a receipt that says what was built, what was tested and what is flagged, and this page keeps them, newest first.',
  'blocks': [
    {'type': 'table', 'columns': ['What', 'Where', 'What we ask'], 'rows': [
      ['Try it', '`meeleraha.ee/tingi` (front door) and `meeleraha.ee/mangukast` (game box)', 'Five people, ten minutes: write one sentence and tell us where you stopped.'],
      ['Review the assumptions', 'Model v%s: lever prices, cost multipliers, evidence strengths' % MV, 'Total Rewards practitioners and a lawyer: where is it naive, and what would you break first?'],
      ['Use the playbooks', 'This reference and the repository', 'HR teams, pension funds and employers: tell us which file you would want first.'],
      ['Find this reference', 'The footer of every Meeleraha page: "For partners: Open Playbook API"', 'Tell us what is missing for your tool.'],
      ['Follow the log', 'The table below', 'Every release adds one row. A row without a flagged list is not a release.']]},
    {'type': 'table', 'columns': ['Date', 'Release', 'Tested', 'Flagged'], 'rows': [
      ['2026-10-17', 'This reference page. Model v%s with owner and review date shown on both pages. Mängukast listed in the toolbox.' % MV, 'About 200 test cases green, 14 files', 'Assumptions unreviewed. No lawyer yet. `/api/e` not live. Canonical addresses to check after deploy.'],
      ['2026-10-16', 'Tingi (one sentence to a table of three packages), Mängukast (seven knots), menu item, shared model file.', 'Privacy tests: sentence, numbers and dream never reach measurement', 'Reading uses simple rules, not a model. Seven languages show English for these pages.'],
      ['2026-10-13', 'Meeleraha in nine languages: Haruta, Lõnga ots, Ajatelg, the toolbox, privacy page.', '159 checks green', 'Eight of nine languages are drafts; native review pending.']]}]})

S.append({'id': 'scope', 'group': 'Guidelines', 'title': 'What the API exposes',
  'lede': 'Eight playbooks are in scope; five have a contract today (the model only as a code module), and three are readable only inside their pages until they are exported.',
  'blocks': [{'type': 'table', 'columns': ['Playbook', 'What it contains', 'Lives in', 'Contract', 'Status'], 'rows': [
    ['Negotiation model', '5 claims against 6 evidence types, 3 styles, 8 levers with prices and cost multipliers, side pools, solver', '`public/vaidle-mudel.js`', 'JS module; JSON export planned', LOOK],
    ['Front door and game box', 'Tingi (one sentence to a table) and Mängukast (seven knots, step by step)', '`tingi.html`, `mangukast.html`', 'State link, Markdown card', ALLOWED],
    ['Thread of knots', '8 knots, 6 situations, rings, trust marks', 'Inline in `ots.html`', 'None yet', CLOSED],
    ['Pension rules', '26 nodes, 18 rumors, trust marks', 'Inline in `haruta.html`', 'None yet', CLOSED],
    ['Life timeline', 'Life blocks, cash flows, balance sheet, forward and backward runs', '`ajatelg.html`', 'JSON file, version 2', ALLOWED],
    ['Toolbox catalog', '%d entries in 9 languages' % CAT, 'JSON block in `kast.html`', 'None yet', CLOSED],
    ['Measurement taxonomy', '%d events, %d components, %d enumerations' % (EV, CO, EN), '`public/taxonomy.json`', 'Public JSON', ALLOWED],
    ['Reading interface', 'Typed answers with probabilities from one sentence', '`tingi.html`', 'Typed object', LOOK]]},
    {'type': 'note', 'text': '**Not exposed, by design:** anything about a person, any write operation, and any HTTP service. None of the three exists today.'}]})

S.append({'id': 'rules', 'group': 'Guidelines', 'title': 'The five rules',
  'lede': 'Five rules govern every playbook; each is held by code or by a named review, and each has a proof.',
  'blocks': [{'type': 'table', 'columns': ['Rule', 'What it means', 'How it is held'], 'rows': [
    ['1 · Education, not advice', 'Outputs are ranges and scenarios, never "you should".', 'Wording on every page, covered by the shared-frame test on all ten pages. Legal wording review is open (stage 2).'],
    ['2 · No personal data crosses the API', 'Inputs stay in the browser. Measurement uses a closed list of events with enumerated values.', 'Unknown events, components and values are rejected. Do Not Track and Global Privacy Control switch it off. Tested: sentence, numbers and dream never reach measurement.'],
    ['3 · Every number has an owner, a source type and a review date', 'The model carries version, owner and review date; every knot carries a trust mark.', '`tests/mudel.test.mjs` checks the metadata and that the tables cover every style, claim, evidence type and lever.'],
    ['4 · Open by default, changed by review', 'One source file per model; changes by pull request with a receipt.', 'Convention today. **Not yet enforced by code;** a CI check is part of stage 1.'],
    ['5 · When a source changes, the owner retests', 'One command runs the suite; law-dependent nodes carry a check date.', 'About 200 test cases in %d files before every release. The 2027 pension-law text is still unread.' % NTEST_FILES]]}]})

S.append({'id': 'roles', 'group': 'Guidelines', 'title': 'Who asks, who runs, who says yes',
  'lede': 'Reading is open to everyone; every change to a number or a wording needs a named yes.',
  'blocks': [{'type': 'table', 'columns': ['Step', 'Who asks', 'Where it runs', 'Yes needed from'], 'rows': [
    ['Read a playbook', 'Anyone: a developer, an HR or Total Rewards team', 'Their own tool or the browser', 'Nobody; it is open'],
    ['Use a playbook in a product', 'A partner', "The partner's side", 'Model owner (attribution) and a written agreement; stage 4 only'],
    ['Change a number in the model', 'Model owner or a reviewer proposes', 'Repository pull request', 'Model owner and one reviewer; two reviewers from stage 2'],
    ['Release a new version', 'Model owner', 'Repository, test suite', 'Model owner, tests green, flagged list shown'],
    ['Optional "read my sentence more closely"', 'The end user, by clicking a separate button', 'A service, planned; the button says what is sent', "The user's click; legal and data-protection review first (stage 3)"],
    ['Partner pilot', 'A partner', "The partner's side", 'Model owner, partner and a lawyer; stage 4 only']]},
    {'type': 'note', 'text': 'The end user is never asked to approve a change to the model; they only decide what leaves their own browser.'}]})

S.append({'id': 'ideas', 'group': 'Guidelines', 'title': 'Where the ideas come from',
  'lede': 'Four outside ideas shaped the design; each is credited, and what we took from it is stated plainly.',
  'blocks': [{'type': 'table', 'columns': ['Idea', 'Source (opened 2026-10-17)', 'What we took'], 'rows': [
    ['Several offers at once, limits first', 'Pactum, Single-Source Negotiation Agent: `pactum.com/procurement-agents/single-source-negotiation`', 'Packages that are equal to the person; the other side picks; limits set before the conversation.'],
    ['Typed answers with probabilities', 'TypeSafe, System One: `docs.typesafe.ai/concepts/system-one`', 'The reading result has the same shape. A hosted model is not used at run time (see Privacy and data).'],
    ['Write the definitions once', 'Shreeraj Gujar, The Dashboard Is Dead. Long Live the Question: `medium.com/@shreerajgujar`', 'One readable model file for every page; owner, version and review date shown.'],
    ['Rules with proofs, a rollout ladder, a flagged list', 'The Mews property config guide of the Distribution team', 'The structure of this reference.']]}]})

S.append({'id': 'principles', 'group': 'Guidelines', 'title': 'Principles: one protocol, many playbooks',
  'lede': 'Every negotiation playbook shares one protocol; only the playbook changes: the levers, the parties and who has the last word.',
  'blocks': [
    {'type': 'table', 'columns': ['Part of the protocol', 'What it means', 'Built in', 'Status'], 'rows': [
      ['Parties and roles', 'Who asks, who answers, who has the last word', '`mangukast.html`, this page', ALLOWED],
      ['Levers, not one number', 'Several things can move, each with a price and an owner', '`vaidle-mudel.js`', LOOK],
      ['Limits first', 'Each side writes its own limits before the conversation', '`mangukast.html` (limits before the table)', ALLOWED],
      ['Several equal packages', 'The other side picks from options that are equal to the person', '`tingi.html`, `mangukast.html`', ALLOWED],
      ['Honest statement', 'What I know, what I do not know, what I assume', '`tingi.html` (What I heard, What I do not know)', ALLOWED],
      ['Source marks, owner, version', 'Every number says where it comes from and who owns it', '`vaidle-mudel.js`, trust marks on every knot', LOOK],
      ['Reveal and receipt', 'Say how the person was nudged; each release writes a receipt', '`mangukast.html` (reveal); change control below', LOOK],
      ['Data stays local, measured by a closed list', 'Nothing typed leaves the browser; only enumerated events are counted', 'Shared frame, `taxonomy.json`', ALLOWED]]},
    {'type': 'table', 'columns': ['Field', 'Parties', 'Levers', 'Last word', 'What "equal" means here', 'Status'], 'rows': [
      ['Pay', 'Employee, employer', 'Pay, leave, learning, remote days, title', 'The employer; the employee may walk away', 'Same table and same information', LOOK],
      ['Supplier contract (the Pactum pattern)', 'Buyer, supplier', 'Price, payment terms, delivery', 'A person outside the buyer\'s limits', 'Limits are fixed before the conversation', CLOSED],
      ['A couple\'s money', 'Two adults', 'Costs, saving, time', 'Both', 'Each side has the same voice and the same view', CLOSED],
      ['Parent and child', 'Parent, child', 'Screen time, drawing, a toy bought with saved money', 'The parent, and the playbook says so', 'The child writes some conditions and sees which were whose', CLOSED]]},
    {'type': 'note', 'text': '**Only the pay playbook exists.** The other three are candidates; the parent and child one is a design sketch from 2026-10-17, not built.'},
    {'type': 'note', 'text': '**What "equal" means:** the tool does not equalise power. It equalises visibility and moves: both sides see the same table, limits are set first and the assumptions are shown. Where one side keeps the last word, as a parent does, the playbook says so instead of pretending.'},
    {'type': 'note', 'text': '**What "secure" means:** today it means local first: nothing typed leaves the browser, and measurement is a closed list. Secure comparison between two parties is not built. The idea: each side writes its limits on its own device and learns only whether room exists and which package fits, without the other side\'s limit being shown. That would use secure multi-party computation (general knowledge, not researched here); it is open question 5 in "Not built yet".'},
    {'type': 'note', 'text': '**Where it does not fit:** single-number disputes, emergencies, coercion or abuse, and court disputes. A stronger side can misuse a tool like this, which is why the reveal is mandatory. Claim only what has been checked.'},
    {'type': 'note', 'text': '**In one line:** Haggle as equals. Securely. Read it together with the two notes above: equal means visible, and secure means local today.'}]})

S.append({'id': 'statuses', 'group': 'Usage', 'title': 'Statuses',
  'lede': 'Every status is a shape and a word, never colour alone.',
  'blocks': [{'type': 'table', 'columns': ['Label', 'Meaning'], 'rows': [
    [ALLOWED, 'Open today, has a contract, and is covered by tests.'],
    [LOOK, 'Open today, but a number or a probability inside it is an unreviewed assumption.'],
    [MANUAL, 'Cannot be checked by tests; a person decides, for example the legal wording.'],
    [CLOSED, 'Not built yet, or closed by a rollout stage.'],
    [GAP, 'Checked and different from what the rules require.']]}]})

S.append({'id': 'model', 'group': 'Usage', 'title': 'Model document',
  'lede': 'The model is one versioned file today; a JSON export, `model.json`, is planned and would carry these fields. The sample values are the current assumptions.',
  'blocks': [{'type': 'table', 'columns': ['Field', 'Meaning', 'Sample value'], 'rows': [
    ['`version`, `owner`, `reviewed`', 'Who owns the numbers and when they were last reviewed', '`0.3`, `Mirko`, `2026-10-17`'],
    ['`units`', 'All prices and costs', '`% of annual pay`'],
    ['`styles`', 'How the other side tends to answer', '`firm`, `flex`, `busy`'],
    ['`base`', "Start of the other side's offer, by style, in percent", '`firm 2`, `flex 3.5`, `busy 2.5`'],
    ['`pool`', 'Side pool added to the budget, by style', '`firm 0.5`, `flex 1.5`, `busy 1`'],
    ['`claims.<id>.value`', 'Points the offer moves when the claim is withdrawn', '`budget 2`'],
    ['`claims.<id>.resistance`', "The other side's resistance, by style", '`firm 3`, `flex 1`, `busy 2`'],
    ['`claims.<id>.strength`', 'Strength of each evidence type against the claim, 0 to 3', '`results 2`, `offer 2`'],
    ['`levers.<id>.price`', 'Market price of one step, in percent of annual pay', '`leave 0.8` (two days)'],
    ['`levers.<id>.multiplier`', 'Cost multiplier, by style', '`firm 1`, `flex 0.9`, `busy 1`'],
    ['`levers.<id>.max_steps`', 'Largest number of steps', '`3`']]}]})

S.append({'id': 'scoring', 'group': 'Usage', 'title': 'How a package is scored',
  'lede': 'Three rules turn the model into answers; the solver checks every combination of steps.',
  'blocks': [{'type': 'table', 'columns': ['Quantity', 'Rule', 'Terms'], 'rows': [
    ['Claim score', '`score = strength + why - resistance`', '`why` is 1 if the person asked Why? first. A score of 2 or more withdraws the claim; 1 weakens it by half.'],
    ['Cost to them', '`C = sum(steps * price * multiplier)`', 'Summed over the levers. The multiplier depends on the other side\'s style.'],
    ['Value to you', '`V = sum(steps * price * rank)`', '`rank` is 3, 2 and 1.5 for the first three priorities, otherwise 1.'],
    ['Their budget', '`B = (offer + pool) * cut`', '`cut` is 0.7 after a budget cut, otherwise 1.'],
    ['Solver', 'All combinations of steps', 'Returns the package with the highest `V` inside `B`, or the cheapest package that reaches a target `V`.']]}]})

S.append({'id': 'reading', 'group': 'Usage', 'title': 'Reading result',
  'lede': 'One sentence becomes typed answers with probabilities, the same shape a System One model returns.',
  'blocks': [{'type': 'table', 'columns': ['Field', 'Type', 'Meaning', 'Rule today'], 'rows': [
    ['`style`', 'Choice with a probability per option', 'How the other side tends to answer', 'Highest wins; under 0.6 the page asks one question.'],
    ['`claims`', '`{on, p}` per claim', 'Which of the five claims is on the table', 'On when `p` is 0.6 or more.'],
    ['`levers`', 'Top three of eight', 'What matters to the person', 'Heard levers first; defaults (pay, leave, learning) fill the rest and are marked.'],
    ['`ask`, `offer`, `walk`, `pay`', '`{value, p}`', 'Raise wanted, offer heard, floor, annual pay', 'A missing value stays missing; the offer falls back to the style start; pay to 60,000 and the page says so.']]},
    {'type': 'note', 'text': 'Probabilities today are rule scores, not calibrated model output, and the page marks them as inferred. Proposed for a calibrated model: 0.9 or more fills the field, 0.6 to 0.9 pre-fills and asks for a tap, under 0.6 asks.'}]})

S.append({'id': 'link', 'group': 'Usage', 'title': 'State link and card',
  'lede': 'The front door hands its reading to the game box in the address fragment, for example `mangukast.html#s=busy&a=10&w=5&p=salary,leave,learn&k=budget`.',
  'blocks': [{'type': 'table', 'columns': ['Key', 'Meaning', 'Rule'], 'rows': [
    ['`s`', 'Style: firm, flex or busy', 'An unknown value is ignored and nothing is opened.'],
    ['`a`, `w`', 'Raise wanted and floor, in percent', 'Numbers only; clamped by the page.'],
    ['`p`', 'Three levers, comma separated', 'Unknown levers are skipped.'],
    ['`k`', 'Claim to open first', 'Unknown claims are skipped.']]},
    {'type': 'note', 'text': 'The fragment never reaches a server, and pay is never in the link. The conversation card is a Markdown file the person downloads: summary, what the machine heard, the table, the manager\'s pick and what it does not know. The option "without amounts" leaves out costs and times. It is a conversation starter, not advice.'}]})

S.append({'id': 'events', 'group': 'Usage', 'title': 'Events',
  'lede': 'Measurement is a closed list of %d events; properties are enumerations, and text and numbers never appear (tested).' % EV,
  'blocks': [{'type': 'table', 'columns': ['Event', 'Properties', 'Fires when'], 'rows': [
    ['Sentence Read', '`confidence`: high, mid, low', 'A sentence was read'],
    ['Reading Corrected', '`field`: style, claim, priority, ask, offer, walk, pay', 'The person corrected a line'],
    ['Package Offered', '`result`: picked, none', 'Packages were offered'],
    ['Surprise Drawn', '`surprise_id`: cap, cut, gift, swap', 'A limit was switched on or a card drawn'],
    ['Surprise Answered', '`surprise_id`, `outcome`: best, close, far', 'A surprise was answered'],
    ['Gamebox Opened', 'none', 'The game box was opened from the front door'],
    ['Debate Started, Debate Restarted', '`style` (started only)', 'The practice started or restarted'],
    ['Evidence Brought, Why Opened, Claim Challenged, Claim Accepted', '`evidence_id`, `claim_id`, `outcome`', 'A step in a knot'],
    ['Cheap Levers Asked, Package Saved, Offer Accepted', '`slot_id`, `path`', 'A step at the table or at the end'],
    ['Independence Shift Viewed', '`bucket`: none, lt1, 1to3, 3plus', 'The time to independence was shown']]}]})

# operations: live contracts by hand, draft endpoints from the generator
S.append({'id': 'op-live', 'group': 'Operations', 'title': 'Live today',
  'lede': 'These contracts exist now, as files and page behaviour. None of them is an HTTP service.',
  'blocks': [{'type': 'ops', 'rows': [
    {'mode': 'read', 'path': '/taxonomy.json', 'status': P('pass', 'Allowed'), 'desc': 'Public JSON: %d events, %d components, %d enumerations.' % (EV, CO, EN)},
    {'mode': 'read', 'path': '/vaidle-mudel.js', 'status': P('review', 'Needs a look'), 'desc': 'Model v%s as a JS module (`window.VM`): tables, solver, owner, review date. Assumptions unreviewed.' % MV},
    {'mode': 'read', 'path': 'mangukast.html#s=...', 'status': P('pass', 'Allowed'), 'desc': 'State link from the front door to the game box. Never reaches a server.'},
    {'mode': 'read', 'path': 'vaidle.md, vaidlus.md', 'status': P('pass', 'Allowed'), 'desc': 'Conversation cards the person downloads from the front door and from the game box.'},
    {'mode': 'read', 'path': 'ajatelg file, version 2', 'status': P('pass', 'Allowed'), 'desc': 'Life timeline JSON: age, horizon, scale, work end, money, blocks. Import and export in the page.'},
    {'mode': 'read', 'path': 'tingi.html readSentence, derive', 'status': P('review', 'Needs a look'), 'desc': 'One sentence to typed answers with probabilities. Rule scores, not calibrated.'}]}]})

order = [('Model', 'Draft endpoints. Closed until stage 1, when the exports exist and are validated in CI.'),
         ('Playbooks', 'Draft endpoints. Closed until stage 1; the pension rules wait for the 2027 law text.'),
         ('Catalog and measurement', 'Draft endpoints. The taxonomy is live today at `/taxonomy.json`; the versioned path opens at stage 1.'),
         ('Reading', 'Draft endpoint. Closed until stage 3. If it ever opens it is a separate, opt-in button that says what is sent.')]
for title, lede in order:
    sec = gen_ops[title]; sec['lede'] = lede; S.append(sec)

# privacy and data collection (distilled from the research note of 2026-10-17)
S.append({'id': 'privacy', 'group': 'Guardrails', 'title': 'Privacy and data',
  'lede': 'Today nothing a person types leaves the browser; the rest of this group says what could change, under which conditions, and what each step would cost.',
  'blocks': [{'type': 'table', 'columns': ['Promise today', 'How it is held', 'Checked'], 'rows': [
    ['Numbers and text stay in the browser', 'No request carries them; tests cover sentence, numbers and dream', ALLOWED],
    ['Only clicks are measured, not what is written', 'A closed event list; free-text properties are rejected', ALLOWED],
    ['No cookies, no persistent identifier, no IP stored; events counted by day', 'Design of the counter; the server side is not live yet', LOOK],
    ['Every page shows what it sends; measurement can be switched off', 'Footer panel; Do Not Track and Global Privacy Control apply automatically', ALLOWED],
    ['Data leaves only when the person writes a message or orders something', 'Contact page uses the mail client; no form posts to a server', ALLOWED],
    ['Legal assessment of the measurement', 'Not done; to be reviewed by a lawyer before public launch', MANUAL]]},
    {'type': 'note', 'text': '**Last checked 2026-10-17:** a research note recorded that the only outgoing request is `POST /api/e`, which answered 404, so the server side of measurement is not live. **Found in the page source the same day:** every Meeleraha page loads its fonts from Google (`fonts.googleapis.com`), which is a request to a third party at page load; the note did not mention it. To be rechecked in a browser. Self-hosting the fonts or using system fonts would remove it. **Not checked:** what is sent after a sentence is entered.'}]})

S.append({'id': 'collect', 'group': 'Guardrails', 'title': 'What may be collected',
  'lede': 'Only fields whose possible values are known in advance may ever be shared: choices, ranges and outcomes.',
  'blocks': [{'type': 'table', 'columns': ['Field type', 'Example', 'Share?', 'Note'], 'rows': [
    ['Free text', 'The sentence about the conversation, a dream, a search', NO, 'Cannot be aggregated and is the most sensitive part. Stays in the browser.'],
    ['Exact number', 'Pay, cost, saving', NO, 'If ever needed, only as a coarse range.'],
    ['Choice from a list', 'Style: firm, flex, busy. Evidence: peer, offer', YES, 'Fits a histogram.'],
    ['Outcome from a list', 'Claim outcome: held, weakened, broken', YES, 'Shows which claims fall.'],
    ['Range', 'Independence shift: none, lt1, 1to3, 3plus', YES, 'Coarse enough not to identify anyone.']]},
    {'type': 'note', 'text': '**What a statistic would say:** what people chose in a practice game, not market pay. Practice often uses sample or wished-for numbers, and the sample is people who found the tool and agreed to share. It suits "which levers and claims are popular", not "how much is paid". Every aggregate would be labelled entered, unconfirmed. Sharing protects inputs, not outputs: a small group can still reveal one person, so an aggregate is published only above a minimum group size.'}]})

S.append({'id': 'options', 'group': 'Guardrails', 'title': 'Options for collecting',
  'lede': 'Four options in growing order of effort and need to trust someone; the recommendation is A, then B, and C or D only when a question demands it.',
  'blocks': [{'type': 'table', 'columns': ['Option', 'What it gives', 'Whom you must trust', 'Effort', 'Fits when'], 'rows': [
    ['A · Counts of enumerated events (today)', 'Daily counts of allowed values', "Meeleraha's own server: it sees a count, not a person", 'Small: the endpoint, legal review', 'The question is "what was clicked"'],
    ['B · Local randomisation (local differential privacy)', 'Each browser randomises its choice before sending; population statistics stay recoverable', 'Nobody: it happens in the browser', 'Small to medium; needs thousands of users', 'You want rough ranges without trusted servers'],
    ['C · Two-server summation with a proof (Prio-type)', 'Exact sums and histograms; a proof rejects invented inputs', 'Two independent operators who do not collude', 'Medium', 'You need exact sums but not medians'],
    ['D · Secret sharing across several parties (Sharemind)', 'Also medians, percentiles, regression; authorised queries only', 'Independent operators; the vendor page names no count or threat model', 'Large: partnership, licence and hosting unclear', 'Questions need distributions and the sample is big enough']]},
    {'type': 'note', 'text': '**Sources and limits:** A and D rest on the read sources (the privacy policy, the Sharemind MPC page, the ITL case study). The descriptions of B and C are general knowledge and were not researched here, so check them before deciding.'}]})

S.append({'id': 'community', 'group': 'Guardrails', 'title': 'Rewriting the rules, openly',
  'lede': 'The current rules are a design decision, not a limit; each may change only if it brings a named benefit, the default stays the same, and the change log is public.',
  'blocks': [{'type': 'table', 'columns': ['Rule today', 'Rule in an opt-in community mode', 'What it gives', 'What it costs'], 'rows': [
    ['Numbers and text never leave the browser', 'Structured fields leave only as random shares; free text never leaves', 'Aggregates of dreams, levers and outcomes', 'Needs explaining, independent parties and a legal assessment'],
    ['We measure clicks, not what is written', "We also measure the person's own coded choices (a taxonomy)", 'Dream, limit, lever and outcome in one dataset', 'Taxonomy design; a combination of fields can identify someone'],
    ['No persistent identifier', 'An optional research identifier, only in a research mode, kept as shares', 'Measuring change over time', 'Breaks today\'s promise; needs an ethics review and clear consent'],
    ['Events counted by day', 'An aggregate is published only above a minimum group size', 'Avoids exposing a small group', 'Part of the data stays unpublished in a small population'],
    ['Do Not Track and Global Privacy Control apply', 'They stay: the signal blocks the offer of the mode', 'Trust', 'Fewer participants'],
    ['No legal assessment yet', 'The assessment is done before the mode starts', 'A lawful basis', 'Time and money']]},
    {'type': 'table', 'columns': ['Principle', 'In practice'], 'rows': [
      ['Version the rules', 'Today\'s local mode stays the default; a new mode is separate; the change log is public.'],
      ['Never retroactive', 'Whoever does not choose, shares nothing.'],
      ['Keep the strongest promise checkable', '"Free text never leaves" stays, and the shares are visible before sending.'],
      ['Name the state as a role, not an owner', 'One party among several and a consumer of aggregates.'],
      ['Separate practice from research', 'Ethics principles are written down in public.'],
      ['Ask three things of every change', 'What is the benefit, who feels it, and what happens if one party misuses it.']]}]})

S.append({'id': 'independence', 'group': 'Guardrails', 'title': 'What independence needs',
  'lede': 'Independence is organisational and legal, not technical: three chains whose keys are held by the same person are still one party.',
  'blocks': [{'type': 'table', 'columns': ['Requirement', 'Why'], 'rows': [
    ['Different legal entities, for example a university, a non-profit and a technology company; a state body as one party, never more than one', 'One owner behind several nodes is a promise, not a property.'],
    ['Different administrators, keys, and cloud providers or locations', 'A single administrator across three servers should not be the norm.'],
    ['A written agreement not to collude, and a public page saying who does what', 'Lets anyone check the claim.'],
    ['Authorised queries and an audit log, not only a pledge', 'The Sharemind MPC page says both exist.'],
    ['A public, tamper-evident log of allowed queries and published results (hashes only)', 'A blockchain helps with transparency, not storage: shares written to a public chain cannot be deleted. General knowledge, not researched here.'],
    ['The browser code is served and checkable by someone other than the game maker', 'The weakest link is the client: whoever changes the script can forward the value unshared. Open source, a verifiable hash and an audit reduce that.']]}]})

S.append({'id': 'never', 'group': 'Guardrails', 'title': 'Things that are never okay',
  'lede': 'These hold at every stage, whoever asks.',
  'blocks': [{'type': 'table', 'columns': ['Never', 'How it is held'], 'rows': [
    ["Collecting, storing or sending a person's numbers, sentences or files, except by a button the person pressed that says what leaves", 'A closed event list; privacy tests; no write operation exists'],
    ['Presenting a result as advice, a forecast or a guarantee', 'Wording on every page; legal review at stage 2'],
    ['Hiding an assumption', 'Trust marks; owner, version and review date on the model'],
    ['Scoring, ranking or profiling individuals', 'No such operation exists in the draft'],
    ['Training a model on what people typed', 'Any optional reading service logs nothing and sends only what the button says'],
    ["Acting for a person: sending an offer, a message or a payment", 'The API is read-only'],
    ["Letting a partner change the model's numbers without a receipt and the reviews", 'Change control below; a CI check is planned (stage 1)'],
    ['Selling aggregates, or publishing anything at the level of one person', 'A public promise to be written before any collection starts (this is a recommendation, not an existing rule)'],
    ['Calling a release done before the tests have run and the flagged list has been shown', 'The release rule; tests run before every release']]}]})

S.append({'id': 'change', 'group': 'Guardrails', 'title': 'Change control',
  'lede': 'Every change to the model ends with a version, a receipt and a flagged list, so a reviewer can see what moved and what nobody has checked.',
  'blocks': [{'type': 'table', 'columns': ['Change', 'Version step', 'Who reviews'], 'rows': [
    ['Wording only', 'Patch (0.3.1)', 'Model owner'],
    ['A number changes: a price, a multiplier, a strength', 'Minor (0.4)', 'Model owner and one reviewer; two from stage 2'],
    ['A field changes meaning, or a lever, claim or style is added or removed', 'Major (1.0)', 'Model owner, two reviewers, and a lawyer if the wording could read as advice']]},
    {'type': 'table', 'columns': ['Receipt field', 'Sample value (a sample, not a real change)'], 'rows': [
      ['Change', 'Learning budget price from 500 to 600 per step'],
      ['Why', 'Three employers quoted 600 in 2026'],
      ['Source type', 'Secondary (employer quotes), not verified'],
      ['Reviewed by', 'Name, date'],
      ['Tests', 'All green (count)'],
      ['Flagged', 'The quotes were not seen by the reviewer']]}]})

S.append({'id': 'rollout', 'group': 'Reference', 'title': 'Rollout stages',
  'lede': 'One ladder, five stages: each adds exactly one thing, no stage is skipped, and no gate is passed without the named people saying yes. A failed or surprising result sends the team back one stage, not forward.',
  'blocks': [{'type': 'table', 'columns': ['Stage', 'Where', 'What is allowed', 'Who performs', 'Signs off to enter', 'Evidence they look at'], 'rows': [
    ['0 Prototype', 'Repository and browser', 'Open files, local rules, tests', 'Mirko', 'Mirko', 'Tests green; flagged list shown'],
    ['1 Open files', 'Static JSON under `/api/v1/`', 'Read-only exports, version in the path', 'Mirko', 'Mirko and one reviewer', 'Exports validate against a schema in CI; receipt check works'],
    ['2 Reviewed model', 'Same', 'Prices and multipliers reviewed; wording reviewed', 'Mirko; reviewers review', 'Two reviewers (one a Total Rewards practitioner) and a lawyer', 'A receipt per changed assumption; a legal note on "education, not advice"'],
    ['3 Calibrated reading', 'First at design time, with invented sentences only; later, optionally, a separate button', 'Local rules calibrated against a typed-answer model. Only after a click and a plain statement of what is sent, a closer reading', 'Mirko', 'Mirko and a lawyer', 'Calibration check on invented sentences; data-protection review; cost per call known'],
    ['4 Partner pilot', "The partner's own tools", 'Employees reach a playbook through the partner, under a written agreement', 'The partner; Mirko supports', 'Mirko, the partner and a lawyer', 'Pilot report; an undo path named']]},
    {'type': 'note', 'text': 'Only stage 0 exists today. Stages 1 to 4 are closed until the items in "Not built yet" exist.'}]})

S.append({'id': 'notbuilt', 'group': 'Reference', 'title': 'Not built yet',
  'lede': 'Stages 1 to 4 stay closed because the following does not exist; each item needs its own tests and review.',
  'blocks': [{'type': 'table', 'columns': ['Item', 'Needed before', 'Status'], 'rows': [
    ['JSON exports of the model, the knots and the pension rules, validated against a schema in CI', 'Stage 1', CLOSED],
    ['A read-only static endpoint such as `/api/v1/model.json`, with the version in the path', 'Stage 1', CLOSED],
    ['A CI check that a model change carries a receipt and a reviewer', 'Stage 1', CLOSED],
    ['A licence and an attribution line for reuse', 'Stage 1', CLOSED],
    ['A named reviewer roster: at least one Total Rewards practitioner and one lawyer', 'Stage 2', CLOSED],
    ['Review of the lever prices and cost multipliers', 'Stage 2', CLOSED],
    ['The 2027 pension-law text read and the rules updated', 'Before the pension rules are exported', CLOSED],
    ['Model texts in the seven languages beyond Estonian and English', 'Stage 2', CLOSED],
    ['A legal assessment of the measurement, and a decision whether `/api/e` goes live and with which events', 'Before any collection', MANUAL],
    ['A check of network requests after a sentence is entered, to confirm that nothing leaves in full use', 'Before any collection', MANUAL],
    ['Answers from the Sharemind team: (1) does the client library run in a browser, (2) how many parties and which trust model, (3) who hosts the nodes, (4) on what terms may a free educational tool use the SDK and the emulator, (5) can two browsers compare limits without a trusted server', 'Before option D and before any two-party comparison', CLOSED],
    ['A calibration set of invented sentences to test the local reading rules', 'Stage 3', CLOSED],
    ['Fonts self-hosted or replaced by system fonts, so that no page requests anything from a third party at load', 'Before any collection', CLOSED],
    ['A partner pilot agreement', 'Stage 4', CLOSED]]}]})

S.append({'id': 'where', 'group': 'Reference', 'title': 'Where things live',
  'lede': 'Short, concrete, plain: the rule before the explanation, numbers before adjectives, and a plain note of what was not checked. Sample values in examples are sample values.',
  'blocks': [{'type': 'table', 'columns': ['Path', 'What it holds'], 'rows': [
    ['`public/vaidle-mudel.js`', 'The negotiation model: tables, solver, version, owner, review date'],
    ['`public/tingi.html`', 'The front door: one sentence to a table of three packages'],
    ['`public/mangukast.html`', 'The game box: seven knots, limits, finance bridge, card'],
    ['`public/ots.html`, `public/haruta.html`, `public/ajatelg.html`', 'Thread of knots, pension rules, life timeline'],
    ['`public/kast.html`', 'The toolbox catalog (JSON block)'],
    ['`public/taxonomy.json`', 'Events, components and enumerations'],
    ['`public/open-playbook-api.html`', 'This page, built from the OpenAPI draft, the allowlist and the hand sections (`tools/open-playbook-api/`)'],
    ['`tests/`', 'The test suite: about 200 cases in %d files' % NTEST_FILES],
    ['`README.md`', 'How the pieces fit together']]}]})

S.append({'id': 'sources', 'group': 'Reference', 'title': 'Sources',
  'lede': 'Pages opened for this draft on 2026-10-17; anything marked as general knowledge was not researched here.',
  'blocks': [{'type': 'table', 'columns': ['Page', 'Used for'], 'rows': [
    ['Pactum, Single-Source Negotiation Agent: `pactum.com/procurement-agents/single-source-negotiation`', 'Several equal offers and limits set first'],
    ['TypeSafe, System One: `docs.typesafe.ai/concepts/system-one`', 'Typed answers with probabilities'],
    ['Shreeraj Gujar, The Dashboard Is Dead. Long Live the Question: `medium.com/@shreerajgujar`', 'The semantic-layer pattern'],
    ['Sharemind MPC: `cyber.ee/products/sharemind-mpc/`', 'Option D: what the product page says and does not say'],
    ['ITL case study: `research.cyber.ee/~jan/publ/itl-system-case-study.pdf`', 'An earlier secret-sharing deployment in a web form'],
    ['Decision Spine: `decisionspine.com`', 'Later: testing whether analytics AI answers honestly'],
    ['Meeleraha privacy page and the front door, read in a browser', 'What the site promises and sends today']]}]})

# ---------- 4. inject into the layout ----------
layout = open(os.path.join(HERE, a.layout), encoding='utf-8').read()
spec = {'brand': 'MEELERAHA', 'title': 'Open Playbook API',
        'intro': 'What the Meeleraha playbooks expose, who owns each number, what is open today, and what is built in public. Read-only, versioned, nothing about a person.',
        'badge': 'Draft 0.1',
        'stamp': 'Built from Open Playbook API 0.1.0-draft (draft file fingerprint %s) and the repository on %s. %s operations in the draft, %s open. The page shows; it never runs.' % (fp, a.date, n_ops, allowed),
        'sections': S}
html = re.sub(r'(<script type="application/json" id="spec">).*?(</script>)',
              lambda m: m.group(1) + '\n' + json.dumps(spec, ensure_ascii=False).replace('</', '<\\/') + '\n' + m.group(2), layout, count=1, flags=re.S)
open(a.out, 'w', encoding='utf-8').write(html)
print('wrote', a.out, len(S), 'sections;', EV, 'events,', CO, 'components,', CAT, 'catalog entries')
