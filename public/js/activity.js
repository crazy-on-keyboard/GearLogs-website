/* GearLogs website — live activity ledger (mock data, faithful to the app log).
   External file per the strict CSP (script-src 'self'). All names/gear are
   fictional demo data. Times shown are today's date + a rolling clock. */
(function () {
  var feed = document.getElementById('actfeed');
  if (!feed) return;

  var USERS = [["US-004","Marcus Reed"],["US-006","Elena Sokolova"],["US-009","Tomás Rivera"],["US-011","Aisha Bello"],["US-013","Jonas Berg"],["US-015","Priya Nair"],["US-018","Kenji Watanabe"],["US-021","Sofia Marchetti"],["US-024","Omar Haddad"],["US-027","Grace Okafor"],["US-030","Liam Fletcher"],["US-033","Nadia Petrova"]];
  var ITEMS = [["EQ-001","Laptop (14-inch)"],["EQ-006","Two-Way Radio"],["EQ-013","Barcode Scanner"],["EQ-017","First-Aid Kit"],["EQ-022","Cordless Drill"],["EQ-028","Safety Harness"],["EQ-031","Label Printer"],["EQ-035","Defibrillator (AED)"],["EQ-042","Impact Wrench"],["EQ-048","Hi-Vis Vest"],["EQ-055","Headlamp"],["EQ-061","Pallet Jack"],["EQ-067","Tablet (10-inch)"],["EQ-071","Fuel Can"],["EQ-078","Angle Grinder"],["EQ-084","Binoculars"],["EQ-090","Hard Hat"],["EQ-096","Multimeter"],["EQ-103","Tool Roll"],["EQ-118","Extension Ladder"],["EQ-126","GPS Unit"]];
  var PEOPLE = [["PR-001","J. Whitaker"],["PR-006","M. Larsson"],["PR-007","D. Petrov"],["PR-011","G. Traoré"],["PR-003","K. Novak"],["PR-002","R. Ibáñez"],["PR-014","F. Diallo"],["PR-019","L. Nguyen"],["PR-022","A. Kowalski"],["PR-028","S. Mbeki"],["PR-034","H. Yamamoto"],["PR-041","C. Andersen"]];
  var REASONS = ["Lost","Damaged","Stolen","Unreturned"];

  function pad(n) { return String(n).length < 2 ? "0" + n : "" + n; }
  function code(c) {
    var p = c.split("-")[0];
    var cls = p === "EQ" ? "c-eq" : p === "PR" ? "c-pr" : p === "GR" ? "c-gr" : "c-tb";
    return '<span class="actcode ' + cls + '">' + c + "</span>";
  }
  function qty(n) { return '<span class="actqty">' + n + "x</span>"; }

  var now = new Date();
  var today = pad(now.getDate()) + "/" + pad(now.getMonth() + 1) + "/" + now.getFullYear();
  var h = now.getHours(), m = now.getMinutes(), s = now.getSeconds();
  function tick() { s -= 7; if (s < 0) { s += 60; m -= 1; } if (m < 0) { m += 60; h -= 1; } if (h < 0) h = 23; return pad(h) + ":" + pad(m) + ":" + pad(s); }

  var rows = [], N = 40;
  for (var i = 0; i < N; i++) {
    var u = USERS[i % USERS.length], it = ITEMS[(i * 3 + 1) % ITEMS.length], pe = PEOPLE[(i * 2 + 3) % PEOPLE.length];
    var q = (i % 4) + 1, kind = i % 7, badge, cls, act;
    if (kind === 0 || kind === 3) { badge = "DISP"; cls = "b-disp"; act = "Dispensed " + qty(q) + " " + code(it[0]) + " " + it[1] + " to " + code(pe[0]) + ' <span class="who">' + pe[1] + "</span>"; }
    else if (kind === 1 || kind === 4) { badge = "RTN"; cls = "b-rtn"; act = "Returned " + qty(q) + " " + code(it[0]) + " " + it[1] + " from " + code(pe[0]) + ' <span class="who">' + pe[1] + "</span>"; }
    else if (kind === 2) { badge = "ASG"; cls = "b-asg"; act = "Assigned " + code(it[0]) + " " + it[1] + " to " + code(pe[0]) + ' <span class="who">' + pe[1] + "</span>"; }
    else if (kind === 5) { badge = "W-OFF"; cls = "b-woff"; act = "Wrote off " + qty(q) + " " + code(it[0]) + " " + it[1] + " (" + REASONS[i % REASONS.length] + ") from " + code(pe[0]) + ' <span class="who">' + pe[1] + "</span>"; }
    else { badge = "ADD"; cls = "b-add"; act = "Added " + qty(q + 4) + " " + code(it[0]) + " " + it[1] + " to stock"; }
    rows.push('<div class="actrow"><span class="ts">' + today + ", " + tick() + '</span><span class="user"><span class="uc">' + u[0] + '</span><span class="un">' + u[1] + '</span></span><span><span class="actbadge ' + cls + '">' + badge + '</span></span><span class="act">' + act + "</span></div>");
  }
  feed.innerHTML = rows.join("") + rows.join(""); // duplicate for a seamless loop
})();
