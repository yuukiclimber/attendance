// main.js
// クラスベースにリファクタリングされた勤怠アプリケーションのエントリ
// クラスベースにリファクタリングされた勤怠アプリケーションのエントリ

/**
 * ヒント（リファクタリング案）:
 * - DOM 操作をクラス外（または別メソッド）に切り出し、KintaiApp をロジック専用にする
 * - 時刻パースや労働時間計算をヘルパーにして単体テスト可能にする
 * - バリデーションやアラートは UI レイヤーに移す（戻り値でエラー情報を返す）
 * - カレンダーやファイル入出力は依存性注入（setCalendar / setFileIO）で差し替えやすくしているが、
 *   さらにインターフェース化（ミニマルなプロトコル）するとテストが楽になる
 * - HTML の inline onclick をやめて、addEventListener ベースに移行することで可読性向上
 */

/**
 * @typedef {Object} KintaiEntry
 * @property {string} date
 * @property {string} start
 * @property {string} end
 * @property {string} hours
 * @property {string} [memo]
 */

/**
 * メインアプリクラス
 */
class KintaiApp {
  /**
   * @param {string} [storageKey]
   */
  constructor(storageKey = 'kintai_log') {
    /** @type {string} */
    this.storageKey = storageKey;
    /** @type {KintaiEntry[]} */
    this.log = JSON.parse(localStorage.getItem(this.storageKey) || '[]');
    /** @type {number|null} */
    this.editingIndex = null;
    /** @type {Object|null} */
    this.calendar = null; // CalendarView インスタンスをセット
    /** @type {Object|null} */
    this.fileIO = null; // 後でセット可能
  }

  /**
   * カレンダーを注入
   * @param {{render:function(Array):void, init?:function():void, changeMonth?:function(number):void}} calendarInstance
   */
  setCalendar(calendarInstance) {
    this.calendar = calendarInstance;
  }

  /**
   * FileIO を注入
   * @param {{importData:function():void, exportData:function():void}} fileIOInstance
   */
  setFileIO(fileIOInstance) {
    this.fileIO = fileIOInstance;
  }

  // ---- 小さなヘルパーを追加（テストしやすいように分離） ----
  /**
   * "HH:MM" -> [h, m]（不正入力は null を返す）
   * @param {string} timeStr
   * @returns {number[]|null}
   */
  parseTime(timeStr) {
    if (!timeStr) return null;
    const parts = timeStr.split(':').map(Number);
    if (parts.length !== 2 || parts.some(p => Number.isNaN(p))) return null;
    return parts;
  }

  /**
   * 労働時間を算出（失敗時は NaN）
   * @param {string} startStr
   * @param {string} endStr
   * @returns {number}
   */
  computeHours(startStr, endStr) {
    const start = this.parseTime(startStr);
    const end = this.parseTime(endStr);
    if (!start || !end) return NaN;
    const [sh, sm] = start;
    const [eh, em] = end;
    return ((eh * 60 + em) - (sh * 60 + sm)) / 60;
  }

  /**
   * ボタンラベル更新
   * @param {string} label
   */
  updatePrimaryButtonLabel(label) {
    const firstBtn = document.querySelector('button');
    if (firstBtn) firstBtn.textContent = label;
  }
  // ----------------------------------------------------------

  /**
   * 記録処理（UI から呼ばれる）
   * @returns {void}
   */
  record() {
    const date = document.getElementById('date').value || new Date().toISOString().slice(0,10);
    const start = document.getElementById('start').value;
    const end = document.getElementById('end').value;
    const memo = document.getElementById('memo').value.trim();

    if (!start || !end) {
      alert('開始時間と終了時間を入力してください');
      return;
    }

    const hours = this.computeHours(start, end);

    if (Number.isNaN(hours)) {
      alert('時刻の形式が不正です（HH:MM）');
      return;
    }

    if (hours < 0) {
      alert('終了時間は開始時間より後にしてください');
      return;
    }

    /** @type {KintaiEntry} */
    const newEntry = { date, start, end, hours: hours.toFixed(2), memo };

    if (this.editingIndex !== null) {
      this.log[this.editingIndex] = newEntry;
      this.editingIndex = null;
      this.updatePrimaryButtonLabel('記録する');
    } else {
      this.log.push(newEntry);
    }

    this.saveAndRender();
  }

  /**
   * レンダリング
   * @returns {void}
   */
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

    if (this.calendar && typeof this.calendar.render === 'function') {
      this.calendar.render(this.log);
    }
  }

  /**
   * 編集行読み込み
   * @param {number} index
   */
  editRow(index) {
    const row = this.log[index];
    document.getElementById('date').value = row.date;
    document.getElementById('start').value = row.start;
    document.getElementById('end').value = row.end;
    document.getElementById('memo').value = row.memo || '';
    this.editingIndex = index;
    this.updatePrimaryButtonLabel('更新する');
  }

  /**
   * 削除
   * @param {number} index
   */
  deleteRow(index) {
    if (confirm('この記録を削除しますか？')) {
      this.log.splice(index, 1);
      this.saveAndRender();
    }
  }

  /**
   * 保存して再描画
   */
  saveAndRender() {
    localStorage.setItem(this.storageKey, JSON.stringify(this.log));
    this.render();
  }

  /**
   * サマリ描画
   */
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
        Object.entries(summaryMonth).map(([m,t]) => `${m}: ${formatHours(t)} 時間`).join('<br>')
    }
  }
}

// グローバルなアプリ／カレンダーインスタンス初期化と互換ラッパー
const app = new KintaiApp();
let calendarView = null;

document.addEventListener('DOMContentLoaded', () => {
  if (typeof CalendarView === 'function') {
    calendarView = new CalendarView();
    app.setCalendar(calendarView);
    if (typeof calendarView.init === 'function') calendarView.init();
  }

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