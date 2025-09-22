// main.js
// クラスベースにリファクタリングされた勤怠アプリケーションのエントリ
// クラスベースにリファクタリングされた勤怠アプリケーションのエントリ

class KintaiApp {
  constructor(storageKey = 'kintai_log') {
    this.storageKey = storageKey;
    this.log = JSON.parse(localStorage.getItem(this.storageKey) || '[]');
    this.editingIndex = null;
    this.calendar = null; // CalendarView インスタンスをセット
    this.fileIO = null; // 後でセット可能
  }

  setCalendar(calendarInstance) {
    this.calendar = calendarInstance;
  }

  setFileIO(fileIOInstance) {
    this.fileIO = fileIOInstance;
  }

  record() {
    const date = document.getElementById('date').value || new Date().toISOString().slice(0,10);
    const start = document.getElementById('start').value;
    const end = document.getElementById('end').value;
    const memo = document.getElementById('memo').value.trim();

    if (!start || !end) {
      alert('開始時間と終了時間を入力してください');
      return;
    }

    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    const hours = ((eh * 60 + em) - (sh * 60 + sm)) / 60;

    if (hours < 0) {
      alert('終了時間は開始時間より後にしてください');
      return;
    }

    const newEntry = { date, start, end, hours: hours.toFixed(2), memo };

    if (this.editingIndex !== null) {
      this.log[this.editingIndex] = newEntry;
      this.editingIndex = null;
      const firstBtn = document.querySelector('button');
      if (firstBtn) firstBtn.textContent = '記録する';
    } else {
      this.log.push(newEntry);
    }

    this.saveAndRender();
  }

  render() {
    const tbody = document.getElementById('log');
    if (!tbody) return;
    tbody.innerHTML = '';

    this.log.sort((a, b) => (a.date + 'T' + a.start) > (b.date + 'T' + b.start) ? -1 : 1);

    this.log.forEach((row, index) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${row.date}</td>
        <td>${row.start}</td>
        <td>${row.end}</td>
        <td>${formatHours(row.hours)}</td>
        <td>${row.memo || ''}</td>
        <td>
          <button onclick="editRow(${index})">編集</button>
          <button onclick="deleteRow(${index})">削除</button>
        </td>`;
      tbody.appendChild(tr);
    });

    this.renderSummary();

    // カレンダーがセットされていれば、ログを渡して再描画
    if (this.calendar && typeof this.calendar.render === 'function') {
      this.calendar.render(this.log);
    }
  }

  editRow(index) {
    const row = this.log[index];
    document.getElementById('date').value = row.date;
    document.getElementById('start').value = row.start;
    document.getElementById('end').value = row.end;
    document.getElementById('memo').value = row.memo || '';
    this.editingIndex = index;
    const firstBtn = document.querySelector('button');
    if (firstBtn) firstBtn.textContent = '更新する';
  }

  deleteRow(index) {
    if (confirm('この記録を削除しますか？')) {
      this.log.splice(index, 1);
      this.saveAndRender();
    }
  }

  saveAndRender() {
    localStorage.setItem(this.storageKey, JSON.stringify(this.log));
    this.render();
  }

  renderSummary() {
    const summaryMonth = {};
    const summaryWeek = {};

    this.log.forEach(row => {
      const month = row.date.slice(0,7);
      summaryMonth[month] = (summaryMonth[month] || 0) + parseFloat(row.hours);

      const weekStart = getWeekStartDate(row.date);
      summaryWeek[weekStart] = (summaryWeek[weekStart] || 0) + parseFloat(row.hours);
    });

    const summaryDiv = document.getElementById('summary');
    if (summaryDiv) {
      summaryDiv.innerHTML =
        '📊 月別労働時間：<br>' +
        Object.entries(summaryMonth).map(([m,t]) => `${m}: ${formatHours(t)} 時間`).join('<br>') +
        '<br><br>' +
        '📅 週別労働時間：<br>' +
        Object.entries(summaryWeek).map(([w,t]) => `${w}: ${formatHours(t)} 時間`).join('<br>');
    }
  }
}

// グローバルなアプリ／カレンダーインスタンス初期化と互換ラッパー
const app = new KintaiApp();
let calendarView = null;

document.addEventListener('DOMContentLoaded', () => {
  // CalendarView が定義済みならインスタンス化して app にセット
  if (typeof CalendarView === 'function') {
    calendarView = new CalendarView();
    app.setCalendar(calendarView);
    if (typeof calendarView.init === 'function') calendarView.init();
  }

  // FileIO が定義済みならインスタンス化して app にセット
  if (typeof FileIO === 'function') {
    app.setFileIO(new FileIO(app));
  }

  app.render();
});

// 既存の HTML から呼ばれるグローバル関数を維持
function record() { app.record(); }
function editRow(index) { app.editRow(index); }
function deleteRow(index) { app.deleteRow(index); }
function importData() { if (app.fileIO && typeof app.fileIO.importData === 'function') app.fileIO.importData(); }
function exportData() { if (app.fileIO && typeof app.fileIO.exportData === 'function') app.fileIO.exportData(); }
function changeMonth(diff) { if (calendarView && typeof calendarView.changeMonth === 'function') calendarView.changeMonth(diff); }