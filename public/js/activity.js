/* GearLogs website — live activity ledger (mock data, faithful to the app log).
   External file per the strict CSP (script-src 'self'). All names/gear are fictional
   demo data. Times shown are today's date + a rolling clock. Bilingual: the row text,
   badges and demo names follow the page language (document.documentElement.lang). */
(function () {
  var feed = document.getElementById('actfeed');
  if (!feed) return;

  var HE = document.documentElement.lang === 'he';
  var ni = HE ? 2 : 1; // name column: [code, en, he]

  // [code, English name, Hebrew name]
  var USERS = [
    ["US-004", "Marcus Reed", "יונתן כהן"], ["US-006", "Elena Sokolova", "מאיה לוי"],
    ["US-009", "Tomás Rivera", "דניאל אברהם"], ["US-011", "Aisha Bello", "נועה פרידמן"],
    ["US-013", "Jonas Berg", "איתי שפירא"], ["US-015", "Priya Nair", "תמר ביטון"],
    ["US-018", "Kenji Watanabe", "עומר דהן"], ["US-021", "Sofia Marchetti", "שירה מזרחי"],
    ["US-024", "Omar Haddad", "אורי ברק"], ["US-027", "Grace Okafor", "ליאת אזולאי"],
    ["US-030", "Liam Fletcher", "גיא רוזן"], ["US-033", "Nadia Petrova", "הדר סגל"],
  ];
  var ITEMS = [
    ["EQ-001", "Laptop (14-inch)", "מחשב נייד (14 אינץ׳)"], ["EQ-006", "Two-Way Radio", "מכשיר קשר"],
    ["EQ-013", "Barcode Scanner", "סורק ברקוד"], ["EQ-017", "First-Aid Kit", "ערכת עזרה ראשונה"],
    ["EQ-022", "Cordless Drill", "מקדחה נטענת"], ["EQ-028", "Safety Harness", "רתמת בטיחות"],
    ["EQ-031", "Label Printer", "מדפסת מדבקות"], ["EQ-035", "Defibrillator (AED)", "דפיברילטור (AED)"],
    ["EQ-042", "Impact Wrench", "מפתח אימפקט"], ["EQ-048", "Hi-Vis Vest", "אפוד זוהר"],
    ["EQ-055", "Headlamp", "פנס ראש"], ["EQ-061", "Pallet Jack", "עגלת משטחים"],
    ["EQ-067", "Tablet (10-inch)", "טאבלט (10 אינץ׳)"], ["EQ-071", "Fuel Can", "מיכל דלק"],
    ["EQ-078", "Angle Grinder", "משחזת זווית"], ["EQ-084", "Binoculars", "משקפת"],
    ["EQ-090", "Hard Hat", "קסדת מגן"], ["EQ-096", "Multimeter", "מודד רב-תכליתי"],
    ["EQ-103", "Tool Roll", "גליל כלים"], ["EQ-118", "Extension Ladder", "סולם הארכה"],
    ["EQ-126", "GPS Unit", "מכשיר GPS"],
  ];
  var PEOPLE = [
    ["PR-001", "J. Whitaker", "י. כהן"], ["PR-006", "M. Larsson", "מ. לוי"],
    ["PR-007", "D. Petrov", "ד. פרץ"], ["PR-011", "G. Traoré", "ג. ביטון"],
    ["PR-003", "K. Novak", "ק. גולן"], ["PR-002", "R. Ibáñez", "ר. אזולאי"],
    ["PR-014", "F. Diallo", "פ. דהן"], ["PR-019", "L. Nguyen", "ל. חדד"],
    ["PR-022", "A. Kowalski", "א. שמעוני"], ["PR-028", "S. Mbeki", "ס. מלכה"],
    ["PR-034", "H. Yamamoto", "ה. אנקרי"], ["PR-041", "C. Andersen", "כ. רוזן"],
  ];
  var REASONS = HE ? ["אבד", "ניזוק", "נגנב", "לא הוחזר"] : ["Lost", "Damaged", "Stolen", "Unreturned"];

  var L = HE
    ? { disp: "נופק", rtn: "הוחזר", asg: "הוקצה", woff: "נרשם כאובדן", add: "נוסף למלאי",
        to: "אל", from: "מאת", at: "אצל", addSuffix: "",
        bDisp: "ניפוק", bRtn: "החזרה", bAsg: "הקצאה", bWoff: "אובדן", bAdd: "הוספה" }
    : { disp: "Dispensed", rtn: "Returned", asg: "Assigned", woff: "Wrote off", add: "Added",
        to: "to", from: "from", at: "from", addSuffix: " to stock",
        bDisp: "DISP", bRtn: "RTN", bAsg: "ASG", bWoff: "W-OFF", bAdd: "ADD" };

  function pad(n) { return String(n).length < 2 ? "0" + n : "" + n; }
  function code(c) {
    var p = c.split("-")[0];
    var cls = p === "EQ" ? "c-eq" : p === "PR" ? "c-pr" : p === "GR" ? "c-gr" : "c-tb";
    return '<span class="actcode ' + cls + '">' + c + "</span>";
  }
  function qty(n) { return '<span class="actqty">' + n + "x</span>"; }
  function who(pe) { return code(pe[0]) + ' <span class="who">' + pe[ni] + "</span>"; }

  var now = new Date();
  var today = pad(now.getDate()) + "/" + pad(now.getMonth() + 1) + "/" + now.getFullYear();
  var h = now.getHours(), m = now.getMinutes(), s = now.getSeconds();
  function tick() { s -= 7; if (s < 0) { s += 60; m -= 1; } if (m < 0) { m += 60; h -= 1; } if (h < 0) h = 23; return pad(h) + ":" + pad(m) + ":" + pad(s); }

  var rows = [], N = 40;
  for (var i = 0; i < N; i++) {
    var u = USERS[i % USERS.length], it = ITEMS[(i * 3 + 1) % ITEMS.length], pe = PEOPLE[(i * 2 + 3) % PEOPLE.length];
    var q = (i % 4) + 1, kind = i % 7, badge, cls, act;
    var itLine = code(it[0]) + " " + it[ni];
    if (kind === 0 || kind === 3) { badge = L.bDisp; cls = "b-disp"; act = L.disp + " " + qty(q) + " " + itLine + " " + L.to + " " + who(pe); }
    else if (kind === 1 || kind === 4) { badge = L.bRtn; cls = "b-rtn"; act = L.rtn + " " + qty(q) + " " + itLine + " " + L.from + " " + who(pe); }
    else if (kind === 2) { badge = L.bAsg; cls = "b-asg"; act = L.asg + " " + itLine + " " + L.to + " " + who(pe); }
    else if (kind === 5) { badge = L.bWoff; cls = "b-woff"; act = L.woff + " " + qty(q) + " " + itLine + " (" + REASONS[i % REASONS.length] + ") " + L.at + " " + who(pe); }
    else { badge = L.bAdd; cls = "b-add"; act = L.add + " " + qty(q + 4) + " " + itLine + L.addSuffix; }
    rows.push('<div class="actrow"><span class="ts">' + today + ", " + tick() + '</span><span class="user"><span class="uc">' + u[0] + '</span><span class="un">' + u[ni] + '</span></span><span><span class="actbadge ' + cls + '">' + badge + '</span></span><span class="act">' + act + "</span></div>");
  }
  feed.innerHTML = rows.join("") + rows.join(""); // duplicate for a seamless loop
})();
