// main.js
// 勤怠ログの主要なロジックとデータ管理を行うファイル

const storageKey = "kintai_log";
let log = JSON.parse(localStorage.getItem(storageKey) || "[]");
let editingIndex = null; // 編集中のインデックス保持用



/**
 * 勤怠記録を保存し、表示を更新します。
 */
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

/**
 * 勤怠記録をテーブルとサマリーに描画します。
 */
function render() {
  const tbody = document.getElementById("log");
  if (!tbody) return; // tbodyが存在しない場合は処理を終了

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
  // カレンダーの描画は calendar.js の関数を呼び出す
  // log データに変更があった場合はカレンダーも更新する必要があるため、呼び出しが必要です。
  if (typeof renderCalendar === 'function') {
    renderCalendar();
  }
}

/**
 * 既存の勤怠記録を編集するためにフォームにデータをセットします。
 * @param {number} index - 編集対象の記録のインデックス
 */
function editRow(index) {
  const row = log[index];
  document.getElementById("date").value = row.date;
  document.getElementById("start").value = row.start;
  document.getElementById("end").value = row.end;
  document.getElementById("memo").value = row.memo || "";
  editingIndex = index;
  document.querySelector("button").textContent = "更新する";
}

/**
 * 勤怠記録を削除します。
 * @param {number} index - 削除対象の記録のインデックス
 */
function deleteRow(index) {
  if (confirm("この記録を削除しますか？")) {
    log.splice(index, 1);
    saveAndRender();
  }
}

/**
 * 勤怠記録をLocalStorageに保存し、表示を更新します。
 */
function saveAndRender() {
  localStorage.setItem(storageKey, JSON.stringify(log));
  render();
}

/**
 * 月別・週別の労働時間サマリーを表示します。
 */
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
  if (summaryDiv) {
    summaryDiv.innerHTML =
      "📊 月別労働時間：<br>" +
      Object.entries(summaryMonth).map(([m,t]) => `${m}: ${formatHours(t)} 時間`).join("<br>") +
      "<br><br>" +
      "📅 週別労働時間：<br>" +
      Object.entries(summaryWeek).map(([w,t]) => `${w}: ${formatHours(t)} 時間`).join("<br>");
  }
}




// ページ読み込み時初期化
document.addEventListener('DOMContentLoaded', () => {
  // calendar.js の関数が読み込まれていることを確認してから呼び出す
  if (typeof initCalendar === 'function') {
    initCalendar();
  }
  render(); // 初期表示
});