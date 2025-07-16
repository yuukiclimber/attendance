// calendar.js
// カレンダー表示に関する関数をまとめたファイル

// 勤怠ログデータ（main.jsから共有されることを想定）
// もしくは、カレンダー内で必要なデータのみを引数として渡すように変更することも検討
// 例: renderCalendar(logData) のように

let currentYear, currentMonth; // カレンダー表示用変数

// 月名配列（日本語）
const monthNamesJP = ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"];



/**
 * 全期間の日別労働時間を取得
 * log データに依存するため、log のスコープを適切に管理する必要があります。
 * この例では、グローバルな log 変数にアクセスすることを前提とします。
 */
function getAllDailyTotals() {
  const totals = {};
  // log は main.js で定義されているグローバル変数、またはここへ渡される想定
  if (typeof log !== 'undefined' && Array.isArray(log)) {
    log.forEach(row => {
      const date = row.date;
      totals[date] = (totals[date] || 0) + parseFloat(row.hours);
    });
  }
  return totals;
}


/**
 * カレンダーを初期化します。
 */
function initCalendar() {
  const today = new Date();
  currentYear = today.getFullYear();
  currentMonth = today.getMonth(); // 0=1月
  renderCalendar();
}

/**
 * 月を切り替えます。
 * @param {number} diff - 月の差分 (+1で翌月, -1で前月)
 */
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

/**
 * カレンダーのヘッダー（年月）を更新します。
 */
function updateCalendarHeader() {
  const header = document.getElementById("calendar-header");
  if (header) {
    header.textContent = `${currentYear}年 ${monthNamesJP[currentMonth]}`;
  }
}

/**
 * 日付のセルを作成し、日付と日ごとの労働時間を表示します。
 * @param {string} dateStr - YYYY-MM-DD形式の日付文字列
 * @param {number} displayMonth - 表示する月の数値 (1-12)
 * @param {number} displayDay - 表示する日の数値
 * @param {Object} dailyTotals - 日ごとの労働時間合計を格納したオブジェクト
 * @param {boolean} isOtherMonth - 他の月の場合はtrue
 * @returns {HTMLElement} 作成されたtd要素
 */
function createDateCell(dateStr, displayMonth, displayDay, dailyTotals, isOtherMonth = false) {
  const td = document.createElement("td");
  if (isOtherMonth) {
    td.className = "other-month";
  } else {
    td.style.verticalAlign = "top";
    td.style.height = "60px";
  }

  const dayHours = dailyTotals[dateStr] || 0;
  td.innerHTML = `<strong>${displayMonth}/${displayDay}</strong><br>` + (dayHours ? formatHours(dayHours) + " 時間" : "");
  return td;
}

/**
 * 週合計のセルを作成し、週の労働時間を表示します。
 * @param {number} totalHours - 週の合計労働時間
 * @returns {HTMLElement} 作成されたtd要素
 */
function createWeekTotalCell(totalHours) {
  const weekTotalTd = document.createElement("td");
  weekTotalTd.className = "week-total";
  weekTotalTd.textContent = formatHours(totalHours) + " 時間";
  return weekTotalTd;
}

/**
 * カレンダーグリッド全体を描画します。
 */
function renderCalendar() {
  const tbody = document.getElementById("calendar-body");
  if (!tbody) return; // tbodyが存在しない場合は処理を終了

  tbody.innerHTML = "";

  updateCalendarHeader(); // ヘッダー更新

  // 月曜始まり対応の最初の曜日（0=月曜, 6=日曜）
  const firstDay = new Date(currentYear, currentMonth, 1);
  const lastDay = new Date(currentYear, currentMonth + 1, 0);
  let firstWeekday = firstDay.getDay();
  firstWeekday = (firstWeekday === 0) ? 6 : firstWeekday - 1;

  const dailyTotals = getAllDailyTotals();
  const weeklyTotalsByWeekStart = {}; // 週開始日ごとの合計を計算するオブジェクト

  let tr = document.createElement("tr");

  // --- カレンダーの前月部分を描画 ---
  const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
  const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
  const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate();

  for (let i = 0; i < firstWeekday; i++) {
    const prevDay = prevMonthLastDay - (firstWeekday - i - 1);
    const dateStr = `${prevYear}-${String(prevMonth + 1).padStart(2, "0")}-${String(prevDay).padStart(2, "0")}`;
    const dayHours = dailyTotals[dateStr] || 0;

    tr.appendChild(createDateCell(dateStr, prevMonth + 1, prevDay, dailyTotals, true));

    const weekStart = getWeekStartDate(dateStr);
    weeklyTotalsByWeekStart[weekStart] = (weeklyTotalsByWeekStart[weekStart] || 0) + dayHours;
  }

  // --- 当月の日を描画 ---
  const daysInMonth = lastDay.getDate();
  for (let day = 1; day <= daysInMonth; day++) {
    // 7日ごとに週合計セルを入れて行を閉じるための判定
    if ((firstWeekday + day - 1) % 7 === 0 && day !== 1) {
      const prevWeekDate = new Date(currentYear, currentMonth, day - 1);
      const prevWeekStart = getWeekStartDate(prevWeekDate.toISOString().slice(0, 10));
      const weekTotal = weeklyTotalsByWeekStart[prevWeekStart] || 0;

      tr.appendChild(createWeekTotalCell(weekTotal));
      tbody.appendChild(tr);
      tr = document.createElement("tr"); // 新しい行を開始
    }

    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const dayHours = dailyTotals[dateStr] || 0;

    tr.appendChild(createDateCell(dateStr, currentMonth + 1, day, dailyTotals));

    const weekStart = getWeekStartDate(dateStr);
    weeklyTotalsByWeekStart[weekStart] = (weeklyTotalsByWeekStart[weekStart] || 0) + dayHours;
  }

  // --- 翌月の日付で空白埋め ---
  let nextDay = 1;
  const nextMonth = (currentMonth + 1) % 12;
  const nextYear = (currentMonth === 11) ? currentYear + 1 : currentYear;
  while (tr.children.length < 7) {
    const dateStr = `${nextYear}-${String(nextMonth + 1).padStart(2, "0")}-${String(nextDay).padStart(2, "0")}`;
    const dayHours = dailyTotals[dateStr] || 0;

    tr.appendChild(createDateCell(dateStr, nextMonth + 1, nextDay, dailyTotals, true));

    const weekStart = getWeekStartDate(dateStr);
    weeklyTotalsByWeekStart[weekStart] = (weeklyTotalsByWeekStart[weekStart] || 0) + dayHours;
    nextDay++;
  }

  // 最後の週の合計を入れてテーブルに追加
  const lastDayDateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}`;
  const lastWeekStart = getWeekStartDate(lastDayDateStr);
  const lastWeekTotal = weeklyTotalsByWeekStart[lastWeekStart] || 0;

  tr.appendChild(createWeekTotalCell(lastWeekTotal));
  tbody.appendChild(tr);
}