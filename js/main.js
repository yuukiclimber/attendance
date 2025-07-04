const storageKey = "kintai_log";
let log = JSON.parse(localStorage.getItem(storageKey) || "[]");
let editingIndex = null; // 編集中のインデックス保持用

function record() {
  const date = document.getElementById("date").value || new Date().toISOString().slice(0,10);
  const start = document.getElementById("start").value;
  const end = document.getElementById("end").value;
  const memo = document.getElementById("memo").value.trim();

  if (!start || !end) {
    alert("開始時間と終了時間を入力してください");
    return;
  }

  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const hours = ((eh * 60 + em) - (sh * 60 + sm)) / 60;

  if (hours < 0) {
    alert("終了時間は開始時間より後にしてください");
    return;
  }

  const newEntry = { date, start, end, hours: hours.toFixed(2), memo };

  if (editingIndex !== null) {
    log[editingIndex] = newEntry;
    editingIndex = null;
    document.querySelector("button").textContent = "記録する";
  } else {
    log.push(newEntry);
  }

  saveAndRender();
}

function render() {
  const tbody = document.getElementById("log");
  tbody.innerHTML = "";

  log.sort((a, b) => (a.date + "T" + a.start) > (b.date + "T" + b.start) ? -1 : 1);

  log.forEach((row, index) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${row.date}</td>
      <td>${row.start}</td>
      <td>${row.end}</td>
      <td>${formatHours(row.hours)}</td>
      <td>${row.memo || ""}</td>
      <td>
        <button onclick="editRow(${index})">編集</button>
        <button onclick="deleteRow(${index})">削除</button>
      </td>`;
    tbody.appendChild(tr);
  });

  renderSummary();
  renderCalendar();
}

function editRow(index) {
  const row = log[index];
  document.getElementById("date").value = row.date;
  document.getElementById("start").value = row.start;
  document.getElementById("end").value = row.end;
  document.getElementById("memo").value = row.memo || "";
  editingIndex = index;
  document.querySelector("button").textContent = "更新する";
}

function deleteRow(index) {
  if (confirm("この記録を削除しますか？")) {
    log.splice(index, 1);
    saveAndRender();
  }
}

function saveAndRender() {
  localStorage.setItem(storageKey, JSON.stringify(log));
  render();
}

// 週の開始日（月曜）を取得
function getWeekStartDate(dateStr) {
  const d = new Date(dateStr);
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1 - day);
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

function renderSummary() {
  const summaryMonth = {};
  const summaryWeek = {};

  log.forEach(row => {
    const month = row.date.slice(0,7);
    summaryMonth[month] = (summaryMonth[month] || 0) + parseFloat(row.hours);

    const weekStart = getWeekStartDate(row.date);
    summaryWeek[weekStart] = (summaryWeek[weekStart] || 0) + parseFloat(row.hours);
  });

  const summaryDiv = document.getElementById("summary");
  summaryDiv.innerHTML =
    "📊 月別労働時間：<br>" +
    Object.entries(summaryMonth).map(([m,t]) => `${m}: ${formatHours(t)} 時間`).join("<br>") +
    "<br><br>" +
    "📅 週別労働時間：<br>" +
    Object.entries(summaryWeek).map(([w,t]) => `${w}: ${formatHours(t)} 時間`).join("<br>");
}

// カレンダー表示用変数
let currentYear, currentMonth;

// 小数点以下のゼロを除去して文字列化する関数
function formatHours(hours) {
  const n = Number(hours);
  return Number.isInteger(n) ? n.toString() : n.toFixed(2).replace(/\.?0+$/, "");
}

// カレンダー初期化
function initCalendar() {
  const today = new Date();
  currentYear = today.getFullYear();
  currentMonth = today.getMonth(); // 0=1月
  renderCalendar();
}

// 月を切り替え
function changeMonth(diff) {
  currentMonth += diff;
  if (currentMonth < 0) {
    currentMonth = 11;
    currentYear--;
  } else if (currentMonth > 11) {
    currentMonth = 0;
    currentYear++;
  }
  renderCalendar();
}

// 全期間の日別労働時間を取得
function getAllDailyTotals() {
  const totals = {};
  log.forEach(row => {
    const date = row.date;
    totals[date] = (totals[date] || 0) + parseFloat(row.hours);
  });
  return totals;
}

// 月名配列（日本語）
const monthNamesJP = ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"];

// カレンダー描画関数
function renderCalendar() {
  const tbody = document.getElementById("calendar-body");
  tbody.innerHTML = "";

  // カレンダー上部に年月表示
  const header = document.getElementById("calendar-header");
  header.textContent = `${currentYear}年 ${monthNamesJP[currentMonth]}`;

  // 月曜始まり対応の最初の曜日（0=月曜, 6=日曜）
  const firstDay = new Date(currentYear, currentMonth, 1);
  const lastDay = new Date(currentYear, currentMonth + 1, 0);
  let firstWeekday = firstDay.getDay();
  firstWeekday = (firstWeekday === 0) ? 6 : firstWeekday - 1;

  const dailyTotals = getAllDailyTotals();

  // 週開始日ごとの合計を計算するオブジェクト
  const weeklyTotalsByWeekStart = {};

  // --- カレンダーの前月部分を描画 ---
  let tr = document.createElement("tr");
  const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
  const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
  const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate();

  for (let i = 0; i < firstWeekday; i++) {
    const prevDay = prevMonthLastDay - (firstWeekday - i - 1);
    const td = document.createElement("td");
    td.className = "other-month";
    const displayDate = `${prevMonth + 1}/${prevDay}`;
    const dateStr = `${prevYear}-${String(prevMonth + 1).padStart(2, "0")}-${String(prevDay).padStart(2, "0")}`;
    const dayHours = dailyTotals[dateStr] || 0;
    td.innerHTML = `<strong>${displayDate}</strong><br>` + (dayHours ? formatHours(dayHours) + " 時間" : "");
    tr.appendChild(td);

    // 前月の日も週開始日を求めて合計に加算
    const weekStart = getWeekStartDate(dateStr);
    if (!weeklyTotalsByWeekStart[weekStart]) weeklyTotalsByWeekStart[weekStart] = 0;
    weeklyTotalsByWeekStart[weekStart] += dayHours;
  }

  // --- 当月の日を描画 ---
  const daysInMonth = lastDay.getDate();
  for (let day = 1; day <= daysInMonth; day++) {
    // 7日ごとに週合計セルを入れて行を閉じるための判定
    if ((firstWeekday + day - 1) % 7 === 0 && day !== 1) {
      // 今まで計算した週の開始日を求めて、その週合計を取得
      const prevWeekDate = new Date(currentYear, currentMonth, day - 1);
      const prevWeekStart = getWeekStartDate(prevWeekDate.toISOString().slice(0, 10));
      const weekTotal = weeklyTotalsByWeekStart[prevWeekStart] || 0;

      // 週合計セルを追加して行を閉じる
      const weekTotalTd = document.createElement("td");
      weekTotalTd.className = "week-total";
      weekTotalTd.textContent = formatHours(weekTotal) + " 時間";
      tr.appendChild(weekTotalTd);
      tbody.appendChild(tr);

      // 新しい行を開始
      tr = document.createElement("tr");
    }

    const td = document.createElement("td");
    td.style.verticalAlign = "top";
    td.style.height = "60px";

    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const dayHours = dailyTotals[dateStr] || 0;

    td.innerHTML = `<strong>${currentMonth + 1}/${day}</strong><br>` + (dayHours ? formatHours(dayHours) + " 時間" : "");
    tr.appendChild(td);

    // 週開始日を取得して週合計に加算
    const weekStart = getWeekStartDate(dateStr);
    if (!weeklyTotalsByWeekStart[weekStart]) weeklyTotalsByWeekStart[weekStart] = 0;
    weeklyTotalsByWeekStart[weekStart] += dayHours;
  }

  // --- 翌月の日付で空白埋め ---
  let nextDay = 1;
  const nextMonth = (currentMonth + 1) % 12;
  const nextYear = (currentMonth === 11) ? currentYear + 1 : currentYear;
  while (tr.children.length < 7) {
    const td = document.createElement("td");
    td.className = "other-month";
    const displayDate = `${nextMonth + 1}/${nextDay}`;
    const dateStr = `${nextYear}-${String(nextMonth + 1).padStart(2, "0")}-${String(nextDay).padStart(2, "0")}`;
    const dayHours = dailyTotals[dateStr] || 0;
    td.innerHTML = `<strong>${displayDate}</strong><br>` + (dayHours ? formatHours(dayHours) + " 時間" : "");
    tr.appendChild(td);

    // 翌月の日も週合計に加算
    const weekStart = getWeekStartDate(dateStr);
    if (!weeklyTotalsByWeekStart[weekStart]) weeklyTotalsByWeekStart[weekStart] = 0;
    weeklyTotalsByWeekStart[weekStart] += dayHours;

    nextDay++;
  }

  // 最後の週の合計を入れてテーブルに追加
  const lastDayDateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}`;
  const lastWeekStart = getWeekStartDate(lastDayDateStr);
  const lastWeekTotal = weeklyTotalsByWeekStart[lastWeekStart] || 0;

  const lastWeekTotalTd = document.createElement("td");
  lastWeekTotalTd.className = "week-total";
  lastWeekTotalTd.textContent = formatHours(lastWeekTotal) + " 時間";
  tr.appendChild(lastWeekTotalTd);
  tbody.appendChild(tr);
}

// ページ読み込み時初期化
initCalendar();
render();
