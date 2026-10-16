window.MR_TAX={
 "version": 1,
 "convention": {
  "et": "Sündmused järgivad Segment Spec konventsiooni: „Objekt Tegevus“, Title Case, minevikuvormis. Komponentide ID: leht.jaotis.komponent. Omadused on snake_case ja ainult lubatud loendist.",
  "en": "Events follow the Segment Spec convention: \"Object Action\", Title Case, past tense. Component IDs: page.section.component. Properties are snake_case and only from allowed enumerations.",
  "never": [
   "inimese sisestatud number",
   "inimese sisestatud tekst",
   "faili sisu",
   "vabatekst",
   "püsiv tunnus",
   "IP-aadress"
  ]
 },
 "pages": {
  "index": {
   "name": "Manifest",
   "space": "Tunne",
   "name_en": "Manifesto",
   "space_en": "Feel"
  },
  "haruta": {
   "name": "Haruta lõngakera",
   "space": "Haruta",
   "name_en": "Untangle the yarn ball",
   "space_en": "Untangle"
  },
  "ots": {
   "name": "Lõnga ots",
   "space": "Plaani",
   "name_en": "Thread end",
   "space_en": "Plan"
  },
  "ajatelg": {
   "name": "Ajatelgekiik",
   "space": "Elu",
   "name_en": "Timeline swing",
   "space_en": "Life"
  },
  "kast": {
   "name": "Mängukast",
   "space": "Kast",
   "name_en": "Toolbox",
   "space_en": "Toolbox"
  },
  "kontakt": {
   "name": "Kontakt",
   "space": "Meta",
   "name_en": "Contact",
   "space_en": "Meta"
  },
  "privaatsus": {
   "name": "Privaatsus ja mõõtmine",
   "space": "Meta",
   "name_en": "Privacy and measurement",
   "space_en": "Meta"
  },
  "kell": {
   "name": "Kellakeeramise vestlus",
   "space": "Elu",
   "name_en": "Clock-change check-in",
   "space_en": "Life"
  },
  "playbook": {
   "name": "Läbirääkimiste playbook",
   "space": "Plaani",
   "name_en": "Negotiation playbook",
   "space_en": "Plan"
  },
  "tingi": {
   "name": "Vaieldav masin",
   "space": "Plaani",
   "name_en": "Debatable machine",
   "space_en": "Plan"
  }
 },
 "enums": {
  "langs": [
   "et",
   "en",
   "de",
   "es",
   "fr",
   "nl",
   "sv",
   "da",
   "nb"
  ],
  "pages": [
   "index",
   "haruta",
   "ots",
   "ajatelg",
   "kast",
   "kontakt",
   "privaatsus",
   "kell",
   "tingi",
   "playbook"
  ],
  "entry": [
   "direct",
   "internal",
   "external"
  ],
  "nav_items": [
   "home",
   "haruta",
   "ots",
   "tingi",
   "ajatelg",
   "kast"
  ],
  "footer_items": [
   "kell",
   "privacy",
   "contact"
  ],
  "doors": [
   "feel",
   "haruta",
   "plan",
   "timeline",
   "kast"
  ],
  "breath_modes": [
   "breath",
   "voice"
  ],
  "activity_ids": [
   "reisida",
   "lastelastega",
   "aed",
   "oppimine"
  ],
  "gift_modes": [
   "fut",
   "don"
  ],
  "share_actions": [
   "hide",
   "show",
   "copy"
  ],
  "situations": [
   "kuu-lopp",
   "algus",
   "lapsed",
   "kaasa",
   "rahatark",
   "elunautleja"
  ],
  "knots": [
   "1",
   "2",
   "3",
   "4",
   "5",
   "6",
   "7",
   "8"
  ],
  "cards": [
   "md",
   "tingi",
   "playbook"
  ],
  "amounts": [
   "shown",
   "hidden"
  ],
  "matched": [
   "rumor",
   "node",
   "none"
  ],
  "buckets": [
   "0",
   "1",
   "2-5",
   "6+"
  ],
  "nodes": [
   "kolm-sammast",
   "riiklik-pension-osad",
   "riikliku-pensioni-sisendid",
   "pensioniiga",
   "ii-samba-oigus",
   "ii-samba-varajane",
   "ii-samba-sissemaksed",
   "iii-samba-vanus",
   "iii-samba-mahaarvamine",
   "fondipension",
   "fondipensioni-periood",
   "kogu-raha-korraga-vs-regulaarselt",
   "paindlik-pension",
   "edasilykatud-pension",
   "soodustingimused",
   "maksuvaba-tulu",
   "parimine",
   "kindlustuspension",
   "tootamine-pensionil",
   "eripension",
   "aastahind",
   "taiendav-sissemakse",
   "sisend-synniaasta",
   "sisend-sugu",
   "sisend-lapsed",
   "sisend-tootlus"
  ],
  "rumors": [
   "r-iii-55",
   "r-ii-valja",
   "r-fond-sama",
   "r-pension-65",
   "r-paindlik-sood",
   "r-riiklik-sama",
   "r-maks-pensionil",
   "r-toota-pension",
   "r-surm-riik",
   "r-kindlustus-lopeb",
   "r-eri-paindlik",
   "r-sugu-pensioniiga",
   "r-sama-igal-aastal",
   "r-luhem-maksuvaba",
   "r-kolm-last",
   "r-tootlus-kindel",
   "r-taiendav-koigile",
   "r-edasi-sama"
  ],
  "pull_outcomes": [
   "opened",
   "released"
  ],
  "audio_kinds": [
   "node",
   "rumor"
  ],
  "age_chips": [
   "a14",
   "a24",
   "a43",
   "a55",
   "a85",
   "custom"
  ],
  "presets": [
   "kool",
   "esimene-too",
   "suhe",
   "kolimine",
   "kodu-ost",
   "laps",
   "laen",
   "ii-valjavott",
   "too-vahetus",
   "oma-ettevote",
   "haigus-kaotus",
   "vabadus-reisid",
   "pension",
   "lapselapsed",
   "unistus",
   "oma"
  ],
  "scales": [
   "time",
   "center"
  ],
  "flags": [
   "work_end",
   "horizon"
  ],
  "import_outcomes": [
   "ok",
   "error"
  ],
  "tools": [
   "longa-ots",
   "vaidlusmasin",
   "haruta",
   "kuulujutu-kontroll",
   "ajatelg",
   "elukaar",
   "hingamine",
   "tulevane-mina",
   "kattuvus",
   "kingi",
   "kellakeeramine",
   "longaots-md",
   "vestluskaardid",
   "trumbimang",
   "podcast"
  ],
  "filters": [
   "ring",
   "type",
   "status"
  ],
  "filter_values": [
   "all",
   "mina",
   "lahedased",
   "seadus",
   "aeg",
   "tool",
   "download",
   "game",
   "live",
   "building",
   "idea"
  ],
  "contact_reasons": [
   "general",
   "tool",
   "delivery",
   "seller"
  ],
  "states": [
   "on",
   "off"
  ],
  "debate_styles": [
   "firm",
   "flex",
   "busy"
  ],
  "evidence_ids": [
   "job-ad",
   "peer",
   "survey",
   "ai",
   "results",
   "offer"
  ],
  "claim_ids": [
   "budget",
   "band",
   "market",
   "performance",
   "timing"
  ],
  "challenge_outcomes": [
   "held",
   "weakened",
   "broken"
  ],
  "accept_paths": [
   "quick",
   "sentence"
  ],
  "fire_buckets": [
   "none",
   "lt1",
   "1to3",
   "3plus"
  ],
  "package_slots": [
   "1",
   "2",
   "3"
  ],
  "offer_results": [
   "picked",
   "none"
  ],
  "surprise_ids": [
   "cap",
   "cut",
   "gift",
   "swap"
  ],
  "answer_outcomes": [
   "best",
   "close",
   "far"
  ],
  "read_confidence": [
   "high",
   "mid",
   "low"
  ],
  "reading_fields": [
   "style",
   "claim",
   "priority",
   "ask",
   "offer",
   "walk",
   "pay"
  ]
 },
 "events": {
  "Page Viewed": {
   "desc": "Leht avati.",
   "props": {
    "page": "enum:pages",
    "lang": "enum:langs",
    "entry": "enum:entry"
   },
   "desc_en": "A page was opened."
  },
  "Language Changed": {
   "desc": "Keel vahetati.",
   "props": {
    "from_lang": "enum:langs",
    "to_lang": "enum:langs"
   },
   "desc_en": "The language was changed."
  },
  "Nav Item Clicked": {
   "desc": "Peamenüü link.",
   "props": {
    "item": "enum:nav_items"
   },
   "desc_en": "A main menu link."
  },
  "Footer Link Clicked": {
   "desc": "Jaluse link.",
   "props": {
    "item": "enum:footer_items"
   },
   "desc_en": "A footer link."
  },
  "Measurement Toggled": {
   "desc": "Mõõtmine lülitati sisse või välja.",
   "props": {
    "state": "enum:states"
   },
   "desc_en": "Measurement was turned on or off."
  },
  "Measurement Log Opened": {
   "desc": "Läbipaistvuse paneel avati.",
   "props": {},
   "desc_en": "The transparency panel was opened."
  },
  "Door Clicked": {
   "desc": "Meeleraha kaardi uks.",
   "props": {
    "door": "enum:doors"
   },
   "desc_en": "A door on the Meeleraha map."
  },
  "Breath Started": {
   "desc": "Mikrofoniga juhtimine algas.",
   "props": {
    "mode": "enum:breath_modes"
   },
   "desc_en": "Microphone control started."
  },
  "Activity Selected": {
   "desc": "Pensionitegevus valiti.",
   "props": {
    "activity_id": "enum:activity_ids"
   },
   "desc_en": "A retirement activity was chosen."
  },
  "Call Played": {
   "desc": "Tulevase mina kõne mängiti.",
   "props": {},
   "desc_en": "The future-self call was played."
  },
  "Gift Mode Selected": {
   "desc": "Kingi raam valiti.",
   "props": {
    "mode": "enum:gift_modes"
   },
   "desc_en": "A gift frame was chosen."
  },
  "Share Card Changed": {
   "desc": "Jagatava kaardi toiming.",
   "props": {
    "action": "enum:share_actions"
   },
   "desc_en": "An action on the shareable card."
  },
  "Situation Selected": {
   "desc": "Olukord valiti.",
   "props": {
    "situation_id": "enum:situations"
   },
   "desc_en": "A situation was chosen."
  },
  "Situation Recognized": {
   "desc": "Reegel tuvastas olukorra ja see valiti.",
   "props": {
    "situation_id": "enum:situations"
   },
   "desc_en": "A rule recognised the situation and it was chosen."
  },
  "Knot Opened": {
   "desc": "Lõnga sõlm avati.",
   "props": {
    "knot_id": "enum:knots"
   },
   "desc_en": "A thread knot was opened."
  },
  "Next Thread Pulled": {
   "desc": "Tiriti järgmine lõng.",
   "props": {},
   "desc_en": "The next thread was pulled."
  },
  "Sample Loaded": {
   "desc": "Näidisandmed laaditi.",
   "props": {},
   "desc_en": "Sample data was loaded."
  },
  "Card Downloaded": {
   "desc": "Kaart laaditi alla.",
   "props": {
    "card": "enum:cards",
    "amounts": "enum:amounts"
   },
   "desc_en": "A card was downloaded."
  },
  "Search Submitted": {
   "desc": "Otsing tehti.",
   "props": {
    "matched": "enum:matched",
    "result_bucket": "enum:buckets"
   },
   "desc_en": "A search was made."
  },
  "Node Opened": {
   "desc": "Seaduse sõlm avati.",
   "props": {
    "node_id": "enum:nodes"
   },
   "desc_en": "A law knot was opened."
  },
  "Rumor Opened": {
   "desc": "Kuulujutt avati.",
   "props": {
    "rumor_id": "enum:rumors"
   },
   "desc_en": "A rumor was opened."
  },
  "Knot Pulled": {
   "desc": "Sõlme tirimine lõppes.",
   "props": {
    "outcome": "enum:pull_outcomes"
   },
   "desc_en": "Pulling a knot ended."
  },
  "Audio Played": {
   "desc": "Kõne mängiti lõngakeral.",
   "props": {
    "kind": "enum:audio_kinds"
   },
   "desc_en": "A spoken message was played on the yarn page."
  },
  "Age Chosen": {
   "desc": "Vanus valiti.",
   "props": {
    "age_chip": "enum:age_chips"
   },
   "desc_en": "An age was chosen."
  },
  "Block Added": {
   "desc": "Eluklots lisati.",
   "props": {
    "preset_id": "enum:presets"
   },
   "desc_en": "A life block was added."
  },
  "Block Moved": {
   "desc": "Eluklotsi liigutati.",
   "props": {
    "preset_id": "enum:presets"
   },
   "desc_en": "A life block was moved."
  },
  "Block Resized": {
   "desc": "Eluklotsi pikkust muudeti.",
   "props": {
    "preset_id": "enum:presets"
   },
   "desc_en": "A life block was resized."
  },
  "Peace Made": {
   "desc": "Rahu rida valiti.",
   "props": {
    "preset_id": "enum:presets"
   },
   "desc_en": "A peace line was chosen."
  },
  "Scale Toggled": {
   "desc": "Mõõtkava vahetati.",
   "props": {
    "scale": "enum:scales"
   },
   "desc_en": "The scale was changed."
  },
  "Flag Moved": {
   "desc": "Lippu liigutati.",
   "props": {
    "flag": "enum:flags"
   },
   "desc_en": "A flag was moved."
  },
  "File Exported": {
   "desc": "Fail laaditi alla.",
   "props": {},
   "desc_en": "A file was downloaded."
  },
  "File Imported": {
   "desc": "Fail avati.",
   "props": {
    "outcome": "enum:import_outcomes"
   },
   "desc_en": "A file was opened."
  },
  "Money Sample Loaded": {
   "desc": "Raha näidisandmed laaditi.",
   "props": {},
   "desc_en": "Money sample data was loaded."
  },
  "Tool Opened": {
   "desc": "Tööriist avati kastist.",
   "props": {
    "tool_id": "enum:tools"
   },
   "desc_en": "A tool was opened from the toolbox."
  },
  "Filter Changed": {
   "desc": "Kasti filter muutus.",
   "props": {
    "filter": "enum:filters",
    "value": "enum:filter_values"
   },
   "desc_en": "A toolbox filter changed."
  },
  "Waitlist Clicked": {
   "desc": "Anna märku klõps.",
   "props": {
    "tool_id": "enum:tools"
   },
   "desc_en": "Notify-me was clicked."
  },
  "Contact Started": {
   "desc": "Kontaktikiri avati kasutaja nõusolekul.",
   "props": {
    "reason": "enum:contact_reasons"
   },
   "desc_en": "A message was started with the user’s consent."
  },
  "Calendar Downloaded": {
   "desc": "Kellakeeramise kalender laaditi alla.",
   "props": {},
   "desc_en": "The clock-change calendar was downloaded."
  },
  "Debate Started": {
   "desc": "Vaidluse harjutus algas.",
   "props": {
    "style": "enum:debate_styles"
   },
   "desc_en": "A debate practice started."
  },
  "Evidence Brought": {
   "desc": "Tõend valiti lauale kaasa.",
   "props": {
    "evidence_id": "enum:evidence_ids"
   },
   "desc_en": "A piece of evidence was brought to the table."
  },
  "Why Opened": {
   "desc": "Väite „Miks?“ avati.",
   "props": {
    "claim_id": "enum:claim_ids"
   },
   "desc_en": "A claim’s Why? was opened."
  },
  "Claim Challenged": {
   "desc": "Väide vaidlustati tõendiga.",
   "props": {
    "claim_id": "enum:claim_ids",
    "outcome": "enum:challenge_outcomes"
   },
   "desc_en": "A claim was challenged with evidence."
  },
  "Claim Accepted": {
   "desc": "Väide võeti vastu.",
   "props": {
    "claim_id": "enum:claim_ids"
   },
   "desc_en": "A claim was accepted."
  },
  "Offer Accepted": {
   "desc": "Pakkumine kinnitati.",
   "props": {
    "path": "enum:accept_paths"
   },
   "desc_en": "The offer was accepted."
  },
  "Independence Shift Viewed": {
   "desc": "Majandusliku sõltumatuse nihe vaadati.",
   "props": {
    "bucket": "enum:fire_buckets"
   },
   "desc_en": "The financial-independence shift was viewed."
  },
  "Debate Restarted": {
   "desc": "Harjutus algas uuesti.",
   "props": {},
   "desc_en": "Practice was restarted."
  },
  "Cheap Levers Asked": {
   "desc": "Küsiti, mis on juhile odav.",
   "props": {},
   "desc_en": "Asked what is cheap for the manager."
  },
  "Package Saved": {
   "desc": "Pakett salvestati.",
   "props": {
    "slot_id": "enum:package_slots"
   },
   "desc_en": "A package was saved."
  },
  "Package Offered": {
   "desc": "Paketid esitati juhile.",
   "props": {
    "result": "enum:offer_results"
   },
   "desc_en": "Packages were offered to the manager."
  },
  "Surprise Drawn": {
   "desc": "Üllatuskaart tõmmati.",
   "props": {
    "surprise_id": "enum:surprise_ids"
   },
   "desc_en": "A surprise card was drawn."
  },
  "Surprise Answered": {
   "desc": "Üllatusele vastati.",
   "props": {
    "surprise_id": "enum:surprise_ids",
    "outcome": "enum:answer_outcomes"
   },
   "desc_en": "A surprise was answered."
  },
  "Sentence Read": {
   "desc": "Lause loeti.",
   "props": {
    "confidence": "enum:read_confidence"
   },
   "desc_en": "A sentence was read."
  },
  "Reading Corrected": {
   "desc": "Masina lugemist parandati.",
   "props": {
    "field": "enum:reading_fields"
   },
   "desc_en": "The machine’s reading was corrected."
  },
  "Playbook Opened": {
   "desc": "Läbirääkimiste playbook avati.",
   "props": {},
   "desc_en": "The negotiation playbook was opened."
  }
 },
 "components": {
  "nav.primary.link": {
   "page": "nav",
   "section": "primary",
   "name": "link",
   "desc": "Peamenüü link.",
   "desc_en": "Main menu link."
  },
  "nav.lang.switch": {
   "page": "nav",
   "section": "lang",
   "name": "switch",
   "desc": "Keelevahetus.",
   "desc_en": "Language switch."
  },
  "footer.links.link": {
   "page": "footer",
   "section": "links",
   "name": "link",
   "desc": "Jaluse link.",
   "desc_en": "Footer link."
  },
  "footer.measure.log-link": {
   "page": "footer",
   "section": "measure",
   "name": "log-link",
   "desc": "Avab läbipaistvuse paneeli.",
   "desc_en": "Opens the transparency panel."
  },
  "footer.measure.toggle": {
   "page": "footer",
   "section": "measure",
   "name": "toggle",
   "desc": "Mõõtmise lüliti paneelis.",
   "desc_en": "Measurement switch in the panel."
  },
  "footer.measure.log-panel": {
   "page": "footer",
   "section": "measure",
   "name": "log-panel",
   "desc": "Paneel, mis näitab saadetavaid sündmusi.",
   "desc_en": "Panel showing the events that would be sent."
  },
  "index.hero.cta": {
   "page": "index",
   "section": "hero",
   "name": "cta",
   "desc": "Lehe alguse nupp.",
   "desc_en": "Button at the top of the page."
  },
  "index.hub.door": {
   "page": "index",
   "section": "hub",
   "name": "door",
   "desc": "Meeleraha kaardi uks.",
   "desc_en": "A door on the Meeleraha map."
  },
  "index.breath.mic-button": {
   "page": "index",
   "section": "breath",
   "name": "mic-button",
   "desc": "Hinga mikrofoniga nupp.",
   "desc_en": "Breathe with the microphone button."
  },
  "index.dream.activity-chip": {
   "page": "index",
   "section": "dream",
   "name": "activity-chip",
   "desc": "Pensionitegevuse valik.",
   "desc_en": "Retirement activity choice."
  },
  "index.dream.say-button": {
   "page": "index",
   "section": "dream",
   "name": "say-button",
   "desc": "Loe kõne ette.",
   "desc_en": "Read the call aloud."
  },
  "index.gift.mode-button": {
   "page": "index",
   "section": "gift",
   "name": "mode-button",
   "desc": "Kingi raami valik.",
   "desc_en": "Gift frame choice."
  },
  "index.share.hide-button": {
   "page": "index",
   "section": "share",
   "name": "hide-button",
   "desc": "Jagatava kaardi summade peitmine.",
   "desc_en": "Hide amounts on the shareable card."
  },
  "index.share.copy-button": {
   "page": "index",
   "section": "share",
   "name": "copy-button",
   "desc": "Jagatava kaardi kopeerimine.",
   "desc_en": "Copy the shareable card."
  },
  "haruta.search.form": {
   "page": "haruta",
   "section": "search",
   "name": "form",
   "desc": "Otsingu ja kuulujutu vorm.",
   "desc_en": "Search and rumor form."
  },
  "haruta.yarn.knot": {
   "page": "haruta",
   "section": "yarn",
   "name": "knot",
   "desc": "Lõngakera sõlm.",
   "desc_en": "A knot in the yarn ball."
  },
  "haruta.card.say-button": {
   "page": "haruta",
   "section": "card",
   "name": "say-button",
   "desc": "Kõne nupp sõlme või kuulujutu kaardil.",
   "desc_en": "Speak button on a knot or rumor card."
  },
  "haruta.card.node": {
   "page": "haruta",
   "section": "card",
   "name": "node",
   "desc": "Sõlme link.",
   "desc_en": "Knot link."
  },
  "haruta.card.rumor": {
   "page": "haruta",
   "section": "card",
   "name": "rumor",
   "desc": "Kuulujutu link.",
   "desc_en": "Rumor link."
  },
  "ots.picker.situation-card": {
   "page": "ots",
   "section": "picker",
   "name": "situation-card",
   "desc": "Olukorra kaart.",
   "desc_en": "Situation card."
  },
  "ots.recognition.suggestion": {
   "page": "ots",
   "section": "recognition",
   "name": "suggestion",
   "desc": "Reegli soovitus.",
   "desc_en": "Rule suggestion."
  },
  "ots.inputs.sample-button": {
   "page": "ots",
   "section": "inputs",
   "name": "sample-button",
   "desc": "Näidisandmete nupp.",
   "desc_en": "Sample data button."
  },
  "ots.thread.knot": {
   "page": "ots",
   "section": "thread",
   "name": "knot",
   "desc": "Lõnga sõlm.",
   "desc_en": "A knot of the thread."
  },
  "ots.thread.next-button": {
   "page": "ots",
   "section": "thread",
   "name": "next-button",
   "desc": "Tiri järgmine lõng.",
   "desc_en": "Pull the next thread."
  },
  "ots.file.md-button": {
   "page": "ots",
   "section": "file",
   "name": "md-button",
   "desc": "lõngaots.md allalaadimine.",
   "desc_en": "lõngaots.md download."
  },
  "ajatelg.age.chip": {
   "page": "ajatelg",
   "section": "age",
   "name": "chip",
   "desc": "Vanuse valik.",
   "desc_en": "Age choice."
  },
  "ajatelg.presets.chip": {
   "page": "ajatelg",
   "section": "presets",
   "name": "chip",
   "desc": "Eluklotsi eelseade.",
   "desc_en": "Life block preset."
  },
  "ajatelg.timeline.block": {
   "page": "ajatelg",
   "section": "timeline",
   "name": "block",
   "desc": "Eluklots ajateljel.",
   "desc_en": "A life block on the timeline."
  },
  "ajatelg.timeline.flag": {
   "page": "ajatelg",
   "section": "timeline",
   "name": "flag",
   "desc": "Töö lõpu või horisondi lipp.",
   "desc_en": "Work-end or horizon flag."
  },
  "ajatelg.setup.scale-button": {
   "page": "ajatelg",
   "section": "setup",
   "name": "scale-button",
   "desc": "Mõõtkava nupp.",
   "desc_en": "Scale button."
  },
  "ajatelg.detail.peace-button": {
   "page": "ajatelg",
   "section": "detail",
   "name": "peace-button",
   "desc": "Rahu rea valik.",
   "desc_en": "Peace line choice."
  },
  "ajatelg.file.export-button": {
   "page": "ajatelg",
   "section": "file",
   "name": "export-button",
   "desc": "Faili allalaadimine.",
   "desc_en": "File download."
  },
  "ajatelg.file.import-input": {
   "page": "ajatelg",
   "section": "file",
   "name": "import-input",
   "desc": "Faili avamine.",
   "desc_en": "File open."
  },
  "ajatelg.money.sample-button": {
   "page": "ajatelg",
   "section": "money",
   "name": "sample-button",
   "desc": "Raha näidisandmete nupp.",
   "desc_en": "Money sample data button."
  },
  "kast.catalog.tool-card": {
   "page": "kast",
   "section": "catalog",
   "name": "tool-card",
   "desc": "Tööriista kaart.",
   "desc_en": "Tool card."
  },
  "kast.filters.filter": {
   "page": "kast",
   "section": "filters",
   "name": "filter",
   "desc": "Kasti filter.",
   "desc_en": "Toolbox filter."
  },
  "kast.catalog.waitlist-button": {
   "page": "kast",
   "section": "catalog",
   "name": "waitlist-button",
   "desc": "Anna märku nupp.",
   "desc_en": "Notify-me button."
  },
  "kontakt.form.submit": {
   "page": "kontakt",
   "section": "form",
   "name": "submit",
   "desc": "Kirja avamise nupp.",
   "desc_en": "Open-the-message button."
  },
  "kell.calendar.download-button": {
   "page": "kell",
   "section": "calendar",
   "name": "download-button",
   "desc": "Kalendri allalaadimine.",
   "desc_en": "Calendar download."
  },
  "privaatsus.demo.button": {
   "page": "privaatsus",
   "section": "demo",
   "name": "button",
   "desc": "Demonupp, mis tekitab näidissündmuse.",
   "desc_en": "Demo button that creates an example event."
  },
  "privaatsus.settings.toggle": {
   "page": "privaatsus",
   "section": "settings",
   "name": "toggle",
   "desc": "Mõõtmise lüliti.",
   "desc_en": "Measurement switch."
  },
  "playbook.style.pick": {
   "page": "playbook",
   "section": "style",
   "name": "pick",
   "desc": "Valib vastaspoole stiili ja alustab harjutust.",
   "desc_en": "Chooses the counterpart style and starts the practice."
  },
  "playbook.inputs.sample-button": {
   "page": "playbook",
   "section": "inputs",
   "name": "sample-button",
   "desc": "Laeb näidisandmed.",
   "desc_en": "Loads sample data."
  },
  "playbook.evidence.card": {
   "page": "playbook",
   "section": "evidence",
   "name": "card",
   "desc": "Tõendi kaart.",
   "desc_en": "An evidence card."
  },
  "playbook.offer.quick": {
   "page": "playbook",
   "section": "offer",
   "name": "quick",
   "desc": "Kinnitab pakkumise kohe.",
   "desc_en": "Accepts the offer at once."
  },
  "playbook.offer.sentence": {
   "page": "playbook",
   "section": "offer",
   "name": "sentence",
   "desc": "Kinnitab pakkumise lausega.",
   "desc_en": "Accepts the offer with a sentence."
  },
  "playbook.thread.knot": {
   "page": "playbook",
   "section": "thread",
   "name": "knot",
   "desc": "Avab sõlme.",
   "desc_en": "Opens a knot."
  },
  "playbook.thread.next-button": {
   "page": "playbook",
   "section": "thread",
   "name": "next-button",
   "desc": "Tirib järgmise lõnga.",
   "desc_en": "Pulls the next thread."
  },
  "playbook.claim.why": {
   "page": "playbook",
   "section": "claim",
   "name": "why",
   "desc": "Avab väite aluse.",
   "desc_en": "Opens the basis of a claim."
  },
  "playbook.claim.challenge": {
   "page": "playbook",
   "section": "claim",
   "name": "challenge",
   "desc": "Vaidlustab väite tõendiga.",
   "desc_en": "Challenges a claim with evidence."
  },
  "playbook.claim.accept": {
   "page": "playbook",
   "section": "claim",
   "name": "accept",
   "desc": "Võtab väite vastu.",
   "desc_en": "Accepts a claim."
  },
  "playbook.fire.panel": {
   "page": "playbook",
   "section": "fire",
   "name": "panel",
   "desc": "Sõltumatuse aja paneel.",
   "desc_en": "Time-to-independence panel."
  },
  "playbook.file.md-button": {
   "page": "playbook",
   "section": "file",
   "name": "md-button",
   "desc": "Laeb alla vestluskaardi.",
   "desc_en": "Downloads the conversation card."
  },
  "playbook.result.restart": {
   "page": "playbook",
   "section": "result",
   "name": "restart",
   "desc": "Alustab uuesti.",
   "desc_en": "Starts again."
  },
  "playbook.table.cheap-button": {
   "page": "playbook",
   "section": "table",
   "name": "cheap-button",
   "desc": "Küsib, mis on juhile odav.",
   "desc_en": "Asks what is cheap for the manager."
  },
  "playbook.table.save-button": {
   "page": "playbook",
   "section": "table",
   "name": "save-button",
   "desc": "Salvestab paketi.",
   "desc_en": "Saves a package."
  },
  "playbook.table.offer-button": {
   "page": "playbook",
   "section": "table",
   "name": "offer-button",
   "desc": "Esitab paketid juhile.",
   "desc_en": "Offers the packages to the manager."
  },
  "playbook.surprise.draw-button": {
   "page": "playbook",
   "section": "surprise",
   "name": "draw-button",
   "desc": "Tõmbab üllatuse.",
   "desc_en": "Draws a surprise."
  },
  "playbook.surprise.answer-button": {
   "page": "playbook",
   "section": "surprise",
   "name": "answer-button",
   "desc": "Vastab üllatusele.",
   "desc_en": "Answers a surprise."
  },
  "tingi.sentence.listen-button": {
   "page": "tingi",
   "section": "sentence",
   "name": "listen-button",
   "desc": "Loeb lause.",
   "desc_en": "Reads the sentence."
  },
  "tingi.sentence.example": {
   "page": "tingi",
   "section": "sentence",
   "name": "example",
   "desc": "Laeb näitelause.",
   "desc_en": "Loads an example sentence."
  },
  "tingi.reading.chip": {
   "page": "tingi",
   "section": "reading",
   "name": "chip",
   "desc": "Parandab masina lugemist.",
   "desc_en": "Corrects the machine’s reading."
  },
  "tingi.board.limit-toggle": {
   "page": "tingi",
   "section": "board",
   "name": "limit-toggle",
   "desc": "Lülitab palgalae või eelarve kärbe.",
   "desc_en": "Toggles the pay cap or budget cut."
  },
  "tingi.board.offer-button": {
   "page": "tingi",
   "section": "board",
   "name": "offer-button",
   "desc": "Esitab kolm paketti.",
   "desc_en": "Offers the three packages."
  },
  "tingi.board.playbook-link": {
   "page": "tingi",
   "section": "board",
   "name": "playbook-link",
   "desc": "Avab playbooki.",
   "desc_en": "Opens the playbook."
  },
  "tingi.file.md-button": {
   "page": "tingi",
   "section": "file",
   "name": "md-button",
   "desc": "Laeb alla vestluskaardi.",
   "desc_en": "Downloads the conversation card."
  }
 }
};
